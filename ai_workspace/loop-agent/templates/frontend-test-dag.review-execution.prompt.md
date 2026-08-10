# Review frontend execution evidence

Review AC → case → browser-evidence traceability only after deterministic evidence validation. Each manifest case must have `execution.md` and a valid `case-result.json` with matching `caseId`, `status`, and `evidencePaths`; `blocked` requires a non-empty `blockedReason`. A passed case additionally needs assertions and screenshot or equivalent browser evidence. Failed and blocked cases need an explicit cause. Treat `token-budget-exhausted` as blocked; do not substitute model conclusions or static checks for browser evidence.
