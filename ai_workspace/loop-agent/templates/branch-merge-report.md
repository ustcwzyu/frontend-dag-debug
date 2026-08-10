# Branch Merge Report — `<source-ref>` into `<target-branch>` at `<source-short-sha>`

Date: `<YYYY-MM-DD>`
Target branch: `<target-branch>`
Target before merge: `<full SHA>`
Source: `<source-ref>@<full SHA>`
Merge base: `<full SHA>`
Merge commit: `<full SHA or follow-up commit reference>`
Merge mode: `quick | standard | deep`
Mode rationale: `<why this mode is sufficient>`

## Naming Convention

Use `YYYY-MM-DD-origin-<source>-into-<target>-<source-short-sha>.md` under `docs/reports/merge/`. Replace `/` and other path separators in branch names with `-`. The source short SHA distinguishes repeated merges on the same day.

## Pre-merge Inspection

- Divergence: `<target-only count>` target-only commits / `<source-only count>` source-only commits.
- Dry run: `git merge-tree --write-tree --messages <target> <source>`.
- Predicted conflicts: `<count and files>`.
- Baseline verification: `<commands and results>`.

## Final Source Drift Check

- Final fetch: `<command and timestamp>`.
- Final source tip: `<full SHA>`.
- Source advanced during work: `<no | yes, with re-audit details>`.

## Incoming Capabilities

| Capability | Key files / contracts | Expected user or runtime result | Verification |
| --- | --- | --- | --- |
| `<incoming capability>` | `<paths>` | `<behavior>` | `<test/smoke>` |

## Target-branch Capabilities to Preserve

| Capability | Key files / contracts | Preservation risk | Verification |
| --- | --- | --- | --- |
| `<target capability>` | `<paths>` | `<possible overwrite>` | `<test/smoke>` |

## Conflict Resolution

| File | Conflict type | Incoming concern | Target concern | Resolution | Evidence |
| --- | --- | --- | --- | --- | --- |
| `<path>` | `content/rename-delete/add-add` | `<incoming behavior>` | `<target behavior>` | `<combined decision>` | `<test/diff>` |

If there were no textual conflicts, write `No textual conflicts` and continue with the automatic-merge review below.

## Automatic-merge Semantic Review

Record overlapping or high-risk files that Git merged without conflict. These are common places for silent feature loss.

| File / area | Why high risk | Incoming behavior retained | Target behavior retained | Evidence |
| --- | --- | --- | --- | --- |
| `<path>` | `<shared imports/topology/config>` | `<incoming proof>` | `<target proof>` | `<tests/search>` |

## Functional Impact Matrix

| Feature | Before merge | After merge | Deleted or weakened? | Notes |
| --- | --- | --- | --- | --- |
| `<feature>` | `<baseline>` | `<result>` | `No/Yes` | `<details>` |

## Init and Update Impact

- Changed init/package surface: `<paths or none>`.
- Fresh full init result: `<result>`.
- `init check-update` result: `<result>`.
- `init update --apply-safe` recovery result: `<result>`.
- Manifest or init implementation updates made: `<details or none>`.

## Package Surface Impact

- `npm pack --dry-run --ignore-scripts --json`: `<file count>` files.
- Added package paths: `<paths>`.
- Removed package paths: `<paths or none>`.
- Unexpected files or missing required files: `<details or none>`.

## Verification

| Command | Result | Capability covered |
| --- | --- | --- |
| `npm run typecheck` | `<pass/fail>` | TypeScript integration |
| `npm test` | `<pass/fail>` | Full regression |
| `npm run build` | `<pass/fail>` | Build/package inputs |
| `bash scripts/check-repo.sh` | `<pass/fail>` | Governance and init surface |
| `npm run docs:build` | `<pass/fail>` | User documentation |
| `npm pack --dry-run --ignore-scripts --json` | `<pass/fail>` | Published files |

Add focused tests and real init/update/browser/CLI smokes required by the merged capabilities.

## Mode Completion Check

- Required gates for selected mode: `<list>`.
- Passed gates: `<list>`.
- Any mode upgrade during execution: `<no | from quick/standard to standard/deep, with reason>`.

## Residual Risk

- `<unverified external environment, performance, migration, or compatibility risk>`

## Rollback and Investigation Pointers

- Merge commit: `<SHA>`.
- Conflict files: `<paths>`.
- First tests to run if a feature appears missing: `<commands>`.
- Safe rollback strategy: prefer `git revert -m 1 <merge-commit>` after review; do not use destructive reset on shared work.
