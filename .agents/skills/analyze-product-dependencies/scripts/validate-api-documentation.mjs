#!/usr/bin/env node

import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { apiBlocks, assertHeadings, field, headings, load, metadata, print, scopeIncludes, section, storyBlocks, tableValue, validateArtifactLocation } from "./validation-helpers.mjs";

const args = process.argv.slice(2);
const targetIndex = args.indexOf("--target");
const expectedTarget = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
const positional = args.filter((_, index) => targetIndex < 0 || (index !== targetIndex && index !== targetIndex + 1));
if (positional.length < 2) {
  console.error("Usage: node validate-api-documentation.mjs <product-requirement.md> <api-documentation.md> [--target backend|both]");
  process.exit(2);
}
let requirement, api;
try { requirement = load(positional[0], "Product Requirement"); api = load(positional[1], "API Documentation"); }
catch (error) { console.error(error.message); process.exit(2); }

const errors = [];
validateArtifactLocation(api, errors, "api-documentation.md");
const scope = metadata(api.text, "analysis_scope");
const upstreamScope = metadata(requirement.text, "analysis_scope");
if (metadata(api.text, "artifact_version") !== "3.0") errors.push("artifact_version must be 3.0.");
if (metadata(api.text, "artifact_type") !== "api-documentation") errors.push("artifact_type must be api-documentation.");
if (metadata(api.text, "api_status") !== "complete") errors.push("api_status must be complete.");
if (!["backend", "both"].includes(scope)) errors.push("analysis_scope must be backend or both for API Documentation.");
if (targetIndex >= 0 && !["backend", "both"].includes(expectedTarget)) errors.push("--target must be backend or both for API Documentation.");
else if (expectedTarget && scope !== expectedTarget) errors.push(`analysis_scope ${scope} does not match requested target ${expectedTarget}.`);
if (!scopeIncludes(upstreamScope, scope)) errors.push("analysis_scope must be included in Product Requirement scope.");
if (metadata(api.text, "requirement_id") !== metadata(requirement.text, "requirement_id")) errors.push("requirement_id must match Product Requirement.");
const source = metadata(api.text, "source_product_requirement");
if (!source || resolve(dirname(api.path), source) !== requirement.path) errors.push("source_product_requirement must reference the supplied Product Requirement.");
if (dirname(requirement.path) !== dirname(api.path)) errors.push("API Documentation and Product Requirement must be in the same requirement directory.");
const repo = metadata(api.text, "repository_root");
const repoPath = repo ? resolve(dirname(api.path), repo) : "";
if (!repoPath || !existsSync(repoPath) || !statSync(repoPath).isDirectory()) errors.push("repository_root must be an existing readable directory.");
const projectRoot = resolve(dirname(api.path), metadata(api.text, "project_root") ?? "");
if (repoPath && projectRoot && repoPath !== projectRoot) errors.push("repository_root must resolve to project_root.");

assertHeadings(api.text, 2, ["通用约定", "API 索引", "API 详情", "数据模型", "错误码"], errors, "API Documentation");
const conventions = section(api.text, 2, "通用约定") ?? "";
assertHeadings(conventions, 3, ["Base URL", "统一响应结构", "错误响应结构", "分页约定", "时间和标识符规范"], errors, "通用约定");
if (/(?:认证方式|认证要求|鉴权方式|鉴权要求|权限要求|权限规则|访问控制要求|Authorization|Bearer|X-API-Key|access[_-]?token|id[_-]?token|业务规则|业务逻辑|实现逻辑|处理逻辑|分支逻辑|数据读写逻辑|实现算法)/i.test(api.text)) errors.push("API Documentation must not contain authentication, permission, business-rule, or implementation-logic content.");
if (/(?:复用检查|通用定义复用)/.test(api.text)) errors.push("API Documentation must not contain reuse-check sections or search evidence.");
const index = section(api.text, 2, "API 索引") ?? "";
const blocks = apiBlocks(api.text);
if (!blocks.length) errors.push("API Documentation must contain at least one API-* detail.");
const ids = new Set();
const operations = new Set();
for (const block of blocks) {
  if (ids.has(block.id)) errors.push(`Duplicate API ID: ${block.id}.`);
  ids.add(block.id);
  const operation = tableValue(block.text, "Operation ID");
  if (!operation) errors.push(`${block.id} is missing Operation ID.`);
  else if (operations.has(operation)) errors.push(`Duplicate Operation ID: ${operation}.`);
  else operations.add(operation);
  for (const name of ["Operation ID", "变更类型", "幂等性"]) if (!tableValue(block.text, name)) errors.push(`${block.id} is missing basic information field ${name}.`);
  if (tableValue(block.text, "API ID")) errors.push(`${block.id} basic information must not repeat API ID.`);
  if (tableValue(block.text, "变更类型") && !["新增", "修改", "复用"].includes(tableValue(block.text, "变更类型"))) errors.push(`${block.id} 变更类型 is invalid.`);
  const signature = block.text.match(/^>\s*`(GET|POST|PUT|PATCH|DELETE)\s+(\/[^`]+)`/m);
  if (!signature) errors.push(`${block.id} is missing a Swagger-style method and path signature.`);
  for (const title of ["基本信息", "成功响应", "错误响应"]) if (!headings(block.text, 4).some((item) => item.title.trim() === title)) errors.push(`${block.id} is missing section ${title}.`);
  const query = section(block.text, 4, "Query 参数") ?? "";
  if (/\b(?:pageSize|page_size|limit|cursor|page)\b/i.test(query)) {
    const pageSizeRow = query.split(/\r?\n/).find((line) => /^\|\s*(?:pageSize|page_size|limit)\s*\|/i.test(line));
    if (!pageSizeRow) errors.push(`${block.id} paginated API must define an optional page-size parameter.`);
    else {
      if (!/^\|\s*(?:pageSize|page_size|limit)\s*\|\s*[^|]+\|\s*(?:否|可选)\s*\|/i.test(pageSizeRow)) errors.push(`${block.id} page-size parameter must be optional.`);
      const values = [...new Set(pageSizeRow.match(/\b\d+\b/g) ?? [])].sort((a, b) => Number(a) - Number(b));
      if (values.join(",") !== "10,20,50,100") errors.push(`${block.id} page-size values must be exactly 10, 20, 50, and 100.`);
    }
  }
  if (signature) {
    const parameters = signature[2].match(/\{([^}]+)\}/g) ?? [];
    const pathSection = section(block.text, 4, "Path 参数") ?? "";
    if (parameters.length && !pathSection) errors.push(`${block.id} path template requires Path 参数.`);
    for (const parameter of parameters) {
      const name = parameter.slice(1, -1);
      if (!new RegExp(`^\\|\\s*${name}\\s*\\|`, "m").test(pathSection)) errors.push(`${block.id} path parameter ${name} is not documented.`);
    }
  }
  const success = section(block.text, 4, "成功响应") ?? "";
  const error = section(block.text, 4, "错误响应") ?? "";
  if (!/HTTP(?: 状态码)?[：:]\s*2\d\d/.test(success)) errors.push(`${block.id} must define a 2xx success response.`);
  if (!/^\|\s*[45]\d\d\s*\|/m.test(error)) errors.push(`${block.id} must define at least one 4xx or 5xx error response.`);
  for (const [content, label] of [[success, "success"], [error, "error"]]) {
    const example = content.match(/```json\s*([\s\S]*?)```/)?.[1];
    if (!example) errors.push(`${block.id} must include a JSON ${label} example.`);
    else try { JSON.parse(example); } catch { errors.push(`${block.id} ${label} example must be valid JSON.`); }
  }
  if (!index.includes(block.id)) errors.push(`${block.id} is missing from API index.`);
  if (operation && !index.includes(operation)) errors.push(`${block.id} Operation ID is missing from API index.`);
  if (signature && !index.includes(`${signature[1]} ${signature[2]}`)) errors.push(`${block.id} method and path are missing from API index.`);
}

const requiredApiStories = storyBlocks(section(requirement.text, 2, "后端用户故事"), "BE-US").filter((story) => /\bAPI\b/i.test(field(story.text, "触发方式") ?? ""));
for (const story of requiredApiStories) {
  if (!index.includes(story.id)) errors.push(`API index does not cover API-triggered story ${story.id}.`);
  for (const ac of field(story.text, "验收标准")?.match(/AC-BE-\d{3,}/g) ?? []) if (!index.includes(ac)) errors.push(`API index does not trace ${ac}.`);
}
print("API Documentation", api.path, errors);
