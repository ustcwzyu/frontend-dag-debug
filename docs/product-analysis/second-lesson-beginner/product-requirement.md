# 入门路线 · 第二课「接入第一个 Tool」— Product Requirement

- 状态：已澄清（用户确认「入门路线新增第二课」「参考第一课风格延续」）
- 范围：frontend + backend 课程内容扩展（纯静态课程，无新交互）
- 日期：2026-08-15

## 1. 背景与目标

第一课「从一次模型调用到可验证的 Agent Run」已交付：学习者在课程页 `#/lesson/beginner` 学会辨别「模型调用 ≠ Agent run」、为研究助手 v0 写出八项任务合约（run-contract.md 等五份本地文件）、并用 10 分量表评估一次 run。第一课末尾预告：

> 下一课：接入第一个 Tool —— 为研究助手声明第一个可验证的工具调用。

本任务把该预告落地：在入门路线课程页新增第二课「接入第一个 Tool：声明可验证的工具调用」，延续第一课的全部教学法与工程约束（静态中文课程、六段学习路径、风险驱动的拆解、五阶段本地实验、10 分量表、故意失败样例、自测题），让学习者掌握「工具合约」——为 Agent 声明工具的四要素（名称、描述、参数 Schema、副作用与失败语义），并能验证一次带工具调用的 run。

## 2. 用户故事

- 作为完成第一课的学习者，我想在课程页看到第二课，使我能为研究助手声明第一个可验证的工具，并用本地脚本模拟工具调用完成一次实验，从而把「一次 run」升级为「带工具行动的 run」。
- 作为评估者，我想第二课与第一课共用同一套课程区约束与样式体系，使页面可访问性、无交互纯净性与无网络/存储承诺不退化。

## 3. 输出规范（逐条）

### 3.1 前端课程内容（src/main.ts）

1. 新增 `secondLessonSectionMarkup` 常量：完整 `<section class="lesson container" id="second-lesson-beginner" aria-labelledby="second-lesson-title">`，位于第一课 section 之后。
2. 课程头部：kicker `入门路线 · 第 02 课`；title「接入第一个 Tool：声明可验证的工具调用」；meta 预计用时（如 60–90 分钟，具体由 writer 定并保持两侧一致）。
3. 六段课程结构（延续第一课教学法，section 内部使用既有 `lesson-*` 类）：
   - **01 课程定位**：`<dl class="lesson-facts">` 五要素（适合人群 / 预计用时 / 前置知识 / 完成后能力 / 课程产物）；六段学习路径表（概念→拆解→设计→实验→评估→复盘：目的/学习动作/产出）；「读完 vs 完成」区分与第二课交付物验收关系表。
   - **02 概念**：核心陈述「声明了工具 ≠ 会用工具」；「模型调用 / 工具调用 / 工具合约」层级差异对照表；工具四要素（名称、描述、参数 Schema、副作用与失败语义）逐要素「解决什么问题 / 缺失时会发生什么」；工具幻觉（编造工具名或参数）示例。
   - **03 拆解**：一条带工具调用的静态 run 样例（复用第一课 run 字段并新增「工具调用记录」字段：入参快照、返回结果、失败与重试），逐字段风险说明，覆盖：参数越界、工具不存在/拼错、失败无重试、副作用未声明、工具结果未核对、无工具调用记录。
   - **04 设计**：为研究助手声明第一个工具（如 `study-source-lookup`：名称/描述/参数 JSON Schema/返回结构/副作用/失败语义），给出 `tool-contract.md` 模板（pre 块，可直接复制）。
   - **05 实验**：五阶段本地实验（准备/冻结/执行/评估/复盘，各含动作、检查点、产物、常见错误），延续零网络、零账号、零 API key：用本地脚本/函数模拟工具实现（如 Node 函数 `lookupSource(keyword)` 读取本页内联资料）；给出 `tool-call-log.md` 模板（每次调用：时间、入参、返回、失败与重试、结果核对）。
   - **06 评估**：10 分评估量表（覆盖：工具契约完整 / 参数校验 / 失败重试 / 副作用声明 / 结果核对 / 调用记录等项，8 分及以上完成）；四类故意失败样例（无参数 Schema、工具名幻觉、失败不重试、调用无记录）与修复提示；自测题（3–4 道）与直接可读参考答案；复盘模板。
4. 第一课末尾 `lesson__next` 预告文案更新为指向第二课（如「第二课在本页下方：接入第一个 Tool……」，不得指向虚构页面）。
5. `lessonPageMarkup('beginner')` 拼接输出 `lessonSectionMarkup` + `secondLessonSectionMarkup`。

### 3.2 服务端契约（server/content.ts、server/db.ts、server/app.ts）

1. `server/content.ts` 新增 `lessonBeginnerSecondHtml`：与 `src/main.ts` 第二课 section **内层 HTML 逐字一致**（沿用 R3 裁决「服务端 seed 从 main.ts 复制」，文件头注释同步说明）。
2. `server/db.ts` seed：`INSERT OR REPLACE INTO lessons (id, html) VALUES ('beginner-2', ?)`。
3. `server/app.ts` `GET /api/v1/lessons/:routeId`：放开硬编码 `routeId !== 'beginner'` 的 404 分支，支持 `beginner-2`，返回第二课的 kicker（`入门路线 · 第 02 课`）/ title / meta / html；`beginner` 与其余未知 id 行为保持不变。

### 3.3 前端 API 客户端（src/api.ts、src/main.ts）

1. `src/api.ts` `loadCourseContent()`：并行 fetch `/lessons/beginner-2`，校验形状与 `lesson` 相同（routeId/html 非空字符串），返回 `lesson2`。
2. `src/main.ts`：`cachedContent` 扩展为 `{ lesson, lesson2 }`；`applyLessonContent()` 同时经 `getElementById('second-lesson-beginner')` 替换第二课内层（延续 R2 裁决：课程重渲染不经过 `querySelector(All)(...first-lesson-beginner)`，同样不得出现 `querySelector(All)(...second-lesson-beginner)`）；`applyCourseContent`/`loadServerContent` 同步传递 lesson2，内容加载失败时降级横幅行为不变。

### 3.4 文档收敛

- `README.md` 项目概览与测试清单段落：登记第二课、`/lessons/beginner-2` 端点与新增测试文件。

### 3.5 测试（test/）

1. `test/homepage.test.mjs` 新增第二课静态断言组：section 存在且位于第一课之后、kicker 第 02 课、六段标题、课程定位五要素、tool-contract.md 与 tool-call-log.md 模板、10 分量表、四类失败样例、自测题、课程区纯净（无 button/details/input/checkbox）、`lesson__next` 预告更新；第一课既有断言全部保持通过（不得破坏）。
2. `test/frontend-api.test.mjs` 新增：`second-lesson-beginner` section 存在于 main.ts；服务端契约断言（`server/content.ts` 存在 `lessonBeginnerSecondHtml` 且与 main.ts 内层一致或含关键锚点）；R2 裁决断言（main.ts 无 `querySelector(All)(...second-lesson-beginner)`，存在 `getElementById('second-lesson-beginner')`）；api.ts 存在 `/lessons/beginner-2` fetch。
3. `test/server-api.test.mjs` 新增：`GET /api/v1/lessons/beginner-2` 返回 200、data.routeId='beginner-2'、html 非空且含第二课关键锚点；`beginner` 端点行为不变；未知 routeId 仍 404。

## 4. 验收标准（Given/When/Then）

- AC1：访问 `#/lesson/beginner`，页面在第一课 section 之后渲染 `second-lesson-beginner` section。
- AC2：第二课含 kicker「入门路线 · 第 02 课」与六段标题（01 课程定位 … 06 评估）。
- AC3：第二课含 `<dl class="lesson-facts">` 五要素（适合人群/预计用时/前置知识/完成后能力/课程产物）。
- AC4：第二课含 `tool-contract.md` 与 `tool-call-log.md` 两个 pre 模板块。
- AC5：第二课含 10 分量表、四类故意失败样例与修复提示、自测题及参考答案。
- AC6：课程区纯净：第二课 section 内无 button/details/input/checkbox；`src/style.css` 的 `@keyframes` 数量保持 1；390px 视口无横向溢出（复用既有样式与既有表级滚动，如无必要不新增样式）。
- AC7：`GET /api/v1/lessons/beginner-2` 返回 200 且 html 非空；`/lessons/beginner` 与未知 routeId 行为不变。
- AC8：服务端内容加载成功后，第二课内层经 `getElementById('second-lesson-beginner')` 被替换；main.ts 中不存在对 second-lesson 的 querySelector 渲染路径。
- AC9：`npm test`、`npm run typecheck`、`npm run build` 全部通过。

## 5. 非目标（明确不做）

- 不新增 `#/lesson/...` 二级路由或 `RouteId`（router.ts 零改动）。
- 不扩展学习会话工作台（journal.ts 零改动，保持第一课专用）。
- 不改进度数据模型（types.ts / ProgressData / 进度表单 / server 进度表零改动）。
- 不改 style.css 主题结构（如确实需要新增样式，须在实现中说明理由且不得增加 @keyframes）。
- 不新增任何按钮/表单等交互控件；不引入网络请求或存储写入到课程区。

## 6. 工程约束（沿用既有裁决）

- R2 裁决：课程重渲染不经过 `querySelector(All)(...lesson...)`；fetch 字面量只出现在 `src/api.ts`。
- R3 裁决：`server/content.ts` 课程 HTML 与 `src/main.ts` 内层逐字一致（两侧同步修改）。
- 课程区纯静态：无交互控件、无 aria-live、无动画、无网络/存储写入（AC-FE-004）。
- 中文优先、`aria-labelledby`/`aria-label` 语义完整、`:focus-visible` 与 `prefers-reduced-motion` 行为保留。
