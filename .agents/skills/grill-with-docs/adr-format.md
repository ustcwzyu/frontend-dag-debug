# ADR Format

ADRs live under `${harness.json.governanceRoot}/decisions/`（源码仓库通常为 `docs/decisions/`；普通初始化目标项目通常为 `ai_workspace/loop-agent/decisions/`）。

Do **not** create a parallel `adr/` tree. Use `decisions/` under the governance root only.

Create the decisions directory lazily — only when the first ADR is needed and write permission exists.

## Template

Follow the **target repository's existing ADR template**. In the loop-agent source repo that is `docs/templates/adr.md` with full sections:

- 标题 / 状态
- 背景
- 决策
- 备选方案
- 取舍理由
- 影响范围
- 后果（正面 / 负面）
- 验证与落地
- 复审条件

Do not replace a full local template with a one-paragraph mini-ADR.

Target projects may ship a copy of the template under their governance `templates/` directory; use that when present.

## Numbering

Scan the decisions directory for the highest existing `NNNN-*.md` number and increment by one. Update the decisions README index when one exists.

## When to offer an ADR

All three must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder why this path was chosen
3. **The result of a real trade-off** — genuine alternatives existed and one was chosen for specific reasons

If any is missing, skip the ADR.

### What qualifies

- Architectural shape and integration patterns between contexts
- Technology choices that carry lock-in
- Boundary and scope decisions (explicit no-es included)
- Deliberate deviations from the obvious path
- Constraints not visible in the code
- Rejected alternatives when the rejection is non-obvious

### What does not

- Temporary scheduling
- Obvious implementation choices with no alternatives
- Facts that belong in code, tests, or progress/report artifacts

## Write boundary

Only create or edit ADR files when the current task `allowedPaths` / DAG `writeSet` allow it. Otherwise return a suggested patch for human or writer follow-up.
