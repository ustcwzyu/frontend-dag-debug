# 将项目改造为 Agents 学习网站

> 进行中。完成后由 `loop-agent plan complete` 归档到 `ai_workspace/loop-agent/exec-plans/completed/`，运行与验证事实以本次 task / DAG 为准。

## 状态

- active

## 背景

- 当前页面仍是 `hello world`、问候弹窗和本地任务看板的调试组合，缺少统一主题、内容层级与真实学习路径。
- 用户希望把整个前端改造成学习 Agents 相关内容的网站；这是一次用户可见、跨入口/样式/测试/元数据的完整改造，需要受治理前端 DAG。

## 目标（Objective）

- 交付一个中文优先、响应式、无后端依赖的「Agent 学习实验室」单页网站，让有基础开发经验的学习者在 5 分钟内选定入门、构建或进阶路线并开始第一课。
- 以可交互的 Agent 执行轨迹作为页面记忆点，并用真实课程内容覆盖模型、工具、记忆、规划、评估、安全与可观测性。

## 范围（Scope）

- 包含：更新 HTML 元数据、首页结构与交互、完整视觉系统、响应式与可访问性样式、站点 favicon、聚焦行为测试、项目 README 人类维护区。
- 不包含：后端、登录、支付、真实学习进度同步、多页面路由、第三方 API、外部字体或图片服务、部署发布。
- 兼容策略：旧 `src/task-board.ts` 及其独立纯函数测试保留，但不再挂载到新首页；移除测试中“旧首页必须继续显示 hello world / 弹窗 / 任务看板”的回归假设。

## 约束（Constraints）

- 架构/契约约束：保持 Vite + TypeScript 零运行时依赖；业务实现只经 `taskKind=frontend-implementation` 的 DAG writer 写入；不得编辑 `.harness/**`、`ai_workspace/**`、`.agents/**`、`scripts/**` 或 README managed block。
- 视觉约束：雾蓝纸面 + 深海军蓝 + 小面积信号橙；显示字体使用本机 condensed sans fallback，正文使用中文系统字体，数据标签使用 monospace；无渐变、无外部字体；唯一主视觉风险是可交互的“执行轨迹图”。
- 工作区约束：当前仓库有大量初始化与治理迁移的既有 dirty changes，全部视为受保护；仅当前任务明确允许的网页与测试文件可由 writer 触碰。
- 验证约束：TDD 逐行为切片记录 RED → GREEN；必须通过 `npm test`、`npm run typecheck`、`npm run build`；浏览器检查桌面和 390px 移动视口、交互、overflow、console errors、键盘 focus 与 reduced-motion 样式。

## 里程碑（Milestones）

| ID | Milestone | Status | Exit Criteria |
|----|-----------|--------|---------------|
| M1 | 冻结 PRD 与写入边界 | in_progress | task source 完整，明确 REQ/BR/AC 与保护区 |
| M2 | 受治理实现 | todo | frontend DAG writer 完成且 writeSet 无越界 |
| M3 | 硬验证与浏览器验收 | todo | tests/typecheck/build 与桌面/移动浏览器检查有新证据 |
| M4 | 收口与交接 | todo | DAG 终态、文档收敛、plan complete 与剩余风险已记录 |

## 工作分解（Work Breakdown）

| ID | Work Item | Status | Notes |
|----|-----------|--------|-------|
| W1 | 创建可追溯任务源 | in_progress | 会话需求 + 设计契约导入 task references |
| W2 | 审查 frontend DAG writeSet gate | todo | 只允许站点入口、样式、favicon、测试和 README 人类区 |
| W3 | 执行实现与 DAG 内验证 | todo | 不由主会话直接写业务代码 |
| W4 | 独立 shell/browser 验收 | todo | 分层报告硬证据与局限 |

## 验证关口（Verification Gates）

- [ ] 文档/契约已同步
- [ ] 最低必要测试已通过
- [ ] 关键路径已验证
- [ ] 风险与未覆盖项已记录

## 风险 / 阻塞项

- 风险：旧页面功能和测试均未提交；首页替换会有意取消旧调试 UI 的挂载，但保留 `task-board.ts` 源码与独立测试，避免无关删除。
- 风险：仓库存在 2026-07-23 的陈旧 active pending 快照，当前 controller 无法证明 runner 已停止；本次不修改该历史事实，必要时仅对新 run 使用 in-flight 检查豁免，并在交接中单列治理验证影响。
- 阻塞：暂无产品或后端阻塞；若 writeSet gate 触碰保护区则拒绝并重生成。

## 回退 / 恢复（Rollback / Recovery）

- 如何回退：依靠 Git diff 精确回退本 task 的允许路径，不使用 broad reset；不触碰用户的初始化/治理迁移改动。
- 回退后如何恢复基线：重新运行 `npm test`、`npm run typecheck`、`npm run build`，结果应回到本轮记录的 41 tests / typecheck / build 基线。

## Open Questions

- 无需用户先行决策：在未指定品牌、课程深度和多页面结构时，采用“面向有基础开发经验者的单页学习路径选择器”作为可逆默认。

## 推荐下一步

- 创建 `20260810-agents-learning-site`，导入详细 PRD，审查 writeSet gate 后执行。
