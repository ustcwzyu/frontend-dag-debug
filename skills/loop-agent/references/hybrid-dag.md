# Agent DAG Hybrid Workflow（`run-dag` / `dag init-hybrid`）

创建或执行 loop-agent 工作的首选 Agent DAG path 时使用本文：Level 2 Agent DAG orchestration、Pi read-only + Pi `toolProfile: "write"` bounded execution、optional Cursor backend、write policy、DAG template、task-to-DAG 生成，或基于 governance-profile 的 template 选择。

### DAG workflow 优先级

`harness.json.workflowPolicy` 现声明 Agent DAG 为首选 implementation workflow：

- `defaultImplementationWorkflow=agent-dag`
- `dag.defaultEntry=dag run-task`
- `dag.outputLanguage=zh-CN`；未配置时也默认中文，显式设为 `en` 可切换英文
- `dag.profileRouting`：`minimal|standard -> standard-dag`，`reviewed -> review-gated-dag`，`supervised -> supervised-implementation`
- `humanGatePolicy.defaultMode=record-only`；需求不清、架构/公共契约风险、凭据/费用/部署风险、重复 gate failure 或高风险决策时升级人工介入

此 policy 驱动 `dag run-task --profile auto`：CLI 仍要求显式 `dag run-task`、`dag validate`、`run-dag`，但 `--profile auto` 在确定性 candidate `governanceProfile` 推断后应用 `workflowPolicy.dag.profileRouting`。生成器还会把 `outputLanguage` 写入 DagSpec，runner 在每个 Pi/Cursor 节点 prompt 中注入语言规则；代码、命令、路径、JSON 字段与 gate token 保持原样。`humanGatePolicy` 是默认人机边界声明；真实暂停仍由 DAG 节点的 `decisionGate.mode: "pause-on-human"` 与 decision envelope 触发。无 profile 的 `dag run-task <task-id>` 仍为 standard-compatible，供 legacy/review workflow。

### DAG workflow 层级

| 优先级 | 入口 | 使用场景 |
|-------|-------|----------|
| **Primary / Level 3** | `dag run-task --profile auto` / `dag init-hybrid`（已实现） | 从 task `source/` 自动生成 hybrid DAG；`--profile auto` 路由 standard / review-gated / supervised template；无 profile `run-task` 默认为 standard-compatible generate+validate only |
| **Primary / Level 2** | `run-dag --dag <path>` | 跨 Cursor + Pi + shell executor 执行 Agent DAG orchestration |
历史顺序式 `run analyze|plan|implement|verify|auto|loop|continue` 已移除。trivial one-line 修正时，记录的 main-session surgical patch 仍可能比建 DAG 更省，但它不是第二套 workflow runtime。

**心智模型**：`run-dag` 是 `.` 内自编的 Agent DAG orchestration；Cursor SDK 仅是 `executor: "cursor"` node 的 leaf executor。Cookbook 式 Cursor DAG 示例同样是基于 Cursor SDK local subagent 的 custom DAG runner，不是 Cursor 原生 DAG API。仅可选地借鉴其 observer/streaming/cancel 模式作为 derived feature；不要替换本 repo 的 hybrid schema、`executorModels`、Pi/shell/static executor 或 `.harness/dag-runs` facts。

### Level 2 Agent DAG hybrid（`run-dag`）

```bash
cp examples/hybrid-loop-agent-dag.json <temp-dir>/hybrid-dag.json
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json                 # 常规 validation + ranks；无 dag-runs 副作用
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --strict-models # 非 canonical executorModels 时也失败
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --strict-governance # governance warning（如 read-only artifact drift）时失败
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --forbid-executor cursor # offline/CI/no-key 显式 no-Cursor；存在 cursor node 时失败
loop-agent run-dag --dag <temp-dir>/hybrid-dag.json --cwd <repo-root>          # 执行（若包含 cursor node 则需 CURSOR_API_KEY）
loop-agent run-dag --dag <temp-dir>/hybrid-dag.json --cwd <repo-root> --no-cursor # 存在 cursor node 时执行前失败
loop-agent run-dag --dag <temp-dir>/hybrid-dag.json --init-only --canvas-path <temp-dir>/hybrid-dag.canvas.tsx # 可选 derived Canvas（无需 CURSOR_API_KEY）
```

`<temp-dir>` 表示平台原生临时目录；实际命令中 macOS 与 Windows 都使用本机路径。`/` 只作为 repo refs、JSON/Markdown evidence refs 和 glob 约定的稳定分隔符。

完整 schema 与语义：`docs/agent-dag-runner.md`。Workflow 概览：`docs/loop-agent-harness.md`。

**v2 字段**（均可选；缺失时行为同 v1）：

- 顶层：`objective`、`successCriteria`、`globalConstraints`、`defaults`、`skillsByRole`、`executorModels`
- 每 node：`role`、`skills`、`writePolicy`、`writeSet`、`piStep`、`shell`、`outputContract`、`executor`（`cursor` | `pi` | `shell` | `static`）；Pi 写入节点额外声明 `toolProfile: "write"`

**Model 生成 DAG 的 template 卫生**：

- 执行前将所有 `REPLACE/WITH/...` placeholder 换为具体 repo path。
- 每个 task 应显式声明 `executor`；`defaults.executor` 仅 schema，非 runtime fallback。
- 每个 task 应声明 `outputContract`；read-only node 应含 `forbiddenPaths`（至少 `[".harness/**", "artifacts/**"]`）；exclusive write node 也应 forbid `artifacts/**`，除非 legacy root artifacts 显式在 `writeSet` 中并记录迁移计划。
- 输出独立时优先 same-rank parallel read-only scout（`scout-src`、`scout-tests` 等），而非 serial scout chain。
- 仅当 child 真正需要 upstream output 时加 `depends_on`；review 时质疑 single-chain topology。
- `exclusive` implementer node 需 narrow、disjoint 的 `writeSet` path；勿用 `**` 或 repo root。
- 默认 no-Cursor DAG 使用 `pi` read-only scouts/reviewers 与 `toolProfile: "write"` exclusive implementer；Cursor 是显式启用的可选 scout / writer backend。
- model routing 用 `executorModels`；勿用 `defaults.model` 或 legacy 顶层 `models`。

**运维 warning**：

- **常规 validation**：`dag validate --dag <path>` 做 schema/topology/ranks。JSON 输出含 `governanceProfile`（确定性 `minimal|standard|reviewed|supervised` 推断，含 `process` / `delivery` / `codeChange` signal 与 `reasons`），及 model-matrix drift、governance lint（如 read-only artifact-boundary drift 或 DAG 内 `check-repo.sh` shell env drift）的 warnings。手写临时 DAG spec 执行前用 `dag validate --dag <path> --strict-models`；governance warning 应 fail fast 时加 `--strict-governance`。no-Cursor 环境用 `dag validate --dag <path> --forbid-executor cursor` 或 `run-dag --no-cursor` 捕获显式 Cursor 节点；默认生成 DAG 应使用 `pi` read-only / Pi write profile / shell。仅当有意在 `.harness/dag-runs/active/` 要 active run snapshot 时用 `run-dag --dry-run`。
- **Governance profile 推断与 routing（code vs skill 分工）**：`./src/workflows/dag/governance-profile.ts` 从 DAG 结构与 write scope 做 **硬确定性推断**。JSON 输出 **报告** `process` / `delivery` / `codeChange` signal 与人类可读 `reasons`；`profile` tier（`minimal|standard|reviewed|supervised`）仅由该模块 code rule 选择（如多个 exclusive writer、repair node、review-gate topology、`loop-agent-runtime-paths`、`scripts-ci-harness-paths`、weak post-implementation shell verification、supervised topology）。baseline `forbiddenPaths`（`.harness/**`、`.harness/dag-runs/**`、`artifacts/**`）是默认 governance，**本身不是** process-risk signal。skill prompt 与本 reference **解释** tier 并摘要 profile 选择原因；不替代 code 推断。`dag run-task` 转发 embedded validate step 的同一 candidate `governanceProfile`。`dag run-task --profile auto` 先将 candidate profile 经 `harness.json.workflowPolicy.dag.profileRouting` 映射，再在 candidate delivery signal 含 `loop-agent-runtime-paths`、`scripts-ci-harness-paths` 或 `public-contract-paths` 时应用 M4 `supervised-quality-gate` promotion；`profileRouting.routingReasons` 记录确定性 reason。无 profile `dag run-task <task-id>` 仍为 standard-compatible；显式 `--profile minimal|standard|reviewed|supervised` 强制对应 template family（当前 policy 下 minimal/standard 路由到 `standard-dag`），高风险 task 应用 `--profile auto` 或显式 `--profile supervised`，而非显式 `--profile reviewed`。
- **Executor model routing**：DAG spec 选 `executor` 与 `complexity`，可通过 `executorModels` 覆盖 `cursor` / `pi` 的 model 名；不选 provider。默认 routing：Cursor 各 complexity 用 `composer-2.5`；Pi read-only 与 Pi write profile 共用 LOW=`wizard-local/gpt-5.3-codex-spark`、MED=`wizard-local/glm-5.2`、HIGH=`wizard-local/gpt-5.5`。`shell` 不用 model，忽略 `executorModels`。
- **Active visibility**：真实 `run-dag` execution 在 run/node 转换时写 active `state.json`，归档前 core runner 暴露 isolated `DagRunObserver` hook 供 derived view。`.harness/dag-runs/completed/<run-id>/` / `paused/<run-id>/` 仍是 source of truth；observer 输出非 canonical。
- **可选 Canvas**：传 `--canvas-path <abs-path>` 或 `--canvas <name>` 输出 derived `.canvas.tsx` live view。省略 flag 行为不变。`--init-only` + Canvas 无需 `CURSOR_API_KEY`。

- **Shell node**：`executor: "shell"` 串行跑确定性 `shell.commands`，每 command 有 `timeoutMs`；非零 exit / timeout 标 node `ERROR` 并将 command output 归档到 node result 目录。用于 verification fact，非 code repair。
- **Pi node**：`executor: "pi"` 默认仅用 read-only tool（当前 DAG Pi executor 中 `read`、`grep`、`find`、`ls`），返回 Markdown 结论供 downstream node。声明 `toolProfile: "write"` 后同一个 Pi executor 使用 writer tools 并在执行后跑 write guard；必须配合 `writePolicy=exclusive`、`allowedPaths`、`forbiddenPaths`、`writeSet`。
- **Root `artifacts/` boundary**：root `artifacts/修改记录.md` 与 `artifacts/验证结果.md` 是 legacy / explicit-write 摘要，不是 Agent DAG read-only scratchpad，也不是新工作流默认 handoff。read-only DAG node 须在 node output 返回发现；runner-owned node artifacts 于 `.harness/dag-runs/<run-id>/` 是 per-run source of truth。
- **Upstream output artifacts**：直接 `depends_on` 上游 stdout 超过 2000 字符时，runner 写 `<runDir>/<node-id>/stdout.md` 并在下游 `<upstream_context>` 提供 preview + artifact pointer map（绝对路径、`chars`、`sha256`）。下游 agent 可读 runner evidence，但 read-only node 仍不得编辑 `.harness/dag-runs/**`。
- **`writePolicy=exclusive`** 要求非空 `writeSet`；same-rank exclusive node 的 `writeSet` 条目须 **disjoint**，否则 validation fail fast。v1 DAG 中声明 `writePolicy` 或 `writeSet` 任一即 opt-in write validation。
- **`forbiddenPaths` 优先于 `allowedPaths`**（writeSet validation）。
- **Pi rollback**：SDK path 损坏时在 `run-dag` 前 `export CODE_AGENT_PI_BACKEND=cli-only`。
- **Defaults  caveat**：`defaults.skills` / `defaults.writePolicy` 生效。对 `cursor` / `pi` node，resolved skill 名亦由 DAG runner 映射为有界 inline `SKILL.md` instruction，审计于 `<node>/skills.json`；Pi 仍以 `noSkills` / `--no-skills` 运行，故非 Pi ResourceLoader loading。`defaults.executor`、`defaults.model`、`defaults.piBackend`、`defaults.contextProfile` 接受/保留但尚非 runtime default。runtime execution 用 node `executor` + node `complexity`；各 executor 内部自选 model。live contract 已移除 `models`；executor-specific routing 用 `executorModels`。
- **默认无**跨 node Pi runtime reuse；各 Pi node 是独立 `executePiStep()` call。
- **Prompt source**：每个 task 仅用一种 prompt source。v1-compatible DAG 用 inline `subtask_prompt`；markdown-backed prompt 用 canonical `subtask_prompt_markdown`。同时提供两字段、皆不提供、或用连字符 alias `subtask_prompt-markdown` 均 fail fast。
- **勿宣称 live smoke 已通过**，除非真实 `run-dag` execution 中 Pi read-only、Pi writer、显式 Cursor 或 shell node 均按 DAG 完成。

可复用 template：`docs/templates/agent-dag.base.json`（model 生成 DAG 的首选 base template）、`docs/templates/agent-dag.schema.json`（JSON Schema）、`docs/templates/agent-dag.supervised-implementation.json`（supervised implementation：writeSet audit、soft/hard verify、process supervisor、repair、review verdict gate）、`docs/templates/agent-dag-process-supervisor.prompt.md`、`docs/templates/agent-dag-review-verdict.prompt.md`、`docs/templates/agent-dag-authority-surface-audit.prompt.md`（可选 authority surface verifier；authority signal 或显式 enablement 匹配时由 `dag init-hybrid` 插入）、`examples/hybrid-loop-agent-dag.json`、`docs/templates/hybrid-dag.json`。

### Supervised implementation flow（减少 main-session intervention）

长时 implementation 曾迫使 main session 中途 re-verify、re-review 或 surgical-patch 时，用 `docs/templates/agent-dag.supervised-implementation.json`。

**此前 main session 介入原因**：linear hybrid DAG 缺少 in-run writeSet coverage audit、supervision 前归档的 soft verification、read-only process supervisor（`executor: pi`，`role: supervisor` — 非新 executor）、bounded repair exclusive writer、确定性 hard-verify shell fact，以及 fail-closed review verdict gate（除非 whitelist `VERDICT:` 行存在）。

**Supervised topology**（执行前替换所有 `REPLACE/WITH/...` placeholder）：

```text
contract-pi → scout-src ∥ scout-tests → plan-pi → write-set-audit-pi
  → write-set-gate-shell → implement-pi → soft-verify-shell → process-supervisor-pi → process-gate-shell
  → repair-pi → hard-verify-shell
  → [authority-surface-audit-pi → authority-surface-gate-shell]  # 可选
  → review-pi → review-gate-shell → decision-pi → closeout-pi
```

| Stage | 减少 main-session 工作的方式 |
|-------|------------------------------|
| `write-set-audit-pi` | implement 前捕获 missing/overlapping writeSet owner |
| `write-set-gate-shell` | 除非 extracted audit verdict 行为 `VERDICT: pass`，否则 fail-closed block implement |
| `soft-verify-shell` | supervision 前归档 focused test exit code |
| `process-supervisor-pi` | read-only audit coverage、boundary drift、verify gap、repair scope；应 prominently 输出 `VERDICT: pass` 或 `VERDICT: request-revision` |
| `process-gate-shell` | supervisor node JSON 上 runtime `shell.verdictGate`（仅 `pass` 或 `request-revision`） |
| `repair-pi` / optional `repair-cursor` | supervisor 请求 revision 时在 repair `writeSet` 内 bounded exclusive fix |
| `hard-verify-shell` | lint/typecheck + `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 check-repo.sh` fact |
| `authority-surface-audit-pi` + `authority-surface-gate-shell` | 可选 permission/state/tool-exposure audit；仅 authority signal 或显式 `authority-surface-audit` marker 时插入；gate 仅接受 `VERDICT: pass` |
| `review-pi` + `review-gate-shell` | Critical/Important → `request-revision`；node JSON 上 `shell.verdictGate` block，除非 extracted verdict 行为 `VERDICT: pass` |

**Verdict gate contract（`shell.verdictGate`）**：声明 `fromNodeId`、`accept[]`、可选 `label`、可选 `lineMode`。runner 展开为一条 shell command，从 injected current run directory 读 `$HARNESS_DAG_RUN_DIR/<fromNodeId>.json`，对 extracted `assistantText ?? stdout` verdict line 与 `accept[]` exact-match。默认 `lineMode` 为 `first-non-empty` 以兼容；supervised gate 用 `first-verdict-line` 选 Pi 在 preamble 或常见整行 Markdown emphasis（如 `**VERDICT: pass**`）后第一条 normalized `VERDICT:` line。勿用 `result.summary.md`、grep VERDICT、latest-active-run discovery 或 multi-command stateful gate。`--strict-governance` 对 anti-pattern fail。supervisor 仍为 `executor: pi` 上的 `role: supervisor`。

Prompt invariant：`docs/templates/agent-dag-process-supervisor.prompt.md`、`docs/templates/agent-dag-review-verdict.prompt.md`、`docs/templates/agent-dag-authority-surface-audit.prompt.md`（启用时）。测试：`npx vitest run test/dag-supervised-template.test.ts test/authority-surface.test.ts`。完整叙述：`docs/agent-dag-runner.md` §「Why main-session interventions happened」。

**未实现**：`executor: supervisor`、automatic retry/resume、`executor: human`/`decision`、browser executor，或 read-only node 对 root `artifacts/**` 的 exemption。

### Level 3 task-to-DAG（`dag init-hybrid` / `dag run-task`）

```bash
loop-agent dag init-hybrid <task-id> [--output <temp-dir>/<task-id>-hybrid-dag.json]
loop-agent dag run-task <task-id> [--output <temp-dir>/<task-id>-hybrid-dag.json]   # 安全默认：仅 generate + validate，standard-compatible
loop-agent dag run-task <task-id> --profile auto                                # 推断 candidate governanceProfile，再经 workflowPolicy 路由
loop-agent dag run-task <task-id> --profile minimal                             # 强制当前 minimal 路由（standard-dag）
loop-agent dag run-task <task-id> --profile standard                            # 强制 standard-dag
loop-agent dag run-task <task-id> --profile reviewed                            # 强制 review-gated DAG
loop-agent dag run-task <task-id> --profile supervised                          # 强制 supervised implementation DAG
loop-agent dag run-task <task-id> --strict-models                              # 非 canonical executorModels 时失败
loop-agent dag run-task <task-id> --no-cursor                                  # 显式 no-Cursor 校验；generated cursor node 时失败
loop-agent dag run-task <task-id> --execute --cwd <repo-root>                        # 要求 narrowed implement writeSet
loop-agent dag run-task <task-id> --dry-run --cwd <repo-root>                        # active snapshot 于 .harness/dag-runs/active/
loop-agent dag run-task <task-id> --init-only --cwd <repo-root>                      # pending active snapshot，不执行 node
```

默认 `dag run-task` **不**创建 `.harness/dag-runs/**`。placeholder / `**` implement writeSet 会 block `--execute`、`--init-only`、`--dry-run`，直到人工 review narrow path。

`dag run-task` JSON 输出含确定性 `reviewPacket` 供执行前 review。derived 自 generated DAG JSON、embedded validate summary、`profileRouting`；不调用 LLM，不写 completed run facts。`run-dag` 前用它 inspect `profileRouting`、`governanceProfile`、exclusive writer `writeSet`、`broadWriteSetRisk`、`forbiddenOverlapRisk`、`shellGates`（含 `lineMode`）、`shellVerification` / `expectedVerification`、`decisionGates` mode。

### DAG 与 artifacts source-of-truth 规则

- 临时 DAG input spec 放平台原生临时目录（例如 `<temp-dir>/<topic>-dag.json`）；可复用 template 放 `examples/` 或 `docs/templates/`。
- **不要**在 `.harness/dag-runs/active/` root 保留手写 DAG input 副本。
- **不要**把 `.harness/dag-runs/` 内容 commit 到 git。
- canonical per-run DAG 历史是 `.harness/dag-runs/completed/<run-id>/run.json` 及该 run 目录的 `state.json`、`executor.jsonl`、node artifacts；新建 run directory 使用 `YYYYMMDD-<slug>`。
- root `artifacts/修改记录.md` 与 `artifacts/验证结果.md` 是 legacy current-work / explicit-write 摘要。不是 per-run 不可变历史，也不是新工作流默认交付路径。
- Agent DAG read-only node 不得写 root `artifacts/`；若须更新 root artifacts，用显式 `exclusive` write node 或记录了理由、验证与迁移计划的 main-session surgical patch。
- DAG Cursor 节点交付物必须写入 `.harness/dag-runs/<state>/<run-id>/artifacts/<node-id>/`；`./artifacts/**` 是错误落点。
- 长期结论须迁入 `docs/exec-plans/`、`docs/reports/` 或 `docs/progress/`。从 completed run evidence 汇总 task artifacts 时用 `promote-run <task-id> --run-id <run-id>`；再用 `closeout task <task-id>` 生成 progress。二者 deterministic，且不 mutate completed run facts。

**DAG author 的 artifact-boundary 提醒**：大量 *讨论* root `artifacts/**` 的 task 仍遵守同一 write guard — read-only node 仅在 node output 返回发现；exclusive node 保持 `artifacts/**` 在 `forbiddenPaths`，除非 concrete path 在 `writeSet`。不要在 declared writeSet 外 instruct implementer 写 `artifacts/修改记录.md` 或 `artifacts/验证结果.md`（P3 boundary-risk practice）。scout 在链接 skill reference 中发现 stale wording 时，把那些 path 纳入 implementer writeSet，或接受记录的 main-session patch（P2 教训：`hybrid-dag.md` 被 scout 发现但 initial writeSet 遗漏）。

### Decision Gate（M3–M5 runtime）

Pi reviewer node 设 `decisionGate.enabled: true` 时，runner 从 persisted `assistantText`（优先）或 `result.summary.md`（fallback）解析 **恰好一个** info string 为 `DECISION_ENVELOPE_JSON` 的 fenced block。Schema：`docs/templates/agent-dag-decision-envelope.schema.json`。Prompt：`docs/templates/agent-dag-decision-gate.prompt.md`（含 §Recovery Recommendation Consumption 与 schema-adherence 硬规则：勿发明 envelope schema、勿用 `decision: accept`、勿加 extra root key、`audit.runId` 须绑定当前 run id，并填 `audit.nodeId` / `audit.model`）。Playbook：`docs/agent-dag-recovery-playbook.md`。示例 DAG：`examples/decision-gate-agent-dag.json`。

| Milestone | `decisionGate.mode` | 行为 |
|-----------|---------------------|----------|
| **M3 record-only** | `record-only`（默认） | 写 `<node-id>/decision.envelope.json` + node record summary；**不 pause**，**不** branch 于 `decision`/`nextAction` |
| **M4 pause-on-human** | `pause-on-human` | parse OK 且 `requiresHuman=true`：run `status=paused`，移入 `.harness/dag-runs/paused/<run-id>/`，写 `human-escalation.json` / `.md`；downstream node 保持 `PENDING` |
| **M5 CLI** | （M4 pause 后） | 确定性 human decision — **无 LLM**，**无** `executor: human` / `executor: decision` |

```bash
loop-agent dag doctor
loop-agent dag status --run-id <run-id>
loop-agent dag report --paused-latest [--json|--markdown]   # 最新 paused run；勿与 --lifecycle 并用
loop-agent dag report [--run-id <run-id>] [--lifecycle active|paused|completed|all] [--json|--markdown] [--failed-only] [--latest] [--action <recovery-action>]  # derived per-node report（只读）；JSON schema: docs/templates/agent-dag-report.schema.json；仅 advisory — 见 docs/agent-dag-recovery-playbook.md
loop-agent dag closeout-draft [--run-id <run-id>] [--output <path>]  # M5：从 completed run facts 生成确定性 closeout draft；默认平台临时目录；仅 advisory；不 mutate completed facts
loop-agent promote-run <task-id> --run-id <run-id>                    # 从 completed DAG/one-shot evidence 汇总 task artifacts；不 mutate completed facts
loop-agent closeout task <task-id>                                    # 从 task artifacts 生成 docs/progress closeout
loop-agent dag reconcile-tasks --glob '<pattern>' [--json|--markdown]  # 仅报告的 task/run/artifact/verify drift audit
loop-agent dag final-verification <task-id> [--output <path>]  # 生成 closeout DAG；final verify 依赖 closeout artifact
loop-agent dag decision inspect --run-id <run-id> [--node-id <node-id>]
loop-agent dag decision validate --run-id <run-id> [--node-id <node-id>]
loop-agent dag approve --run-id <run-id> --option <id> [--notes "..."]
loop-agent dag reject --run-id <run-id> --reason "..."
loop-agent dag resume --run-id <run-id>   # approve 后继续
```

**Paused operator flow**：`run-dag` → `paused/` →（`dag status` / 可选 `dag decision validate`）→ `dag approve` → `active/` → `dag resume` → `completed/`；或 `dag reject` → `completed/`（`failed`，`failureCategory=human-rejected`）。

**Stale active detection**：`dag doctor` 标 health code 如 `terminal-in-active`（`active/` 保留 terminal run）；仅 advisory — 按 playbook 手动 archive/remove，尚无 auto cleanup CLI。

**Deferred**：`browser` executor；`dag recover apply`；勿在 DAG JSON 加 `executor: human` 或 `executor: decision`。

**In-flight DAG run 期间的 governance**：live run 内 shell verify node 须用 `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh`。run 归档到 `completed/` 后，在 DAG 外跑裸 `bash scripts/check-repo.sh`。

### Evidence summary guidance（practice convention — 非 runtime）

review-heavy DAG 中长 shell stdout 可能掩盖 proof 时，用 **evidence-summary-shell** 作为 authoring pattern。**不是** runtime executor、schema field 或 parser。

- soft/hard verify shell node 之后，prompt downstream **read-only** Pi reviewer（`reviewer`、`supervisor`、`closeout`）在 node output 开头用紧凑 `EVIDENCE:` 行（`EVIDENCE: <check> exit=<code> (<one-line fact>)`），再写 prose findings。
- 与现有 **`shell.verdictGate`** 配对做 fail-closed gate：`VERDICT: pass` 或 `VERDICT: request-revision` 仍是 machine-readable decision；supervised gate 用 `lineMode: "first-verdict-line"`，`EVIDENCE:` 行供扫描事实，不能替代 verdict line。
- shell node exit code 与 archived command output 为 authoritative；`EVIDENCE:` 摘要供 human/decision-gate 扫描速度，不替代 deterministic shell verification。
- **不要**期望 runner enforce、parse 或 validate `EVIDENCE:` 格式；**不要**在 `shell.verdictGate` 或 shell exit code 已够用时手写 shell grep `EVIDENCE:`。
- read-only node 不得写 root `artifacts/**`；compact evidence 属于 `.harness/dag-runs/<run-id>/` 下归档的 node output。

完整叙述：`docs/agent-dag-runner.md` §「Evidence Summary as a Practice Convention」。P1 calibration report：`docs/reports/2026-06-08-agent-dag-practice-p1-evidence-summary-docs.md`。

### Authoring checklist（P1–P5 practice guidance — 非 runtime 行为）

> 与 `docs/agent-dag-runner.md` §「Agent DAG authoring checklist」相同。Calibration reports：`docs/reports/2026-06-08-agent-dag-practice-p1-evidence-summary-docs.md` … `p5-handoff-closeout-20260608.md`。

| # | Check | Expect |
|---|-------|--------|
| 1 | Topology | 优先 same-rank parallel read-only scout/review；仅 output 真正需要时加 `depends_on` |
| 2 | Executor | 每个 task 显式声明 `executor`；`defaults.executor` 是 schema metadata，非 runtime fallback |
| 3 | Model routing | 用 node `complexity` + `executorModels`；Pi MED（`glm-5.2`）quota 耗尽时提高 Pi node 到 `complexity: HIGH`（`gpt-5.5`）— 勿 mutate canonical model matrix |
| 4 | Read-only output | read-only / Pi node 在 **node output** 返回发现；runner 归档于 `.harness/dag-runs/<run-id>/<node-id>/` |
| 5 | Root `artifacts/**` | 非 read-only handoff target；持久记录去 `docs/reports/`、`docs/progress/`，或 narrow exclusive `writeSet` 写 legacy 摘要并记录迁移计划 |
| 6 | DAG Cursor artifacts | 写入 `.harness/dag-runs/<state>/<run-id>/artifacts/<node-id>/`；不得写入 `./artifacts/**` |
| 7 | Completed facts | `.harness/dag-runs/completed/**` 仅可读 evidence — 归档后永不 mutate 历史 run 目录、`run.json`、`state.json` 或 `artifacts/**` |
| 8 | Verdict gate | review/supervisor 应以 `VERDICT: pass` 或 `VERDICT: request-revision` 开头以利阅读；用 current-run `<fromNodeId>.json`（`$HARNESS_DAG_RUN_DIR`）上 `shell.verdictGate` block，exact-match `accept[]`；默认 `lineMode=first-non-empty`，supervised template 用 `first-verdict-line` 容忍 preamble 或第一条 normalized `VERDICT:` 前的常见整行 Markdown emphasis |
| 9 | Decision Gate | 恰好 emit 一个 `DECISION_ENVELOPE_JSON` block；`audit.runId` 须绑定 **当前** run id；禁止 `decision: accept`、发明 schema、extra root key；填 `audit.nodeId` / `audit.model` |
| 10 | writeSet planning | scout 应列出链接的 `./skill/references/**` 为 **writeSet expansion candidates**（P2：遗漏链接 skill ref 迫使 main-session patch） |
| 11 | Evidence summary | `evidence-summary-shell` / leading `EVIDENCE:` 行是 **practice convention**，非 runtime executor、schema field 或 parser |
| 12 | Featureization | 除非 repeated real-run failure 证明 checklist guidance 不够，勿加 runtime/schema/validator/CLI/executor feature |
| 13 | writeSet / writer backend | `exclusive` node 用 narrow、disjoint path；无 `**`；默认用 Pi write profile，仅在显式启用且 task-fit 时用 Cursor |
| 14 | Placeholders | 执行前将 `REPLACE/WITH/...` 换为具体 path |
| 15 | Governance | in-flight shell：`HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh`；archive 后：裸 `bash scripts/check-repo.sh` |
