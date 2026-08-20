# 前端任务需求模板

本模板只承载**通用编写协议 + 三要素 + fail-closed 规则**，不包含任何具体业务组件名、项目专属路径或项目专属命令。填写时每一节都要给出「**要写什么** / **DAG 如何消费** / **缺失/冲突时 fail-closed**」三要素；缺节、空占位或与验收标准冲突时必须阻塞，不得由模型猜测补写。

## 用户目标

- **要写什么**：以用户视角写清本次要交付的前端行为与用户价值——用户能完成什么、为什么需要它、成功后的可观察结果。必须可验证（可被界面状态或交互断言覆盖），不得只写技术动作或孤立关键词。
- **DAG 如何消费**：`frontend-contract-pi` 把它映射为 Scope 与 `requirements[].expectedOutcome`，`frontend-plan-pi` 据它安排实现步骤并映射验收标准。
- **缺失/冲突时 fail-closed**：缺失用户目标，或用户目标与验收标准互相矛盾时阻塞（`request-revision`/blocked），不得猜测补写或改写为技术实现描述。

## 目标页面/组件/路由

- **要写什么**：明确本次交付涉及的目标路由、页面入口与组件范围，逐条列出路径/名称与职责边界；相关但超出范围的页面写清「不做」。
- **DAG 如何消费**：对齐 `docs/runtime/frontend-implementation-workflow.md` §「需求.md 应包含」的「目标路由/页面/组件」，`frontend-contract-pi` 据它确定 `targets.files` / `targets.routes`，`frontend-plan-pi` 据它划定 writeSet 与实现步骤。
- **缺失/冲突时 fail-closed**：无法确定目标路由/页面/组件，或范围与验收标准不一致时阻塞；只写泛化名词（如「页面」「组件」）而不给具体范围视为缺失。

## 用户流程

- **要写什么**：写清端到端用户路径，从入口到结果，逐步列出触发动作、顺序与关键分支；涉及多页面/多状态时把每条路径分开写。
- **DAG 如何消费**：`frontend-contract-pi` 据它抽取 `interactions[]`（每条带 `trigger` 与 `expectedBehavior`），`frontend-plan-pi` 据它安排组件/状态/交互实现步骤。
- **缺失/冲突时 fail-closed**：缺少可执行的端到端路径、流程与验收标准冲突或关键分支未写时阻塞，不得只写「用户进入页面即可」。

## 必须状态

每个适用状态必须写清该状态的触发条件与预期界面表现；不适用状态必须写 `N/A` 并给出非空理由（对齐 runtime 的 `uiStates` / N/A state 规则）。

### loading

- **要写什么**：loading 状态出现与结束的触发条件、展示内容（骨架/文案/禁用交互）与超时/失败转移。
- **DAG 如何消费**：进入 implementation contract 的 `uiStates[]`（`name: "loading"`），`frontend-implement-pi` 按它实现，verify 用它的 `verificationTargetIds` 断言。
- **缺失/冲突时 fail-closed**：适用但缺失预期行为时阻塞；不适用必须写 `N/A` 并给非空理由，只写 `N/A` 不带理由同样阻塞。

### empty

- **要写什么**：无数据/无结果状态的触发条件与展示（空态文案/引导动作/是否可刷新）。
- **DAG 如何消费**：进入 `uiStates[]`（`name: "empty"`），verify 断言空态展示与引导。
- **缺失/冲突时 fail-closed**：适用但缺失预期行为、或与 success/error 展示冲突时阻塞；不适用写 `N/A` + 非空理由。

### error

- **要写什么**：失败状态（请求失败/校验失败/权限失败）的触发条件、错误展示与可恢复动作。
- **DAG 如何消费**：进入 `uiStates[]`（`name: "error"`），verify 断言错误展示与重试/回退行为。
- **缺失/冲突时 fail-closed**：适用但缺失错误预期、或错误态会覆盖用户数据时阻塞；不适用写 `N/A` + 非空理由。

### success

- **要写什么**：成功状态的触发条件与展示（数据呈现/确认反馈/后续入口）。
- **DAG 如何消费**：进入 `uiStates[]`（`name: "success"`），verify 断言成功展示与验收标准对应。
- **缺失/冲突时 fail-closed**：成功态与验收标准不一致、或缺失成功结果时阻塞；不适用写 `N/A` + 非空理由。

### disabled

- **要写什么**：禁用/不可交互状态的触发条件（权限/前置未满足/进行中）与视觉/交互表现。
- **DAG 如何消费**：进入 `uiStates[]`（`name: "disabled"`），verify 断言禁用态不会被误触。
- **缺失/冲突时 fail-closed**：适用但缺失禁用条件、或禁用态与交互要求冲突时阻塞；不适用写 `N/A` + 非空理由。

## 目标运行环境

每个环境必须声明适用性；不适用环境写 `N/A` 并给非空理由。

### desktop

- **要写什么**：desktop 视口下的适用性声明与关键布局/交互差异（断点、栅格、悬停等）。
- **DAG 如何消费**：进入 contract 的 target runtime environment，`frontend-plan-pi` 据它决定响应式范围与样式策略。
- **缺失/冲突时 fail-closed**：适用但缺失断点/布局说明，或与响应式要求冲突时阻塞；不适用写 `N/A` + 非空理由。

### mobile

- **要写什么**：mobile 视口下的适用性声明与触控/布局/安全区差异。
- **DAG 如何消费**：进入 target runtime environment，`frontend-plan-pi` 据它决定响应式范围与组件策略。
- **缺失/冲突时 fail-closed**：适用但缺失移动端表现，或与交互要求冲突时阻塞；不适用写 `N/A` + 非空理由。

### tablet

- **要写什么**：tablet 视口下的适用性声明与中间断点表现。
- **DAG 如何消费**：进入 target runtime environment，`frontend-plan-pi` 据它决定响应式策略。
- **缺失/冲突时 fail-closed**：适用但缺失 tablet 表现时阻塞；不适用写 `N/A` + 非空理由。

## 交互要求

- **要写什么**：逐条写清每个可交互元素的触发动作与预期行为（点击/输入/提交/滚动/键盘等），可被自动化断言覆盖。
- **DAG 如何消费**：对齐 §「需求.md 应包含」的「交互要求」，`frontend-contract-pi` 抽取 `interactions[]`（`trigger` + `expectedBehavior`），verify 用行为命令断言。
- **缺失/冲突时 fail-closed**：交互触发或预期行为缺失、与 UI 状态冲突、或不可自动化断言时阻塞，不得用「用户可正常操作」这类空话。

## 接口与 Mock 输入

- **接口文档/schema — 要写什么**：引用接口文档或任务附件路径与版本，声明请求/响应 schema 来源。**DAG 如何消费**：`frontend-plan-pi` 据此选择 Mock 策略并冻结 endpoint/fixture 映射。**缺失/冲突时 fail-closed**：涉及接口但未引用文档或 schema 时阻塞，不得自行发明字段。
- **endpoint、method、关键请求/响应字段 — 要写什么**：逐条列出 method、path 与关键字段及含义。**DAG 如何消费**：写入 `mockApi.endpoints[]`（method/path/fixture/consumer）。**缺失/冲突时 fail-closed**：字段缺失、与接口文档冲突或路径不合法时阻塞。
- **是否允许依赖真实后端 — 要写什么**：明确声明真实后端当前是否可调用、是否允许生产/预览依赖真实请求。**DAG 如何消费**：决定 `mockApi.strategy` 是否可选 `not-needed`（需要真实/无远程证据）。**缺失/冲突时 fail-closed**：未声明后端就绪度却要求真实数据时阻塞，选 `not-needed` 却没有真实/无远程证据会被拦截。
- **是否要求离线或独立行为验证 — 要写什么**：声明是否需要离线、本地预览或自动化行为验证（或两者都要）。**DAG 如何消费**：决定生成期 `frontendMock.verifyCommands` 与冻结命令集。**缺失/冲突时 fail-closed**：要求离线/自动化却未声明确定性验证命令时，生成期收敛为 `not-needed` 或直接 blocked，plan-revision 无法修复。
- **success/empty/error/permission 状态 — 要写什么**：逐条声明接口各响应状态对应的 UI 表现。**DAG 如何消费**：与「必须状态」交叉校验，写入 `uiStates[]` 与 fixture 映射。**缺失/冲突时 fail-closed**：接口状态与 UI 状态不匹配或缺失 permission 分支时阻塞。
- **后端当前就绪状态与 Real Integration Gap — 要写什么**：写清后端是否就绪、未就绪时保留的 Real Integration Gap 与后端就绪后的复验路径。**DAG 如何消费**：进入 `evidenceGaps[]` 与 closeout 的 `Real integration: pending`。**缺失/冲突时 fail-closed**：声称已联通真实接口却无真实证据时阻塞；未就绪却把 Mock 结果写成真实联调会被 review 拒绝。

## 验收标准

- **要写什么**：逐条编号（如 `AC-001`）写出可独立断言的前端验收标准，每条都能映射到需求与一个 verification target（可逐条追踪）。
- **DAG 如何消费**：`frontend-contract-pi` 生成 `requirements[].verificationTargetIds` 映射，`frontend-plan-pi` 把每条 AC 落到有序步骤与验证命令，verify 逐条断言。
- **缺失/冲突时 fail-closed**：无验收标准、AC 无法映射到需求/验证目标、或 AC 与其它节冲突时阻塞，不得把「看起来能用」当验收。

## 非目标

- **要写什么**：明确列出本次不做的前端范围/排除项（页面、组件、交互、浏览器/视觉/无障碍检查等）。
- **DAG 如何消费**：`frontend-contract-pi` 记录为 Non-goals，`frontend-review-pi` 据它拒绝范围扩散。
- **缺失/冲突时 fail-closed**：非目标与目标/验收标准冲突、或范围被悄悄扩大时阻塞；明确不做前端时也必须写入非目标。
