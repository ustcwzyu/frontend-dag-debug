---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: site-hash-routing
project_root: ../../..
analysis_scope: frontend
source_product_requirement: ./product-requirement.md
repository_root: ../../..
analysis_status: complete
blocked_on: none
---

# Dependency Analysis：单页站点拆分为多路由页面

## 1. 输入与代码基线

- 基线：当前 main 分支工作区（含未提交的 r2 工作台改动 src/journal.ts、main.ts 工作台 section、test/frontend-journal.test.mjs 等）。
- 技术栈：TypeScript ~6.0.2、Vite ^8.1.1、`node --test`；零运行时依赖（路由化零新依赖）。
- 契约文档：docs/product-analysis/site-hash-routing/ 全套（source-requirement / product-analysis / requirement-clarification / product-requirement / 本文件）。
- 关键源码事实（CODE-FACT，来自只读侦察）：
  - main.ts 965 行：单 `app.innerHTML`（L192–195）渲染全部 section：header L196、hero L206、route-picker L236（route-detail L241）、first-lesson-beginner L264–606（01–06 lesson-block）、capability-map L608、weekly-lab L614、progress-panel L623（service-unavailable L626、auth-form L628、progress-form L645）、journal-workbench-mount L669、footer L672。
  - 无路由代码：src/ 全目录 grep `location|history|hashchange|popstate|pushState|replaceState|window.addEventListener` 零命中。
  - 交互函数：selectRoute L696、renderCapabilities L738、renderWeeklyLab L750、loadServerContent L768、setAuthMode/showAuthError/clearAuthError L834–851、enterLoggedIn/enterLoggedOut L853–871、refreshProgress/saveProgress L877–912、事件绑定 L914–953、initJournalWorkbench L955–959、启动 L961–965。
  - journal.ts 666 行：JOURNAL_STORAGE_KEY='frontend-dag-debug:journal'、createEmptyDraft/countSteps/isTemplateCompleted/validateScore/formatDuration/mergeProgressForSync/syncJournalProgress/load-save-clearJournalDraft/setJournalSession/initJournalWorkbench。
  - api.ts 导出：loadCourseContent/register/login/getProgress/putProgress；auth.ts：loadSession/saveSession/clearSession。
  - style.css 1312 行：恰 1 处 @keyframes trace-travel（L263–270）；.service-banner L951、.progress-panel L961、.auth-form/.progress-form L970–979、.journal-* L1041–1288；prefers-reduced-motion L1292–1312。

## 2. 用户故事覆盖矩阵

| 故事 | PRD AC | 影响文件 |
|---|---|---|
| FE-US-001 | AC-FE-001/002/003 | F1、F2、F3、F5、F6 |
| FE-US-002 | AC-FE-004/005/006 | F1、F2、F3、F5 |
| FE-US-003 | AC-FE-007/008/009 | F1、F2、F3、F5 |
| FE-US-004 | AC-FE-010/011/012 | F1、F3、F5 |

## 3. 前端依赖详情

### FE-US-001 主页总览

- 验收标准：AC-FE-001/002/003
- 影响文件：F1（src/main.ts）、F2（src/style.css）、F3（src/router.ts 新）、F5（test/frontend-router.test.mjs 新）、F6（homepage.test.mjs 更新）
- 页面/路由：`#/`（默认）
- 组件：site-header（新增导航）、hero、route-picker、capability-map、weekly-lab
- 状态：路由当前页（router 模块变量）；内容缓存（courseContent 模块级）
- 定位证据：main.ts L196–260/L608–621 现渲染片段
- 风险：默认路由渲染需保持既有内容断言（能力六类、本周实验）
- 置信度：高

### FE-US-002 课程阅读页

- 验收标准：AC-FE-004/005/006
- 影响文件：F1、F2、F3、F5、F6
- 页面/路由：`#/lesson/:routeId`
- 组件：first-lesson-beginner 课程区（自 lesson 数据或本地兜底）；builder/advanced 占位
- 状态：routeId 路由参数
- 定位证据：main.ts L264–606 课程区 HTML（须从首页模板迁移为课程页模板，保留字面量断言所需片段）
- 风险：课程区 300+ 行 HTML 迁移时字面量漂移；lessonRegion 纯净断言与锚点断言需按新结构更新（DEC-SR-003）
- 置信度：高

### FE-US-003 登录与进度管理页

- 验收标准：AC-FE-007/008/009
- 影响文件：F1、F2、F3、F5、F6
- 页面/路由：`#/login`、`#/progress`
- 组件：auth-form（迁移自 progress-panel）、progress-form、journal-workbench
- 状态：登录态（auth.ts）、进度表单值、工作台草稿
- 定位证据：main.ts L623–669（progress-panel 区）、journal.ts initJournalWorkbench
- 风险：auth-form 从进度面板迁出后 frontend-api.test.mjs 中 auth-form/progress-form 同页断言需更新；登录成功跳转逻辑（原 enterLoggedIn 保留页面）需新增 navigate('#/progress')
- 置信度：高

### FE-US-004 未知地址兜底与状态保持

- 验收标准：AC-FE-010/011/012
- 影响文件：F1、F3、F5
- 页面/路由：未知 hash
- 组件：404 视图（提示 + 返回主页链接）
- 状态：无
- 定位证据：无既有对应（新增）
- 风险：hashchange 幂等渲染（重复导航不累积监听）
- 置信度：高

## 4. 影响文件清单

| 编号 | 操作 | 路径 | 用途 |
|---|---|---|---|
| F1 | modify | src/main.ts | 拆分渲染为视图函数（renderHome/renderLesson/renderProgress/renderLogin/renderNotFound）、导航渲染、路由分发接入；保留净化约束 |
| F2 | modify | src/style.css | 导航/路由状态样式（.site-nav、active 高亮、404 视图）；不新增 @keyframes |
| F3 | add | src/router.ts | parseHash 纯函数、navigate、hashchange 监听、视图分发注册；零依赖 |
| F4 | modify | src/journal.ts | 仅当工作台需适配进度页独立挂载时微调（默认不改） |
| F5 | add | test/frontend-router.test.mjs | parseHash/导航/幂等/404 的静态源断言 + 纯函数行为断言 |
| F6 | modify | test/homepage.test.mjs | 单页结构断言 → 路由结构断言更新（lessonRegion 切片改新锚点、锚点计数、内容断言保持） |
| F7 | modify | test/frontend-api.test.mjs | auth-form/progress-panel 归属断言按新页面更新；净化断言保持 |
| F8 | modify | README.md | 文档收敛：路由结构、导航说明 |
| F9 | modify | ai_workspace/loop-agent/verification-matrix.md | 登记路由验证命令（frontend-router.test.mjs） |

## 5. 跨故事共享依赖

- F3 提供 parseHash/navigate/分发，F1 消费；F3 不得含 fetch/localStorage 字面量（网络/存储仍收敛 api.ts/auth.ts/journal.ts）。
- 内容缓存模块级共享：主页（能力/实验）与课程页（课程 HTML）均消费 loadServerContent 结果；降级横幅两页可见。
- 登录态共享：auth.ts 模块变量 + localStorage；登录页与进度页消费。
- 约束公共点：main.ts 字面量净化、课程区纯净、@keyframes 计数、README 断言（F6/F7 更新时不得放宽）。

## 6. 边界与禁止

- 禁止改动：server/**、src/api.ts、src/auth.ts、src/task-board.ts、src/types.ts、src/journal.ts、test/server-api.test.mjs、test/task-board.test.mjs、test/frontend-journal.test.mjs、vite.config.ts、tsconfig.json、package.json、package-lock.json、harness.json、docs/**、.harness/**、.agents/**、.pi/**、.opencode/**、scripts/**、AGENTS.md、dist/**。
- 允许改动：src/main.ts、src/style.css、src/router.ts（新）、test/frontend-router.test.mjs（新）、test/homepage.test.mjs、test/frontend-api.test.mjs、README.md、ai_workspace/loop-agent/verification-matrix.md。
- 验证命令（expected verification，登记于 verification-matrix）：`HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 node --test test/frontend-router.test.mjs`、`HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 npm test`、`npm run typecheck`、`npm run build`、`bash scripts/check-repo.sh`。

## 7. 风险与未定位项

- 风险 R1（中）：课程区 HTML 从单页模板迁出至课程页视图，字面量漂移导致内容断言失败。缓解：F5 断言课程页模板与兜底数据同源；F6 更新时逐条核对。
- 风险 R2（低）：hash 路由与页内锚点（原 #first-lesson-*）语义冲突。缓解：课程页不依赖 hash 锚点滚动，导航全走 router.navigate。
- 风险 R3（低）：视图切换重渲染导致 journal 工作台事件重复绑定。缓解：BR-RT-002 幂等渲染（每次渲染前清空/重建挂载点）。
- 未定位项：无。
