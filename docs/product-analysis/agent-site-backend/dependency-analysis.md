---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: agent-site-backend
project_root: ../../..
analysis_scope: both
source_product_requirement: ./product-requirement.md
source_api_documentation: ./api-documentation.md
repository_root: ../../..
analysis_status: complete
blocked_on: none
---

# Dependency Analysis：Agent 学习实验室后端服务

## 1. 输入与代码基线

- 基线提交：`aa70b52 feat: establish Agents learning site baseline`（工作区另有未提交的本地修改：`src/main.ts`、`src/style.css`、`test/homepage.test.mjs`、AGENTS.md、README.md、.gitignore）。
- 技术栈：TypeScript ~6.0.2、Vite ^8.1.1、`node --test`；无任何运行时依赖（CODE-FACT-005）。
- Node v26.5.0：原生 `node:sqlite` 实测可用（CODE-FACT-006）；TS type stripping 已默认启用（tsconfig `erasableSyntaxOnly` 已兼容此执行模型）。
- 后端契约先例：`docs/product-analysis/task-stats-api/`（含 task.json 将 `server/**`、`test/**` 纳入 allowedPaths，referenceDocs 只读）。

## 2. 用户故事覆盖矩阵

| 故事 | PRD AC | API | 影响文件 |
|---|---|---|---|
| FE-US-001 | AC-FE-001/002 | API-001/002/003/004 | F1、F2、F3、F4、F5、F8 |
| FE-US-002 | AC-FE-003/004 | API-005/006 | F1、F4、F9 |
| FE-US-003 | AC-FE-005/006 | API-007/008 | F1、F2、F4、F10 |
| BE-US-001 | AC-BE-001/002 | API-001/002/003/004 | F6、F7、F8、F11、F12 |
| BE-US-002 | AC-BE-003/004 | API-005/006 | F6、F7、F9、F11、F12 |
| BE-US-003 | AC-BE-005/006 | API-007/008 | F6、F7、F10、F11、F12 |

## 3. 前端依赖详情

### FE-US-001 服务化课程内容与降级兜底

- 验收标准：AC-FE-001、AC-FE-002
- 影响文件：F1、F2、F3、F4、F5、F8（见 §7）
- 页面/路由：首页单页（hero / route-picker / lesson / capability-map / weekly-lab）；无路由库
- 组件：路线 tabs + route-detail、trace 轨迹、能力卡片、本周实验、第一课课程 section
- 状态：内容数据由「内联常量」改为「API 结果 + 兜底数据」的双态；加载中沿用当前展示值
- API client/类型：新增 `src/api-client.ts` 集中封装 `fetch('/api/v1/...')` 与类型；不新增第三方库
- 状态与边界落点：`selectRoute` 保持本地即时切换（BR-AGENT-002 不回归）；内容渲染函数改为接收数据源
- 定位证据：F1 `src/main.ts`（routes/capabilities/weeklyLab 常量，§17–128；模板字面量渲染 §132–620；交互 §622–669）
- 风险：内容双源（服务端与兜底）一致性漂移；需共享数据模块保证同源
- 置信度：高

### FE-US-002 简易账号登录

- 验收标准：AC-FE-003、AC-FE-004
- 影响文件：F1、F4、F9
- 页面/路由：进度面板（新增 UI 区域，建议置于 weekly-lab 或独立 section）
- 组件：注册/登录表单（用户名、密码、提交）、登录态标识、退出按钮
- 状态：idle / submitting / success / error / logout；令牌持久化（契约变化已确认，README 断言同步更新）
- API client/类型：F4 中新增 register/login 方法与令牌存储（localStorage）
- 状态与边界落点：F1 尾部交互区加入表单逻辑；错误文案直接可读
- 定位证据：F1 交互区 §622–669
- 风险：令牌持久化方式与「无存储」旧断言的冲突——属已确认契约变化（DEC-Q-005）
- 置信度：高

### FE-US-003 学习进度保存与恢复

- 验收标准：AC-FE-005、AC-FE-006
- 影响文件：F1、F2、F4、F10
- 页面/路由：进度面板
- 组件：三个进度控件（第一课完成、评估分 0–10、本周实验完成）+ 保存按钮 + 保存时间
- 状态：idle / saving / saved / save-failed / logged-out（visibility: 未登录禁用）
- API client/类型：F4 中 fetchProgress/saveProgress
- 状态与边界落点：F1 进度面板逻辑；样式进 F2
- 定位证据：无既有进度代码，全新区域
- 风险：evaluationScore 输入校验（0–10 整数或空）需前后端一致
- 置信度：高

## 4. 后端依赖详情

### BE-US-001 提供课程内容 API

- 验收标准：AC-BE-001、AC-BE-002
- API 文档引用：API-001/002/003/004
- 影响文件：F6、F7、F8、F11、F12
- 路由/入口：F6 Express 入口挂载 `/api/v1` 内容路由器
- Controller/Handler：F8 四个 GET handler
- Service/领域逻辑：内容初始化（F7 首次启动建表并写入种子数据）；builder/advanced 无课程 → 404
- DTO/Schema：F11 定义 Route/Capability/WeeklyLab/Lesson 响应类型
- 数据依赖：F7 SQLite 内容表（或由共享内容模块一次性种子）
- 权限依赖：无（开放）
- 错误/日志/审计：统一 `{ code, message }`；404 `LESSON_NOT_FOUND`
- 测试落点：F12 `test/server-api.test.mjs`（起真实 server，`node --test`）
- 定位证据：CODE-FACT-001（内容现状）、CODE-FACT-006（node:sqlite）
- 风险：第一课内容结构化为 JSON blocks 的工作量最大；建议共享内容模块单源，服务端种库、前端兜底复用
- 置信度：高

### BE-US-002 提供账号注册登录与会话

- 验收标准：AC-BE-003、AC-BE-004
- API 文档引用：API-005/006
- 影响文件：F6、F7、F9、F11、F12
- 路由/入口：F9 `/api/v1/auth/register`、`/api/v1/auth/login`
- Controller/Handler：F9 两个 handler + 令牌校验中间件
- Service/领域逻辑：用户名唯一；密码单向散列（Node 内置 `crypto.scrypt`，零额外依赖）；随机令牌持久化
- DTO/Schema：F11 `{ token, username }`
- 数据依赖：F7 users 表、tokens 表（或 sessions 表）
- 权限依赖：受保护端点需 `Authorization: Bearer`
- 错误/日志/审计：409 `USERNAME_TAKEN`、401 `INVALID_CREDENTIALS`、400 `INVALID_INPUT`
- 测试落点：F12
- 定位证据：CODE-FACT-005（零依赖现状 → 散列用内置 crypto）
- 风险：无；模式常规
- 置信度：高

### BE-US-003 提供按用户隔离的学习进度持久化

- 验收标准：AC-BE-005、AC-BE-006
- API 文档引用：API-007/008
- 影响文件：F6、F7、F10、F11、F12
- 路由/入口：F10 `/api/v1/progress`
- Controller/Handler：F10 GET/PUT handler，挂认证校验
- Service/领域逻辑：按 token 解析用户，按 user_id 读写进度；写入覆盖整份
- DTO/Schema：F11 Progress 类型（firstLessonCompleted / evaluationScore / weeklyLabCompleted / updatedAt）
- 数据依赖：F7 progress 表（user_id 主键或唯一约束）
- 权限依赖：强依赖认证中间件
- 错误/日志/审计：401 `UNAUTHORIZED`、400 `INVALID_INPUT`
- 测试落点：F12（含双用户隔离用例 AC-BE-006）
- 定位证据：无既有代码
- 风险：无；模式常规
- 置信度：高

## 5. 后端场景的 API 实现映射

| API ID | Operation ID | 方法路径 | 代码入口 |
|---|---|---|---|
| API-001 | listRoutes | GET /api/v1/routes | F8 |
| API-002 | listCapabilities | GET /api/v1/capabilities | F8 |
| API-003 | getWeeklyLab | GET /api/v1/lab | F8 |
| API-004 | getLesson | GET /api/v1/lessons/:routeId | F8 |
| API-005 | register | POST /api/v1/auth/register | F9 |
| API-006 | login | POST /api/v1/auth/login | F9 |
| API-007 | getProgress | GET /api/v1/progress | F10 |
| API-008 | saveProgress | PUT /api/v1/progress | F10 |

## 6. 跨故事共享依赖

- F11 后端共享类型（Route/Capability/WeeklyLab/Lesson/Progress/Auth 响应），前端 F4 可声明同行 TS 类型；建议内容契约类型放共享内容模块。
- 认证中间件（F9）被 F10 复用：一处解析 token，全路由生效。
- 统一错误结构 `{ code, message }` 三路由共用（沿用 task-stats-api 契约先例，CODE-FACT-007，规格见 G-ERR 节）。
- Vite 代理（F5）将 `createServer` 之外的 `/api` 转发至 3001；生产由 Express 静态托管 `dist/`。
- 验证接线：`npm test` 需将 `test/server-api.test.mjs` 纳入；`npm run typecheck` 需覆盖 `server/**`（新增服务端 tsconfig 或扩展 includes）；`npm run build` 保持 `tsc && vite build`。

## 7. 影响文件清单

| 编号 | 操作 | 路径 | 用途 |
|---|---|---|---|
| F1 | modify | src/main.ts | 渲染改为服务数据 + 降级；加入进度面板与登录表单 |
| F2 | modify | src/style.css | 进度面板、表单、服务不可用提示、falback 状态样式 |
| F3 | add | src/fallback-content.ts | 内联兜底数据（现状 routes/capabilities/lab/lesson 迁移至此） |
| F4 | add | src/api-client.ts | `/api/v1` fetch 封装、令牌存储、错误归一 |
| F5 | add | vite.config.ts | dev 代理 `/api` → http://localhost:3001 |
| F6 | add | server/index.ts | Express 入口：中间件、路由挂载、静态托管 dist、监听 3001 |
| F7 | add | server/db.ts | node:sqlite 打开/建表/种子；users、tokens、progress、内容 |
| F8 | add | server/routes/content.ts | GET 内容四端点 handler |
| F9 | add | server/routes/auth.ts | register/login handler + 令牌校验中间件 |
| F10 | add | server/routes/progress.ts | GET/PUT /api/v1/progress handler |
| F11 | add | server/types.ts | 后端 DTO 与共享类型 |
| F12 | add | test/server-api.test.mjs | 后端 API 端到端测试（node --test，真实启动 server） |
| F13 | modify | test/homepage.test.mjs | 按新契约更新断言（服务数据 + 兜底 + 登录/进度 UI，移除「无 fetch」断言） |
| F14 | modify | package.json | 新增 express 依赖与 scripts（dev:server / start / typecheck 覆盖服务端等） |
| F15 | modify | tsconfig.json | include 覆盖（或新增 server tsconfig）以通过服务端 typecheck |
| F16 | modify | .gitignore | 忽略数据库文件与运行产物（如 *.db） |
| F17 | modify | README.md | 文档收敛：技术栈、运行命令、契约变化说明 |
| F18 | modify | ai_workspace/loop-agent/verification-matrix.md | 登记新的项目验证命令 |
| F19 | reuse | src/task-board.ts | 保持原样（约束） |
| F20 | reuse | test/task-board.test.mjs | 保持原样（约束） |

## 8. 风险与未定位项

- 风险 R1（中）：第一课内容 API 化结构转换（约 300 行 HTML → 结构化 blocks）工作量大、易漏内容。缓解：共享内容模块单源（F3 与 F7 种子同源），先写红灯测试锁定关键内容（对照表、五模板、10 分量表、自测题）。
- 风险 R2（中）：`test/homepage.test.mjs` 大量源码断言需重写，改后可能失去部分现状覆盖。缓解：按契约变化接受（DEC-Q-005），断言目标改为「兜底数据内容完整性 + 服务数据一致性」，课时逐项覆盖保留。
- 风险 R3（低）：Node 26 TS type stripping 与 `erasableSyntaxOnly` 配合执行 server TS，若个别 TS 特性不兼容需改用编译产物目录。缓解：约束 enum/namespace 不用，服务器代码保持 erasable。
- 未定位项：无。