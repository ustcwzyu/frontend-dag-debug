---
name: systematic-debugging
description: 遇到任何 bug、test failure 或 unexpected behavior 时使用，且在提出 fixes 之前
---

# Systematic Debugging

## Overview

Random fixes 浪费时间并制造新 bug。Quick patches 掩盖 underlying issues。

**Core principle：** ALWAYS 在尝试 fixes 之前找到 root cause。Symptom fixes 是 failure。

**违反本流程字面即违反 debugging 精神。**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

若尚未完成 Phase 1，不得提出 fixes。

## Feedback Loop Gate（Phase 1 之前）

在列假设、读大段代码或改文件之前，先建立一条**快速、确定性、Agent 可运行**的 pass/fail 信号。完整优先级与手段见 governance 下的 `harness-methodology-debugging.md`。

可执行清单：

1. 选最小回路：失败测试 → HTTP/CLI/浏览器脚本 → fixture/snapshot → 一次性 harness → bisect/differential → 结构化 HITL。
2. 跑一次，确认有可重复的 exit code / 断言结果。
3. 间歇性问题：先提高复现率，再进入根因调查。
4. **无回路 → STOP**：请求环境、artifact 或临时插桩许可；不要猜。

Verifier 角色只提供诊断与证据，不得越过 writer `writeSet` / `allowedPaths` 直接修复。

## When to Use

用于 ANY technical issue：
- Test failures
- Production bugs
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**ESPECIALLY 在以下情况使用：**
- 时间压力下（emergencies 使 guessing 诱人）
- "Just one quick fix" 看起来 obvious
- 已尝试 multiple fixes
- Previous fix 无效
- 未完全理解 issue

**Don't skip when：**
- Issue 看起来 simple（simple bugs 也有 root causes）
- 赶时间（rushing 保证 rework）
- Manager 要求 NOW 修好（systematic 比 thrashing 更快）

## The Four Phases

进入下一阶段前 MUST 完成每一 phase。反馈回路是地基，不是第五 phase。

### Phase 1: Root Cause Investigation

**在尝试 ANY fix 之前（且已有反馈回路）：**

1. **Read Error Messages Carefully**
   - 不要跳过 errors 或 warnings
   - 它们常含 exact solution
   - 完整阅读 stack traces
   - 记下 line numbers、file paths、error codes

2. **Reproduce Consistently**
   - 能否可靠触发？
   - Exact steps 是什么？
   - 是否每次都发生？
   - 若不可 reproduce → 收集更多 data，不要 guess

3. **Check Recent Changes**
   - 什么变更可能导致此问题？
   - Git diff、recent commits
   - New dependencies、config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system 有多个 components（CI → build → signing，API → service → database）：**

   **BEFORE proposing fixes，添加 diagnostic instrumentation：**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

5. **Trace Data Flow**

   **WHEN error 在 call stack 深处：**

   完整 backward tracing 见本目录 `root-cause-tracing.md`。

   **Quick version：**
   - Bad value 从哪 originate？
   - 谁用 bad value 调用了 this？
   - 一直向上 trace 直到 source
   - 在 source 修复，而非 symptom

### Phase 2: Pattern Analysis

**Fix 前先找 pattern：**

1. **Find Working Examples**
   - 在同 codebase 找 similar working code
   - 什么能 work、什么 broken？

2. **Compare Against References**
   - 若实现 pattern，COMPLETE 阅读 reference implementation
   - 不要 skim — 读每一行
   - 应用前 fully 理解 pattern

3. **Identify Differences**
   - Working 与 broken 有何不同？
   - 列出 every difference，再小也要列
   - 不要假设 "that can't matter"

4. **Understand Dependencies**
   - 还需要哪些 other components？
   - 哪些 settings、config、environment？
   - 它作哪些 assumptions？

### Phase 3: Hypothesis and Testing

**Scientific method：**

1. **Form Single Hypothesis**
   - 清楚陈述："I think X is the root cause because Y"
   - 写下来
   - 要 specific，不要 vague

2. **Test Minimally**
   - 做 SMALLEST possible change 以 test hypothesis
   - One variable at a time
   - 不要一次 fix multiple things

3. **Verify Before Continuing**
   - 有效？Yes → Phase 4
   - 无效？Form NEW hypothesis
   - DON'T 在其上叠加更多 fixes

4. **When You Don't Know**
   - 说 "I don't understand X"
   - 不要假装知道
   - Ask for help
   - Research more

### Phase 4: Implementation

**Fix root cause，不是 symptom：**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - 可能的话用 automated test
   - 无 framework 时用 one-off test script
   - MUST 在 fix 之前有
   - 遵循 RED-GREEN-REFACTOR：写 failing test，看它 fail，再 fix

2. **Implement Single Fix**
   - 针对已识别的 root cause
   - ONE change at a time
   - 无 "while I'm here" improvements
   - 无 bundled refactoring

3. **Verify Fix**
   - Test 现在 pass？
   - 无 other tests broken？
   - Issue 真的 resolved？

4. **If Fix Doesn't Work**
   - STOP
   - Count：已尝试多少 fixes？
   - 若 < 3：Return to Phase 1，用 new information 再分析
   - **若 ≥ 3：STOP 并质疑 architecture（见下方 step 5）**
   - DON'T 在未做 architectural discussion 前尝试 Fix #4

5. **If 3+ Fixes Failed: Question Architecture**

   **表明 architectural problem 的 pattern：**
   - 每个 fix 在不同位置 reveal 新的 shared state/coupling/problem
   - Fixes 需要 "massive refactoring" 才能实现
   - 每个 fix 在其他地方制造新 symptoms

   **STOP 并质疑 fundamentals：**
   - 此 pattern fundamentally sound 吗？
   - 是否 "sticking with it through sheer inertia"？
   - 应 refactor architecture 还是继续 fix symptoms？

   **Discuss with your human partner before attempting more fixes**

   This is NOT a failed hypothesis — this is a wrong architecture.

## Red Flags - STOP and Follow Process

若发现自己想：
- "No pass/fail loop yet — just read code and guess"
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to feedback loop / Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4.5)

## your human partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" — You assumed without verifying
- "Will it show us...?" — You should have added evidence gathering
- "Stop guessing" — You're proposing fixes without understanding
- "Ultrathink this" — Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) — Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues 也有 root causes。Process 对 simple bugs 很快。 |
| "Emergency, no time for process" | Systematic debugging 比 guess-and-check thrashing 更快。 |
| "Just try this first, then investigate" | First fix 定模式。从一开始就做对。 |
| "I'll write test after confirming fix works" | Untested fixes 不 stick。Test first 证明它。 |
| "Multiple fixes at once saves time" | 无法 isolate what worked。制造新 bugs。 |
| "Reference too long, I'll adapt the pattern" | Partial understanding 保证 bugs。Complete 阅读。 |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause。 |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem。质疑 pattern，不要再 fix。 |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **0. Feedback Loop** | Build fast deterministic pass/fail signal | Repeatable command + exit code |
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

若 systematic investigation 表明 issue  truly environmental、timing-dependent 或 external：

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% 的 "no root cause" cases 是 incomplete investigation。

## Supporting Techniques

本目录中属于 systematic debugging 的技术：

- **`root-cause-tracing.md`** — Trace bugs backward through call stack 找 original trigger
- **`defense-in-depth.md`** — 找到 root cause 后在 multiple layers 加 validation
- **`condition-based-waiting.md`** — 用 condition polling 替代 arbitrary timeouts

**Related principles:**
- **RED-GREEN-REFACTOR**（见 `harness.json.governanceRoot` 下 `harness-methodology-tdd.md`）— 用于 creating failing test case（Phase 4, Step 1）
- **Verification discipline** — 宣称 success 前 verify fix worked。Run verification command，读 output，THEN claim result。
- **Feedback loop**（见同目录 `harness-methodology-debugging.md`）— Phase 1 前的 pass/fail 地基。

## Real-World Impact

来自 debugging sessions：
- Systematic approach：15-30 分钟 fix
- Random fixes approach：2-3 小时 thrashing
- First-time fix rate：95% vs 40%
- New bugs introduced：Near zero vs common
