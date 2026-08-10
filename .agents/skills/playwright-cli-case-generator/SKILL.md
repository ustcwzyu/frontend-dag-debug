---
name: playwright-cli-case-generator
description: 根据 FE-test RAG 知识包生成可由 playwright-cli 串行执行的前端功能测试用例、索引和 case manifest。
---

# Playwright Test Generator

仅用于 FE-test DAG 的 `generate-frontend-functional-cases-pi`。本 skill
生成中文 Markdown 测试用例和 `manifest.json`，不执行浏览器、不生成
Playwright/Pytest 源码，也不修改被测应用。

## 输入与边界

- 只读取 `testcase/frontend/rag/context.md`、`coverage-map.md` 与已有
  `testcase/frontend/cases/`。
- 只写 `testcase/frontend/cases/**`；不得回读 PRD、读取 `.harness/`，或写
  `testcase/frontend/evidence/**`。
- 所有 API、字段限制、状态流转、数据来源、SLA、URL 与账号要求必须能在
  RAG 知识包中追溯。缺失信息标记 `blocked` 或“需人工确认”，不得猜测。

## 输出

- 写 `index.md`、`manifest.draft.json`（生成阶段；materialize 会写成
  `manifest.json`）与独立 case 文件
  `FE-<FEATURE>-<NNN>-<dimension>.md`；`dimension` 仅为 `core`、`boundary`、
  `flow` 或 `backend`。
- **ID 契约（高频失败点，禁止混用）**：
  - `caseId` / 文件名 = **用例 ID**，形态 `FE-<FEATURE>-<NNN>-<dimension>`
    （例：`FE-LOGIN-001-core`）。**禁止**把验收标准写成 caseId
    （错误：`AC-FE-001.md` / `caseId: "AC-FE-001"`）。
  - `acIds` = **验收标准 ID 列表**，形态 `AC-FE-*` / `AC-*`
    （例：`["AC-FE-001"]`）。**禁止**把用例 ID 放进 acIds
    （错误：`acIds: ["FE-LOGIN-001-core"]`）。
  - `casePath` 必须等于 `testcase/frontend/cases/<caseId>.md`；
    `evidenceDir` 必须等于 `testcase/frontend/evidence/<caseId>/`。
- `manifest` 使用 `schemaVersion: 1`，每项只含 `caseId`、`casePath`、
  `dimension`、`acIds`、`evidenceDir`。所有 ID、路径和 evidenceDir 必须唯一，
  并位于 `testcase/frontend/` 内。
- `index.md` 按功能点列出 case、维度、AC、数据依赖、API 映射和预期执行状态。

每个 case 必须包含：

1. 元信息：功能、CRUD 分类、维度、关联 AC、RAG 来源、API 映射状态与数据策略。
2. 前置条件：默认浏览器 session 中的登录状态、fixture/存量数据、清理责任；不得用 `-s=<case-id>` 建立 named session。
3. 可独立执行的命令序列：使用 RAG `context.md` 中已解析的绝对 `baseUrl`（优先来自任务源 `config.md`；缺失时默认 `http://localhost:5173`），必须以
   `playwright-cli open --browser=chrome --headed <resolved-base-url>` 开始，禁止保留 `<base-url>` 占位符，也不得使用 `-s=<case-id>` 或其他 named session；再按需登录/数据准备、
   `snapshot` 后优先使用元素引用、操作、UI 断言、可选 API 断言、cleanup、`close`。
4. 明确的 UI/API 预期与数据清理结果；无法满足的环境或数据依赖必须写为 `blocked`。

所有 snapshot、screenshot、trace 和 video 命令必须指向执行节点提供的
`testcase/frontend/evidence/<case-id>/` 工作目录。命令必须使用现有
`playwright-cli` skill 已声明的接口；不要生成 `requests --clear`、
`request-body` 或 `response-body`。

### playwright-cli-only（硬约束）

- 用例步骤只能使用 `playwright-cli` skill 已声明的命令语法。
- **禁止**裸 `playwright`、`npx playwright`、`playwright test`、`@playwright/test`、
  Node Playwright API 或生成 Playwright/Pytest 源码。
- `playwright-cli` 不可用时不得降级到原生 Playwright；应写 blocked evidence，
  `blockedReason: playwright-cli-unavailable`。

## 覆盖矩阵

| CRUD 类型 | 必选 | 条件 |
| --- | --- | --- |
| C-新增 | `core`、`boundary` | 有状态流转时 `flow`；有 API 映射时 `backend` |
| R-查询 | `core` | 有搜索/筛选输入时 `boundary`；有 API 映射时 `backend` |
| U-修改 | `core`、`boundary` | 有状态流转时 `flow`；有 API 映射时 `backend` |
| D-删除 | `core` | 有 API 映射时 `backend` |

- `boundary` 只从已知必填、长度、范围、精度、枚举或字符规则推导；无约束时
  不伪造边界值。
- `flow` 是自包含的多步状态旅程；每个关键步骤都有 UI 与已知数据一致性断言，
  不依赖其他 case 创建的数据。
- `backend` 只在 API 映射存在时使用 `requests` / `request <id>`，或在精确时序
  下使用 `run-code`。错误、空态或超时使用 `route`，并在 cleanup 中 `unroute`。
  响应字段和性能阈值必须来自 RAG。

## 数据策略

- C-新增优先使用需求中给出的测试数据；仅在已授权 API 映射存在时才描述临时构造
  与清理。
- R 查询优先使用知识包登记的 fixture 或当前用户可见数据。
- **U/D 修改删除归属顺序（硬约束）**：
  1. 仅操作可由**当前登录用户身份**与 UI/API 可观测归属字段共同证明的数据；
     禁止只凭名称、猜测 ID 或列表顺序认定归属。
  2. 当前用户无可用数据时，优先在当前用户上下文创建带 run/case 可追踪标记、
     可清理的数据，再执行 U/D，并在 cleanup 中验证清理。
  3. 无法安全创建时，仅可使用任务源/RAG 已确认且受路径/环境约束的 Mock，
     并明确标注为 Mock（不得声称真实后端验证）。
  4. 既无法证明归属、也无法安全创建或 Mock 时，写 `blocked` evidence，
     `blockedReason` 使用：`current-user-data-unavailable` |
     `data-ownership-unverifiable` | `safe-test-data-setup-unavailable`，不执行 U/D。
  5. 禁止修改/删除其他用户数据、共享 fixture、生产数据或无法确认可清理的数据。
- 禁止使用生产 URL、真实用户凭据或不可清理的数据写入。无法证明隔离与清理时，
  case 必须为 `blocked`。

## 交接

生成结束时仅返回紧凑 JSON 摘要：case 总数、各维度数量、manifest 相对路径、
blocked case ID 与原因。详细内容保留在 case 文件，供后续 manifest/map 子节点
逐 case 读取，避免把完整用例塞进上游上下文。
