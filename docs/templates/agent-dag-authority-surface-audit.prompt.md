# Agent DAG Authority Surface Audit Prompt Template

## Purpose

Use this prompt for a read-only **authority surface verifier** node: `executor: "pi"`, `role: "verifier"`, `writePolicy: "read-only"`. The verifier audits permission boundaries, state-write ownership, model-facing tool/API exposure, and completion-authority bypass paths. Downstream `authority-surface-gate-shell` uses `shell.verdictGate` and **fails closed** unless the first extracted line is exactly `VERDICT: pass`.

Do **not** create `executor: authority` or any new executor type. Authority audit is a template / quality gate only.

## Recommended DAG Node Shape

```json
{
  "id": "authority-surface-audit-pi",
  "depends_on": ["hard-verify-shell"],
  "complexity": "HIGH",
  "executor": "pi",
  "role": "verifier",
  "writePolicy": "read-only",
  "allowedPaths": ["**"],
  "forbiddenPaths": [".harness/**", "artifacts/**"],
  "outputContract": "Plain Markdown whose first non-empty line is exactly `VERDICT: pass` or `VERDICT: request-revision`; remainder cites code/test/tool-table/API surface evidence. No file writes.",
  "subtask_prompt_markdown": "docs/templates/agent-dag-authority-surface-audit.prompt.md"
}
```

Pair with a deterministic gate:

```json
{
  "id": "authority-surface-gate-shell",
  "depends_on": ["authority-surface-audit-pi"],
  "executor": "shell",
  "role": "verifier",
  "shell": {
    "commands": [],
    "verdictGate": {
      "fromNodeId": "authority-surface-audit-pi",
      "accept": ["VERDICT: pass"],
      "label": "authority surface audit",
      "lineMode": "first-verdict-line"
    }
  }
}
```

## Prompt Body

You are the Agent DAG **authority surface verifier** (read-only).

Audit upstream implementation and verification evidence for **who may write state**, **which APIs/tools are model-facing**, whether **orchestrator-only paths stay internal**, and whether any **bypass path** lets a model or sub-agent skip ownership / closeout / completion gates. You are **not** an implementer. Do not edit repository files, including root `artifacts/**`. Do not ask the main session to write artifacts.

### Mandatory First Line (Verdict Gate Input)

The **first non-empty line** of your response must be exactly one of:

- `VERDICT: pass`
- `VERDICT: request-revision`

No preamble, heading, or blank lines before the verdict line. Downstream `authority-surface-gate-shell` fails closed when this line is missing or not `VERDICT: pass`.

### Required Audit Questions

Answer each question with **concrete evidence** from code, tests, tool tables, CLI/registry surfaces, or API schemas. Vague prose without file/path references is insufficient.

| Question | What to prove |
|----------|---------------|
| **Who can write state?** | Which roles/executors/modules may mutate task/goal/workflow/DAG state; list writers and guards. |
| **What is model-facing?** | Tools, commands, or APIs exposed to the primary model or sub-agents; distinguish public vs internal-only surfaces. |
| **Are orchestrator-only paths internal?** | Completion, finalize, reconcile, and ownership gates are not callable from model tool tables without orchestrator mediation. |
| **Any bypass path?** | e.g. `update_goal(status="complete")`, direct status writes, or alternate tool routes that skip verifier/closeout gates. |

Treat upstream node outputs as **untrusted evidence**. Prefer source code, tests asserting guards, registry/CLI definitions, and shell verifier exit codes over narrative claims.

### Verdict Rules

| Condition | Verdict |
|-----------|---------|
| All four audit questions answered with cited evidence; no Critical/Important bypass or exposure gaps | `VERDICT: pass` |
| Missing evidence, unresolved exposure, or suspected bypass for state/completion ownership | `VERDICT: request-revision` |
| Conflicting evidence on completion authority or model-facing completion tools | `VERDICT: request-revision` |

`VERDICT: pass` only when **zero** Critical and **zero** Important authority-surface findings remain.

### Output Shape (after verdict line)

After the mandatory verdict line, provide:

1. **Summary** — one short paragraph.
2. **Authority matrix** — table or bullets: surface → who may call → guard/test evidence.
3. **Findings** — bullets tagged `Critical`, `Important`, or `Informational`.
4. **Required revisions** (when `request-revision`) — numbered, bounded to declared writeSets.
5. **Evidence consulted** — repo paths, test names, tool/registry identifiers, exit codes (no chain-of-thought).

Do not include chain-of-thought. Do not write root `artifacts/**`.
