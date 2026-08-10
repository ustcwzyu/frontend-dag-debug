---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: task-stats-api-frontend
project_root: ../../..
analysis_scope: frontend
source_product_requirement: ./product-requirement.md
source_api_documentation: none
repository_root: ../../..
analysis_status: complete
blocked_on: none
---

# 依赖分析：前端任务统计展示

## 1. 用户故事覆盖矩阵

| 故事 | AC | 影响域 | 覆盖状态 |
|---|---|---|---|
| FE-US-001 | AC-FE-001、AC-FE-002 | frontend | covered |

## 2. 输入与代码基线

- Product Requirement：`./product-requirement.md`，状态 complete，范围 frontend。
- 外部 API 文档：`../task-stats-api/api-documentation.md`，只读输入，不生成新 API 文档。
- 代码基线：Vite + TypeScript 单页任务看板；无现成统计 adapter。

## 3. 前端依赖详情

### FE-US-001 展示服务任务统计

- 验收标准：AC-FE-001、AC-FE-002。
- 影响文件：
  - F1 modify `src/task-board.ts`：触发统计请求并维护 loading/success/error 状态与本地兜底。
  - F2 add `src/task-stats-api.ts`：定义 API 类型、request adapter 与 dev/test mock transport。
  - F3 modify `src/style.css`：增加状态提示样式。
  - F4 add `test/task-stats-api.test.mjs`：覆盖请求契约、mock 成功/失败与兜底行为。
- 页面/路由：现有单页，无新增路由。
- 组件：现有任务看板统计区域。
- 契约适配：F2 按外部只读接口文档的请求和响应字段提供类型安全适配。
- API client/类型：F2 提供请求体与响应体类型及可注入 transport，不实现服务端。
- 状态：loading、success、empty、error。
- 状态与边界落点：F1 覆盖请求状态、空列表、失败本地兜底和筛选快照隔离。
- 定位证据：`src/task-board.ts` 已导出 Task、统计和初始化入口；`src/main.ts` 组装页面。
- 风险：mock 验证不等于真实服务联调；真实服务 ready 后需单独执行联调验证。
- 置信度：high。

## 4. 跨故事共享依赖

- F1/F2 共享 API 文档中的 TaskSnapshotItem 与 TaskSummary 字段语义。
- 测试使用 Node.js 内置 test runner。

## 5. 风险与未定位项

- mock 验证不等于真实服务联调；真实服务 ready 后需单独执行联调验证。

## 6. 约束

- 不修改 `../task-stats-api/api-documentation.md`。
- 不新增 `server/`、依赖包或真实 API 服务进程。
- mock 显式 dev/test-only，production 默认关闭。
