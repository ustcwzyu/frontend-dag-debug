---
artifact_version: "3.0"
artifact_type: product-analysis
requirement_id: learning-session-journal
project_root: ../../..
analysis_scope: frontend
analysis_status: no-clarification-required
source_requirement: ./source-requirement.md
repository_root: ../../..
---

# Product Analysis：第一课学习会话记录器

## 原始需求

为 Agent 学习实验室首页新增「学习会话记录器」工作台：8 步闭环逐步引导、5 模板草稿编辑与完成度校验、10 分量表自评、会话计时与摘要页；草稿 localStorage 持久化 + 与现有进度 API 同步。本需求同时用于验证项目新加入的前端实现工作流（frontend-implementation 类型任务）。

## 需求概述

在第一课课程区之后新增独立「学习会话工作台」区块：用户按八步闭环勾选进度、在五份模板（run-contract / input-freeze / run-log / evaluation / retrospective）草稿区编辑内容（须修改过预填骨架才算完成）、自评 10 分量表、本地累计会话时长；草稿自动保存到 localStorage，登录后可将完成状态与自评分合并同步到现有 `/api/v1/progress`。纯前端实现，不改后端。

## 业务目标

- 把第一课从「纯阅读」升级为「可执行的练习工作台」，用户实际产出五份本地文件的骨架。
- 草稿与进度不丢失：刷新页面后工作台状态完整恢复。
- 同步不破坏既有进度：只更新 firstLessonCompleted / evaluationScore，保留 weeklyLabCompleted。

## 需求分析

### 明确需求

- 8 步闭环逐步引导：八步列表来源于第一课内容中的八步闭环，每步可勾选完成。R1
- 5 模板草稿编辑与完成度校验：五份模板（run-contract / input-freeze / run-log / evaluation / retrospective）预填骨架文本，用户编辑；完成判定=草稿文本与骨架文本不同（修改过骨架，P1-1 用户决策）。R2
- 10 分量表自评：0–10 整数输入，可留空。R3
- 会话计时：本地累计时长（开始/暂停/继续/重置），随草稿持久化，展示于摘要；不同步服务端（P1-3 用户决策，后端无时长字段）。R4
- 摘要页：展示步骤完成 X/8、模板完成 Y/5、自评分、累计时长、最近保存时间。R5
- 草稿持久化：localStorage 自动保存与恢复。R6
- 进度同步：合并后再 PUT——同步前 GET 现有进度，保留 weeklyLabCompleted 不变，仅更新 firstLessonCompleted 与 evaluationScore（P1-2 用户决策）。R7
- 工作台 UI 位于 progress-panel 区块之后，不得进入课程区源码范围（lessonRegion 纯净断言）。R8
- 不新增 fetch/localStorage 字面量到 main.ts；网络仅收敛 api.ts、存储仅收敛 auth.ts（本需求如需持久化，须新建独立模块并保持既有断言绿）。R9
- 不新增 @keyframes（style.css 恰 1 处断言）。R10

### 推断需求

- 工作台入口：课程区后的独立 section（id 如 session-journal），不修改课程区任何内容。R11
- 同步按钮在未登录时禁用并提示登录。R12
- 完成后可重置工作台（清空草稿与状态）。R13
- 同步失败保留本地草稿，不清空。R14

### 待确认问题

无。所有 P1 决策已确认（选项 C + P1-1/P1-2/P1-3），见 requirement-clarification.md。

### 初步非目标

- 不改后端：无新端点、不改 server/**、不改 api.ts / auth.ts / task-board.ts。
- 不改现有进度面板（progress-panel）行为。
- 第一课课程内容本身（阅读区）不改动。
- 不做富文本编辑、文件下载、多用户协作。

## 外部事实

### 知识库事实

- 前端工作流 skills：frontend-implementation（contract/scout/mock/plan 阶段）、frontend-bounded-implement（writer）、frontend-design-review（plan design gate）、frontend-review、frontend-verification（均位于 .agents/skills/）。

### 代码库事实

- CODE-FACT-J1：`src/main.ts` 课程区为静态阅读内容（section id=first-lesson-beginner，行 263 起；capability-map 行 607；weekly-lab 行 613；progress-panel 行 622 起，含 service-banner 行 625、auth-form/progress-form、id=progress-status aria-live=polite 行 662）；`lessonSection = getElementById('first-lesson-beginner')` 行 732。
- CODE-FACT-J2：`test/frontend-api.test.mjs` 断言 main.ts 不得含 fetch(/localStorage/XMLHttpRequest/location.reload 字面量；网络仅收敛 api.ts、存储仅收敛 auth.ts；lessonRegion（first-lesson-beginner 至 capability-map 区间）不得有 button/details/input/select/textarea/checkbox/aria-live；课程重渲染必须 getElementById('first-lesson-beginner') 且不得 querySelector(...first-lesson-beginner)；style.css 恰 1 处 @keyframes。
- CODE-FACT-J3：`test/homepage.test.mjs` 同样断言无 fetch/XMLHttpRequest/localStorage 字面量、课程区无交互控件；大量内容断言覆盖第一课（表格、八步闭环、5 模板、10 分量表、自测题）。
- CODE-FACT-J4：`server/content.ts` 第一课 HTML 含 `<ol class="lesson-loop" aria-label="Agent 最小闭环八步：…">`（行 249）与 5 个 `<pre><code>` 模板（行 344/471 为 run-contract 出现处，行 509-532 为五模板正文：run-contract / input-freeze / run-log / evaluation / retrospective）。
- CODE-FACT-J5：`src/api.ts` 导出 loadCourseContent / register / login / getProgress / putProgress；`src/auth.ts` SESSION_KEY='frontend-dag-debug:auth'。
- CODE-FACT-J6：`src/main.ts` 行 622 后为 progress-panel 区块；首页所有 section 均在 `#app` 容器内。

## 初步前端用户故事

### FE-US-001 八步闭环引导工作台

- 角色：学习第一课的用户
- 目标：在工作台按八步闭环逐项勾选完成进度
- 价值：把八步闭环从阅读材料变成执行清单
- 入口：工作台区块（课程区之后）
- 验收关注点：八步列表完整、勾选状态可切换、全部完成提示

### FE-US-002 五模板草稿编辑与完成度校验

- 角色：学习第一课的用户
- 目标：在工作台编辑五份模板草稿，明确哪些已完成
- 价值：五份交付物落地，完成度可视化
- 入口：工作台模板区
- 验收关注点：骨架预填、修改过骨架才算完成、计数与状态正确

### FE-US-003 自评、计时与摘要

- 角色：学习第一课的用户
- 目标：自评 10 分量表，查看会话时长与整体摘要
- 价值：形成可归档的学习会话记录
- 入口：工作台摘要区
- 验收关注点：0–10 校验、计时开始/暂停/继续/重置、摘要数据一致

### FE-US-004 草稿持久化与进度同步

- 角色：已登录/未登录用户
- 目标：刷新不丢草稿；登录后同步到服务端进度
- 价值：草稿与进度双保险，不同设备可恢复
- 入口：工作台同步区
- 验收关注点：自动保存恢复、合并式 PUT 保留 weeklyLabCompleted、未登录禁用同步、失败保留本地