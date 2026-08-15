---
artifact_version: "3.0"
artifact_type: product-analysis
requirement_id: site-hash-routing
project_root: ../../..
analysis_scope: frontend
source_requirement: ./source-requirement.md
analysis_status: complete
blocked_on: none
---

# 需求分析：单页站点拆分为多路由页面

## 1. 现状事实（CODE-FACT）

- 单页 SPA：`src/main.ts`（965 行）经 `app.innerHTML = \`...\``（L192–195）一次渲染全部内容：site-header、hero（L206）、route-picker（L236，含 route-detail L241）、first-lesson-beginner 完整课程区（L264–606，含 01–06 六个 lesson-block）、capability-map（L608）、weekly-lab（L614）、progress-panel（L623，含 service-unavailable banner L626、auth-form L628、progress-form L645）、journal-workbench-mount（L669）、footer（L672）。
- 无任何路由机制：grep `location|history|hashchange|popstate|pushState|replaceState|window.addEventListener` 在 src/ 零命中；跳转仅静态锚点 href（`#first-lesson-beginner` / `#capability-map` / `#first-lesson-${route.id}`）。
- 交互逻辑（main.ts L696–965）：selectRoute、路线 tab 绑定、loadServerContent（fetch 封装于 api.ts）、进度面板事件、journal 工作台初始化（initJournalWorkbench 来自 journal.ts）。
- 模块边界（架构裁决 R1/R2）：main.ts 无 fetch(/localStorage/XMLHttpRequest/location.reload 字面量（homepage.test.mjs L69–72/L487–490、frontend-api.test.mjs L65–68 强制）；网络收敛 api.ts（唯一 fetch 字面量）、存储收敛 auth.ts（SESSION_KEY）与 journal.ts（JOURNAL_STORAGE_KEY）。
- 测试断言锚定现状结构：lessonRegion 切片（`<section class="lesson container" id="first-lesson-beginner"` → `<section class="capability-map`）无交互控件（homepage L448–449/L472–481、frontend-api L86–97）；progress-panel 在 main.ts 且含 auth-form/progress-form 标记（frontend-api L36–61）；journal 挂载点位于 progress-panel 之后（frontend-journal L385–395）；锚点 `#first-lesson-builder/advanced` 为空 span（homepage L464–467）；style.css 恰 1 处 @keyframes（三个测试文件共同强制）。

## 2. 需求本质

用户感知问题：**信息架构拥挤**——一份面向"第一课学习"的页面同时承担首页导航、完整课程阅读、进度管理与工作台四类职责，垂直方向内容过长。

解决方向：按职责拆分路由视图（Hash 路由，零依赖），每页只承担一类职责；导航（header 链接 / hero 按钮 / 路线卡片）驱动 hash 切换。

## 3. 拆分方案

| 路由 | 页面 | 内容（从现状 section 迁移） |
|---|---|---|
| `#/` | 主页 | site-header、hero（含 CTA 按钮）、route-picker（路线选择器）、capability-map、weekly-lab、footer |
| `#/lesson/:routeId` | 课程页 | site-header、first-lesson-beginner 课程区（builder/advanced 无内容 → 空锚点占位 + "内容筹备中"提示）、footer |
| `#/progress` | 进度页 | site-header、progress-panel（登录态进度表单）、journal-workbench-mount（学习会话工作台）、footer |
| `#/login` | 登录页 | site-header、auth-form（登录/注册切换）、footer；已登录访问 → 自动跳转进度页 |
| 未知 hash | 兜底 | 404 提示 + 返回主页链接 |

## 4. 方案裁决（建议）

- 路由库：不引入。新建 `src/router.ts`：parseHash（纯函数）、navigate、hashchange 监听、页面渲染分发。零依赖约束保持。
- 数据流：课程/能力/实验内容仍由 loadCourseContent 一次性加载并在多页间共享（页面切换不重复 fetch，可在首次加载后缓存于模块变量）；降级横幅保持（任何页面加载失败均显示）。
- 登录态：auth-form 移至登录页；进度页未登录访问 → 显示"请先登录"提示 + 登录链接（不强制跳转，避免打断）；登录成功 → 跳转进度页。
- 测试更新（DEC-SR-003）：homepage.test.mjs / frontend-api.test.mjs 中锚定单页结构的断言随新结构更新（lessonRegion 切片改为基于课程页模板字符串或新锚点）；架构裁决断言（main.ts 净化、@keyframes 计数、:focus-visible、prefers-reduced-motion、en dash 60–90 分钟、零网络/零账号文案等）保持绿色。
- style.css：路由化主要复用现有选择器；仅新增少量导航/路由状态样式（如 .route-nav、当前页高亮），不新增 @keyframes。

## 5. 风险

- 风险 R1（中）：测试源断言重构面大（homepage 44+ 断言），更新时可能误伤架构裁决断言。缓解：依赖分析中逐条列出保留/变更断言。
- 风险 R2（低）：hash 路由 + 锚点滚动共存（课程页内原有 `#first-lesson-beginner` 锚点语义变化）。缓解：课程页路由参数与页内锚点语义分开处理。
- 风险 R3（低）：页面切换时 journal 工作台/进度面板重挂载导致状态丢失。缓解：模块级状态保持（草稿在 localStorage，登录态在 auth.ts 模块变量）；切换仅重渲染 DOM。
