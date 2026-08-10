#!/usr/bin/env node

import { acceptanceBlocks, assertHeadings, containsUnresolvedBlockingPriority, field, load, metadata, outputSpecBlocks, print, scopeIncludes, section, storyBlocks, validateAcceptance, validateArtifactLocation } from "./validation-helpers.mjs";

const args = process.argv.slice(2);
const fileArg = args[0];
const targetIndex = args.indexOf("--target");
const target = targetIndex >= 0 ? args[targetIndex + 1] : args[1];
if (!fileArg) {
  console.error("Usage: node validate-product-requirement-input.mjs <product-requirement.md> [frontend|backend|both] | [--target frontend|backend|both]");
  process.exit(2);
}
let artifact;
try { artifact = load(fileArg, "Product Requirement"); }
catch (error) { console.error(error.message); process.exit(2); }

const errors = [];
validateArtifactLocation(artifact, errors, "product-requirement.md");
const version = metadata(artifact.text, "artifact_version");
const upstreamScope = metadata(artifact.text, "analysis_scope");
const scope = target ?? upstreamScope;
if (!["2.0", "3.0"].includes(version)) errors.push("artifact_version must be 2.0 or 3.0.");
if (metadata(artifact.text, "artifact_type") !== "product-requirement") errors.push("artifact_type must be product-requirement.");
if (metadata(artifact.text, "requirement_status") !== "complete") errors.push("requirement_status must be complete.");
if (!["frontend", "backend", "both"].includes(upstreamScope)) errors.push("analysis_scope must be frontend, backend, or both.");
if (!["frontend", "backend", "both"].includes(scope)) errors.push("target must be frontend, backend, or both.");
else if (!scopeIncludes(upstreamScope, scope)) errors.push(`target ${scope} is not included in upstream scope ${upstreamScope}.`);

if (version === "3.0") {
  assertHeadings(artifact.text, 2, ["需求概述", "业务目标", "需求范围", "业务规则", "决策追溯"], errors, "Product Requirement");
  if (/^##\s+(?:\d+[.、]?\s*)?(?:用户角色|验收标准汇总)\s*$/m.test(artifact.text)) errors.push("V3 Product Requirement must not contain standalone 用户角色 or 验收标准汇总 sections.");
} else {
  assertHeadings(artifact.text, 2, ["需求背景", "需求摘要", "业务目标", "用户角色", "需求范围", "业务规则", "验收标准汇总", "决策追溯"], errors, "V2 Product Requirement");
}
const range = section(artifact.text, 2, "需求范围") ?? "";
assertHeadings(range, 3, ["已确认需求", "非目标", "默认假设", "未决事项"], errors, "需求范围");
if (containsUnresolvedBlockingPriority(section(range, 3, "未决事项") ?? "")) errors.push("Product Requirement contains unresolved P0/P1 items.");

function validateDomain(name) {
  const frontend = name === "frontend";
  const title = frontend ? "前端" : "后端";
  const prefix = frontend ? "FE-US" : "BE-US";
  const acPrefix = frontend ? "AC-FE" : "AC-BE";
  const storyFields = version === "3.0"
    ? (frontend ? ["角色", "目标", "价值", "入口", "验收标准"] : ["系统能力", "使用方", "业务价值", "触发方式", "验收标准"])
    : (frontend ? ["用户角色", "用户目标", "页面/入口", "页面/组件", "展示内容", "交互动作", "UI 状态", "权限可见性", "前端边界处理", "验收标准"] : ["系统能力", "使用方", "触发方式", "输入语义", "输出语义", "数据读写", "权限规则", "业务规则", "安全要求", "后端边界处理", "验收标准"]);
  assertHeadings(artifact.text, 2, [`${title}用户故事`, `${title}输出规范`], errors, "Product Requirement");
  const stories = storyBlocks(section(artifact.text, 2, `${title}用户故事`), prefix);
  if (!stories.length) errors.push(`Missing ${prefix}-* stories.`);
  const specs = version === "3.0" ? outputSpecBlocks(section(artifact.text, 2, `${title}输出规范`), prefix) : [];
  const specFields = frontend ? ["页面/组件", "展示内容", "交互动作", "UI 状态", "表单校验", "权限可见性", "边界处理"] : ["输入语义", "输出语义", "数据读写", "权限规则", "业务规则", "安全要求", "幂等与并发", "错误与边界"];
  const seen = new Set();
  for (const story of stories) {
    if (seen.has(story.id)) errors.push(`Duplicate story ID: ${story.id}.`);
    seen.add(story.id);
    for (const fieldName of storyFields) if (!field(story.text, fieldName)) errors.push(`${story.id} is missing field ${fieldName}.`);
    if (!frontend && !/^(?:API|定时任务|事件|消息|内部调用|数据迁移)(?:$|[、,，/])/i.test(field(story.text, "触发方式") ?? "")) errors.push(`${story.id} 触发方式 is invalid.`);
    const container = version === "3.0" ? specs.find((spec) => spec.id === story.id) : story;
    if (!container) {
      errors.push(`Missing output specification for ${story.id}.`);
      continue;
    }
    if (version === "3.0") for (const fieldName of specFields) if (!field(container.text, fieldName)) errors.push(`${story.id} output specification is missing field ${fieldName}.`);
    const criteria = acceptanceBlocks(container, acPrefix);
    if (!criteria.length) errors.push(`${story.id} is missing embedded acceptance criteria.`);
    const actual = criteria.map((item) => item.id).sort();
    const referenced = [...(field(story.text, "验收标准") ?? "").matchAll(new RegExp(`${acPrefix}-\\d{3,}`, "g"))].map((item) => item[0]).sort();
    if (actual.join() !== referenced.join()) errors.push(`${story.id} acceptance references must match its embedded criteria.`);
    for (const item of criteria) validateAcceptance(item.text, item.id, errors);
  }
  if (version === "3.0") for (const spec of specs) if (!stories.some((story) => story.id === spec.id)) errors.push(`Output specification references unknown story ${spec.id}.`);
}

if (scope === "frontend" || scope === "both") validateDomain("frontend");
if (scope === "backend" || scope === "both") validateDomain("backend");
print("Product Requirement input", artifact.path, errors);
