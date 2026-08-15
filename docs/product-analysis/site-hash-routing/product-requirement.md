---
artifact_version: "3.0"
artifact_type: product-requirement
requirement_id: site-hash-routing
project_root: ../../..
requirement_status: complete
analysis_scope: frontend
source_requirement: ./source-requirement.md
source_product_analysis: ./product-analysis.md
source_clarification: ./requirement-clarification.md
---

# 产品需求：单页站点拆分为多路由页面

## 1. 需求概述

将 Agent 学习实验室单页 SPA（hero、路线选择、第一课课程区、能力地图、本周实验、进度面板、学习会话工作台堆叠于一个页面）拆分为四个 Hash 路由页面：登录页 `#/login`、主页 `#/`、课程页 `#/lesson/:routeId`、进度页 `#/progress`，外加未知 hash 的 404 兜底页。路由零依赖（新建 src/router.ts 纯前端模块），内容数据跨页共享，登录态与工作台草稿跨页保持。重构 src/main.ts 渲染结构，接受现有测试源断言随结构更新（DEC-SR-003），但架构裁决断言保持绿色。

## 2. 业务目标

- 解决单页拥挤：页面按职责拆分，每页内容聚焦。
- 路由零依赖：纯 hash 方案，无新依赖、无 server 改动、无 vite 配置改动。
- 状态跨页保持：登录态（auth）、工作台草稿（journal localStorage）、课程内容（模块级缓存）在页面切换后不丢失。
- 验证前端实现工作流（frontend-implementation 任务类型）第二轮全链路。

## 3. 需求范围

### 3.1 已确认需求

- Hash 路由（DEC-SR-001）：`#/` 主页、`#/lesson/beginner|builder|advanced` 课程页、`#/progress` 进度页、`#/login` 登录页；未知 hash → 404 兜底（提示 + 返回主页链接）。
- 页面划分（DEC-SR-002）：主页 = hero + route-picker + capability-map + weekly-lab + footer；课程页 = first-lesson-beginner 课程区 + footer（builder/advanced 空锚点占位 + 内容筹备中提示）；进度页 = progress-panel + journal-workbench + footer；登录页 = auth-form（登录/注册切换）+ footer。
- 导航：header 内新增主导航（主页 / 课程 / 进度 / 登录）驱动 hash 切换；hero CTA 与路线选择跳转对应路由；当前页高亮。
- 测试更新（DEC-SR-003）：homepage.test.mjs / frontend-api.test.mjs 中锚定单页结构的断言随新结构更新（lessonRegion 切片改为新锚点；progress-panel/auth-form 断言按新页面归属调整）；架构裁决断言保持。
- 架构裁决保持（不因路由化放宽）：main.ts 不得含 fetch(/localStorage/XMLHttpRequest/location.reload 字面量（网络收敛 api.ts、存储收敛 auth.ts/journal.ts）；课程区源码区间（first-lesson-beginner 内）无 button/details/input/select/textarea/checkbox/aria-live；课程重渲染用 getElementById('first-lesson-beginner') 且不得 querySelector(...first-lesson-beginner)；style.css 恰 1 处 @keyframes（trace-travel）；README 断言子串与 LOOP_AGENT_INIT 块保持。

### 3.2 非目标

- 不改后端：无新端点、不改 server/**、不改 src/api.ts / src/auth.ts / src/task-board.ts / src/types.ts / src/journal.ts。
- 不引入路由库或新依赖；不改 vite.config.ts / tsconfig.json / package.json（除必要测试命令外）。
- 不做懒加载/代码分割、不预渲染、不做多语言、不做 URL 深度链接到课程内锚点（如 #/lesson/beginner#section-02 语义保持简单）。
- 不改变课程内容、能力地图、本周实验、进度面板、工作台的既有功能语义。

### 3.3 默认假设

- 课程内容跨页共享：loadCourseContent 首次成功加载后模块级缓存；页面切换不重复 fetch；加载失败降级横幅在任意页面可见。
- 已登录访问 #/login → 跳转 #/progress；未登录访问 #/progress → 显示请先登录提示与链接。
- 未知 hash 不重定向，直接渲染 404 兜底（地址栏保留用户输入）。
- 路由切换不触发页面刷新（hashchange 仅重渲染 #app 内视图）。
- 课程页 builder/advanced：内容筹备中提示，同时保留空锚点 span（first-lesson-anchor）以维持既有断言语义。

### 3.4 未决事项

无。

## 4. 业务规则

- 路由解析（BR-RT-001）：parseHash 纯函数将 `location.hash` 映射为 {page, routeId}；`#/`、空 hash、`#` → 主页；`#/lesson/:id`（id ∈ beginner|builder|advanced）→ 课程页；`#/progress` → 进度页；`#/login` → 登录页；其余 → 404。
- 页面渲染（BR-RT-002）：hashchange 与首次加载时按路由渲染对应视图到 #app；视图渲染幂等（重复渲染同一路由不累积事件监听）。
- 导航高亮（BR-RT-003）：当前路由对应导航项带 active 状态；404 无对应导航项。
- 登录重定向（BR-RT-004）：已登录（loadSession() 非空）访问 #/login → navigate('#/progress')。
- 未登录访问 #/progress（BR-RT-005）：进度页渲染"请先登录"提示与 #/login 链接；不强制跳转。
- 内容缓存（BR-RT-006）：loadServerContent 成功结果缓存于模块级变量，后续页面渲染直接读缓存；失败仅显示横幅，不缓存。
- 状态保持（BR-RT-007）：路由切换不调用 clearSession、不重置工作台草稿；journal 工作台在进度页渲染时按需初始化/复用。

## 5. 决策追溯

| 决策 | 内容 | 定位 |
|---|---|---|
| DEC-SR-001 | Hash 路由，零依赖 | §3.1、BR-RT-001、FE-US-001 |
| DEC-SR-002 | 四页：登录/主页/课程/进度 | §3.1、FE-US-001~004 |
| DEC-SR-003 | 接受测试更新，架构裁决保持 | §3.1、AC-FE-008/009/010 |

## 6. 前端用户故事

### FE-US-001 主页总览

- 角色：所有访问者
- 目标：从主页快速了解站点并进入课程/进度
- 价值：首屏聚焦导航与概览，不被课程长文淹没
- 入口：`#/`（默认路由）
- 验收标准：AC-FE-001、AC-FE-002、AC-FE-003

### FE-US-002 课程阅读页

- 角色：学习第一课的用户
- 目标：专注阅读第一课完整内容
- 价值：课程区独占一页，阅读不被打断
- 入口：`#/lesson/beginner`（主页路线选择 / hero CTA 跳转）
- 验收标准：AC-FE-004、AC-FE-005、AC-FE-006

### FE-US-003 登录与进度管理页

- 角色：需要同步进度的用户
- 目标：独立登录页注册/登录；独立进度页管理进度与工作台
- 价值：认证与进度管理分离，交互清晰
- 入口：`#/login`、`#/progress`
- 验收标准：AC-FE-007、AC-FE-008、AC-FE-009

### FE-US-004 未知地址兜底与状态保持

- 角色：所有访问者
- 目标：未知 hash 不白屏；切换页面不丢状态
- 价值：稳健性（不白屏）与连续性（登录态/草稿保持）
- 入口：任意未知 hash、任意页面切换
- 验收标准：AC-FE-010、AC-FE-011、AC-FE-012

## 7. 前端输出规范

### FE-US-001 主页总览

- 页面/路由：`#/`
- 展示内容：site-header（含主导航）、hero（含 CTA 按钮）、route-picker（路线选择器）、capability-map、weekly-lab、footer
- 交互动作：导航链接点击切换路由；hero CTA 跳转课程页；路线选择跳转对应课程页
- UI 状态：主页导航项高亮；CTA 与路线选择指向 `#/lesson/beginner`
- 边界处理：内容加载失败显示降级横幅，其余仍渲染

#### AC-FE-001 默认进入主页

Given：
- 用户打开站点（无 hash / 空 hash）。

When：
- 页面加载完成。

Then：
- 渲染主页视图：header（含导航）、hero、route-picker、capability-map、weekly-lab、footer。
- 导航包含主页/课程/进度/登录四个入口，其中主页项处于 active 状态。
- 主页不含第一课课程区（first-lesson-beginner）与进度面板、登录表单。

异常场景：
- 浏览器不支持 hash 变化（极旧环境）时仍展示主页兜底内容，不白屏。

#### AC-FE-002 主页导航到课程页

Given：
- 用户处于主页。

When：
- 点击 hero CTA「开始入门路线」或路线选择器任一路线入口。

Then：
- 地址 hash 变为 `#/lesson/<routeId>`（beginner/builder/advanced 对应）。
- 视图切换为课程页，主页导航项失去 active。

异常场景：
- 点击非 beginner 路线（builder/advanced）进入对应课程页显示"内容筹备中"提示，不白屏。

#### AC-FE-003 主页展示既有内容与降级横幅

Given：
- 主页渲染完成（内容加载成功或失败）。

Then：
- 能力地图（六类能力）、本周实验（研究助手）内容与当前一致。
- 内容加载失败时显示"服务不可用：课程内容以本地缓存展示，进度保存暂不可用"横幅；成功时横幅隐藏。

### FE-US-002 课程阅读页

- 页面/路由：`#/lesson/:routeId`
- 展示内容：site-header、first-lesson-beginner 完整课程区（01–06 章节、五模板、八步闭环、10 分量表、自测题）、footer；builder/advanced 空锚点占位 + 内容筹备中
- 交互动作：导航切换；页内无新增交互（课程区保持纯净）
- UI 状态：课程页导航项高亮
- 边界处理：内容加载失败显示横幅 + 本地兜底课程区

#### AC-FE-004 课程页完整渲染第一课

Given：
- 用户访问 `#/lesson/beginner`。

When：
- 页面加载完成（服务端内容可用或降级本地兜底）。

Then：
- 渲染第一课完整课程区（id=first-lesson-beginner）：01 课程定位至 06 评估六章节、五份模板 `<pre><code>`、八步闭环列表、10 分量表、四道自测题、复盘。
- 课程区源码区间内无 button/details/input/select/textarea/checkbox/aria-live 交互控件（架构裁决保持）。

异常场景：
- 服务端课程内容加载失败：渲染本地兜底课程区（与现状内联 HTML 一致），同时显示降级横幅。

#### AC-FE-005 课程页 builder/advanced 占位

Given：
- 用户访问 `#/lesson/builder` 或 `#/lesson/advanced`。

Then：
- 页面显示"内容筹备中"提示与返回主页链接。
- 保留空锚点 span（class=first-lesson-anchor，id=first-lesson-builder/advanced），不渲染为 section。

#### AC-FE-006 课程重渲染走 getElementById

Given：
- 课程页渲染（含服务端内容替换本地兜底）。

Then：
- 重渲染路径使用 `getElementById('first-lesson-beginner')` 定位课程区。
- main.ts 不出现 `querySelector(?:All)?\([^)]*first-lesson-beginner` 调用。

### FE-US-003 登录与进度管理页

- 页面/路由：`#/login`、`#/progress`
- 展示内容：登录页 = auth-form（用户名/密码、登录/注册切换、错误提示）+ footer；进度页 = progress-panel（进度表单：第一课完成、0–10 自评、本周实验）+ journal-workbench + footer
- 交互动作：登录/注册提交；进度保存；工作台操作；导航切换
- UI 状态：登录页导航高亮（登录项）；进度页导航高亮（进度项）；已登录访问 #/login → 跳转进度页
- 边界处理：未登录访问 #/progress → 请先登录提示 + 链接

#### AC-FE-007 登录页注册与登录

Given：
- 用户访问 `#/login`（未登录）。

When：
- 输入用户名/密码并提交（注册或登录模式）。

Then：
- 调用 register/login（经 api.ts），成功后保存会话（saveSession）并跳转 `#/progress`。
- 失败时在登录页显示错误提示，不跳转、不刷新页面。

异常场景：
- 用户名重复（409）或密码错误（401）：错误信息展示于 auth-error，表单保留已填内容。

#### AC-FE-008 登录页重定向与进度页鉴权提示

Given：
- 已登录用户访问 `#/login`：自动跳转 `#/progress`。
- 未登录用户访问 `#/progress`：渲染"请先登录"提示与 `#/login` 链接，不强制跳转。

Then：
- 两种场景均不白屏、不刷新页面。

#### AC-FE-009 进度页保存进度与工作台

Given：
- 用户处于进度页（已登录）。

When：
- 修改进度表单（第一课完成/自评/本周实验）并保存，或操作学习会话工作台。

Then：
- 保存成功展示"已保存：时间"；失败展示"保存失败，已保留当前填写内容"。
- 工作台（八步/模板/自评/计时/摘要）正常渲染与操作，草稿存取仍走 journal 模块。
- 退出登录后进度表单与工作台回到未登录态。

### FE-US-004 未知地址兜底与状态保持

- 页面/路由：未知 hash
- 展示内容：404 提示 + 返回主页链接 + footer
- 交互动作：返回主页链接
- UI 状态：无导航高亮
- 边界处理：地址栏保留用户输入 hash

#### AC-FE-010 未知 hash 显示 404 兜底

Given：
- 用户访问任意未知 hash（如 `#/nonsense`、`#/lesson/unknown`）。

Then：
- 渲染 404 兜底页：提示"页面不存在"与返回主页链接。
- 地址栏 hash 保持用户输入不变，不自动重定向。

#### AC-FE-011 页面切换保持登录态与草稿

Given：
- 用户已登录且工作台有草稿。

When：
- 在主页/课程页/进度页/登录页之间任意切换。

Then：
- 登录态保持（无需重新登录），工作台草稿不丢失（localStorage 原 key 不变）。
- 切换过程不触发页面刷新。

#### AC-FE-012 导航与路由映射一致

Given：
- 任意页面。

When：
- 点击导航项（主页/课程/进度/登录）。

Then：
- 地址 hash 与视图同步切换；再次点击当前页导航项不重复渲染、不报错（幂等）。

## 8. 约束与架构裁决（必须保持）

- main.ts 不得含字面量：fetch(/localStorage/XMLHttpRequest/location.reload（homepage.test.mjs L69–72/L487–490、frontend-api.test.mjs L65–68）。
- 网络仅收敛 src/api.ts（唯一 fetch 字面量）；存储仅收敛 src/auth.ts / src/journal.ts（localStorage 字面量模块）。
- main.ts 不得含 frontend-dag-debug:tasks / frontend-dag-debug:auth 字面量（frontend-api.test.mjs L80–82）。
- 课程区源码区间（first-lesson-beginner 至能力地图）无 button/details/input/select/textarea/checkbox/aria-live；课程重渲染 getElementById('first-lesson-beginner')。
- style.css 恰 1 处 @keyframes（trace-travel）；:focus-visible 3px coral；prefers-reduced-motion 块（scroll-behavior auto、animation none）保持。
- README 断言子串（Agent 学习实验室、npm run typecheck/build/test、LOOP_AGENT_INIT_START/END、从一次模型调用到可验证的 Agent Run、#first-lesson-beginner/builder/advanced、空锚点、零网络、零账号、零 API key、60–90 分钟（en dash）、bash scripts/check-repo.sh、运行态阻断、HARNESS_ALLOW_ACTIVE_DAG_RUNS=1、.harness/dag-runs/active）保持；LOOP_AGENT_INIT 块不触碰。
- 不改：server/**、src/api.ts、src/auth.ts、src/task-board.ts、src/types.ts、src/journal.ts、test/server-api.test.mjs、test/task-board.test.mjs、test/frontend-journal.test.mjs（仅当断言锚定单页结构时按 DEC-SR-003 评估）、vite.config.ts、tsconfig.json、harness.json、docs/**、.harness/**、.agents/**、.pi/**、.opencode/**、scripts/**、AGENTS.md。
