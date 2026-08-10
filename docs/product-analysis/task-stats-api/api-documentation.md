---
artifact_version: "3.0"
artifact_type: api-documentation
requirement_id: task-stats-api
project_root: ../../..
api_status: complete
analysis_scope: both
source_product_requirement: ./product-requirement.md
repository_root: ../../..
---

# API Documentation：任务统计服务

## 1. 通用约定

### Base URL

`http://localhost:3001`

### 统一响应结构

请求和成功响应使用 `application/json`；成功响应结构为 `{ "data": <payload> }`。

### 错误响应结构

错误响应结构为 `{ "code": string, "message": string }`。

### 分页约定

本接口不分页。

### 时间和标识符规范

本接口不返回时间字段；任务 `id` 为非空字符串，本接口不生成标识符。

## 2. API 索引

| API | Method + Path | Operation ID | 用户故事 | AC | 变更 |
|---|---|---|---|---|---|
| API-001 | POST /api/v1/tasks/summary | summarizeTasks | BE-US-001 | AC-BE-001、AC-BE-002 | 新增 |

## 3. API 详情

### API-001 计算任务快照统计

> `POST /api/v1/tasks/summary`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | summarizeTasks |
| 变更类型 | 新增 |
| 幂等性 | 相同请求体重复提交返回相同结果 |

#### Request Body

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| tasks | array | 是 | 否 | JSON 数组，最大请求体 64 KiB | 当前任务快照 |
| tasks[].id | string | 是 | 否 | 非空 | 任务标识 |
| tasks[].title | string | 是 | 否 | 字符串 | 任务标题 |
| tasks[].completed | boolean | 是 | 否 | `true` 或 `false` | 完成状态 |

#### 成功响应

- HTTP：200

```json
{
  "data": {
    "total": 3,
    "pending": 2,
    "done": 1
  }
}
```

| 字段 | 类型 | 必填 | 可空 | 语义 |
|---|---|---|---|---|
| data | object | 是 | 否 | 统计结果 |
| data.total | integer | 是 | 否 | 任务总数，非负整数 |
| data.pending | integer | 是 | 否 | 未完成任务数，非负整数 |
| data.done | integer | 是 | 否 | 已完成任务数，非负整数 |

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 400 | INVALID_TASKS | 请求不是合法 JSON、缺少 `tasks`、任务字段类型不符合契约或请求体超过 64 KiB |

```json
{
  "code": "INVALID_TASKS",
  "message": "tasks must be an array"
}
```

## 4. 数据模型

### TaskSnapshotItem

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| id | string | 是 | 否 | 非空 | 任务标识 |
| title | string | 是 | 否 | 字符串 | 任务标题 |
| completed | boolean | 是 | 否 | 布尔值 | 完成状态 |

### TaskSummary

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| total | integer | 是 | 否 | `total >= 0` | 总任务数 |
| pending | integer | 是 | 否 | `pending >= 0` | 待完成数量 |
| done | integer | 是 | 否 | `done >= 0` | 已完成数量 |

## 5. 错误码

| HTTP 状态 | code | 可观测触发条件 |
|---|---|---|
| 400 | INVALID_TASKS | 请求体无法满足 TaskSnapshotItem 数组契约，或超过大小限制 |
