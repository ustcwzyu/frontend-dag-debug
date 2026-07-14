---
name: ai-engineering-context
description: 当 AI coding agent 启动 loop-agent 工作、准备 DAG 或 Loop context、委派 role-specific 节点，或决定 requirements、facts、evidence、handoff notes 应落何处时使用。
---

# AI Engineering Context

Context 是工程 artifact，不是 chat 残留。须显式保留 requirements、role 边界、write authority、evidence 与 handoff facts。

## When to Use

在启动 task、DAG、workflow 或 Loop round；准备 role prompt；委派给 Cursor/Pi/shell/static executor；或处理 stale plan、冲突 requirements、缺失 evidence 时使用。

不要用于 private platform paths、personal memory、Google Drive 规则，或替代 task skills。

## Context Priority

按以下顺序优先采信 facts：最新 user instruction；task source/contract；DAG/Loop artifacts；docs/plans/ADRs；code/tests；chat history 仅作 hint。

若 sources 冲突，停止并点明冲突。

## Role Boundaries

- Planner：contract、DAG shape、write boundary、verification plan；不做 implementation edits。
- Scout：code/test/doc/artifact facts；不写 repo。
- Implementer：在 writeSet 内做 bounded changes；不扩大 scope 或宣称完成。
- Reviewer：bugs、regressions、missing tests、risk；除非被指派，否则不重写。
- Verifier：command evidence、reproduction、failure category；model judgment 不是 proof。
- Supervisor：gates、escalation、repair scope；不绕过 write-guard 或 human-gate。
- Closeout：evidence、risks、next steps；不隐藏 failures。

## Prompt Contract

每个 delegated node prompt 应包含：objective、task id、role、executor、allowed paths、forbidden paths、writeSet、upstream artifact refs、concise excerpts、output contract、expected evidence、non-goals、stop conditions。

read-only node 只能在 node output 返回 findings。不得在 repo 中创建 scratch files。

## Persistence Rules

Requirements 与 constraints 写入 task `source/`。Execution state 与 node artifacts 写入 `.harness/`。Durable plans、reports、decisions 写入 `docs/`。可复用 process guidance 写入 `skills/`。Chat 仅 transient。

## Failure Handling

- Missing context：运行 scout 或读取 durable source。
- Ambiguous requirement：implementation 前更新 contract。
- Verification failure：改 code 前先 diagnose cause。
- Missing skill instructions：视为 context defect；不要假设 hidden behavior。
- Missing fresh verification：不要 close out。
