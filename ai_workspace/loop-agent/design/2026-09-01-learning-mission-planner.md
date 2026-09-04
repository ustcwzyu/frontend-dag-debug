# 复杂前端需求：学习任务规划中心

## 1. 背景与目标

「Agent 学习实验室」已经提供课程、进度、学习会话工作台、实验归档和导出中心，但学习者还缺少一个把未来练习拆成可执行任务、安排优先级并形成短期专注队列的入口。

本需求新增纯前端页面 `#/planner`（导航文案「计划」），让学习者在不登录、后端不可用时也能维护学习任务，并从中选出最多三项作为当前专注队列。该切片用于验证 loop-agent 的 `frontend-implementation` 契约、侦察、设计审查、受界 writer、修复与验证闭环。

## Scope

- 在现有 hash 路由中新增 `#/planner` 与主导航「计划」。
- 新增纯前端学习任务 CRUD、搜索、三轴筛选、排序、汇总与三项专注队列。
- 使用独立 localStorage key 持久化，并提供解析失败、隐私模式和配额错误降级。
- 复用现有视觉语言，覆盖键盘、动态状态和 390px 响应式行为。
- 新增 Node 原生测试并保持全量测试、类型检查、生产构建与治理检查通过。

## Acceptance Criteria

- AC-PLN-001: `#/planner` 精确解析为 planner 页面，主导航「计划」显示当前页语义；`#/planner/` 保持 404，既有路由与登录重定向不回归。
- AC-PLN-002: 页面以「学习任务规划中心」为可访问标题，明确本机存储；创建表单覆盖标题、路线、优先级、状态、预计用时、截止日期与备注，所有按钮类型明确。
- AC-PLN-003: 标题 trim 后限制 1–80 字符、备注限制 0–300 字符、截止日期为空或合法日历日期；非法提交保留输入并显示可访问错误，合法提交新增任务、清空表单并更新状态消息。
- AC-PLN-004: 任务可编辑、取消编辑、显式流转 `backlog | active | done` 和确认删除；编辑保持 `id`/`createdAt`，完成或删除任务时从专注队列移除，取消删除不改变数据。
- AC-PLN-005: 搜索覆盖标题与备注且忽略大小写；路线、状态、优先级可组合筛选；排序支持截止日期、优先级、更新时间及升降序，空截止日期始终在末尾；清除筛选不修改数据。
- AC-PLN-006: 空数据与无匹配分别显示「还没有学习任务」和「没有符合当前条件的任务」，汇总实时展示总数、三种状态计数与未完成预计分钟数，视图筛选不改变汇总。
- AC-PLN-007: 专注队列最多包含三个不重复、非完成任务，支持加入、移出、上移、下移和边界禁用；队列满时其他加入按钮禁用，并实时计算预计总时长。
- AC-PLN-008: 持久化载荷使用 `schemaVersion: 1`、`missions`、`focusQueueIds`；加载时拒绝非法任务，清除重复/失效/已完成队列 ID 并截断前三项，所有纯函数不修改输入。
- AC-PLN-009: 唯一新增存储 key 为 `frontend-dag-debug:planner`；localStorage 访问集中在 `src/planner.ts` 且 try/catch 降级，重置仅清除 planner key，不读写 journal、archive、export-history、auth 或 tasks key。
- AC-PLN-010: 页面在存储不可用时继续工作并显示「本地计划存储不可用，本次修改仅在当前页面保留」；本需求不新增网络请求、后端端点、登录依赖、依赖包或跨页面存储迁移。
- AC-PLN-011: 键盘可到达全部操作，动态状态和选择/禁用状态具有可访问语义；desktop 双栏、480px 以下单栏、390px 无页面级横向滚动；复用现有 token，不新增渐变、外部字体或 `@keyframes`。
- AC-PLN-012: writer 只修改 `src/planner.ts`、`src/main.ts`、`src/router.ts`、`src/style.css`、`test/frontend-planner.test.mjs`、`test/frontend-router.test.mjs`、`package.json`、`README.md`；禁止修改后端、锁文件、治理与现有 journal/archive/exporter 实现和测试。
- AC-PLN-013: `test/frontend-planner.test.mjs` 覆盖校验、搜索、组合筛选、排序、汇总、队列归一化/移动/上限、CRUD 纯函数、存储降级及静态集成契约；`npm test`、`npm run typecheck`、`npm run build` 和治理检查通过。
- AC-PLN-014: `src/main.ts` 继续无 `fetch`/`localStorage` 字面量，`src/router.ts` 继续零本地依赖/DOM/网络/存储；不恢复任务看板或 `openspec/task-board-refresh.md` 约束的「刷新列表」。

## 2. 范围

### 2.1 页面与模块

- 新增 `src/planner.ts`，集中负责数据模型、校验、纯函数、localStorage 读写和页面交互。
- 在 `src/router.ts` 增加 `#/planner` 的精确 hash 路由；`#/planner/` 继续进入 404。
- 在 `src/main.ts` 增加主导航入口、页面语义骨架、挂载与重复渲染接线。
- 在 `src/style.css` 增加 `planner-*` 样式，复用现有颜色、按钮、表单、卡片、焦点和响应式语言。
- 新增 `test/frontend-planner.test.mjs`，并登记到 `package.json` 的现有 Node test 入口。
- 更新根 `README.md` 的项目能力与测试说明。

### 2.2 数据模型

`LearningMission` 至少包含：

- `id`：稳定、非空字符串。
- `title`：trim 后 1–80 字符。
- `route`：`beginner | builder | advanced`。
- `priority`：`high | medium | low`。
- `status`：`backlog | active | done`。
- `estimateMinutes`：`15 | 30 | 45 | 60 | 90`。
- `dueDate`：空或合法 `YYYY-MM-DD` 日历日期。
- `notes`：0–300 字符。
- `createdAt`、`updatedAt`：ISO 时间字符串。

持久化载荷为 `schemaVersion: 1`、`missions`、`focusQueueIds`。队列最多三个不重复 ID，只能指向非 `done` 的有效任务。

## 3. 功能需求

### REQ-PLN-001 路由与页面身份

- `#/planner` 精确解析为 `planner` 页面，主导航「计划」在该页带 `aria-current="page"`。
- 页面使用 `aria-labelledby`，可见标题为「学习任务规划中心」，说明文案明确数据只保存在本机。
- 未知路由与现有登录重定向行为保持不变。

### REQ-PLN-002 创建与校验

- 创建表单包含标题、路线、优先级、状态、预计用时、截止日期和备注。
- 所有按钮显式声明 `type="button"` 或 `type="submit"`。
- 校验失败时不清空输入，错误摘要以可访问方式展示；至少覆盖标题空/超长、日期非法、备注超长。
- 创建成功后写入任务、清空表单并显示非阻塞状态消息。

### REQ-PLN-003 编辑、状态流转与删除

- 每条任务可进入编辑模式；表单回填当前值，提交后保持原 `id`/`createdAt`，刷新 `updatedAt`。
- 编辑模式可取消并恢复创建态，不修改原任务。
- 任务状态可在 `backlog → active → done` 间显式选择；变为 `done` 时自动移出专注队列。
- 删除必须经 `window.confirm`；确认删除后同步移除对应队列 ID，取消则保持数据不变。

### REQ-PLN-004 搜索、筛选、排序与空态

- 搜索对标题与备注做 trim 后、不区分大小写的包含匹配。
- 路线、状态、优先级三个筛选轴可独立或组合使用，`all` 表示不限制。
- 排序支持 `dueDate`、`priority`、`updatedAt`，同字段再次选择时切换升/降序；空截止日期始终排在末尾。
- 无任何任务时显示「还没有学习任务」；有任务但无匹配时显示「没有符合当前条件的任务」。
- 清除筛选恢复完整列表，但不修改任务或专注队列。

### REQ-PLN-005 三项专注队列

- 非完成任务可加入专注队列；重复任务、已完成任务或队列已满时加入按钮禁用并提供可理解状态。
- 队列按顺序展示 1–3 项，支持上移、下移和移出；边界位置按钮正确禁用。
- 队列显示预计总时长；任务被编辑时总时长实时更新。
- 加载持久化数据时清除重复、失效或已完成的队列 ID，并截断为前三项。

### REQ-PLN-006 汇总与状态一致性

- 汇总区实时展示总任务数、待规划数、进行中数、已完成数，以及未完成任务预计总分钟数。
- 搜索、筛选和排序只影响列表视图，不影响汇总口径。
- 所有纯函数都返回新数组/对象，不修改调用方输入。

### REQ-PLN-007 本地持久化与隔离

- 唯一新存储 key 为 `frontend-dag-debug:planner`，所有 localStorage 访问集中在 `src/planner.ts` 并使用 `try/catch`。
- 解析失败、形状不合法、隐私模式或配额错误不得抛出到页面；页面显示「本地计划存储不可用，本次修改仅在当前页面保留」。
- 重置动作只清除 planner key；不得读写 journal、archive、export-history、auth 或 tasks key。
- 本需求不新增网络请求、后端端点、登录依赖或跨页面存储迁移。

### REQ-PLN-008 可访问性与响应式

- 键盘可到达表单、筛选、排序、任务操作与队列操作；交互控件有稳定可访问名称。
- 动态状态区使用合适的 `aria-live`，筛选/排序选择态使用原生表单语义或 `aria-pressed`。
- desktop 使用列表与专注队列双栏布局；宽度不超过 480px 时收敛为单栏，390px 视口不得出现页面级横向滚动。
- 复用现有设计 token；不得新增渐变、外部字体或 `@keyframes`，并保留 `prefers-reduced-motion` 行为。

### REQ-PLN-009 集成不变量

- `src/main.ts` 继续不出现 `fetch` 或 `localStorage` 字面量。
- `src/router.ts` 继续保持零本地依赖、零 DOM、零网络、零存储。
- 现有首页、课程、进度、登录、归档、导出及 404 行为不回归。
- 不新增依赖，不修改后端、API、数据库、Vite/TypeScript 配置或现有存储契约。
- `openspec/task-board-refresh.md` 仅适用于已下线的任务看板刷新交互，本需求不得借此恢复任务看板或「刷新列表」。

### REQ-PLN-010 测试与文档

- `test/frontend-planner.test.mjs` 使用 Node 原生测试和 TS type-stripping，覆盖数据校验、搜索、组合筛选、稳定排序、汇总、队列归一化/移动/限制、创建/编辑/删除相关纯函数以及存储降级。
- 静态契约断言覆盖路由、导航、挂载、可访问文案、localStorage 隔离、响应式样式、无新增动画和 package test 登记。
- 现有全量测试、类型检查和生产构建均必须通过。
- README 说明计划中心的能力、独立存储 key 与验证入口。

## 4. UI 状态

| 状态 ID | 触发 | 可观察结果 |
| --- | --- | --- |
| `planner-empty` | 首次进入且无数据 | 显示「还没有学习任务」与创建表单 |
| `planner-create-invalid` | 提交非法字段 | 保留输入并显示错误摘要 |
| `planner-populated` | 至少一条任务 | 列表、汇总和任务操作同步显示 |
| `planner-no-results` | 筛选后无匹配 | 显示「没有符合当前条件的任务」 |
| `planner-editing` | 点击编辑 | 表单回填、标题切换为编辑语义、可取消 |
| `planner-focus-full` | 队列已有三项 | 其他加入按钮禁用，队列总时长可见 |
| `planner-storage-unavailable` | localStorage 抛错或不可用 | 页面继续工作并显示降级提示 |

## 5. 非目标

- 不实现拖拽排序、日历组件、提醒通知、云同步或跨设备同步。
- 不改动后端 API、认证模型、学习进度 DTO 或数据库。
- 不把归档记录自动转成任务，不改变导出字段。
- 不生成 Playwright/E2E 测试，不把浏览器验收伪装为本轮 shell 完成证据。
- 不重构现有 archive、exporter、journal 模块。

## 6. 写入边界

允许实现 writer 修改：

- `src/planner.ts`
- `src/main.ts`
- `src/router.ts`
- `src/style.css`
- `test/frontend-planner.test.mjs`
- `test/frontend-router.test.mjs`
- `package.json`
- `README.md`

禁止修改：`.harness/**`（仅 controller 自己维护运行事实）、`server/**`、`public/**`、`dist/**`、`package-lock.json`、`scripts/**`、`ai_workspace/**`、`.agents/**`、现有 archive/exporter/journal 实现与测试文件。

## 7. 验证

- `npm test`
- `npm run typecheck`
- `npm run build`
- `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh`（仅 DAG 活动期间）
- run 归档后再次执行 `bash scripts/check-repo.sh`

本任务的 shell 验证只证明源码契约、类型、测试和构建；若需要声明真实浏览器渲染与 390px 视觉行为，必须在 DAG 收口后另补浏览器验收证据。
