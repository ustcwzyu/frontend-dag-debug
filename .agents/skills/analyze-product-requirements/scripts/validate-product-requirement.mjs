#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { acceptanceBlocks, assertHeadings, containsUnresolvedBlockingPriority, field, loadMarkdown, metadata, outputSpecBlocks, printResult, section, storyBlocks, validateAcceptance, validateArtifactLocation, validateStorySpecCoverage } from "./validation-helpers.mjs";

const args = process.argv.slice(2);
const allowPending = args.includes("--allow-pending");
const targetIndex = args.indexOf("--target");
const expectedTarget = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
const fileArg = args.find((arg, index) => !arg.startsWith("--") && (targetIndex < 0 || index !== targetIndex + 1));
if (!fileArg) {
  console.error("Usage: node validate-product-requirement.mjs <product-requirement.md> [--target frontend|backend|both] [--allow-pending]");
  process.exit(2);
}

let artifact;
try { artifact = loadMarkdown(fileArg, "Product Requirement"); }
catch (error) { console.error(error.message); process.exit(2); }

const { path, text } = artifact;
const errors = [];
validateArtifactLocation(artifact, errors, "product-requirement.md");
const scope = metadata(text, "analysis_scope");
const status = metadata(text, "requirement_status");
if (metadata(text, "artifact_version") !== "3.0") errors.push("artifact_version must be 3.0.");
if (metadata(text, "artifact_type") !== "product-requirement") errors.push("artifact_type must be product-requirement.");
if (!["frontend", "backend", "both"].includes(scope)) errors.push("analysis_scope must be frontend, backend, or both.");
if (targetIndex >= 0 && !["frontend", "backend", "both"].includes(expectedTarget)) errors.push("--target must be frontend, backend, or both.");
else if (expectedTarget && scope !== expectedTarget) errors.push(`analysis_scope ${scope} does not match requested target ${expectedTarget}.`);
if (!["pending", "complete"].includes(status)) errors.push("requirement_status must be pending or complete.");
if (!allowPending && status !== "complete") errors.push("Final Product Requirement must be complete.");

function sourcePath(name) {
  const value = metadata(text, name);
  if (!value || ["inline", "none"].includes(value)) return value;
  return resolve(dirname(path), value);
}
for (const name of ["source_requirement", "source_product_analysis", "source_clarification"]) {
  const value = sourcePath(name);
  if (!value) errors.push(`${name} is required.`);
  else if (!["inline", "none"].includes(value) && !existsSync(value)) errors.push(`${name} does not exist: ${value}`);
}
for (const name of ["source_product_analysis", "source_clarification"]) {
  const value = sourcePath(name);
  if (value && !["inline", "none"].includes(value) && dirname(value) !== dirname(path)) errors.push(`${name} must reference an artifact in the same requirement directory.`);
}

assertHeadings(text, 2, ["需求概述", "业务目标", "需求范围", "业务规则", "决策追溯"], errors, "Product Requirement");
const range = section(text, 2, "需求范围") ?? "";
assertHeadings(range, 3, ["已确认需求", "非目标", "默认假设", "未决事项"], errors, "需求范围");
if (status === "complete" && containsUnresolvedBlockingPriority(section(range, 3, "未决事项") ?? "")) errors.push("Complete Product Requirement cannot contain unresolved P0/P1 items.");
if (/^##\s+(?:\d+[.、]?\s*)?(?:用户角色|验收标准汇总)\s*$/m.test(text)) errors.push("Product Requirement must not contain standalone 用户角色 or 验收标准汇总 sections.");

function validateDomain(domain) {
  const frontend = domain === "frontend";
  const title = frontend ? "前端" : "后端";
  const prefix = frontend ? "FE-US" : "BE-US";
  const acPrefix = frontend ? "AC-FE" : "AC-BE";
  const storyHeading = `${title}用户故事`;
  const specHeading = `${title}输出规范`;
  assertHeadings(text, 2, [storyHeading, specHeading], errors, "Product Requirement");
  const stories = storyBlocks(section(text, 2, storyHeading), prefix);
  const specs = outputSpecBlocks(section(text, 2, specHeading), prefix);
  if (!stories.length) errors.push(`${storyHeading} must contain at least one ${prefix}-* story.`);
  validateStorySpecCoverage(stories, specs, errors, `${title} scope`);
  const storyFields = frontend ? ["角色", "目标", "价值", "入口", "验收标准"] : ["系统能力", "使用方", "业务价值", "触发方式", "验收标准"];
  const specFields = frontend ? ["页面/组件", "展示内容", "交互动作", "UI 状态", "表单校验", "权限可见性", "边界处理"] : ["输入语义", "输出语义", "数据读写", "权限规则", "业务规则", "安全要求", "幂等与并发", "错误与边界"];
  for (const story of stories) {
    for (const name of storyFields) if (!field(story.text, name)) errors.push(`${story.id} is missing story field ${name}.`);
    if (!frontend && !/^(?:API|定时任务|事件|消息|内部调用|数据迁移)(?:$|[、,，/])/i.test(field(story.text, "触发方式") ?? "")) errors.push(`${story.id} 触发方式 is invalid.`);
    const spec = specs.find((item) => item.id === story.id);
    if (!spec) continue;
    for (const name of specFields) if (!field(spec.text, name)) errors.push(`${spec.id} output specification is missing field ${name}.`);
    const criteria = acceptanceBlocks(spec, acPrefix);
    if (!criteria.length) errors.push(`${spec.id} output specification must contain at least one ${acPrefix}-* acceptance criterion.`);
    for (const item of criteria) validateAcceptance(item.text, item.id, errors);
    const referenced = [...(field(story.text, "验收标准") ?? "").matchAll(new RegExp(`${acPrefix}-\\d{3,}`, "g"))].map((item) => item[0]).sort();
    const actual = criteria.map((item) => item.id).sort();
    if (referenced.join() !== actual.join()) errors.push(`${story.id} acceptance references must match its output specification criteria.`);
  }
}

if (scope === "frontend" || scope === "both") validateDomain("frontend");
if (scope === "backend" || scope === "both") validateDomain("backend");
if (scope === "frontend" && /(?:^##\s+.*后端|^###\s+BE-US-)/m.test(text)) errors.push("frontend scope must not contain backend sections or stories.");
if (scope === "backend" && /(?:^##\s+.*前端|^###\s+FE-US-)/m.test(text)) errors.push("backend scope must not contain frontend sections or stories.");

const clarificationSource = sourcePath("source_clarification");
if (status === "complete" && clarificationSource && !["inline", "none"].includes(clarificationSource) && existsSync(clarificationSource)) {
  const clarification = readFileSync(clarificationSource, "utf8");
  if (metadata(clarification, "clarification_status") !== "complete") errors.push("Complete Product Requirement requires complete source clarification.");
  const markers = [...clarification.matchAll(/^-\s*决策标记[：:]\s*(DEC-Q-\d{3,})/gm)].map((item) => item[1]);
  for (const marker of markers) if (!text.includes(marker)) errors.push(`${marker} from source clarification is missing from Product Requirement.`);
}

printResult("Product Requirement", path, errors);
