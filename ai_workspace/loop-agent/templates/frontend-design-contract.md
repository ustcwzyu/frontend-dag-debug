# 前端设计契约模板

本模板只承载**通用编写协议 + 三要素 + fail-closed 规则**，不包含任何具体业务组件名、项目专属路径或项目专属命令。设计契约在进入实现前由 `frontend-plan-pi` 落入结构化 implementation contract，`frontend-design-review-pi` 按本模板逐节审查；每一节都要给出「**要写什么** / **DAG 如何消费** / **缺失/冲突时 fail-closed**」三要素。

## 页面目标

- **要写什么**：写清每个目标页面的职责、用户到达该页面的目的与成功结果，逐页列出，与需求.md 的用户目标/目标页面一一对应。
- **DAG 如何消费**：`frontend-plan-pi` 据它确定 `targets.routes` 与每页的实现步骤，`frontend-design-review-pi` 据它核对范围与需求一致性。
- **缺失/冲突时 fail-closed**：页面目标与需求不一致、缺页或目标含糊（无成功结果）时阻塞，不得自行补页或改目标。

## 信息结构

- **要写什么**：写清每页展示的信息层级与数据来源（字段、分组、优先级、空/错误占位），接口数据与静态文案分开写。
- **DAG 如何消费**：`frontend-plan-pi` 据它安排组件数据流与状态展示，`frontend-design-review-pi` 据它核对接口字段映射。
- **缺失/冲突时 fail-closed**：信息层级缺失、数据来源不可追溯、与接口字段冲突时阻塞，不得臆造字段或层级。

## 组件拆分

- **要写什么**：把页面拆成组件树，逐组件写职责、复用边界、props/状态归属与可替换点；复用现有设计系统组件时引用其来源路径。
- **DAG 如何消费**：`frontend-plan-pi` 据它确定 `targets.files` 与实现顺序，`frontend-design-review-pi` 据它审查拆分是否越界/重复。
- **缺失/冲突时 fail-closed**：组件边界不清、同一职责被拆到多处、或与设计规范冲突时阻塞，不得按邻近代码自行决定复用。

## 交互规则

- **要写什么**：逐条写清每个交互的触发、预期行为、状态变化与可恢复性（对应需求.md 的交互要求）。
- **DAG 如何消费**：`frontend-plan-pi` 据它填充 `interactions[]`（`trigger` + `expectedBehavior`），verify 用行为命令断言。
- **缺失/冲突时 fail-closed**：交互无预期行为、与 UI 状态冲突、或不可自动化断言时阻塞。

## UI 状态

- **要写什么**：逐状态（loading/empty/error/success/disabled）写清触发条件、展示内容与转移；不适用状态写 `N/A` + 非空理由。
- **DAG 如何消费**：进入 implementation contract 的 `uiStates[]`，verify 逐状态断言，`frontend-review-pi` 据它核对实现是否遗漏状态。
- **缺失/冲突时 fail-closed**：适用状态缺失预期、N/A 无理由、或状态展示与交互/接口状态冲突时阻塞。

## Mock / API 策略

策略枚举固定为 `native | browser-intercept | request-adapter | not-needed | blocked`，与 runtime Mock 语义一致：`blocked` 永远不通过（缺少/冲突接口契约、路径或依赖未授权、无法证明生产默认关闭、固定验证入口无法覆盖、或唯一方案是注释真实请求时必须选它）；`not-needed` 必须有后端可用或任务不涉及远程接口的真实/无远程证据，且固定 behavior 入口能覆盖相应行为；显式 `policy=required` 不接受 `not-needed`。契约只接受当前 policy 允许的非 `blocked` 首行。

- **接口文档或 schema — 要写什么**：引用接口文档/schema 路径与版本，作为 fixture 与字段映射的唯一来源。**DAG 如何消费**：`frontend-plan-pi` 据它冻结 endpoint/fixture 映射，prewrite gate 校验 fixture 可追溯。**缺失/冲突时 fail-closed**：无文档/schema、字段冲突时选 `blocked`，不得自行发明接口。
- **策略**：只写枚举中的一个值：`native | browser-intercept | request-adapter | not-needed | blocked`。
- **endpoint / fixture / UI 状态映射 — 要写什么**：逐 endpoint 列 method、path、fixture 路径与消费组件，并映射到 UI 状态。**DAG 如何消费**：写入 `mockApi.endpoints[]`（method/path/fixture/consumer），非 `not-needed` 策略要求每个 endpoint 都有 fixture 与 consumer。**缺失/冲突时 fail-closed**：非 `not-needed` 却缺 fixture/consumer、endpoint 与 UI 状态映射不一致时阻塞。
- **显式启用方式与 production 默认关闭边界 — 要写什么**：写清真实请求为默认路径、Mock 仅通过显式开关（环境变量/构建开关）启用的具体边界。**DAG 如何消费**：`productionDefaultOff` 恒为 `true`，`frontend-review-pi` 检查是否注释真实请求或默认开启 Mock。**缺失/冲突时 fail-closed**：无法证明生产默认关闭、或 Mock 会进入生产入口时选 `blocked`。
- **DAG 已固化的验证入口 — 要写什么**：引用 DAG 生成时已冻结的 static/behavior/Mock 命令 label，不发明新命令。**DAG 如何消费**：`verificationTarget.commandLabel` 必须逐字落在冻结命令集合内，否则 contract 物化 `invalid-output`。**缺失/冲突时 fail-closed**：策略需要 Mock 验证命令却没有冻结命令时生成期 fail-closed（`no authorized Mock verification commands`）。
- **Real Integration Gap 与后端就绪后的复验 — 要写什么**：写清当前未联通的真实集成缺口，以及后端就绪后的复验路径。**DAG 如何消费**：进入 `evidenceGaps[]`，closeout 报告 `Real integration: pending`，复验任务 `<task-id>-real-api-integration-verify` 由操作者显式触发。**缺失/冲突时 fail-closed**：把 Mock 证据当真实联调证据时 review 拒绝。

## 样式与设计系统映射

- **要写什么**：写清页面用到的主题/Token、设计系统组件与样式来源（引用具体来源路径），自定义样式与复用样式的边界。
- **DAG 如何消费**：`frontend-plan-pi` 据它安排样式实现，`frontend-design-review-pi` 据它核对是否与设计系统冲突。
- **缺失/冲突时 fail-closed**：样式来源缺失、Token/组件冲突、或自定义样式会破坏设计系统时阻塞。

## 响应式范围

- **要写什么**：写清支持的视口范围（desktop/mobile/tablet）与断点、每个断点下的布局差异。
- **DAG 如何消费**：进入 contract 的 target runtime environment，`frontend-plan-pi` 据它决定响应式策略。
- **缺失/冲突时 fail-closed**：视口范围与需求运行环境不一致、或断点未覆盖声明环境时阻塞。

## 风险与非目标

- **要写什么**：写清设计上的已知风险、依赖缺口与明确不做/排除的设计范围。
- **DAG 如何消费**：进入 `evidenceGaps[]` 与 Non-goals，`frontend-review-pi`/closeout 据它保留风险与后续项。
- **缺失/冲突时 fail-closed**：范围与需求非目标冲突、或风险被隐藏时阻塞。

## OpenSpec 引用块（openspec-citations）

- **要写什么**：在 fenced `json` 契约块之后追加**恰好一个** fenced `openspec-citations` 块，每行一个 JSON `{"path","section","line"}`（`section` 可空串、`line` 为 int 或 null），逐条列出本计划实际读取并应用的每个 openspec 规范文件。
- **DAG 如何消费**：`frontend-prewrite-gate-shell` 按 fence 语言标签解析该块，并与生效 plan/review 节点的成功 read 事件核验；`cited` 模式下候选未引用 → `openspec-not-cited`，引用无 read 背书 → `openspec-citation-not-read`，块缺失/不可解析 → `openspec-citation-block-unparseable`。
- **缺失/冲突时 fail-closed**：候选非空而引用块缺失/不可解析、候选未引用、或引用未真实读取时，prewrite gate 以 `retryable-invalid` fail-closed；不要引用未读取的路径，也不要遗漏已读取的 openspec 文件。
