# Product-line execution rules

- Read requirement, acceptance, design, test plan, task graph, and the selected TaskSpec before writing.
- Treat `constraints.allowed_paths` and `constraints.forbidden_paths` as machine-enforced write boundaries; review DAG writer `writeSet` before execution.
- Advance only tasks whose dependencies are complete. Preserve failed run records; retries receive new worker run IDs.
- A Ready task must have acceptance references, non-empty allowed/forbidden paths, and deterministic verification commands.
- For `fullstack-v1` packets (`feature.yaml`), every TaskSpec should declare `execution.workflow`; required ACs need implementation/verification refs, `required_evidence`, and integration policy. Parallel writers must not share overlapping `allowed_paths`.
- QA records an independent verdict and evidence. Do not write `status: success` closeout until `qa_verdict: pass` and non-empty `qa_evidence` exist.
- Human gates remain human decisions. Record owner, time, reason, evidence, and follow-up without rewriting failed history.
