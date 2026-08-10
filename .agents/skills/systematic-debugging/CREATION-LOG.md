# Creation Log: Systematic Debugging Skill

提取、结构化与 bulletproofing 关键 skill 的 reference example。

## Source Material

从 `~/.claude/CLAUDE.md` 提取 debugging framework：
- 4-phase systematic process（Investigation → Pattern Analysis → Hypothesis → Implementation）
- Core mandate：ALWAYS find root cause，NEVER fix symptoms
- 设计以 resist time pressure 与 rationalization 的规则

## Extraction Decisions

**What to include:**
- 完整 4-phase framework 及所有 rules
- Anti-shortcuts（"NEVER fix symptom"、"STOP and re-analyze"）
- Pressure-resistant language（"even if faster"、"even if I seem in a hurry"）
- 各 phase 的 concrete steps

**What to leave out:**
- Project-specific context
- 同一 rule 的 repetitive variations
- Narrative explanations（condensed 为 principles）

## Structure Following skill-creation/SKILL.md

1. **Rich when_to_use** — 含 symptoms 与 anti-patterns
2. **Type: technique** — 带 steps 的 concrete process
3. **Keywords** — "root cause"、"symptom"、"workaround"、"debugging"、"investigation"
4. **Flowchart** — "fix failed" 决策点 → re-analyze vs add more fixes
5. **Phase-by-phase breakdown** — Scannable checklist format
6. **Anti-patterns section** — 什么 NOT to do（对本 skill 关键）

## Bulletproofing Elements

Framework 设计以 resist rationalization under pressure：

### Language Choices
- "ALWAYS" / "NEVER"（非 "should" / "try to"）
- "even if faster" / "even if I seem in a hurry"
- "STOP and re-analyze"（explicit pause）
- "Don't skip past"（捕获 actual behavior）

### Structural Defenses
- **Phase 1 required** — 不能 skip to implementation
- **Single hypothesis rule** — 强制思考，防止 shotgun fixes
- **Explicit failure mode** — "IF your first fix doesn't work" 及 mandatory action
- **Anti-patterns section** — 展示 shortcuts 的确切样子

### Redundancy
- Root cause mandate 在 overview + when_to_use + Phase 1 + implementation rules
- "NEVER fix symptom" 在不同 contexts 出现 4 次
- 各 phase 有 explicit "don't skip" guidance

## Testing Approach

按 .agents/skills/meta/testing-skills-with-subagents 创建 4 个 validation tests：

### Test 1: Academic Context (No Pressure)
- Simple bug，无 time pressure
- **Result:** Perfect compliance，complete investigation

### Test 2: Time Pressure + Obvious Quick Fix
- User "in a hurry"，symptom fix 看起来 easy
- **Result:** Resisted shortcut，followed full process，found real root cause

### Test 3: Complex System + Uncertainty
- Multi-layer failure， unclear 能否 find root cause
- **Result:** Systematic investigation，traced through all layers，found source

### Test 4: Failed First Fix
- Hypothesis 无效，temptation 加 more fixes
- **Result:** Stopped，re-analyzed，formed new hypothesis（no shotgun）

**All tests passed.** No rationalizations found.

## Iterations

### Initial Version
- Complete 4-phase framework
- Anti-patterns section
- Flowchart for "fix failed" decision

### Enhancement 1: TDD Reference
- Added link to .agents/skills/testing/test-driven-development
- Note explaining TDD's "simplest code" ≠ debugging's "root cause"
- Prevents confusion between methodologies

## Final Outcome

Bulletproof skill that:
- ✅ Clearly mandates root cause investigation
- ✅ Resists time pressure rationalization
- ✅ Provides concrete steps for each phase
- ✅ Shows anti-patterns explicitly
- ✅ Tested under multiple pressure scenarios
- ✅ Clarifies relationship to TDD
- ✅ Ready for use

## Key Insight

**Most important bulletproofing：** Anti-patterns section 展示 moment 里 feel justified 的 exact shortcuts。当 Claude 想 "I'll just add this one quick fix"，看到 listed as wrong 的 exact pattern 产生 cognitive friction。

## Usage Example

遇到 bug 时：
1. Load skill: .agents/skills/debugging/systematic-debugging
2. Read overview (10 sec) — reminded of mandate
3. Follow Phase 1 checklist — forced investigation
4. If tempted to skip — see anti-pattern，stop
5. Complete all phases — root cause found

**Time investment:** 5-10 minutes
**Time saved:** Hours of symptom-whack-a-mole

---

*Created: 2025-10-03*
*Purpose: Reference example for skill extraction and bulletproofing*
