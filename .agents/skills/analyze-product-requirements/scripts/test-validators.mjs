#!/usr/bin/env node

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "product-requirement-v3-validators-"));
const projectRoot = join(temp, "project");
const artifactDir = join(projectRoot, "docs", "product-analysis", "nickname");
mkdirSync(artifactDir, { recursive: true });
const analysisValidator = join(scriptDir, "validate-product-analysis.mjs");
const clarificationValidator = join(scriptDir, "validate-requirement-clarification.mjs");
const requirementValidator = join(scriptDir, "validate-product-requirement.mjs");

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

const analysisPath = join(artifactDir, "product-analysis.md");
const clarificationPath = join(artifactDir, "requirement-clarification.md");
const requirementPath = join(artifactDir, "product-requirement.md");

const analysis = `---
artifact_version: "3.0"
artifact_type: product-analysis
requirement_id: nickname
project_root: ../../..
analysis_scope: frontend
analysis_status: no-clarification-required
source_requirement: inline
repository_root: none
---
# Product Analysis
## 1. 原始需求
登录用户可以修改昵称，长度为 2–20 个字符。
## 2. 需求概述
在个人资料页维护展示昵称。
## 3. 业务目标
- 允许用户维护展示名称。
## 4. 需求分析
### 4.1 明确需求
- 用户只能修改自己的昵称。
### 4.2 推断需求
- 无未经确认的推断。
### 4.3 待确认问题
- 无。范围、权限和结果已经明确。
### 4.4 初步非目标
- 不修改头像。
## 5. 外部事实
### 5.1 知识库事实
- 未集成知识库。
### 5.2 代码库事实
- 未提供代码仓库。
## 6. 初步前端用户故事
### FE-US-001 修改昵称
- 角色：已登录用户
- 目标：修改自己的展示昵称
- 价值：保持个人资料准确
- 入口：个人资料页
- 验收关注点：合法值可保存；非法值不可提交；失败时保留输入
## 7. 初步前端输出规范
### FE-US-001 修改昵称
- 页面/组件：个人资料页、昵称编辑表单
- 展示内容：当前昵称、字符计数、校验提示
- 交互动作：编辑、保存、取消、重试
- UI 状态：normal、dirty、loading、success、error、disabled
- 表单校验：昵称长度为 2–20 个字符
- 权限可见性：仅当前登录用户
- 边界处理：失败时保留输入，不得静默失败
`;

const clarification = `---
artifact_version: "3.0"
artifact_type: requirement-clarification
requirement_id: nickname
project_root: ../../..
analysis_scope: frontend
clarification_status: complete
clarification_rounds: 0
source_product_analysis: ./product-analysis.md
target_product_requirement: ./product-requirement.md
---
# Requirement Clarification
## 1. 澄清结论
- 状态：no-clarification-required
- 原因：范围、权限、数据语义和验收结果已经明确。
## 2. 来源
- Product Analysis：./product-analysis.md
## 3. 合并结果
- Product Requirement 根据明确需求生成，无额外决策标记。
`;

const requirement = `---
artifact_version: "3.0"
artifact_type: product-requirement
requirement_id: nickname
project_root: ../../..
requirement_status: complete
analysis_scope: frontend
source_requirement: inline
source_product_analysis: ./product-analysis.md
source_clarification: ./requirement-clarification.md
---
# Product Requirement
## 1. 需求概述
在个人资料页维护当前用户的展示昵称。
## 2. 业务目标
- 允许用户维护准确的展示名称。
## 3. 需求范围
### 3.1 已确认需求
- 当前用户可以修改自己的昵称。
### 3.2 非目标
- 不修改头像。
### 3.3 默认假设
- 无未经确认的默认假设。
### 3.4 未决事项
- 无。
## 4. 业务规则
- 昵称长度必须为 2–20 个字符。
## 5. 前端用户故事
### FE-US-001 修改昵称
- 角色：已登录用户
- 目标：修改自己的展示昵称
- 价值：保持个人资料准确
- 入口：个人资料页
- 验收标准：AC-FE-001
## 6. 前端输出规范
### FE-US-001 修改昵称
- 页面/组件：个人资料页、昵称编辑表单
- 展示内容：当前昵称、字符计数、校验提示
- 交互动作：编辑、保存、取消、重试
- UI 状态：normal、dirty、loading、success、error、disabled
- 表单校验：昵称长度为 2–20 个字符
- 权限可见性：仅当前登录用户
- 边界处理：失败时保留输入，不得静默失败
#### AC-FE-001 保存合法昵称
Given：
- 用户已登录并打开个人资料页。
When：
- 用户输入合法昵称并点击保存。
Then：
- 页面提交昵称修改请求。
- 保存成功后展示新昵称。
- 保存期间按钮保持 disabled。
异常场景：
- 保存失败时保留输入并提供重试入口。
## 7. 决策追溯
- 本轮无需澄清决策标记；需求直接来源于明确需求。
`;

writeFileSync(analysisPath, analysis);
writeFileSync(clarificationPath, clarification);
writeFileSync(requirementPath, requirement);

let checks = 0;
function expectPass(name, script, args) { pass(name, run(script, args)); checks += 1; }
function expectFail(name, script, args, message) { fail(name, run(script, args), message); checks += 1; }

expectPass("valid V3 analysis", analysisValidator, [analysisPath, "--target", "frontend"]);
expectFail("analysis target mismatch", analysisValidator, [analysisPath, "--target", "backend"], "does not match");
expectFail("analysis rejects formal AC", analysisValidator, [variant("analysis-ac.md", analysis.replace("验收关注点：", "验收关注点：AC-FE-001 "))], "must use acceptance concerns");
expectFail("analysis requires matching spec", analysisValidator, [variant("analysis-no-spec.md", analysis.replace("### FE-US-001 修改昵称\n- 页面/组件", "### FE-US-002 修改昵称\n- 页面/组件"))], "missing output specification");
expectFail("analysis rejects standalone roles", analysisValidator, [variant("analysis-roles.md", analysis.replace("## 4. 需求分析", "## 用户角色\n- 已登录用户。\n## 4. 需求分析"))], "must not contain standalone");

expectPass("valid compact clarification", clarificationValidator, [analysisPath, clarificationPath, requirementPath]);
expectFail("clarification rounds cannot exceed three", clarificationValidator, [analysisPath, variant("clarification-four-rounds.md", clarification.replace("clarification_rounds: 0", "clarification_rounds: 4")), requirementPath], "from 0 to 3");
expectFail("compact clarification rejects extra section", clarificationValidator, [analysisPath, variant("clarification-extra.md", clarification + "\n## 4. 完成门禁\n- 已完成。\n"), requirementPath], "must not contain section");

expectPass("valid V3 requirement", requirementValidator, [requirementPath, "--target", "frontend"]);
expectFail("requirement target mismatch", requirementValidator, [requirementPath, "--target", "backend"], "does not match");
expectFail("requirement requires role", requirementValidator, [variant("requirement-no-role.md", requirement.replace("- 角色：已登录用户\n", ""))], "missing story field 角色");
expectFail("requirement requires matching spec", requirementValidator, [variant("requirement-no-spec.md", requirement.replace("### FE-US-001 修改昵称\n- 页面/组件", "### FE-US-002 修改昵称\n- 页面/组件"))], "missing output specification");
expectFail("requirement AC refs match spec", requirementValidator, [variant("requirement-bad-ac.md", requirement.replace("- 验收标准：AC-FE-001", "- 验收标准：AC-FE-002"))], "must match its output specification");
expectFail("requirement rejects standalone roles", requirementValidator, [variant("requirement-roles.md", requirement.replace("## 3. 需求范围", "## 用户角色\n- 已登录用户。\n## 3. 需求范围"))], "must not contain standalone");
expectFail("pending requirement rejected by default", requirementValidator, [variant("requirement-pending.md", requirement.replace("requirement_status: complete", "requirement_status: pending"))], "must be complete");
writeFileSync(requirementPath, requirement.replace("requirement_status: complete", "requirement_status: pending"));
expectPass("pending requirement allowed explicitly", requirementValidator, [requirementPath, "--allow-pending"]);
writeFileSync(requirementPath, requirement);

console.log(`Requirement V3 validator matrix passed: ${checks} checks.`);
