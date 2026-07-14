---
name: requesting-code-review
description: 在完成任务、实现 major features，或 merge 前验证 work 是否满足 requirements 时使用
---

# Requesting Code Review

Dispatch code reviewer subagent，在问题级联前捕获 issue。Reviewer 获得精确 crafted 的 evaluation context — 绝不是你的 session history。这使 reviewer 聚焦 work product，而非你的 thought process，并保留你自己的 context 以继续工作。

**Core principle：** Review early, review often.

## When to Request Review

**Mandatory：**
- subagent-driven development 中每个 task 之后
- 完成 major feature 之后
- merge 到 main 之前

**Optional but valuable：**
- 卡住时（fresh perspective）
- refactoring 前（baseline check）
- 修复 complex bug 之后

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Use the code reviewer template**（本 skill 目录下的 `code-reviewer.md`）：

**Placeholders:**
- `{DESCRIPTION}` — 简要 summary of what you built
- `{PLAN_OR_REQUIREMENTS}` — 它应做什么（contract、exec plan 或 requirements）
- `{BASE_SHA}` — Starting commit
- `{HEAD_SHA}` — Ending commit

**3. Act on feedback:**
- Critical issues 立即修复
- Important issues 在继续前修复
- Minor issues 稍后处理
- Reviewer 有误时 push back（附 reasoning）

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/exec-plans/active/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Integration with Harness Workflow

**每个 work chunk 之后（Plan → Contract → Implement → Verify → Handoff）：**
- Implement 之后、Verify 之前 review
- 在问题 compound 前捕获
- 进入 next task 前修复

**Before merge / Handoff：**
- 宣称 complete 前 review
- 对照 contract acceptance criteria 验证

**Ad-Hoc Development：**
- merge 前 review
- 卡住时 review

## Red Flags

**Never：**
- 因 "it's simple" 跳过 review
- 忽略 Critical issues
- 带着未修复的 Important issues 继续
- 与 valid technical feedback 争辩

**If reviewer wrong：**
- 用 technical reasoning push back
- 展示证明其有效的 code/tests
- 请求 clarification

Template 见：requesting-code-review/code-reviewer.md
