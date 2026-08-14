# Agent 学习实验室：补充入门路线第一课

来源：用户会话，2026-08-10。

## 任务类型

- `taskKind`: `frontend-implementation`
- 风险：small / bounded frontend content slice

## 背景

当前首页的“开始入门路线 · 第一课”CTA 指向 `#first-lesson-beginner`，但目标位置只有空锚点，没有可阅读、可操作、可验证的课程正文。用户要求补充第一课内容。

## 目标

把入门路线第一课补成一段完整的中文静态课程，让首次构建 Agent 的开发者理解“一次模型调用”和“可验证 Agent Run”的区别，并能完成一个无需后端、无需远程 API 的研究助手 v0 纸面/本地实验。

## 用户故事

作为首次构建 Agent 的开发者，我点击“第一课”后，希望立刻看到学习目标、最小心智模型、可复制的任务合约、分步实验和完成标准，从而知道学什么、做什么、如何判断自己做对了。

## 范围

- 在现有单页中增加一个可见、可达的入门路线第一课 section。
- 补充第一课的学习目标、Agent 最小闭环、研究助手 v0 任务合约、三步实验、评估检查表、交付物与下一课预告。
- 为新增课程区域补充响应式样式、行为测试和 README 说明。

## 需求

### REQ-LESSON-001 可达且完整的课程入口

- 用真实可见的第一课 section 替换当前空的 `first-lesson-beginner` 锚点。
- 首屏和入门路线 CTA 继续通过 `#first-lesson-beginner` 到达课程正文。
- 课程头部明确显示“第 01 课”、预计用时和课程标题。

### REQ-LESSON-002 建立正确的 Agent 心智模型

- 明确说明：一次模型调用不是完整 Agent；Agent 需要目标、输入/上下文、可执行步骤或工具、停止条件和评估。
- 展示一个紧凑的最小闭环：目标 → 输入 → 执行 → 输出 → 评估。
- 学习目标至少覆盖：辨别模型调用与 Agent、写出任务合约、用检查表评估一次 run。

### REQ-LESSON-003 研究助手 v0 动手实验

- 实验不调用网络、不要求账号、不引入 API key。
- 提供固定练习场景：只根据给定资料回答一个问题，并使用 `[S1]` / `[S2]` 标注来源。
- 提供可直接照写的任务合约，至少包含任务、输入、约束、输出格式、成功标准。
- 提供 3 个有顺序的实验步骤：冻结输入、执行一次、评估并记录。

### REQ-LESSON-004 完成标准和下一步

- 提供明确检查表：关键结论有引用、未使用资料外事实、无法确认时明确说明、输出满足指定结构。
- 明确本课交付物：任务合约、固定输入、一次输出、一次评估记录。
- 以“下一课：接入第一个 Tool”作为路线预告，不伪造可用页面或后端能力。

### REQ-LESSON-005 视觉、响应式与可访问性

- 延续现有 Mist / Ink / Deep Navy / Signal Coral / Spring / Circuit Lilac token、无渐变、无外部字体的视觉系统。
- 课程内容在桌面形成清晰的信息层级，在 390px 视口单列且无横向溢出。
- 使用语义化 section、heading、ordered/unordered list 和 code/pre；键盘焦点、reduced-motion 既有行为不得回归。

## 行为规则

### BR-LESSON-001

页面仍为静态前端：不得新增 `fetch`、`XMLHttpRequest`、远程脚本、localStorage 写入或第三方运行时依赖。

### BR-LESSON-002

现有入门/构建/进阶路线切换、执行轨迹、能力地图、本周实验及 task-board 独立模块必须保持现有行为。

### BR-LESSON-003

构建与进阶路线第一课内容不在本切片内；不得把未实现内容伪装为已上线页面。

## 验收标准

- AC-LESSON-001: Given 用户位于首页，When 点击默认入门路线的第一课 CTA，Then `#first-lesson-beginner` 对应一个可见课程 section，包含第 01 课、预计用时和“从一次模型调用到可验证的 Agent Run”标题。
- AC-LESSON-002: Given 用户阅读心智模型，When 查看学习目标和最小闭环，Then 页面明确出现“单次模型调用 ≠ 完整 Agent”语义，并展示目标、输入、执行、输出、评估五个阶段。
- AC-LESSON-003: Given 用户开始研究助手 v0 实验，When 按页面步骤练习，Then 能看到 `[S1]` / `[S2]` 来源约定、包含任务/输入/约束/输出格式/成功标准的任务合约，以及冻结输入→执行一次→评估记录三步。
- AC-LESSON-004: Given 用户完成实验，When 对照检查表，Then 能验证引用、资料边界、不确定性和输出结构，并知道需保存四类交付物以及下一课是接入第一个 Tool。
- AC-LESSON-005: Given 页面在桌面或 390px 视口渲染，When 浏览课程区域，Then 内容无横向溢出、语义层级清楚、现有路线交互不回归，且页面仍无网络请求、无本地存储写入。

## 允许写入

- `src/main.ts`
- `src/style.css`
- `test/homepage.test.mjs`
- `README.md`

## 禁止写入

- `.harness/**`
- `.agents/**`
- `ai_workspace/**`
- `scripts/**`
- `package.json`
- `package-lock.json`
- `src/task-board.ts`
- `test/task-board.test.mjs`
- `index.html`
- `public/**`
- `dist/**`

## 验证命令

- `npm test`
- `npm run typecheck`
- `npm run build`
- `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh`

## 非目标

- 后端、真实模型/API 调用、账号、进度保存、复制按钮、多页面路由。
- 补充构建/进阶路线的完整第一课。
- 修改 loop-agent、治理脚本、依赖或旧 task-board 领域模块。
