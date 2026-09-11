# Verification Matrix

本矩阵记录规划中心专注队列到 journal 学习会话的实现证据与验证边界。自动发现规则为 `jest.config.mjs` 的 `testMatch`：`test/*.test.mjs`，无需逐文件登记。

| 要求 / 交互 | 代码证据 | 验证目标 | 当前状态 |
|---|---|---|---|
| `AC-R1` / `focus-queue-start-session` 正常启动 | `src/planner.ts` 校验队列任务并创建 `PlannerMissionSnapshot`；`src/journal.ts` 的 `startJournalSession` 创建新草稿；`src/main.ts` 注入持久化与 `#/progress` 导航 | `VT-SESSION-START`；`npm run build` | 已实现；行为正确性由下游 frontend-test handoff 验证 |
| `AC-R2` / `draft-overwrite-cancel` 取消覆盖 | `hasJournalDraftContent` 在 `src/journal.ts` 确定性识别真实草稿；`window.confirm` 位于 planner、journal、hash 副作用之前 | `VT-DRAFT-PROTECTION` | 已实现；浏览器状态不变性待下游验证 |
| `AC-R3` / `draft-overwrite-confirm` 确认覆盖 | 目标任务快照 → `changeMissionStatus(..., 'active')` → planner 持久化 → `startJournalSession` → `navigate('#/progress')` | `VT-DRAFT-REPLACEMENT` | 已实现；行为由下游 frontend-test handoff 验证 |
| `AC-R4` / `legacy-journal-restore` 旧数据兼容 | `JournalDraft.taskSnapshot?` 可选；`isValidDraft` 接受无任务上下文 payload；`renderTaskContext` 仅在有快照时显示 | `VT-LEGACY-COMPATIBILITY` | 已实现；非法 payload 边界待下游覆盖 |
| `AC-R5` / `ui-runtime-safety` | planner/journal 独立挂载与 DOM 状态同步；既有 `focus-visible`、reduced-motion、480px 单栏和唯一计时 `setInterval` 保留 | `VT-UI-RUNTIME-SAFETY`；`VT-STATIC-BUILD` | 已实现；真实浏览器、视觉、响应式和 a11y 待下游验证 |
| `AC-R6` / `delivery-regression-check` | 两份 planner 测试入口、README 与本矩阵说明自动发现和交付边界 | `VT-DELIVERY-REGRESSION`；`npm test`、`npm run typecheck`、`npm run build` | 本节点仅执行 build；完整回归待 frontend-test / verify handoff |
| `REQ-SRC-D383DE434D63` 范围排除 | 仅修改声明的 planner/journal/main/style、测试与文档；未新增 Mock、API、路由、存储 key 或依赖 | `VT-SCOPE-EXCLUSIONS` | 已实现；由写集守卫与 diff 审计确认 |

## Project-Specific Verification

- 学习会话工作台聚焦回归：`npm test -- --runInBand test/frontend-journal.test.mjs`；规划任务启动会话回归：`npm test -- --runInBand test/frontend-planner-journal.test.mjs`。
- `npm test`：Jest 自动发现 `test/*.test.mjs`；当前工作树为 10 suites、263 个 `test(...)`，包括新增 `test/frontend-planner-journal.test.mjs`。
- `npm run typecheck`：执行 `tsc --noEmit`，覆盖 `src/` 与 `server/`。
- `npm run build`：执行 `tsc && vite build`，确认生产前端 bundle 可构建；本节点已执行成功。构建成功不是行为或测试成功的替代品。
- `git diff --check`：本节点已执行成功，用于检查补丁空白错误。
- `bash scripts/ci-tests.sh`：下游可按确定顺序执行 typecheck、test、build。
- 浏览器可见行为、视觉、窄屏溢出、键盘与辅助技术证据必须单独运行 frontend-test；shell build 不证明渲染行为。

## Mock/API 边界

本实现采用 `mockApi.strategy: not-needed`：真实请求路径保持默认，未新增 Mock、endpoint 或测试框架。planner 与 journal 通过现有显式依赖和独立 localStorage key 协作；本地快照证据不等同于真实后端集成证据。

## 非目标

不修改后端 API、认证、DTO、数据库、新路由、router、archive、exporter、package、lockfile 或 scripts；不实现多会话历史、跨设备同步、通知和自动归档。
