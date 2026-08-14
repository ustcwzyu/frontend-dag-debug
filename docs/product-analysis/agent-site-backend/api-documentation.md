---
artifact_version: "3.0"
artifact_type: api-documentation
requirement_id: agent-site-backend
project_root: ../../..
api_status: complete
analysis_scope: both
source_product_requirement: ./product-requirement.md
repository_root: ../../..
---

# API Documentation：Agent 学习实验室后端服务

## 1. 通用约定

### Base URL

本地开发：`http://localhost:3001`（前端 Vite 通过代理以 `/api` 相对路径访问）。

### 统一响应结构

请求与响应均使用 `application/json`；成功响应结构为 `{ "data": <payload> }`。

### 错误响应结构

错误响应结构为 `{ "code": <string>, "message": <string> }`。未定义路径返回 404 `NOT_FOUND`。

### 认证方式

以 `Authorization: Bearer <token>` 请求头携带令牌；令牌由 API-005/006 签发。缺少或无效令牌访问受保护端点返回 401 `UNAUTHORIZED`。

### 分页约定

本接口不分页。

### 时间和标识符规范

时间字段使用 ISO 8601 字符串（格式 `YYYY-MM-DDTHH:mm:ss.sssZ`），本地时区不带后缀。用户名 length 1–32 个字符；`routeId` 枚举 `beginner | builder | advanced`。

## 2. API 索引

| API | Method + Path | Operation ID | 用户故事 | AC | 变更 |
|---|---|---|---|---|---|
| API-001 | GET /api/v1/routes | listRoutes | BE-US-001 | AC-BE-001、AC-BE-002 | 新增 |
| API-002 | GET /api/v1/capabilities | listCapabilities | BE-US-001 | AC-BE-001、AC-BE-002 | 新增 |
| API-003 | GET /api/v1/lab | getWeeklyLab | BE-US-001 | AC-BE-001、AC-BE-002 | 新增 |
| API-004 | GET /api/v1/lessons/:routeId | getLesson | BE-US-001 | AC-BE-001、AC-BE-002 | 新增 |
| API-005 | POST /api/v1/auth/register | register | BE-US-002 | AC-BE-003 | 新增 |
| API-006 | POST /api/v1/auth/login | login | BE-US-002 | AC-BE-004 | 新增 |
| API-007 | GET /api/v1/progress | getProgress | BE-US-003 | AC-BE-005 | 新增 |
| API-008 | PUT /api/v1/progress | saveProgress | BE-US-003 | AC-BE-006 | 新增 |

## 3. API 详情

### API-001 路线列表

> `GET /api/v1/routes`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | listRoutes |
| 变更类型 | 新增 |
| 幂等性 | GET 幂等 |

#### 成功响应

- HTTP：200

```json
{
  "data": [
    {
      "id": "beginner",
      "name": "入门",
      "audience": "首次构建 Agent 的开发者",
      "duration": "约 2 周",
      "lessonCount": "12 节课",
      "summary": "从提示与模型调用开始……",
      "stages": ["提示与模型调用", "接入第一个 Tool", "加入 Memory 与上下文", "用 Eval 验证收尾"],
      "firstLesson": "让一个模型调用跑起来",
      "traceStates": ["用户提问与可用工具清单", "单步计划：查询 → 回答", "调用 Tool：检索并计算", "检查回答是否引用来源"]
    }
  ]
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 404 | NOT_FOUND | 未定义路径 |

```json
{ "code": "NOT_FOUND", "message": "route not found" }
```

### API-002 能力地图

> `GET /api/v1/capabilities`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | listCapabilities |
| 变更类型 | 新增 |
| 幂等性 | GET 幂等 |

#### 成功响应

- HTTP：200

```json
{
  "data": [
    { "title": "模型与提示", "desc": "选择模型、写提示并度量输出质量，先让单次调用可控。" }
  ]
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 404 | NOT_FOUND | 未定义路径 |

```json
{ "code": "NOT_FOUND", "message": "path not found" }
```

### API-003 本周实验

> `GET /api/v1/lab`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | getWeeklyLab |
| 变更类型 | 新增 |
| 幂等性 | GET 幂等 |

#### 成功响应

- HTTP：200

```json
{
  "data": {
    "title": "研究助手",
    "goal": "构建一个会查资料、带引用回答并接受评估的研究助手。",
    "input": "一篇主题与一组候选资料（你提供的文本或本地文件）。",
    "tools": "检索工具 + 引用记录：查找资料、抽取要点并记录来源。",
    "criteria": "回答包含明确引用，评估集通过，跑一次完整 trace 可复现。",
    "duration": "约 45 分钟"
  }
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 404 | NOT_FOUND | 未定义路径 |

```json
{ "code": "NOT_FOUND", "message": "path not found" }
```

### API-004 第一课课程内容

> `GET /api/v1/lessons/:routeId`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | getLesson |
| 变更类型 | 新增 |
| 幂等性 | GET 幂等 |

#### Path 参数

| 字段 | 类型 | 必填 | 可空 | 枚举 | 语义 |
|---|---|---|---|---|---|
| routeId | string | 是 | 否 | `beginner`、`builder`、`advanced` | 路线标识 |

#### 成功响应

- HTTP：200

```json
{
  "data": {
    "routeId": "beginner",
    "kicker": "入门路线 · 第 01 课",
    "title": "从一次模型调用到可验证的 Agent Run",
    "meta": "预计用时：60–90 分钟 · 完整交付：五份本地文件",
    "blocks": [
      { "type": "heading", "level": 3, "id": "lesson-01-title", "text": "01 · 课程定位：这门课交付什么" },
      { "type": "facts", "items": [{ "term": "适合人群", "detail": "有基础开发经验、第一次系统学习 Agent 的学习者……" }] },
      { "type": "table", "caption": "模型调用与 Agent Run 的八项差异", "headers": ["维度", "单次模型调用", "一个 Agent Run"], "rows": [["目标", "无；只响应提示", "有明确目标，目标决定成败"]], "firstColumnHeader": true },
      { "type": "pre", "code": "# run-contract.md — 研究助手 v0 任务合约\n- 任务：……" }
    ]
  }
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 404 | LESSON_NOT_FOUND | routeId 为 `builder` 或 `advanced`（该路线尚无课程） |
| 400 | INVALID_INPUT | routeId 不属于枚举或非字符串 |

```json
{ "code": "LESSON_NOT_FOUND", "message": "lesson not found for route: builder" }
```

### API-005 注册账号

> `POST /api/v1/auth/register`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | register |
| 变更类型 | 新增 |
| 幂等性 | 非幂等；同名重复注册返回 409 |

#### Request Body

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| username | string | 是 | 否 | 1–32 字符 | 登录用户名，全站唯一 |
| password | string | 是 | 否 | 非空 | 登录密码 |

#### 成功响应

- HTTP：201

```json
{
  "data": { "token": "t_3f9a2c8e", "username": "alice" }
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 400 | INVALID_INPUT | 请求非合法 JSON、字段缺失或类型错误、username 超长、password 为空 |
| 409 | USERNAME_TAKEN | username 已被注册 |

```json
{ "code": "USERNAME_TAKEN", "message": "username already exists: alice" }
```

### API-006 登录

> `POST /api/v1/auth/login`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | login |
| 变更类型 | 新增 |
| 幂等性 | 非幂等；每次成功登录签发新令牌 |

#### Request Body

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| username | string | 是 | 否 | 1–32 字符 | 已注册用户名 |
| password | string | 是 | 否 | 非空 | 对应密码 |

#### 成功响应

- HTTP：200

```json
{
  "data": { "token": "t_1b7d9e4f", "username": "alice" }
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 400 | INVALID_INPUT | 请求非合法 JSON、字段缺失或类型错误 |
| 401 | INVALID_CREDENTIALS | 用户名不存在或密码不匹配 |

```json
{ "code": "INVALID_CREDENTIALS", "message": "invalid username or password" }
```

### API-007 读取学习进度

> `GET /api/v1/progress`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | getProgress |
| 变更类型 | 新增 |
| 幂等性 | GET 幂等 |
| 认证 | 必须 |

#### 成功响应

- HTTP：200

```json
{
  "data": {
    "progress": {
      "firstLessonCompleted": false,
      "evaluationScore": null,
      "weeklyLabCompleted": false,
      "updatedAt": "2026-08-15T10:30:00.000Z"
    }
  }
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 401 | UNAUTHORIZED | 缺少或无效 Bearer 令牌 |

```json
{ "code": "UNAUTHORIZED", "message": "missing or invalid token" }
```

### API-008 保存学习进度

> `PUT /api/v1/progress`

#### 基本信息

| 字段 | 值 |
|---|---|
| Operation ID | saveProgress |
| 变更类型 | 新增 |
| 幂等性 | 相同请求体重复提交结果一致（整份覆盖） |
| 认证 | 必须 |

#### Request Body

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| firstLessonCompleted | boolean | 是 | 否 | `true` 或 `false` | 第一课完成状态 |
| evaluationScore | integer | 是 | 是 | 0–10 或 null | 第一课评估分 |
| weeklyLabCompleted | boolean | 是 | 否 | `true` 或 `false` | 本周实验完成标记 |

#### 成功响应

- HTTP：200

```json
{
  "data": {
    "progress": {
      "firstLessonCompleted": true,
      "evaluationScore": 8,
      "weeklyLabCompleted": true,
      "updatedAt": "2026-08-15T11:00:00.000Z"
    }
  }
}
```

#### 错误响应

| 状态码 | code | 触发条件 |
|---|---|---|
| 401 | UNAUTHORIZED | 缺少或无效 Bearer 令牌 |
| 400 | INVALID_INPUT | 请求非合法 JSON、字段缺失或类型错误、evaluationScore 超出 0–10 或非整数 |

```json
{ "code": "INVALID_INPUT", "message": "evaluationScore must be an integer between 0 and 10 or null" }
```

## 4. 数据模型

### Route

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| id | string | 是 | 否 | `beginner`、`builder`、`advanced` | 路线标识 |
| name | string | 是 | 否 | 非空 | 路线名称 |
| audience | string | 是 | 否 | 非空 | 目标受众 |
| duration | string | 是 | 否 | 非空 | 周期描述 |
| lessonCount | string | 是 | 否 | 非空 | 课程数描述 |
| summary | string | 是 | 否 | 非空 | 路线简介 |
| stages | string[] | 是 | 否 | 长度 4，元素非空 | 阶段列表 |
| firstLesson | string | 是 | 否 | 非空 | 第一课标题 |
| traceStates | string[] | 是 | 否 | 长度 4，元素非空 | 执行轨迹四阶段状态描述 |

### Capability

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| title | string | 是 | 否 | 非空 | 能力名称 |
| desc | string | 是 | 否 | 非空 | 能力描述 |

### WeeklyLab

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| title | string | 是 | 否 | 非空 | 实验名称 |
| goal | string | 是 | 否 | 非空 | 实验目标 |
| input | string | 是 | 否 | 非空 | 输入说明 |
| tools | string | 是 | 否 | 非空 | 工具说明 |
| criteria | string | 是 | 否 | 非空 | 成功标准 |
| duration | string | 是 | 否 | 非空 | 时长 |

### Lesson

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| routeId | string | 是 | 否 | `beginner` | 所属路线 |
| kicker | string | 是 | 否 | 非空 | 课程眉题 |
| title | string | 是 | 否 | 非空 | 课程标题 |
| meta | string | 是 | 否 | 非空 | 课程元信息 |
| blocks | LessonBlock[] | 是 | 否 | 非空数组 | 课程内容块序列 |

### LessonBlock（判别联合，字段随 type 变化）

| type | 附加字段 | 语义 |
|---|---|---|
| heading | `level`（3 或 4）、`id`（可空）、`text` | 章节小标题（h3/h4） |
| paragraph | `variant`（`core`、`lab-note`、`next`、`plain`，默认 plain）、`text` | 段落；variant 决定强调样式 |
| facts | `items[]`：`{ term, detail }` | 定义列表（如课程定位） |
| table | `caption`、`headers[]`、`rows[][]`、`firstColumnHeader`（boolean） | 带 caption 的表格；firstColumnHeader 为 true 时首列渲染为行标题 |
| pre | `code` | 可复制模板块 |
| list | `ordered`（boolean）、`variant`（`plain`、`contract`、`loop`，默认 plain）、`items[]`：`{ lead?: string, text }` | 列表；lead 渲染为加粗引导词；variant=loop 用于八步闭环布局 |
| badge-example | `items[]`：`{ badge: string, text }` | 带徽章的例子（非 Agent / 接近但还不是 / 是 Agent Run） |
| sample | `label`、`text`、`why?`（可空）、`fixed`（boolean） | 失败/改写样例块 |

### Progress

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| firstLessonCompleted | boolean | 是 | 否 | `true` 或 `false` | 第一课完成状态 |
| evaluationScore | integer | 是 | 是 | 0–10 或 null | 第一课评估分 |
| weeklyLabCompleted | boolean | 是 | 否 | `true` 或 `false` | 本周实验完成标记 |
| updatedAt | string | 是 | 否 | ISO 8601 | 最近一次保存时间 |

### Auth 响应

| 字段 | 类型 | 必填 | 可空 | 约束 | 语义 |
|---|---|---|---|---|---|
| token | string | 是 | 否 | 随机不可猜测 | 会话令牌 |
| username | string | 是 | 否 | 非空 | 登录用户名 |

## 5. 错误码

| HTTP | code | 触发条件 |
|---|---|---|
| 400 | INVALID_INPUT | 请求非合法 JSON、字段缺失、类型错误、枚举越界、evaluationScore 非 0–10 整数 |
| 401 | UNAUTHORIZED | 请求头缺少或携带无效令牌 |
| 401 | INVALID_CREDENTIALS | 登录时用户名不存在或密码不匹配 |
| 404 | NOT_FOUND | 未定义路径 |
| 404 | LESSON_NOT_FOUND | 访问该路线尚无课程内容 |
| 409 | USERNAME_TAKEN | 注册用户名已存在 |