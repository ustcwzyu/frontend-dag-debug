---
name: verification-before-completion
description: 在宣称 work complete、fixed 或 passing，或在 commit / 创建 PR 之前使用——须先运行 verification commands 并确认 output，再作任何 success claims；始终 evidence before assertions
---

# Verification Before Completion

## Overview

未经验证就宣称 work complete 是不诚实，不是效率。

**Core principle：** 始终 evidence before claims。

**违反本条字面即违反其精神。**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

若本 message 中尚未运行 verification command，不得宣称 passes。

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |
| Harness integrity | `scripts/check-repo.sh` exit 0 | Files look correct |
| Harness CI | `scripts/ci.sh` exit 0 | Individual checks pass |
| Contract handoff | Handoff checklist completed + progress/report updated | "Should be fine"

## Red Flags - STOP

- 使用 "should"、"probably"、"seems to"
- 验证前表达满意（"Great!"、"Perfect!"、"Done!" 等）
- 未验证就要 commit/push/PR
- 信任 agent success reports
- 依赖 partial verification
- 认为 "just this once"
- 疲惫想结束工作
- **任何未运行 verification 却暗示 success 的措辞**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Harness-Specific Verification

在 harness-governed repo 中工作（存在 `harness.json`）时：

- **Docs/structure changes** → `bash scripts/check-repo.sh`
- **Full-repo delivery** → `bash scripts/ci.sh`
- **Cross-platform changes** → 验证 OpenCode 与 Pi-Agent 两条路径
- **Contract changes** → 验证 contract docs 已更新 + tests 对齐
- **Handoff** → 宣称 complete 前运行 `handoff check`

完整 command 选择见项目 `docs/verification-matrix.md`。

## Why This Matters

来自 24 条 failure memories：
- human partner 说 "I don't believe you" — trust 已破裂
- Undefined functions 已 ship — 会 crash
- Missing requirements 已 ship — 功能不完整
- 虚假完成浪费时间 → redirect → rework
- 违反："Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**在以下情况之前 ALWAYS：**
- 任何 success/completion claims 的变体
- 任何表达满意
- 任何关于 work state 的正面陈述
- Commit、PR creation、task completion
- 进入 next task
- 委派给 agents

**规则适用于：**
- 精确短语
-  paraphrases 与同义词
- success 的暗示
- 任何暗示 completion/correctness 的沟通

## The Bottom Line

**Verification 无捷径。**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
