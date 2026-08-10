---
name: grill-with-docs
description: >-
  Grilling session that challenges a plan against the existing domain model,
  sharpens terminology, and proposes CONTEXT.md / ADR updates as decisions
  crystallise. Use when the user wants to stress-test a plan against project
  language and documented decisions. Explicit interactive operator skill only —
  not a default DAG role.
references:
  - path: context-format.md
    required: true
  - path: adr-format.md
    required: true
---

# Grill With Docs

显式交互式 operator skill。用于压力测试计划与术语；**不**加入默认 planner / reviewer / implementer role mapping，避免普通 DAG 被问答阻塞。

## What to do

Interview the user relentlessly about every aspect of the plan until shared understanding. Walk each design branch, resolve decision dependencies one-by-one. For each question, provide a recommended answer.

Ask questions one at a time; wait for feedback before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Path resolution

1. Read `harness.json.governanceRoot`（缺省时常见为源码仓库 `docs`，目标项目 `ai_workspace/loop-agent`）。
2. Decisions 目录 = `${governanceRoot}/decisions/`（本仓库即 `docs/decisions/`）。
3. Glossary = 仓库根 `CONTEXT.md`（多 context 时见 `CONTEXT-MAP.md`）。
4. **禁止**硬编码平行 `adr/` 目录树；只用 `${governanceRoot}/decisions/`。

## Write boundary

- Inline 更新 `CONTEXT.md` / ADR **必须**服从当前 task `allowedPaths` 与 DAG `writeSet`。
- 无写权限时：只返回建议与待确认 patch，**不得**越界写文档。
- 不得绕过 human gate、write guard 或 shell completion authority。

## During the session

### Challenge against the glossary

术语与 `CONTEXT.md` 冲突时立即指出。

### Sharpen fuzzy language

模糊或过载词要提出规范术语。

### Discuss concrete scenarios

用具体场景压力测试边界。

### Cross-reference with code

声称与代码不符时立即表面矛盾。

### Update CONTEXT.md only when allowed

术语敲定后，若有写权限则按 `context-format.md` 立刻更新；否则只给出建议 patch。

`CONTEXT.md` 是 glossary 且仅是 glossary：不含实现细节、规格草稿、计划状态或架构决策。

### Offer ADRs sparingly

仅当三条同时成立才提议 ADR：

1. **Hard to reverse** — 改变成本可观
2. **Surprising without context** — 未来读者会追问 why
3. **Real trade-off** — 曾有合理备选并基于具体理由选择

缺一则跳过。格式遵循目标仓库已有模板（见 `adr-format.md`），本仓库使用完整 `docs/templates/adr.md` 字段，不用单段极简 ADR 覆盖本地约定。

## Supporting formats

Required references（已进入 skill snapshot）：

- `context-format.md`
- `adr-format.md`
