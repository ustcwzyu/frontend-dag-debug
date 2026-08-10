# Worker Dogfood Evidence

## Sample identity

| Field | Value |
|---|---|
| Date | |
| Feature / Task | |
| Target repo | disposable path or sanitized reference |
| Controller package/version | |
| Agent-worker package/version (same npm install) | |
| Controller requested entry / real entry | sanitized reference; keep machine-local absolute value in runtime evidence |
| Controller launch command / args prefix | sanitized reference |
| Controller binary SHA-256 | |
| Controller package fingerprint | `sha256:<hex>` |
| Expected controller version / fingerprint | n/a / exact values |
| Provider/model / override | |
| Batch ID | |
| Worker run ID | |
| Retry of worker run ID | n/a / |
| Candidate commit / tarball SHA-256 | n/a / |

## Baseline

- Baseline commit and `git status`:
- Existing failing behavior or missing capability:
- Preflight (`loop-agent --version`, `inspect`, `docs audit`, `check-repo`):

## Run evidence

| Artifact | Path / link | Result |
|---|---|---|
| TaskSpec / source-doc copies | | |
| DAG spec | | |
| DAG report JSON / Markdown | | |
| DAG skill snapshot ref / SHA-256 / mode | | |
| shell verification | | |
| diff | | |
| closeout or Failure Handoff | | |
| morning report | | |
| Observe snapshot / events | | |
| Controller identity in Worker / Task Pool / batch / Feature evidence | | |

## Candidate takeover evidence (if applicable)

| Field | Value / result |
|---|---|
| Candidate isolated slot containment | |
| `loop-agent` entry / binary SHA-256 / reported version | |
| `agent-worker` entry / binary SHA-256 / reported version | |
| Shared package fingerprint | |
| Full init / doctor / inspect / docs audit / target check-repo | |
| `agent-worker` skill and `.agents/skills` mirror hashes | |
| Feature validation / `feature run --dry-run` | |
| DAG executors | expected: `static`, `shell` only |
| PATH trap invocations | expected: none |
| Pi/model executor observed | expected: false; derive from actual DAG nodes |
| Feature dry-run executed tasks | expected: empty |
| Canary verdict / evidence path | |

Do not use a deterministic canary result as proof that live Pi/model/provider execution succeeded. Record run-owned skill snapshot evidence and any explicitly authorized live run separately.

## Acceptance and QA coverage

| Acceptance | Test case(s) | Test file / verification | Result |
|---|---|---|---|
| | | | |

## Failure / retry (if applicable)

| Raw failure | Product-line category | Recommended follow-up | Root cause evidence | Retry result |
|---|---|---|---|---|
| | | | | |

## Conclusion

- Verdict: pass / fail / blocked
- Review notes:
- Follow-up task(s):
- Evidence limitations (for example deterministic-only, no Pi executor/live takeover):
