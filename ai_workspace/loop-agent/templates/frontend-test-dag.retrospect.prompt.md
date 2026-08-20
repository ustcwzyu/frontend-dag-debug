# Frontend test retrospective

Write a dated report under `testcase/frontend/reports/` (for example `frontend-test-retrospect-<date>.md`) after `frontend-test-result-v1` materialization. Do **not** require outcome=pass; failed, incomplete, and blocked runs still need a report.

Combine a short AC → case → browser-evidence review with the closeout: case coverage, passed/failed/blocked results (including `token-budget-exhausted`), evidence gaps, browser anomalies, residual risks, and an A/B/C/D maturity rating. Cite the deterministic case-evidence validation outcome. Passed cases should reference the successful `find` assertion plus screenshot or equivalent browser evidence and the ordered post-execution cleanup receipt when available; failed/blocked cases need explicit reasons. Blocked cases never count as passed; a missing or malformed `execution.md` / `case-result.json` is a verification gap, not a pass. Do not write under `docs/**`.
