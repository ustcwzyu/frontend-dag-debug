# Main Orchestrator、Agent DAG 与受控干预

协调长时 loop-agent work、判断 main session 是否可 edit、在 Agent DAG / one-shot Cursor / one-shot Pi 间选择，或在不失 auditability 的情况下恢复 in-flight workflow 时使用本文。

## 核心立场

**Agent DAG 优先，main session = Compatibility / Operator Assist，executor 经 CLI 实现，shell 验证。**

`harness.json.workflowPolicy` 的 repo 级 policy 将 Agent DAG 作为 autonomous 与 harness-governed work 的 implementation workflow。历史顺序式 `run ...` workflow 已移除。

main session 是 decision-maker 与 scheduler，**不是** implementer。稀缺 context 只用于 objective 对齐、调用 `loop-agent` / `agent-worker`、DAG/writeSet review、failure triage、verification review 与 handoff。长时 implementation 必须委派给 Pi-only Agent DAG node（经 CLI）、shell verification 或 worktree `delegate`；Cursor 仅显式 one-shot sidecar。

**严禁**主会话绕过 CLI 直接改业务实现，或在 DAG/worker 失败后「救火改文件」。宿主 Edit/Write 不是受治理恢复路径。

## 默认执行模型

| Actor | 主角色 | 避免 |
|---|---|---|
| Main session (Operator Assist) | Objective、contract、**CLI 编排**、DAG review、routing、failure triage（doctor/reconcile）、approve/reject/resume、shell verify、handoff | 成为 coder；绕过 CLI 写业务树；失败后直接 Edit |
| Agent DAG runner | 可恢复 multi-node orchestration、write policy、run artifacts | 不更新 DAG/source 的 ad-hoc replanning |
| Cursor one-shot prompt | 显式有界诊断/介入；非默认 | 当 DAG executor、自动写入、无 path scope 宽写、失败默认恢复 |
| Pi executor / prompt | DAG 内 scouting/planning/review/write profile；sidecar 只读诊断 | 充当 hidden state；主会话假装自己是 Pi writer |
| Shell executor | 确定性验证事实 | 智能 repair |
| Human gate | Product、architecture、risk、permission | 常规 implementation debugging |

## 入口选择

**Agent DAG**（`dag run-task` → review/writeSet → `run-dag`）为默认，用于 autonomous implementation、workflow/harness/docs governance 变更、multi-file work，或任何受益于多 executor、parallel scout、显式 write policy、shell evidence、review gate、Decision Gate 的工作。

**supervised Agent DAG** 用于 `governanceProfile=supervised`，或工作触及 loop-agent runtime、scripts/CI、schema/public contract、多个 exclusive writer、repair flow 或 high-cost path。

**one-shot Pi / Cursor prompt** 仅作受控 sidecar intervention，不是 workflow state source，也不是 CLI 失败后的默认出口。

**main-session 直接写业务实现：默认禁止。** 仅治理/脚手架层面的极窄修正见下文「允许的 operator 写入」；功能实现、bugfix、多文件逻辑变更必须走 DAG CLI。

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
- sidecar 发现须写入 task artifacts、DAG node artifacts、`ai_workspace/loop-agent/progress` 或 report 后再 resume。
- sidecar 输出为 advisory，直到 deterministic command 验证或并入 canonical workflow state。

### Agent DAG read-only artifact boundary

Agent DAG read-only node **不得**写 root `artifacts/`。

- root `artifacts/修改记录.md` 与 `artifacts/验证结果.md` 是 legacy / explicit-write 摘要；不是 per-node 不可变历史，也不是新工作流默认交付路径。
- Agent DAG node 发现属于 node output 与 runner-owned artifacts，位于 `.harness/dag-runs/<state>/<run-id>/<node-id>/`；Cursor 节点的 `修改记录.md` / `验证结果.md` 位于 `.harness/dag-runs/<state>/<run-id>/artifacts/<node-id>/`。
- 不要把 root `artifacts/` 当作所有 DAG node 的共享 state 交集；`.harness/dag-runs/<run-id>/` 才是 DAG state 交集。
- `./artifacts/**` 不是 DAG artifact 位置；出现该目录通常表示 Cursor prompt 没有收到 DAG-owned artifact dir。
- 若必须更新 root `artifacts/`，用显式 write-capable DAG node；不要用主会话「顺手写 root artifacts」代替节点。

**Linked skill-reference writeSet candidates**：DAG task 变更 workflow 语义时，scout 应提议 `skills/loop-agent/references/**` 为 **writeSet expansion candidates**，并在下一轮 DAG 中写入，而不是 post-DAG 由主会话大段补写 skill。

**允许的 operator 写入必须记录**：若发生下文极窄 operator 文件维护，须在 `ai_workspace/loop-agent/reports/`、`progress/` 或 exec plan 留下 scope + verification — 不可静默、不可当作实现完成。

**勿把 root `artifacts/**` 当 read-only DAG handoff**（P3/P5）：即使 task 文本、scout 或 supervisor 讨论 `artifacts/修改记录.md` / `artifacts/验证结果.md`，read-only DAG node 只能在 node output 返回发现。root `artifacts/` 是 legacy / explicit-write 摘要区，不是 in-flight DAG node 的共享 scratchpad，也不是新工作流默认 handoff。post-DAG 持久 handoff 用 `ai_workspace/loop-agent/reports/`、`ai_workspace/loop-agent/progress/`、exec-plan 索引与 `.harness/dag-runs/completed/<run-id>/` node artifacts。

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
| Surgical patch | small、obvious、可 verify；无 active `writeSet` 冲突 | `ai_workspace/loop-agent/reports/` 或 exec plan，含 scope + verification |
| DAG/source repair | topology、writeSet 或 prompt contract 错误 | 编辑平台临时目录中的 DAG 或 plan；re-validate；rerun |
| Approve/reject/resume | Decision Gate `pause-on-human` | 仅 CLI artifacts |
| Post-DAG closeout | promotion、report、plan archive、indexes | `promote-run`、`closeout task`、`ai_workspace/loop-agent/reports/`、`ai_workspace/loop-agent/progress`、exec-plan indexes — 非 root `artifacts/`，除非 explicit narrow writeSet |

**Verdict 与 Decision Gate 提醒**（authoring guidance，非 runtime 变更）：

- `shell.verdictGate` 后的 review/supervisor node：首条非空行须精确为 `VERDICT: pass` 或 `VERDICT: request-revision`（P2/P4）。
- Decision Gate node：恰好一个 `DECISION_ENVELOPE_JSON` block；`audit.runId` 须为 **当前** run id（P4 misbind 教训；P5 fix）。
- Pi MED quota 耗尽：提高 Pi node `complexity` 到 `HIGH`，而非改 `executorModels` 或加 auto-retry（P4）。

完整 authoring checklist：`ai_workspace/loop-agent/agent-dag-runner.md` §「Agent DAG authoring checklist」与 `hybrid-dag.md` § Authoring checklist。

## 允许的 operator 写入（极窄；默认仍走 CLI）

主会话**默认零业务写权限**。下列**全部**成立时，才允许维护**治理/任务元数据**（不是产品功能实现）：

1. 变更不触及业务功能逻辑；通常是 task source、DAG JSON typo、doc index、或删除 scratch。
2. 原因已知；不需要 broad system understanding。
3. 不改变 product requirement 语义、architecture、public API、data model 或 cross-platform contract。
4. 不与 active DAG exclusive `writeSet` 冲突。
5. 可立即 shell verify。
6. 记录 scope + verification；且**下一步仍是 CLI re-validate / rerun**，不是「主会话继续实现」。

好例子：

- 修 DAG JSON path / schema typo 后 `dag validate` + `run-dag`。
- 修正 doc index link 或 typo。
- 删除明显 out-of-scope 的生成 scratch。
- 补全 `source/执行约束.md` 中的 allowedPaths 列表后 regenerate DAG。

坏例子（**一律禁止**）：

- CLI/DAG 失败后主会话直接改 `src/**`「救火」。
- 手工按计划实现功能或修测试失败。
- 改 API/contract 语义或 refactor 子系统。
- 编辑 in-flight exclusive DAG node 拥有的实现文件。
- 用 `cursor-prompt` / 宿主 Write 代替 `implement-pi` / `repair-pi`。

失败默认序列（替代旧 surgical-patch 心智）：

```text
1. dag doctor / dag report / status
2. 分类失败；需要时 reconcile-run 或 human gate
3. 仅当 source/DAG 包错误时最小修正元数据
4. dag validate → run-dag / worker 重试
5. shell verification
6. 记录 evidence；禁止主会话实现收尾
```

## 失败状态机

```text
Run DAG workflow (via loop-agent / agent-worker CLI)
  -> success: shell verify -> handoff
  -> node/step failure: diagnose with doctor/report
       -> transient/tool issue: CLI retry or explicit read-only sidecar advice -> verify -> resume
       -> bounded implementation issue: DAG repair-pi / re-run writer via CLI（禁止主会话 Edit 实现）
       -> DAG design/source issue: stop -> fix DAG/source metadata -> validate -> rerun
       -> requirement/architecture issue: Decision Gate / human approval -> resume/reject
  -> verification failure: CLI bounded repair loop 或 replan；永不主会话手改冒充完成
```

## 记录要求

每次 intervention 须留可恢复 trail：

- Agent DAG：优先 node artifacts 于 `.harness/dag-runs/<state>/<run-id>/<node-id>/`；长期结论写入 `ai_workspace/loop-agent/progress`、`ai_workspace/loop-agent/reports` 或 `ai_workspace/loop-agent/exec-plans`。read-only node 不得写 root `artifacts/`。
- Repo ai_workspace/loop-agent/skill workflow 变更：以 governance checks 结束，practice 变更时更新本 skill。
