# 2026-08-30-task-board-status-filter — 交付与恢复记录

## Summary

任务看板（task-board）新增状态筛选：提供「全部 / 进行中 / 已完成」三个筛选按钮，默认「全部」；点击仅显示对应状态卡片；筛选状态记入现有测试。用户确认口径：「进行中」= 原「待完成」桶文案替换（不改 `completed: boolean` 模型）；筛选不持久化。

## Changes (writeSet 内两个文件)

- `src/task-board.ts`：
  - 筛选按钮 `data-filter=pending` 文案「待完成」→「进行中」；`all`（默认激活）与 `done` 文案不变
  - `render()` pending 分支空态文案「暂无待完成的任务」→「暂无进行中的任务」
  - `Filter`/`filterTasks` 语义与 data-filter 取值 all/pending/done 保持不变；无持久化
- `test/task-board.test.mjs`：新增/更新断言记入筛选状态 —— `filterTasks` pending/done 过滤行为、「全部」默认激活 class、按钮文案「全部 / 进行中 / 已完成」、data-filter 属性、三种筛选空态文案

## Verification Evidence

- DAG 运行 `20260830-task-board-status-filter-r4`：**status=finished / verdict=pass**（15 节点：11 FINISHED，4 按需 SKIPPED；契约 v1 结构化产物已生成）
- `npm run typecheck`（tsc --noEmit）：exit 0
- `npm test`（node --test 全量）：**218 pass / 0 fail**（含全部新增筛选断言）
- 仅改动上述 2 个文件（git diff 确认），禁止路径未触碰（AC-6 满足）

## Recovery 过程摘要（供审计）

1. r1/r2：deepseek 官方渠道 `402 Insufficient Balance`（provider 层，非契约问题）
2. 用户切换 harness 执行器为 `opencode-go/deepseek-v4-flash`（三档）→ rerun-task 重新生成 DAG
3. r3 性质：`frontend-plan-pi` 修复轮读取冻结白名单外路径 → governance-blocked；再续跑 `…-r3` 3 次尝试均缺 `sourceFragmentIds/sourceRefs` → structured-repair-exhausted
4. 用户将 MED/HIGH 升级为 `opencode-go/deepseek-v4-pro`；PRD 增加 EC-1..EC-4（plan 节点 sourceFragmentIds 取内嵌 requirementToFragments 映射、修复轮白名单纪律、mockApi=not-needed、commandLabel 冻结标签）并重投影 → 第 4 轮成功

## 生命周期簿记注意事项

任务最新成功运行 r4 已完成且验证通过；但 `task advance` 的 promote/closeout 被阻塞：
- `observe` 按 runId 字典序取 `latestRun`；rerun-task 遗留的失败续跑 `dag-1788082577478-84f099a2`（前缀 `dag-`）恒排在 `2026…-rN` 之后，成为 latestRun（partial_failed）→ lifecycleState=run-failed
- `dag reconcile-run` 对该遗留 run 判 canReconcile=false（run-already-terminal），无法 supersede/abandon
- 影响：任务生命周期停留在 run-failed，未走 promote→closeout 记录。交付本身不受影响（代码/测试/验证证据齐全）

可选项（需维护者决策）：保留现状（证据完整，仅簿记状态为 run-failed）；或清理 `.harness/dag-runs/completed/dag-1788082577478-84f099a2` 遗留记录后重跑 `task advance` 使 lifecycle 走 promote/closeout 闭合。