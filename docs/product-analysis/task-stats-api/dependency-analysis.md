---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: task-stats-api
project_root: ../../..
analysis_scope: both
source_product_requirement: ./product-requirement.md
source_api_documentation: ./api-documentation.md
repository_root: ../../..
analysis_status: complete
blocked_on: none
---

# 依赖分析：任务统计服务

## 1. 输入与代码基线

- Product Requirement：`./product-requirement.md`，状态 complete，范围 both。
- API Documentation：`./api-documentation.md`，状态 complete，包含 API-001。
- 代码仓库：项目根，Vite 8 + TypeScript 6 + Node.js 内置 test runner。
- 已确认现状：任务类型和 localStorage 逻辑位于 `src/task-board.ts`；页面组装位于 `src/main.ts`；当前没有服务端 HTTP 入口或请求客户端。

## 2. 用户故事覆盖矩阵

| 故事 | AC | 影响域 | API | 覆盖状态 |
|---|---|---|---|---|
| FE-US-001 | AC-FE-001、AC-FE-002 | frontend | API-001 | covered |
| BE-US-001 | AC-BE-001、AC-BE-002 | backend | API-001 | covered |

## 3. 前端依赖详情

### FE-US-001 展示服务任务统计

- 验收标准：AC-FE-001、AC-FE-002。
- 影响文件：
  - F1 modify `src/task-board.ts`：在任务变化后触发服务统计请求，维护 loading/success/error 状态并展示服务统计/本地兜底。
  - F2 add `src/task-stats-api.ts`：封装 API-001 请求和响应类型。
  - F3 modify `src/main.ts`：保留 task-board 初始化入口，不新增独立页面。
  - F4 add `vite.config.ts`：开发环境将 `/api` 请求转发到本地统计服务。
  - F5 modify `package.json`：登记本地统计服务启动命令。
  - F6 add `test/task-stats-api.test.mjs`：覆盖客户端契约和前端失败兜底静态行为。
- 页面/路由：现有单页入口，无新增路由。
- 组件：现有 task-board 统计区域。
- 状态：normal、loading、success、error、empty。
- API client/类型：F2 调用 API-001；F1 复用现有 `Task` 形状。
- 状态与边界落点：F1 负责空列表、失败保留本地计数和筛选不改变请求快照。
- 定位证据：`src/task-board.ts` 导出 `Task`、`getCounts`、`initTaskBoard`；`src/main.ts` 调用 `initTaskBoard`。
- 风险：当前前端无请求层，需新增最小 adapter；开发时必须同时启动 Vite 和 API 服务。
- 置信度：medium。

## 4. 后端依赖详情

### BE-US-001 计算任务快照统计

- 验收标准：AC-BE-001、AC-BE-002。
- API 文档引用：API-001 / `summarizeTasks`。
- 影响文件：
  - F7 add `server/index.mjs`：新增 HTTP handler，处理 API-001、JSON 解析、大小限制和错误响应。
  - F8 add `server/task-summary.mjs`：纯函数校验任务快照并计算 total/pending/done。
  - F9 add `test/task-summary.test.mjs`：覆盖合法、空列表、非法 JSON、非法字段和大请求体。
  - F5 modify `package.json`：登记 `server` 命令。
- 路由/入口：F7 注册 `POST /api/v1/tasks/summary`。
- Controller/Handler：F7 读取 JSON 请求体、调用 F8、返回统一成功/错误结构。
- Service/领域逻辑：F8 提供无状态统计函数和输入校验。
- DTO/Schema：F8 使用 TaskSnapshotItem 与 TaskSummary 形状。
- 数据依赖：无数据库、文件或外部服务；只读单次请求体。
- 权限依赖：本地演示接口无需登录。
- 错误/日志/审计：F7 对非法输入返回 400 `INVALID_TASKS`；不返回堆栈；无需持久化审计。
- 测试落点：F9 使用 Node.js 内置 test runner，直接测试 handler/service 契约。
- 定位证据：当前仓库搜索不到服务端目录、HTTP 路由、统一响应壳或共享 DTO；新增后端落点置信度 inferred medium。
- 风险：若只启动 Vite 未启动 F7，前端会进入本地兜底状态；文档和开发脚本必须明确双进程启动。
- 置信度：medium。

## 5. API 实现映射

| API | Operation ID | 方法与路径 | 代码入口 |
|---|---|---|---|
| API-001 | summarizeTasks | POST /api/v1/tasks/summary | F7 → F8 |

## 6. 跨故事共享依赖

- F5 同时提供前端开发 proxy/API 服务脚本，不承载业务逻辑。
- F1、F2、F7、F8 共享 TaskSnapshotItem 与 TaskSummary 的字段契约；字段变更必须同步 Product Requirement 与 API Documentation。
- F6、F9 共享 Node.js 内置 test runner 和 AC 追溯命名。

## 7. 风险与未定位项

- 本仓库没有现成后端运行时、统一错误枚举或生产部署配置；本需求明确采用最小 Node.js HTTP 服务，后续生产化不在范围内。
- 前端真实浏览器验证需要同时启动 API 服务和 Vite；单独运行 `npm test` 只证明静态契约与服务单测。
- 未定位项：现有 API client、认证、数据库、路由框架均不存在；已搜索 `src/`、`server/`、`package.json` 和 `test/`，下一步由 F2/F7/F8 新增。
