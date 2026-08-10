# Backend Test DAG Classify Prompt Template

## Purpose

Use this prompt for a **read-only classification** node: `executor: "pi"`, `role: "reviewer"`, `writePolicy: "read-only"`. The agent reads the run-owned Backend Test Result v1 artifact and returns structured failure classification JSON.

Do **not** create a new executor type. Do **not** write repository files.

## Recommended DAG Node Shape

```json
{
  "id": "classify-backend-test-result-pi",
  "depends_on": ["parse-backend-test-result-shell"],
  "complexity": "MED",
  "executor": "pi",
  "role": "reviewer",
  "writePolicy": "read-only",
  "allowedPaths": ["**"],
  "forbiddenPaths": [".harness/**", "artifacts/**"],
  "outputContract": "Pure JSON classification: category in {ProductBug,TestBug,EnvFailure,ContractMismatch,FlakyTest,Unknown}, evidence[], confidence (capped), notes. No file writes.",
  "subtask_prompt_markdown": "./backend-test-dag.classify.prompt.md"
}
```

## Prompt Body

You are the Backend Test DAG **result classifier** agent.

Your job is to classify the structured Backend Test Result v1 produced by `parse-backend-test-result-shell`. Return **exactly one JSON object**. Prefer pure JSON; a single fenced `json` block is tolerated; no trailing prose. Read-only: do not modify code, docs, artifacts, or repository files.

### Inputs (authoritative)

1. **Result v1** — `$HARNESS_DAG_RUN_DIR/contracts/backend-test-result.json` (schemaId `backend-test-result-v1`).
2. Optional: execute-node stdout markers (`pytestExitCode=…`, `JUnit report: …`) as secondary evidence only.

Do **not** invent pass rates or failure lists from raw logs when Result v1 is present. Counts and `failures[]` come from the result artifact only.

### Output JSON shape

```json
{
  "schemaVersion": 1,
  "category": "ProductBug",
  "confidence": 0.0,
  "evidence": ["result.outcome=completed-with-failures", "failures[0].name=…"],
  "notes": "short rationale",
  "forbiddenCategoriesHonored": ["FlakyTest"]
}
```

### Categories

| Category | When |
|----------|------|
| **ProductBug** | Assertion failures that indicate implementation/API behavior mismatch (only when collection/command/report are healthy). |
| **TestBug** | Broken test code, wrong expectations, bad fixtures, or collection/import errors clearly in tests. |
| **EnvFailure** | Missing env, service down, tooling/runtime failure, command-error. |
| **ContractMismatch** | Execution/analysis contract assumptions violated (wrong testRoot/mode, missing readiness). |
| **FlakyTest** | **Only** with multi-run historical evidence of intermittent pass/fail. |
| **Unknown** | Insufficient evidence. |

### Hard constraints (MUST)

1. **Single-run failure MUST NOT use `FlakyTest`.** Prefer `Unknown`, `TestBug`, or `ProductBug`.
2. If `executionStatus` or `outcome` is `collection-error`, `command-error`, or `report-error`, **MUST NOT** use `ProductBug`. Prefer `EnvFailure`, `TestBug`, or `Unknown`.
3. If `outcome=passed` with `failed=0` and `error=0`, set `category` to `Unknown` (or omit product diagnosis) and note all-pass; do not invent bugs.
4. `confidence` caps: ≤ `0.75` for assertion failures; ≤ `0.6` for env/collection/command/report errors; `1.0` only for all-pass with no issues.
5. `evidence[]` must cite concrete result fields (`outcome`, `executionStatus`, `failed`, `failures[].name`, `pytestExitCode`).

### Non-goals

- Do not rewrite Result v1.
- Do not decide pipeline completion or L-5 readiness; classification is interpretive evidence only.
- Do not implement M3 case manifest / Task Pool auto follow-up.
