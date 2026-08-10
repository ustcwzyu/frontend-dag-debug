# Main Orchestrator、Agent DAG 与受控干预

协调长时 loop-agent work、判断 main session 是否可 edit、在 Agent DAG / one-shot Cursor / one-shot Pi 间选择，或在不失 auditability 的情况下恢复 in-flight workflow 时使用本文。

## 核心立场

**Agent DAG 优先，main session 编排，executor 实现，shell 验证。**

`harness.json.workflowPolicy` 的 repo 级 policy 将 Agent DAG 作为 autonomous 与 harness-governed work 的 implementation workflow。历史顺序式 `run ...` workflow 已移除。

main session 是 decision-maker 与 scheduler，不是默认 implementer。其稀缺 context 应留给 objective 对齐、DAG review、failure triage、executor 选择、verification review 与 handoff。长时 implementation 应委派给 Agent DAG node、Cursor、Pi、shell 或 worktree delegate。

这不是绝对禁止 edit。main-session 手动 edit 仅允许作为有 verification 与 artifact 记录的 bounded surgical patch。

## 默认执行模型

| Actor | 主角色 | 避免 |
|---|---|---|
| Main session | Objective、contract、DAG review、routing、failure triage、approve/reject/resume、handoff | 成为长时 coder |
| Agent DAG runner | 可恢复 multi-node orchestration、rank-parallel execution、write policy、run artifacts | 不更新 DAG/source 的 ad-hoc replanning |
| Cursor executor / prompt | Codebase-indexed search、multi-file implementation、bounded refactor/fix | 无 narrow `writeSet` / path scope 的宽写入 |
| Pi executor / prompt | Fast reasoning、read-only scouting、planning、review、decision-envelope advice | 充当 hidden state source |
| Shell executor | 确定性事实：tests、lint、typecheck、build、governance checks | 智能 repair |
| Human gate | Product、architecture、risk、permission 决策 | 常规 implementation debugging |

## 入口选择

**Agent DAG**（`dag run-task` → review/writeSet → `run-dag`）为默认，用于 autonomous implementation、workflow/harness/docs governance 变更、multi-file work，或任何受益于多 executor、parallel scout、显式 write policy、shell evidence、review gate、Decision Gate 的工作。

**supervised Agent DAG** 用于 `governanceProfile=supervised`，或工作触及 loop-agent runtime、scripts/CI、schema/public contract、多个 exclusive writer、repair flow 或 high-cost path。

**one-shot Pi / Cursor prompt** 仅作受控 sidecar intervention，不是 workflow state source。

**main-session surgical patch** 仅用于 small、obvious、low-risk 的修正，且 delegation 开销会占主导。

## Sidecar intervention 协议

sidecar intervention 是一次性 Pi 或 Cursor prompt，用于 unblock 主 workflow。

调用前说明：

1. 观察到什么问题。
2. 为何当前 DAG/step 不应盲目继续。
3. sidecar 是 read-only 还是可写文件。
4. 可写工作的精确 allowed/forbidden paths。
5. 预期输出及记录位置。

典型 routing：

| 情况 | 使用 |
|---|---|
| 需 quick root-cause analysis、plan critique、log 解读 | one-shot Pi prompt，read-only |
| 需 codebase-indexed multi-file 诊断或 bounded patch | one-shot Cursor prompt |
| 需确定性 evidence | shell command / shell DAG node |
| DAG topology、writeSet 或 source contract 错误 | stop/revise DAG 或 source；不要绕开 patch |
| requirement、architecture 或 risk 决策不清 | Decision Gate / human approval |

规则：

- 同一 issue 不应反复 sidecar。若需要，pause 并 replan。
- 可写 sidecar 须在 edit 后跑 targeted verification。
- sidecar 发现须写入 task artifacts、DAG node artifacts、`docs/progress` 或 report 后再 resume。
- sidecar 输出为 advisory，直到 deterministic command 验证或并入 canonical workflow state。

### Agent DAG read-only artifact boundary

Agent DAG read-only node **不得**写 root `artifacts/`。

- root `artifacts/修改记录.md` 与 `artifacts/验证结果.md` 是 legacy / explicit-write 摘要；不是 per-node 不可变历史，也不是新工作流默认交付路径。
- Agent DAG node 发现属于 node output 与 runner-owned artifacts，位于 `.harness/dag-runs/<state>/<run-id>/<node-id>/`；Cursor 节点的 `修改记录.md` / `验证结果.md` 位于 `.harness/dag-runs/<state>/<run-id>/artifacts/<node-id>/`。
- 不要把 root `artifacts/` 当作所有 DAG node 的共享 state 交集；`.harness/dag-runs/<run-id>/` 才是 DAG state 交集。
- `./artifacts/**` 不是 DAG artifact 位置；出现该目录通常表示 Cursor prompt 没有收到 DAG-owned artifact dir。
- 若必须更新 root `artifacts/`，用显式 write-capable node 或 narrow scope、verification、recorded rationale 与后续迁移计划的 main-session surgical patch。

**Linked skill-reference writeSet candidates**：DAG task 变更 workflow 语义（artifact boundary、verdict gate、evidence summary、intervention policy）时，scout node 应提议 `./skill/references/**` 下链接文件为 **writeSet expansion candidates**，而非仅 primary docs。P2 表明 implementer writeSet 遗漏 `hybrid-dag.md` 时，虽 scout 已发现 drift，仍须 post-DAG main-session patch。

**Bounded main-session patch 须记录**：DAG run 中或之后任何可接受的 surgical patch（scope、变更文件、verification、rationale）应写入 `docs/reports/`、`docs/progress/` 或 active exec plan — 不可静默应用且无 audit trail。

**勿把 root `artifacts/**` 当 read-only DAG handoff**（P3/P5）：即使 task 文本、scout 或 supervisor 讨论 `artifacts/修改记录.md` / `artifacts/验证结果.md`，read-only DAG node 只能在 node output 返回发现。root `artifacts/` 是 legacy / explicit-write 摘要区，不是 in-flight DAG node 的共享 scratchpad，也不是新工作流默认 handoff。post-DAG 持久 handoff 用 `docs/reports/`、`docs/progress/`、exec-plan 索引与 `.harness/dag-runs/completed/<run-id>/` node artifacts。

### Completed run facts boundary（P3/P5）

`.harness/dag-runs/completed/<run-id>/` 是 canonical per-run 历史。视为 **只读 evidence**，不是可写 workflow state。

- **允许**：读 node JSON、`result.summary.md`、decision envelope、shell stdout、随 run directory 归档的 `artifacts/<node-id>/修改记录.md` / `验证结果.md`，用于 review、Decision Gate 或 post-DAG closeout。
- **禁止**：run 归档到 `completed/` 后再追加或改写 side file；mutate 历史 `run.json` / `state.json` / `artifacts/**`；把 completed facts 当作 revision DAG 的 write target。
- **Recovery**：revision DAG 需要 prior evidence 时，在 node output 或 main-session report 中消费 — 不要 in-place patch completed 目录。
- **Promotion**：需要把 completed DAG 或 one-shot run evidence 汇总为 task artifacts 时，用 deterministic `promote-run <task-id> --run-id <run-id>`；需要长期 progress 时再用 `closeout task <task-id>`。这两个命令消费历史 facts，但不修改历史 facts。

P5 验证：future agent 可从 practice report + completed node artifacts 继续，无需 root `artifacts/**` 摘要。

### Agent DAG run 中的 main-session intervention

main session 编排；不是默认 implementer。in-flight run 期间：

| Action | 何时 | 记录位置 |
|--------|------|----------|
| Inspect status / node artifacts | 始终允许 | progress 或 sidecar output 中的 notes |
| Sidecar read-only Pi/Cursor prompt | 诊断、plan critique、log 解读 | resume 前的 findings |
| Surgical patch | small、obvious、可 verify；无 active `writeSet` 冲突 | `docs/reports/` 或 exec plan，含 scope + verification |
| DAG/source repair | topology、writeSet 或 prompt contract 错误 | 编辑平台临时目录中的 DAG 或 plan；re-validate；rerun |
| Approve/reject/resume | Decision Gate `pause-on-human` | 仅 CLI artifacts |
| Post-DAG closeout | promotion、report、plan archive、indexes | `promote-run`、`closeout task`、`docs/reports/`、`docs/progress`、exec-plan indexes — 非 root `artifacts/`，除非 explicit narrow writeSet |

**Verdict 与 Decision Gate 提醒**（authoring guidance，非 runtime 变更）：

- `shell.verdictGate` 后的 review/supervisor node：首条非空行须精确为 `VERDICT: pass` 或 `VERDICT: request-revision`（P2/P4）。
- Decision Gate node：恰好一个 `DECISION_ENVELOPE_JSON` block；`audit.runId` 须为 **当前** run id（P4 misbind 教训；P5 fix）。
- Pi MED quota 耗尽：提高 Pi node `complexity` 到 `HIGH`，而非改 `executorModels` 或加 auto-retry（P4）。

完整 authoring checklist：`docs/agent-dag-runner.md` §「Agent DAG authoring checklist」与 `hybrid-dag.md` § Authoring checklist。

## Main-session surgical patch policy

仅当以下**全部**成立时允许：

1. 变更 small 且 obvious，通常 1–3 个文件。
2. 原因已知；不需要 broad system understanding。
3. 不改变 product requirement、architecture、public API、data model 或 cross-platform contract。
4. 不与 active DAG node 的 `writeSet` 或其他 executor 声明职责冲突。
5. 可用 targeted command 立即 verify。
6. patch 摘要与 verification 结果记录在 artifacts/progress/report。

好例子：

- validation 指出后修正 DAG JSON path 或 schema typo。
- 修正 doc index link 或 typo。
- revert 明显 out-of-scope 的生成 scratch file。
- LSP 或 typecheck 指向确切 issue 时修单个 import/path 错误。

坏例子：

- 手工按 `artifacts/实现计划.md` implement feature。
- 不委派就修大量 test failure。
- 改 API/contract 语义。
- refactor 子系统。
- 编辑 in-flight exclusive DAG node 拥有的文件。

最小协议：

```text
1. 标记 intervention / 必要时 pause。
2. 检查 status 与 dirty files。
3. 声明 reason 与 scope。
4. 做最小 edit。
5. 跑 targeted verification。
6. 记录 patch 摘要与 verification evidence。
7. Resume DAG / rerun failed node / restart verify。
```

## 失败状态机

```text
Run DAG workflow
  -> success: verify -> handoff
  -> node/step failure: diagnose
       -> transient/tool issue: one-shot sidecar 或 retry -> verify -> resume
       -> bounded implementation issue: Cursor/Pi fix -> verify -> resume
       -> DAG design/source issue: stop -> edit DAG/source -> validate/spec -> rerun
       -> requirement/architecture issue: Decision Gate 或 human approval -> resume/reject
  -> verification failure: bounded fix loop 或 replan，永不宣称完成
```

## 记录要求

每次 intervention 须留可恢复 trail：

- Agent DAG：优先 node artifacts 于 `.harness/dag-runs/<state>/<run-id>/<node-id>/`；长期结论写入 `docs/progress`、`docs/reports` 或 `docs/exec-plans`。read-only node 不得写 root `artifacts/`。
- Repo docs/skill workflow 变更：以 governance checks 结束，practice 变更时更新本 skill。
