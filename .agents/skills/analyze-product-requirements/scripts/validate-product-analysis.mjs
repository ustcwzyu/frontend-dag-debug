#!/usr/bin/env node

import { assertHeadings, field, loadMarkdown, metadata, outputSpecBlocks, printResult, section, storyBlocks, validateArtifactLocation, validateStorySpecCoverage } from "./validation-helpers.mjs";

const args = process.argv.slice(2);
const fileArg = args[0];
const targetIndex = args.indexOf("--target");
const expectedTarget = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
if (!fileArg) {
  console.error("Usage: node validate-product-analysis.mjs <product-analysis.md> [--target frontend|backend|both]");
  process.exit(2);
}

let artifact;
try { artifact = loadMarkdown(fileArg, "Product Analysis"); }
catch (error) { console.error(error.message); process.exit(2); }

const { path, text } = artifact;
const errors = [];
validateArtifactLocation(artifact, errors, "product-analysis.md");
const scope = metadata(text, "analysis_scope");
const status = metadata(text, "analysis_status");

if (metadata(text, "artifact_version") !== "3.0") errors.push("artifact_version must be 3.0.");
if (metadata(text, "artifact_type") !== "product-analysis") errors.push("artifact_type must be product-analysis.");
if (!["frontend", "backend", "both"].includes(scope)) errors.push("analysis_scope must be frontend, backend, or both.");
if (targetIndex >= 0 && !["frontend", "backend", "both"].includes(expectedTarget)) errors.push("--target must be frontend, backend, or both.");
else if (expectedTarget && scope !== expectedTarget) errors.push(`analysis_scope ${scope} does not match requested target ${expectedTarget}.`);
if (!["ready-for-clarification", "no-clarification-required"].includes(status)) errors.push("analysis_status must be ready-for-clarification or no-clarification-required.");
if (!metadata(text, "source_requirement")) errors.push("source_requirement is required.");
if (!metadata(text, "repository_root")) errors.push("repository_root is required; use none when absent.");

assertHeadings(text, 2, ["原始需求", "需求概述", "业务目标", "需求分析", "外部事实"], errors, "Product Analysis");
const analysis = section(text, 2, "需求分析") ?? "";
assertHeadings(analysis, 3, ["明确需求", "推断需求", "待确认问题", "初步非目标"], errors, "需求分析");
const facts = section(text, 2, "外部事实") ?? "";
assertHeadings(facts, 3, ["知识库事实", "代码库事实"], errors, "外部事实");

const questions = section(analysis, 3, "待确认问题") ?? "";
if (status === "no-clarification-required" && /(?:\bQ-\d{3,}\b|\bBR-\d{3,}\b|\bP[012]\b|[？?])/.test(questions)) errors.push("no-clarification-required analysis cannot contain question markers, priorities, branches, or question sentences.");
if (status === "ready-for-clarification" && !/(?:\bP[012]\b|[？?])/.test(questions)) errors.push("ready-for-clarification analysis must contain at least one prioritized or explicit question.");
if (/\bAC-(?:FE|BE)-\d{3,}\b|^Given[：:]|^When[：:]|^Then[：:]/m.test(text)) errors.push("Product Analysis must use acceptance concerns, not formal AC IDs or Given/When/Then blocks.");
if (/^##\s+(?:\d+[.、]?\s*)?(?:用户角色|初步验收标准汇总)\s*$/m.test(text)) errors.push("Product Analysis must not contain standalone 用户角色 or 初步验收标准汇总 sections.");

function validateDomain(domain) {
  const frontend = domain === "frontend";
  const title = frontend ? "前端" : "后端";
  const prefix = frontend ? "FE-US" : "BE-US";
  const storyHeading = `初步${title}用户故事`;
  const specHeading = `初步${title}输出规范`;
  assertHeadings(text, 2, [storyHeading, specHeading], errors, "Product Analysis");
  const stories = storyBlocks(section(text, 2, storyHeading), prefix);
  const specs = outputSpecBlocks(section(text, 2, specHeading), prefix);
  if (!stories.length) errors.push(`${storyHeading} must contain at least one ${prefix}-* story.`);
  const storyFields = frontend ? ["角色", "目标", "价值", "入口", "验收关注点"] : ["系统能力", "使用方", "业务价值", "触发方式", "验收关注点"];
  const specFields = frontend ? ["页面/组件", "展示内容", "交互动作", "UI 状态", "表单校验", "权限可见性", "边界处理"] : ["输入语义", "输出语义", "数据读写", "权限规则", "业务规则", "安全要求", "幂等与并发", "错误与边界"];
  for (const story of stories) {
    for (const name of storyFields) if (!field(story.text, name)) errors.push(`${story.id} is missing story field ${name}.`);
    if (!frontend && !/^(?:API|定时任务|事件|消息|内部调用|数据迁移)(?:$|[、,，/])/i.test(field(story.text, "触发方式") ?? "")) errors.push(`${story.id} 触发方式 is invalid.`);
  }
  for (const spec of specs) for (const name of specFields) if (!field(spec.text, name)) errors.push(`${spec.id} output specification is missing field ${name}.`);
  validateStorySpecCoverage(stories, specs, errors, `${title} scope`);
}

if (scope === "frontend" || scope === "both") validateDomain("frontend");
if (scope === "backend" || scope === "both") validateDomain("backend");
if (scope === "frontend" && /(?:^##\s+.*后端|^###\s+BE-US-)/m.test(text)) errors.push("frontend scope must not contain backend sections or stories.");
if (scope === "backend" && /(?:^##\s+.*前端|^###\s+FE-US-)/m.test(text)) errors.push("backend scope must not contain frontend sections or stories.");
printResult("Product Analysis", path, errors);
