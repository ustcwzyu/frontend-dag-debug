#!/usr/bin/env node

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "dependency-v3-validators-"));
const repo = join(temp, "repo");
const artifactDir = join(repo, "docs", "product-analysis", "refund-status");
mkdirSync(artifactDir, { recursive: true });
const requirementValidator = join(scriptDir, "validate-product-requirement-input.mjs");
const apiValidator = join(scriptDir, "validate-api-documentation.mjs");
const dependencyValidator = join(scriptDir, "validate-dependency-analysis.mjs");

const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
function pass(name, result) {
  if (result.status !== 0) throw new Error(`${name} should pass:\n${result.stderr}${result.stdout}`);
}
function fail(name, result, message) {
  if (result.status === 0) throw new Error(`${name} should fail.`);
  if (message && !`${result.stderr}${result.stdout}`.includes(message)) throw new Error(`${name} should mention ${message}:\n${result.stderr}${result.stdout}`);
}
function variant(name, text) {
  const path = join(artifactDir, name);
  writeFileSync(path, text);
  return path;
}

const requirementPath = join(artifactDir, "product-requirement.md");
const apiPath = join(artifactDir, "api-documentation.md");
const dependencyPath = join(artifactDir, "dependency-analysis.md");

const requirement = `---
artifact_version: "3.0"
artifact_type: product-requirement
requirement_id: refund-status
project_root: ../../..
requirement_status: complete
analysis_scope: backend
source_requirement: inline
source_product_analysis: none
source_clarification: none
---
# Product Requirement
## 1. 需求概述
订单所属用户可以查询退款状态。
## 2. 业务目标
- 提供可解释的退款进度。
## 3. 需求范围
### 3.1 已确认需求
- 仅订单所属用户可查询。
### 3.2 非目标
- 不修改退款流程。
### 3.3 默认假设
- 无。
### 3.4 未决事项
- 无。
## 4. 业务规则
- 不得泄露其他用户订单。
## 5. 后端用户故事
### BE-US-001 查询退款状态
- 系统能力：返回指定订单的退款状态
- 使用方：订单详情页
- 业务价值：让用户了解退款进度
- 触发方式：API
- 验收标准：AC-BE-001
## 6. 后端输出规范
### BE-US-001 查询退款状态
- 输入语义：当前用户和订单 ID
- 输出语义：退款状态、步骤和更新时间
- 数据读写：只读订单及退款记录
- 权限规则：仅订单所属用户
- 业务规则：按最新退款记录返回
- 安全要求：不得泄露内部错误或其他用户数据
- 幂等与并发：重复查询不修改数据
- 错误与边界：订单不存在返回标准错误
#### AC-BE-001 返回退款状态
Given：
- 请求用户已认证且拥有目标订单。
When：
- 用户请求目标订单退款状态。
Then：
- HTTP 状态码为 200。
- 返回 refundStatus 和 updatedAt。
- 查询不得修改退款记录。
异常场景：
- 无权访问时返回 403 且不得泄露订单详情。
## 7. 决策追溯
- 需求直接来源于明确需求。
`;

const api = `---
artifact_version: "3.0"
artifact_type: api-documentation
requirement_id: refund-status
project_root: ../../..
api_status: complete
analysis_scope: backend
source_product_requirement: ./product-requirement.md
repository_root: ../../..
---
# API Documentation
## 1. 通用约定
### 1.1 Base URL
- /api/v1
### 1.2 统一响应结构
- data 包裹成功响应。
### 1.3 错误响应结构
- code 和 message。
### 1.4 分页约定
- 本接口不分页。
### 1.5 时间和标识符规范
- ISO 8601 和字符串 ID。
## 2. API 索引
| API | Method + Path | Operation ID | 用户故事 | AC | 变更 |
|---|---|---|---|---|---|
| API-001 | GET /api/v1/orders/{orderId}/refund-status | getRefundStatus | BE-US-001 | AC-BE-001 | 新增 |
## 3. API 详情
### API-001 查询退款状态
> \`GET /api/v1/orders/{orderId}/refund-status\`
#### 基本信息
| 字段 | 值 |
|---|---|
| Operation ID | getRefundStatus |
| 变更类型 | 新增 |
| 幂等性 | 只读请求天然幂等 |
#### Path 参数
| 参数 | 类型 | 必填 | 语义 |
|---|---|---|---|
| orderId | string | 是 | 订单标识 |
#### 成功响应
- HTTP：200
\`\`\`json
{"data":{"refundStatus":"processing","updatedAt":"2026-01-01T00:00:00Z"}}
\`\`\`
#### 错误响应
| 状态码 | 错误码 | 条件 |
|---|---|---|
| 403 | FORBIDDEN | 资源访问被拒绝 |
\`\`\`json
{"code":"FORBIDDEN","message":"forbidden"}
\`\`\`
## 4. 数据模型
- RefundStatus 包含 refundStatus 和 updatedAt。
## 5. 错误码
- FORBIDDEN：请求被拒绝。
`;

const dependency = `---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: refund-status
project_root: ../../..
analysis_scope: backend
source_product_requirement: ./product-requirement.md
source_api_documentation: ./api-documentation.md
repository_root: ../../..
analysis_status: complete
blocked_on: none
---
# Dependency Analysis
## 1. 输入与代码基线
- 需求：./product-requirement.md
- 仓库：../../..
## 2. 用户故事覆盖矩阵
| 故事 | AC | API | 主要代码入口 | 状态 |
|---|---|---|---|---|
| BE-US-001 | AC-BE-001 | API-001 | F1 | confirmed |
## 3. 后端依赖详情
### BE-US-001 查询退款状态
- 验收标准：AC-BE-001
- API 文档引用：API-001
- 影响文件：
  - F1 modify \`src/refund/refund.controller.ts\`：增加查询入口
  - F2 modify \`src/refund/refund.service.ts\`：组合退款状态
  - F3 reuse \`src/refund/refund.repository.ts\`：读取退款记录
- 路由/入口：F1 注册退款状态路由
- Controller/Handler：F1 校验身份和订单 ID
- Service/领域逻辑：F2 组合状态和更新时间
- DTO/Schema：F1 复用统一响应结构
- 数据依赖：F3 读取退款记录
- 权限依赖：F1 校验订单归属
- 错误/日志/审计：F1 映射 403 和 404
- 测试落点：F1、F2 的相邻测试文件
- 定位证据：现有订单路由调用 F2，F2 注入 F3
- 风险：旧退款记录可能缺少 updatedAt
- 置信度：high
## 4. API 实现映射
| API | Operation ID | 方法与路径 | 代码入口 |
|---|---|---|---|
| API-001 | getRefundStatus | GET /api/v1/orders/{orderId}/refund-status | F1 |
## 5. 跨故事共享依赖
- 复用订单鉴权和统一错误结构。
## 6. 风险与未定位项
- 需要确认历史数据的 updatedAt 完整性。
`;

writeFileSync(requirementPath, requirement);
writeFileSync(apiPath, api);
writeFileSync(dependencyPath, dependency);

const paginationSections = `#### Query 参数
| 参数 | 类型 | 必填 | 允许值 | 语义 |
|---|---|---|---|---|
| pageSize | integer | 否 | 10 \| 20 \| 50 \| 100 | 每页条数 |
| cursor | string | 否 | - | 下一页游标 |
`;
const paginatedApi = api.replace("#### 成功响应", `${paginationSections}#### 成功响应`);

let checks = 0;
function expectPass(name, script, args) { pass(name, run(script, args)); checks += 1; }
function expectFail(name, script, args, message) { fail(name, run(script, args), message); checks += 1; }

expectPass("valid V3 requirement input", requirementValidator, [requirementPath, "--target", "backend"]);
expectFail("reject scope expansion", requirementValidator, [requirementPath, "--target", "both"], "not included");
expectFail("require matching output spec", requirementValidator, [variant("requirement-no-spec.md", requirement.replace("### BE-US-001 查询退款状态\n- 输入语义", "### BE-US-002 查询退款状态\n- 输入语义"))], "Missing output specification");
expectFail("require matching AC", requirementValidator, [variant("requirement-bad-ac.md", requirement.replace("- 验收标准：AC-BE-001", "- 验收标准：AC-BE-002"))], "must match");

expectPass("valid compact API documentation", apiValidator, [requirementPath, apiPath, "--target", "backend"]);
writeFileSync(apiPath, paginatedApi);
expectPass("valid optional page sizes", apiValidator, [requirementPath, apiPath]);
writeFileSync(apiPath, api);
expectFail("pagination requires all page sizes", apiValidator, [requirementPath, variant("api-pagination-incomplete.md", paginatedApi.replace("10 | 20 | 50 | 100", "10 | 20 | 50"))], "exactly 10, 20, 50, and 100");
expectFail("pagination page size must be optional", apiValidator, [requirementPath, variant("api-pagination-required.md", paginatedApi.replace("| pageSize | integer | 否 |", "| pageSize | integer | 是 |"))], "must be optional");
expectFail("API index covers story", apiValidator, [requirementPath, variant("api-no-story.md", api.replace("BE-US-001 | AC-BE-001", "BE-US-999 | AC-BE-001"))], "does not cover");
expectFail("API success JSON must parse", apiValidator, [requirementPath, variant("api-bad-json.md", api.replace("{\"data\":{\"refundStatus\":\"processing\",\"updatedAt\":\"2026-01-01T00:00:00Z\"}}", "{bad json}"))], "must be valid JSON");
expectFail("API does not repeat ID", apiValidator, [requirementPath, variant("api-repeat-id.md", api.replace("| Operation ID | getRefundStatus |", "| API ID | API-001 |\n| Operation ID | getRefundStatus |"))], "must not repeat API ID");
expectFail("API rejects authentication sections", apiValidator, [requirementPath, variant("api-auth.md", api.replace("### 1.2 统一响应结构", "### 1.2 认证方式\n- Bearer token\n### 1.3 统一响应结构"))], "must not contain authentication");
expectFail("API rejects reuse-check output", apiValidator, [requirementPath, variant("api-reuse-check.md", api.replace("## 4. 数据模型", "## 4. 数据模型\n### 4.1 复用检查"))], "must not contain reuse-check");

expectPass("valid V3 dependency analysis", dependencyValidator, [requirementPath, dependencyPath, apiPath, "--target", "backend"]);
expectFail("impact files are required", dependencyValidator, [requirementPath, variant("dependency-no-impact.md", dependency.replace(/- 影响文件：[\s\S]*?- 路由\/入口：/, "- 路由/入口：")), apiPath], "missing field 影响文件");
expectFail("impact file IDs must be declared", dependencyValidator, [requirementPath, variant("dependency-bad-file-ref.md", dependency.replace("- Service/领域逻辑：F2", "- Service/领域逻辑：F9")), apiPath], "undeclared impact file F9");
expectFail("dependency rejects trace summary", dependencyValidator, [requirementPath, variant("dependency-trace.md", dependency + "\n## 7. 追溯汇总\n- BE-US-001。\n"), apiPath], "must not contain 分析范围 or 追溯汇总");
expectFail("API mapping keeps operation", dependencyValidator, [requirementPath, variant("dependency-no-operation.md", dependency.replace("getRefundStatus", "missingOperation")), apiPath], "missing Operation ID getRefundStatus");
expectFail("dependency AC matches requirement", dependencyValidator, [requirementPath, variant("dependency-bad-ac.md", dependency.replace("- 验收标准：AC-BE-001", "- 验收标准：AC-BE-002")), apiPath], "must match Product Requirement");

const blocked = `---
artifact_version: "3.0"
artifact_type: dependency-analysis
requirement_id: refund-status
project_root: ../../..
analysis_scope: backend
source_product_requirement: none
source_api_documentation: none
repository_root: none
analysis_status: blocked
blocked_on: requirement-missing repository-missing
---
# Dependency Analysis
## 1. 分析范围
- backend
## 2. 输入与代码基线
- 未提供需求和仓库。
## 3. 阻断原因
- 缺少 Product Requirement。
## 4. 恢复条件
- 提供 complete Product Requirement 和仓库。
`;
writeFileSync(dependencyPath, blocked);
expectPass("valid blocked dependency", dependencyValidator, ["none", dependencyPath, "--target", "backend"]);
writeFileSync(dependencyPath, dependency);

console.log(`Dependency V3 validator matrix passed: ${checks} checks.`);
