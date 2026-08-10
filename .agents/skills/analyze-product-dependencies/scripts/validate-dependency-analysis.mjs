#!/usr/bin/env node

import { existsSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { apiBlocks, assertHeadings, canonical, field, fieldBlock, headings, load, metadata, print, scopeIncludes, section, storyBlocks, tableValue, validateArtifactLocation } from "./validation-helpers.mjs";

const args = process.argv.slice(2);
const targetIndex = args.indexOf("--target");
const expectedTarget = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
const positional = args.filter((_, index) => targetIndex < 0 || (index !== targetIndex && index !== targetIndex + 1));
const [requirementArg, dependencyArg, apiArg] = positional;
if (!requirementArg || !dependencyArg) {
  console.error("Usage: node validate-dependency-analysis.mjs <product-requirement.md|none> <dependency-analysis.md> [api-documentation.md] [--target frontend|backend|both]");
  process.exit(2);
}
let requirement, dependency, api;
try {
  if (requirementArg !== "none") requirement = load(requirementArg, "Product Requirement");
  dependency = load(dependencyArg, "Dependency Analysis");
  if (apiArg) api = load(apiArg, "API Documentation");
} catch (error) { console.error(error.message); process.exit(2); }

const errors = [];
validateArtifactLocation(dependency, errors, "dependency-analysis.md");
const scope = metadata(dependency.text, "analysis_scope");
const status = metadata(dependency.text, "analysis_status");
const blockedOn = metadata(dependency.text, "blocked_on") ?? "";
const blockedReasons = blockedOn.split(/[\s,，]+/).filter(Boolean);
const source = metadata(dependency.text, "source_product_requirement");
const sourceApi = metadata(dependency.text, "source_api_documentation");
const repo = metadata(dependency.text, "repository_root");
const repoPath = repo && repo !== "none" ? resolve(dirname(dependency.path), repo) : "";
const repoExists = Boolean(repoPath && existsSync(repoPath) && statSync(repoPath).isDirectory());
const projectRoot = resolve(dirname(dependency.path), metadata(dependency.text, "project_root") ?? "");

if (metadata(dependency.text, "artifact_version") !== "3.0") errors.push("artifact_version must be 3.0.");
if (metadata(dependency.text, "artifact_type") !== "dependency-analysis") errors.push("artifact_type must be dependency-analysis.");
if (!["frontend", "backend", "both"].includes(scope)) errors.push("analysis_scope must be frontend, backend, or both.");
if (targetIndex >= 0 && !["frontend", "backend", "both"].includes(expectedTarget)) errors.push("--target must be frontend, backend, or both.");
else if (expectedTarget && scope !== expectedTarget) errors.push(`analysis_scope ${scope} does not match requested target ${expectedTarget}.`);
if (!["complete", "blocked"].includes(status)) errors.push("analysis_status must be complete or blocked.");

function validateRequirementLink({ allowScopeMismatch = false } = {}) {
  if (!requirement) return;
  if (basename(requirement.path) !== "product-requirement.md") errors.push("Product Requirement filename must be product-requirement.md.");
  if (!allowScopeMismatch && !scopeIncludes(metadata(requirement.text, "analysis_scope"), scope)) errors.push("analysis_scope must be included in Product Requirement scope.");
  if (metadata(dependency.text, "requirement_id") !== metadata(requirement.text, "requirement_id")) errors.push("requirement_id must match Product Requirement.");
  if (!source || resolve(dirname(dependency.path), source) !== requirement.path) errors.push("source_product_requirement must reference the supplied Product Requirement.");
  if (dirname(requirement.path) !== dirname(dependency.path)) errors.push("Dependency Analysis and Product Requirement must be in the same requirement directory.");
}

if (status === "blocked") {
  const allowed = new Set(["requirement-missing", "requirement-invalid", "requirement-not-complete", "repository-missing", "repository-unreadable", "scope-mismatch", "missing-stories", "missing-acceptance", "api-business-contract-incomplete"]);
  if (!blockedReasons.length || blockedOn === "none") errors.push("blocked analysis must declare blocked_on reasons.");
  for (const reason of blockedReasons) if (!allowed.has(reason)) errors.push(`Unknown blocked_on reason: ${reason}.`);
  if (requirement) validateRequirementLink({ allowScopeMismatch: blockedReasons.includes("scope-mismatch") });
  else {
    if (!blockedReasons.includes("requirement-missing")) errors.push("A missing Product Requirement requires blocked_on: requirement-missing.");
    if (source !== "none") errors.push("Missing Product Requirement must use source_product_requirement: none.");
  }
  if (!blockedReasons.some((reason) => ["repository-missing", "repository-unreadable"].includes(reason)) && !repoExists) errors.push("repository_root must be readable unless blocked on repository availability.");
  if (sourceApi !== "none") errors.push("Blocked Dependency Analysis must use source_api_documentation: none.");
  const required = ["分析范围", "输入与代码基线", "阻断原因", "恢复条件"];
  assertHeadings(dependency.text, 2, required, errors, "Blocked Dependency Analysis");
  for (const heading of headings(dependency.text, 2)) if (!required.includes(canonical(heading.title))) errors.push(`Blocked Dependency Analysis must not contain section ${canonical(heading.title)}.`);
  print("Dependency Analysis", dependency.path, errors);
  process.exit(0);
}

if (!requirement) errors.push("Complete Dependency Analysis requires Product Requirement input.");
else validateRequirementLink();
if (blockedOn !== "none") errors.push("complete analysis must use blocked_on: none.");
if (!repoExists) errors.push("repository_root must be an existing readable directory.");
if (repoPath && repoPath !== projectRoot) errors.push("repository_root must resolve to project_root.");
assertHeadings(dependency.text, 2, ["输入与代码基线", "用户故事覆盖矩阵", "跨故事共享依赖", "风险与未定位项"], errors, "Dependency Analysis");
if (/^##\s+(?:\d+[.、]?\s*)?(?:分析范围|追溯汇总)\s*$/m.test(dependency.text)) errors.push("Complete V3 Dependency Analysis must not contain 分析范围 or 追溯汇总 sections.");
if (scope === "frontend" || scope === "both") assertHeadings(dependency.text, 2, ["前端依赖详情"], errors, "Dependency Analysis");
if (scope === "backend" || scope === "both") assertHeadings(dependency.text, 2, ["后端依赖详情", "API 实现映射"], errors, "Dependency Analysis");
if (scope === "frontend" && /(?:^##\s+.*(?:后端依赖详情|API 实现映射)|\bBE-US-\d{3,}\b|\bAC-BE-\d{3,}\b|\bAPI-\d{3,}\b)/m.test(dependency.text)) errors.push("frontend scope must not contain backend dependency details or API mappings.");
if (scope === "backend" && /(?:^##\s+.*前端依赖详情|\bFE-US-\d{3,}\b|\bAC-FE-\d{3,}\b)/m.test(dependency.text)) errors.push("backend scope must not contain frontend dependency details.");

const frontendStories = requirement && (scope === "frontend" || scope === "both") ? storyBlocks(section(requirement.text, 2, "前端用户故事"), "FE-US") : [];
const backendStories = requirement && (scope === "backend" || scope === "both") ? storyBlocks(section(requirement.text, 2, "后端用户故事"), "BE-US") : [];
const apiRequired = backendStories.some((story) => /\bAPI\b/i.test(field(story.text, "触发方式") ?? ""));
if (apiRequired) {
  if (!api) errors.push("API-triggered backend stories require api-documentation.md.");
  if (!sourceApi || sourceApi === "none") errors.push("API-triggered backend stories require source_api_documentation.");
  if (api && resolve(dirname(dependency.path), sourceApi) !== api.path) errors.push("source_api_documentation must reference the supplied API Documentation.");
} else {
  if (api) errors.push("API Documentation must not be supplied when no selected backend story uses API.");
  if (sourceApi !== "none") errors.push("Non-API analysis must use source_api_documentation: none.");
  if ((scope === "backend" || scope === "both") && !/不适用.*不涉及 HTTP API/s.test(section(dependency.text, 2, "API 实现映射") ?? "")) errors.push("Non-API analysis must mark API 实现映射 not applicable.");
}

function validateDetails(frontend, expectedStories) {
  const title = frontend ? "前端依赖详情" : "后端依赖详情";
  const prefix = frontend ? "FE-US" : "BE-US";
  const acPrefix = frontend ? "AC-FE" : "AC-BE";
  const requiredFields = frontend
    ? ["验收标准", "页面/路由", "组件", "状态", "API client/类型", "状态与边界落点", "定位证据", "风险", "置信度"]
    : ["验收标准", "API 文档引用", "路由/入口", "Controller/Handler", "Service/领域逻辑", "DTO/Schema", "数据依赖", "权限依赖", "错误/日志/审计", "测试落点", "定位证据", "风险", "置信度"];
  const details = storyBlocks(section(dependency.text, 2, title), prefix);
  for (const story of expectedStories) if (!details.some((item) => item.id === story.id)) errors.push(`Dependency Analysis is missing ${title} for ${story.id}.`);
  for (const detail of details) {
    const story = expectedStories.find((item) => item.id === detail.id);
    if (!story) errors.push(`Dependency Analysis contains unselected story ${detail.id}.`);
    for (const name of requiredFields) if (!field(detail.text, name)) errors.push(`${detail.id} dependency detail is missing field ${name}.`);
    const impact = fieldBlock(detail.text, "影响文件");
    if (!impact) errors.push(`${detail.id} dependency detail is missing field 影响文件.`);
    const declarations = [...impact.matchAll(/^\s*-\s*(F\d+)\s+(add|modify|reuse|新增|修改|复用)\s+`?([^`\r\n]+)`?/gmi)];
    if (!declarations.length) errors.push(`${detail.id} 影响文件 must declare F<number>, add/modify/reuse, and a path.`);
    const declared = declarations.map((item) => item[1]);
    if (new Set(declared).size !== declared.length) errors.push(`${detail.id} 影响文件 contains duplicate file IDs.`);
    for (const ref of detail.text.match(/\bF\d+\b/g) ?? []) if (!declared.includes(ref)) errors.push(`${detail.id} references undeclared impact file ${ref}.`);
    if (!/^(?:high|medium|low)$/i.test(field(detail.text, "置信度") ?? "")) errors.push(`${detail.id} 置信度 must be high, medium, or low.`);
    if (story) {
      const expected = field(story.text, "验收标准")?.match(new RegExp(`${acPrefix}-\\d{3,}`, "g")) ?? [];
      const actual = field(detail.text, "验收标准")?.match(new RegExp(`${acPrefix}-\\d{3,}`, "g")) ?? [];
      if ([...expected].sort().join() !== [...actual].sort().join()) errors.push(`${detail.id} acceptance references must match Product Requirement.`);
    }
  }
}

if (scope === "frontend" || scope === "both") validateDetails(true, frontendStories);
if (scope === "backend" || scope === "both") validateDetails(false, backendStories);
const coverage = section(dependency.text, 2, "用户故事覆盖矩阵") ?? "";
for (const story of [...frontendStories, ...backendStories]) {
  if (!coverage.includes(story.id)) errors.push(`Coverage matrix is missing ${story.id}.`);
  for (const ac of field(story.text, "验收标准")?.match(/AC-(?:FE|BE)-\d{3,}/g) ?? []) if (!coverage.includes(ac)) errors.push(`Coverage matrix is missing ${ac}.`);
}

if (api) {
  const mapping = section(dependency.text, 2, "API 实现映射") ?? "";
  for (const item of apiBlocks(api.text)) {
    const operation = tableValue(item.text, "Operation ID");
    const signature = item.text.match(/^>\s*`((?:GET|POST|PUT|PATCH|DELETE)\s+\/[^`]+)`/m)?.[1];
    if (!mapping.includes(item.id)) errors.push(`API 实现映射 is missing ${item.id}.`);
    if (operation && !mapping.includes(operation)) errors.push(`API 实现映射 is missing Operation ID ${operation}.`);
    if (signature && !mapping.includes(signature)) errors.push(`API 实现映射 is missing ${signature}.`);
  }
}
print("Dependency Analysis", dependency.path, errors);
