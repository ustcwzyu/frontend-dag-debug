#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { assertHeadings, canonical, field, headings, loadMarkdown, metadata, printResult, section, validateArtifactLocation } from "./validation-helpers.mjs";

const args = process.argv.slice(2);
const allowPending = args.includes("--allow-pending");
const positional = args.filter((arg) => !arg.startsWith("--"));
if (positional.length < 3) {
  console.error("Usage: node validate-requirement-clarification.mjs <product-analysis.md> <requirement-clarification.md> <product-requirement.md> [--allow-pending]");
  process.exit(2);
}

let analysis, clarification, requirement;
try {
  analysis = loadMarkdown(positional[0], "Product Analysis");
  clarification = loadMarkdown(positional[1], "Requirement Clarification");
  requirement = loadMarkdown(positional[2], "Product Requirement");
} catch (error) { console.error(error.message); process.exit(2); }

const errors = [];
validateArtifactLocation(clarification, errors, "requirement-clarification.md");
const scope = metadata(clarification.text, "analysis_scope");
const status = metadata(clarification.text, "clarification_status");
const clarificationRounds = Number(metadata(clarification.text, "clarification_rounds"));
if (metadata(clarification.text, "artifact_version") !== "3.0") errors.push("artifact_version must be 3.0.");
if (metadata(clarification.text, "artifact_type") !== "requirement-clarification") errors.push("artifact_type must be requirement-clarification.");
if (!["frontend", "backend", "both"].includes(scope)) errors.push("analysis_scope must be frontend, backend, or both.");
if (!["pending", "complete"].includes(status)) errors.push("clarification_status must be pending or complete.");
if (!Number.isInteger(clarificationRounds) || clarificationRounds < 0 || clarificationRounds > 3) errors.push("clarification_rounds must be an integer from 0 to 3.");
if (!allowPending && status !== "complete") errors.push("Final Requirement Clarification must be complete.");
if (scope !== metadata(analysis.text, "analysis_scope")) errors.push("analysis_scope must match Product Analysis.");

const resolveRef = (value) => value ? resolve(dirname(clarification.path), value) : "";
const source = metadata(clarification.text, "source_product_analysis");
const target = metadata(clarification.text, "target_product_requirement");
if (resolveRef(source) !== analysis.path) errors.push("source_product_analysis must reference the supplied Product Analysis.");
if (resolveRef(target) !== requirement.path) errors.push("target_product_requirement must reference the supplied Product Requirement.");
if (source && dirname(resolveRef(source)) !== dirname(clarification.path)) errors.push("source_product_analysis must be in the same requirement directory.");
if (target && dirname(resolveRef(target)) !== dirname(clarification.path)) errors.push("target_product_requirement must be in the same requirement directory.");
if (source && !existsSync(resolveRef(source))) errors.push(`source_product_analysis does not exist: ${resolveRef(source)}`);
if (target && !existsSync(resolveRef(target))) errors.push(`target_product_requirement does not exist: ${resolveRef(target)}`);

const analysisStatus = metadata(analysis.text, "analysis_status");
const questionBlocks = headings(clarification.text, 3).filter((item) => /^Q-\d{3,}\s+/.test(item.title));

if (!questionBlocks.length) {
  if (clarificationRounds !== 0) errors.push("Compact clarification must set clarification_rounds to 0.");
  if (analysisStatus !== "no-clarification-required") errors.push("Compact clarification is allowed only when Product Analysis is no-clarification-required.");
  const required = ["澄清结论", "来源", "合并结果"];
  assertHeadings(clarification.text, 2, required, errors, "Compact Requirement Clarification");
  for (const heading of headings(clarification.text, 2)) if (!required.includes(canonical(heading.title))) errors.push(`Compact Requirement Clarification must not contain section ${canonical(heading.title)}.`);
  if (!/状态[：:]\s*no-clarification-required/.test(section(clarification.text, 2, "澄清结论") ?? "")) errors.push("Compact clarification must declare no-clarification-required.");
  if (/\b(?:BR|Q|DEC-Q)-\d{3,}\b/.test(clarification.text)) errors.push("Compact clarification must not fabricate BR, Q, or DEC-Q markers.");
} else {
  if (clarificationRounds < 1 || clarificationRounds > 3) errors.push("Question-based clarification must set clarification_rounds from 1 to 3.");
  if (analysisStatus !== "ready-for-clarification") errors.push("Question records require Product Analysis status ready-for-clarification.");
  assertHeadings(clarification.text, 2, ["澄清来源", "决策分支", "问题记录", "决策索引"], errors, "Requirement Clarification");
  const branchSection = section(clarification.text, 2, "决策分支") ?? "";
  const branchIds = [...new Set(branchSection.match(/\bBR-\d{3,}\b/g) ?? [])];
  if (branchIds.length < 3 || branchIds.length > 6) errors.push("Question-based clarification must define 3–6 top-level BR-* branches.");
  if (status === "complete") {
    const unresolved = branchSection.split(/\r?\n/).filter((line) => /\|\s*BR-\d{3,}\s*\|/.test(line) && !/\|\s*resolved\s*\|\s*$/.test(line));
    if (unresolved.length) errors.push("Complete clarification requires every branch to be resolved.");
  }
  const requiredFields = ["澄清轮次", "分支", "优先级", "影响范围", "推荐答案", "推荐理由", "用户回答", "最终决策", "决策来源", "状态", "决策标记", "目标位置"];
  const markers = new Set();
  for (const block of questionBlocks) {
    const id = block.title.match(/^(Q-\d{3,})/)?.[1];
    for (const name of requiredFields) if (!field(block.text, name)) errors.push(`${id} is missing field ${name}.`);
    const branch = field(block.text, "分支");
    const round = Number(field(block.text, "澄清轮次"));
    const priority = field(block.text, "优先级");
    const impactScope = field(block.text, "影响范围");
    const answer = field(block.text, "用户回答");
    const decisionStatus = field(block.text, "状态");
    const decisionSource = field(block.text, "决策来源");
    if (!branchIds.includes(branch)) errors.push(`${id} 分支 must reference a defined BR-* branch.`);
    if (!Number.isInteger(round) || round < 1 || round > clarificationRounds) errors.push(`${id} 澄清轮次 must be between 1 and clarification_rounds.`);
    if (!["P0", "P1", "P2"].includes(priority)) errors.push(`${id} 优先级 must be P0, P1, or P2.`);
    if (!["common", "frontend", "backend", "both"].includes(impactScope)) errors.push(`${id} 影响范围 is invalid.`);
    if (!["confirmed", "default-confirmed", "pending-blocking", "pending-non-blocking"].includes(decisionStatus)) errors.push(`${id} 状态 is invalid.`);
    if (!["user", "source-requirement", "code-evidence", "confirmed-default"].includes(decisionSource)) errors.push(`${id} 决策来源 is invalid.`);
    const marker = field(block.text, "决策标记");
    if (marker !== `DEC-${id}`) errors.push(`${id} 决策标记 must be DEC-${id}.`);
    if (markers.has(marker)) errors.push(`Duplicate decision marker: ${marker}.`);
    markers.add(marker);
    if (decisionSource === "code-evidence" && !field(block.text, "代码证据")) errors.push(`${id} code-evidence decision requires 代码证据.`);
    if (decisionStatus === "pending-non-blocking" && !field(block.text, "未确认影响")) errors.push(`${id} pending-non-blocking decision requires 未确认影响.`);
    if (status === "complete" && ["P0", "P1"].includes(priority) && (decisionStatus !== "confirmed" || decisionSource !== "user" || /^(?:未回答|待确认|无)$/.test(answer ?? ""))) errors.push(`${id} ${priority} must contain an explicit user confirmation.`);
    if (status === "complete" && marker && !requirement.text.includes(marker)) errors.push(`${marker} is missing from Product Requirement decision traceability.`);
    if (!(section(clarification.text, 2, "决策索引") ?? "").includes(marker ?? "__missing__")) errors.push(`${marker ?? id} is missing from 决策索引.`);
  }
}

if (status === "complete" && metadata(requirement.text, "requirement_status") !== "complete") errors.push("Complete clarification requires a complete Product Requirement.");
printResult("Requirement Clarification", clarification.path, errors);
