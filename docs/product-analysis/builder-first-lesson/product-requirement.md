# Product Requirement — 构建路线第一课「为原型建立一条 Eval 基线」

## 1. 背景与目标

- 构建路线（`contentRoutes.id='builder'`）面向“已有原型、想构建可交付 Agent 的开发者”，路线 `firstLesson` 已声明为“为原型建立一条 Eval 基线”，但 `#/lesson/builder` 课程页当前仍渲染 `lessonPlaceholderMarkup`（内容筹备中 + 返回主页 + 空锚点 `#first-lesson-builder`）。
- 本需求补齐构建路线第一课为完整中文静态课程，对齐入门第一课/第二课教学法（课程定位五要素 → 六段路径 → 概念对照 → 静态样例 → 设计模板 → 五阶段实验 → 10 分量表 → 失败样例 → 自测题 → 复盘），让学习者在零后端、零网络、零账号、零 API key 条件下，为研究助手 v0 建立第一条可复跑的 Eval 基线。
- 本课交付后，`#/lesson/builder` 不再是占位页；`#/lesson/advanced` 保持占位（含 `#first-lesson-advanced` 空锚点）。

## 2. 范围

### In scope

- 前端 `src/main.ts`：新增构建第一课静态 section（`id="first-lesson-builder"`、`aria-labelledby="builder-first-lesson-title"`），位于 `#/lesson/builder` 课程页；`lessonPageMarkup('builder')` 返回该课程 + 服务降级横幅；`advanced` 仍返回占位。
- 前端 `src/api.ts`：`loadCourseContent()` 并行拉取新增第六端点 `GET /api/v1/lessons/builder` 并校验 `lessonBuilder`（routeId/html 非空），`applyLessonContent()` 经 `getElementById('first-lesson-builder')` 替换。
- 后端 `server/content.ts`：新增 `lessonBuilderHtml`，与 `src/main.ts` 构建第一课内层 HTML 逐字一致（R3 裁决）；`server/app.ts`（+ `server/db.ts` 如需）新增 `GET /api/v1/lessons/builder` 返回同源课程 DTO（routeId/kicker/title/meta/html）。
- 测试：`test/homepage.test.mjs`（构建第一课结构/静态回归）、`test/frontend-api.test.mjs`（第六端点 + 两侧逐字一致性 + 课程区纯净/@keyframes 唯一性）、`test/server-api.test.mjs`（builder 端点 DTO 与锚点）。
- `README.md` 项目概览中构建第一课段落更新。

### Out of scope

- 不改 `src/router.ts` 路由表与解析语义、不改登录态/草稿/工作台复用语义、不改 `src/journal.ts`、`src/auth.ts`、`src/types.ts`、`server/auth.ts`。
- 不新增交互控件（课程区无 button/details/input/checkbox）、无 aria-live、无动画（`@keyframes` 保持恰好 1 个）、无网络/存储写入。
- 不动归档/导出/规划中心（archive/exporter/planner）及其测试。

## 3. 课程内容规格（静态 HTML）

- hero：`构建路线 · 第 01 课`、`为原型建立一条 Eval 基线`、`预计用时：60–90 分钟 · 完整交付：新增三份本地文件（eval-set.md、baseline-run.md、eval-report.md）+ 复盘追加`。
- 01 课程定位：适合人群（有可跑原型、被“感觉变好”困扰的开发者，需先完成入门第一课）、预计用时、前置知识（入门第一课五份交付物）、完成后能力（能写出 8–12 条 Eval 集、能冻结基线并复跑、能用 10 分量表判定基线是否合格）、课程产物；六段学习路径表（概念→拆解→设计→实验→评估→复盘）；「读完 vs 完成」区分与交付物验收关系表。
- 02 概念：Eval 基线三要素（评估集/判定规则/基线快照）与“感觉变好 vs 可证明不退化”对照表（6–8 行）；基线四字段（用例/输入冻结/期望判定/实际记录）与缺失后果；五个边界问题（谁定标准/谁提供用例/谁允许改动/何时算退化/谁判定通过）。
- 03 拆解：一条静态 Eval 基线样例表（字段：基线 ID/目标版本/评估集摘要/判定规则/输入冻结/执行记录/通过率/证据引用，每个字段配风险说明，覆盖用例漂移、判定主观、无快照、无记录四类风险）；「看起来测过但不可复跑」失败样例与改写样例。
- 04 设计：`eval-set.md` 八项模板（用例目标/输入/期望判定/来源/难度标签/版本/冻结时间/通过门槛）与一条示例用例；输出格式示例。
- 05 实验：五阶段本地实验表（准备/冻结/执行/评估/复盘，各含动作、检查点、产物、常见错误）与 `baseline-run.md`、`eval-report.md`、`retrospective.md（追加）` 可复制模板；实验仅使用内联 [E1]/[E2] 两条示例用例。
- 06 评估：四类故意失败样例表（无判定规则/用例漂移/只记通过率无明细/无基线快照）及修复提示；10 分评估量表（合计 10 分、8 分及以上才算完成、低于 8 分必须修订或重跑）；四道自测题与直接可读的参考答案区；复盘模板。
- 纯静态约束：课程区无交互控件、无 aria-live、无动画；新增表格采用局部滚动（overflow-x:auto）与长代码内容级换行，390px 视口无横向溢出；`:focus-visible` 描边与 `prefers-reduced-motion` 行为保留；锚点 `scroll-margin-top: 5.5rem`。

## 4. 前后端一致性（R3）

- `src/main.ts` 构建第一课内层 HTML 与 `server/content.ts` 的 `lessonBuilderHtml` 逐字一致，由 `test/frontend-api.test.mjs` 一致性断言守护。
- `GET /api/v1/lessons/builder` DTO：`{ routeId:'builder', kicker, title, meta, html }`，`html` 含 `first-lesson-builder` 锚点内层；前端 `loadCourseContent()` 并行拉取六个端点（routes/capabilities/lab/lessons/beginner/lessons/beginner-2/lessons/builder）并逐一校验，任一失败即抛错并显示降级横幅（`id=service-unavailable`）。
- `applyLessonContent()` 依次经 `getElementById('first-lesson-beginner')`、`getElementById('second-lesson-beginner')`、`getElementById('first-lesson-builder')` 替换；`renderLesson('builder')` 执行替换，`renderLesson('advanced')` 直接返回（占位）。

## 5. 验收标准

- AC-BUILDER-001：访问 `#/lesson/builder` 渲染构建第一课完整内容（含 hero、六段路径、对照表、静态基线样例、三个模板 pre 块、10 分量表、四类失败样例、四道自测题与答案区）；`#/lesson/advanced` 仍为占位且含 `#first-lesson-advanced`。
- AC-BUILDER-002：课程区无 button/details/input/checkbox、无 aria-live、无新增 `@keyframes`（全库恰好 1 个）；390px 无横向溢出。
- AC-BUILDER-003：`GET /api/v1/lessons/builder` 返回同源 DTO，前后端 HTML 逐字一致；断网/服务端失败时前端降级横幅显示且本地内联课程仍齐全。
- AC-BUILDER-004：`npm test`、`npm run typecheck`、`npm run build` 全绿。

## 6. 验证

- `npm test`（jest 自动发现 `test/*.test.mjs`）
- `npm run typecheck`
- `npm run build`
