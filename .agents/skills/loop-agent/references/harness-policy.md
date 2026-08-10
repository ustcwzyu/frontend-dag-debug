# Shared loop-agent Harness Policy

本文件是跨仓库使用 `.` 的 canonical shared workflow policy。Repo-local harness docs 只应描述 local adapters：runtime 位置、governance root、适用的 verification commands。

## Canonical stance

- **Agent DAG** 是 medium/large、multi-file、architecture-sensitive、public-contract、CI/script 或 harness-runtime 工作的默认 implementation workflow。
- 历史顺序式 `run analyze|plan|spec|implement|verify|auto|loop|continue` workflow 已移除。不要将其作为 fallback path 呈现。
- **Long-running `loop`** 是 Agent DAG 之上的 outer state/evidence layer。它记录 rounds、context compression、signals、canonical refs；不得替代 complex work 的 DAG writeSet review、Decision Gate 或 shell verification。
- **Main session（Compatibility / Operator Assist）** 只 orchestrate：选 work chunk、准备 source materials、调用已发布 `loop-agent` / `agent-worker` CLI、review DAG/writeSet、monitor failures、跑 final shell verification、hand off。**不是**默认 implementer。
- **严禁**主会话绕过 CLI，用宿主编辑工具直接改业务实现，或在 DAG/worker 失败后「救火改文件」。skills 是纪律文档，**不是**写入边界执法手段；执法靠 `task.json` 路径、DAG `writeSet` 与 runtime。
- **Executors** 实现 bounded work：Pi 是唯一受治理 Agent runtime（read-only planning/review/diagnosis，以及 `toolProfile: "write"` 的 bounded implementation/repair）；shell 产出 deterministic verification facts；`cursor-prompt` 仅是 one-shot sidecar。
- **Shell verification 是 completion fact source**。LLM review 或 advisory output 不能替代 command exit codes 与 archived evidence。

## Command surface tiers

| Tier | Default purpose | Commands |
| --- | --- | --- |
| Primary | Normal autonomous implementation（经 CLI） | `new-task` -> `dag run-task --profile auto` -> `dag validate --strict-models --strict-governance` -> `run-dag` |
| Operator | Diagnose, recover, close out, inspect facts | `status`, `instructions`, `dag status`, `dag doctor`, `dag report`, `dag reconcile-run`, `dag closeout-draft`, `dag reconcile-tasks`, `dag final-verification`, `inspect`, `doctor`, `spine audit`, `knowledge curate`, `docs audit`, `handoff check`, `loop-benchmark`；Inspect：`agent-worker console serve`（`/inspect/`）与兼容 `observe serve\|snapshot` |
| Compatibility (CLI helpers) | Legacy task metadata and feature-study helpers | `goal`, `reference`, `study` |
| Escape hatch | Isolated delegation, one-shot diagnosis or **显式** bounded repair | `delegate`, `worktree`, `harvest`, `pi-prompt`, `cursor-prompt`（不得作失败默认恢复） |
| Experimental | Long-running outer task state | `loop init\|status\|run\|record-round\|add-signal\|closeout` |

**主会话角色名 Compatibility / Operator Assist** 与上表「Compatibility (CLI helpers)」不同：前者描述宿主 agent 的权限边界，后者是遗留 CLI 命令分层。

Prompt templates、README snippets、task instructions 应优先呈现 Primary + Operator。Escape-hatch 仍可用，但须携带 downgrade 含义，且**不得**写成「CLI 失败后主会话直接改代码」。

## Entry selection decision tree

```text
Is this only status, diagnosis, recovery, or closeout?
  yes -> Operator CLI only (`status` / `dag doctor` / `dag report` / `reconcile` / Observe / human gate).
         Never recover by main-session Edit of business implementation.
  no  -> Does it need recoverable, reviewable, verifiable implementation state?
           no  -> Read-only pi-prompt / inspect only. Do not main-session implement.
           yes -> Agent DAG via loop-agent CLI (or agent-worker outer loop that spawns loop-agent).
```

失败恢复允许集（主会话）：`dag doctor`、`dag report`、`dag reconcile-run`、worker `task reconcile` / `pool mark-failed`（若适用）、记录 human gate、修正 **source/task.json/DAG 包** 后 re-validate/重跑。
**禁止**：宿主直接改 `src/**` 等业务实现以绕过失败节点。

在以下任一 signal 适用时用 Agent DAG 而非 broad one-shot execution：

- loop-agent runtime, DAG schema, run facts, promotion/closeout, scripts/CI, public contract, or shared protocol is touched.
- The change needs multiple files, multiple scouts, review gates, Decision Gate, repair flow, or shell gate.
- `writeSet` is broad, multiple exclusive writers exist, or public interfaces / architecture boundaries change.
- Requirement, architecture, credential, cost, deployment, security, or authority surface is unclear.
- A failure repeats and needs recovery planning rather than blind retry.

## Agent DAG path

Minimum governed path：

```bash
loop-agent new-task <task-id> "Task Title" [--repo-root <target-repo>]
# PRD-first: import-prd → task source prepare --apply
loop-agent import-prd <task-id> --file <path-to-original-prd.md> [--repo-root <target-repo>]
loop-agent task source prepare <task-id> --use-imported-prd --allowed-path "<glob>" --apply --json [--repo-root <target-repo>]

loop-agent dag run-task <task-id> \
  --profile auto \
  --strict-models \
  --output .harness/tasks/<task-id>/dag.json \
  [--repo-root <target-repo>]

loop-agent dag validate \
  --dag .harness/tasks/<task-id>/dag.json \
  --strict-models \
  --strict-governance

loop-agent run-dag \
  --dag .harness/tasks/<task-id>/dag.json \
  --cwd <target-repo>
```

`loop-agent` is the preferred global CLI. For self-hosting loop-agent development, the controller must be an installed npm-published package. Use `npm install -g @tea-agent/loop-agent@latest` for first install or intentional upgrades, then treat the installed version as frozen for the current task and record `npm list -g @tea-agent/loop-agent --depth=0`. Do not repeatedly fetch `npx @latest` inside DAG nodes, and do not use the current working tree's `npm link` or `npm run dev` to control tasks that may edit CLI, DAG runtime, executors, package metadata, or build output. Use `npm run dev -- <args>` only for source debugging and focused CLI development.

The npm package carries static capability assets: `skills/` (bundled in-package, containing `loop-agent` and `agent-worker`; `loop-agent init` mirrors them into the target project's `.agents/skills/`), `docs/templates/`, `docs/architecture/`, `docs/skills/`, `examples/`, `harness.json`, `AGENTS.md`, `README.md`, and `CHANGELOG.md`. `loop-agent init` creates `ai_workspace/loop-agent/` (the default governanceRoot) in the target project with `progress/`, `reports/`, `exec-plans/`, and `decisions/` directories plus their README files; the actual files under those directories belong to the target repository and are not shipped by the npm package.

For arbitrary target repositories, DAG skill instructions must not depend on loop-agent source history being copied into the target repo. Resolve configured, user, or target-local skills when present, then fall back to the package-bundled `skills/` (mirrored as `.agents/skills/` in the target project) as the stable default capability set.

Default DAG draft: `.harness/tasks/<task-id>/dag.json`. Explicit `--output` to temp remains an escape hatch.

Execution 前 review `dag run-task` JSON / `reviewPacket`：

- `profileRouting`：requested profile、selected profile/template、routing reasons。
- `governanceProfile`：process、delivery、code-change signals。
- Writer nodes：`writePolicy`、`writeSet`、`allowedPaths`、`forbiddenPaths`、broad entries、forbidden overlaps。
- Shell gates 与 verification commands。
- Decision Gate mode（`record-only` vs `pause-on-human`）。
- 执行前须 narrow 的 placeholder、`**` 或 repo-root writeSet。

In-flight DAG shell checks 在需要时用 repo active-run override（例如 `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh`）。DAG archived 后，再不带 in-flight override 跑 repo check。

On Windows, run Bash scripts through Git Bash or a configured compatible Bash. Do not require WSL, `/tmp`, `which`, or other POSIX filesystem assumptions in loop-agent CLI behavior.

## Task source materials

每个 handoff-ready task 包含：

```text
.harness/tasks/<task-id>/
  task.json
  source/
    references/          # immutable original PRD / acceptance / design
    source-manifest.json # optional hash manifest from import-prd
    需求.md              # derived execution contract
    执行约束.md
```

`需求.md` 应陈述 objective、scope、non-goals、acceptance criteria，并链接或追溯 `source/references/*` / repo-local specs 或 plans。原始 PRD 优先 `import-prd` 归档；Worker materialize 会复制 `source_docs` 到 `references/`，并把 acceptance_refs 展开为短摘要。冲突时以 `source/references/*` 为准。

`执行约束.md` 应陈述：

- allowed paths
- forbidden paths
- 当前 dirty workspace / protected user changes（如有）
- architecture boundaries 与 invariants
- expected verification commands
- acceptance criteria / failure conditions
- 是否允许 DAG fallback，及若已知时的 fallback reason

若 `spec`、`plan` 或 DAG generation 后 source materials 变更，implementation 前 regenerate 或 revalidate plan/DAG。

`task.json` 中以下字段必须是结构化对象数组，不能写成字符串数组：

```json
{
  "referenceDocs": [
    {
      "name": "requirement",
      "path": "docs/requirement.md"
    }
  ],
  "verifyCommands": [
    {
      "label": "tests",
      "command": "npm test",
      "timeoutMs": 120000
    }
  ]
}
```

`referenceDocs` 每项至少包含 `path`，可选 `name`；`verifyCommands` 每项至少包含 `label` 与 `command`，可选正整数 `timeoutMs`。持久化入口会在写盘前校验完整 TaskConfig，格式错误不会留下部分 `task.json`。

## Long-running loop policy

`loop` 用于 long-running outer task memory：objective/context projection、round records、signals、derived events、verification summaries、closeout draft。它不是 Agent DAG 的 substitute。

Governed work 的典型 loop path：

```bash
loop-agent loop init <task-id>
loop-agent loop run <task-id> --action dag
# review DAG packet / writeSet / shell gates
loop-agent loop run <task-id> --action dag --execute
loop-agent loop run <task-id> --action shell-verify --command "<repo-check>"
loop-agent loop run <task-id> --action pi-review
loop-agent loop run <task-id> --auto --max-rounds 3
loop-agent loop closeout <task-id>
```

Loop action rules：

- `shell-verify` 是 deterministic；exit code 决定 verification record。
- `pi-review` 是 read-only；tools 限于 `read,grep,find,ls`，output 为 structured advisory evidence。Structured JSON 须含 `findingSummary`、`failureCategory`、`nextHypothesis`、`recommendedAction`、`fixScope`、`rootCause`；`recommendedAction`  exactly 为 `implement_fix|replan|pause|done`。
- 自动写入只能通过 Pi-only Agent DAG execute；须读 task `allowedPaths` / `forbiddenPaths`，审查 writer `writeSet`，并 follow shell verification 或 review。
- 对 `task.json.complexity = medium | large`，自动 DAG execute  additionally 需要：
  - previous loop `dag` round，或
  - explicit `task.json.dagFallbackReason` 说明为何不能用 DAG。
- `loop run --auto` 默认不 write。Auto DAG execute 需要 `task.json.loopAutoExecutionPolicy="enabled"`，或 `loopAutoExecutionPolicy="approval-required"` 加 pending approval signal；旧 `loopAutoWritePolicy` fail-fast；write guards 仍 fail closed 并 pause。
- `loop closeout` 须报告 workflow path：`dag`、`explicit-fallback`、`missing-dag-evidence` 或 `micro-or-small`。
- 无 DAG evidence 且无 `dagFallbackReason` 的 medium/large closeout 须将其列为 remaining risk。
- `record-round --decision complete` 仅是 loop-state candidate；completion 仍须 shell verification、review verdict、success-criteria coverage。

## Supervised DAG convergence

Supervised DAG convergence 可选且由 task-config 驱动：

```json
{
  "convergence": {
    "enabled": true,
    "maxPasses": 3,
    "stopOnHardVerifyPass": true,
    "pauseOnRegression": true
  }
}
```

Rules:

- 默认保持 single repair，除非 `convergence.enabled=true`；`HARNESS_DAG_CONVERGENCE=off` 是 rollback switch。
- Supervised process supervisor 须 emit 首行 `VERDICT:` 与 `REPAIR_ARTIFACT_JSON` fenced block。Repair prompts 应先消费 artifact `failureClass`、`rootCause`、`fixScope`、`invariant`；raw logs 仅在 artifact 允许时为 fallback evidence。
- 在 `maxPasses` 前 retryable `hard-verify-shell` failure 时，preserve current pass evidence 于 `convergence/pass-N/`，reset process-supervisor/process-gate/repair/hard-verify segment 及 blocked downstream nodes，再进入现有 DAG rank execution loop。
- 不要 retry write guards、timeout/spawn/auth failures 或 human-gate failures。
- 出现 conservative regression signals（如 lower shell success count）时 pause 而非 retry。
- `dag report --json` 与 markdown 须 expose `convergence.passHistory`。
- Final completion authority 仍是 full shell verification；quota/focused commands 仅为 intermediate cost controls。

## Structured repair, spine audit, and curator gates

- `shell.repairArtifactGate.fromNodeId` validates the upstream supervisor artifact before repair. Missing/invalid JSON, missing request-revision `fixScope`, or scope outside the downstream repair writer allowedPaths/writeSet fails closed.
- `spine audit <task-id>` is the deterministic minimal spec spine checker for task source, ownership paths, requirement coverage, and final verification commands.
- `dag validate --strict-governance --spine-task <task-id>` may consume the same spine audit as part of strict validation.
- `knowledge curate` reads completed convergence patterns and writes only human-gated proposal Markdown after skill safety preflight.

## SePO-lite prompt evolution

- Learned prompt deltas 是 human-gated proposals；成为 reusable guidance 前须 review。
- Prompt deltas 为 Markdown-only process guidance；不得含 shell commands、credential handling、tool permission expansion 或 completion-authority bypass。
- Accepted learned guidance 位于 `skills/loop-agent/references/learned/<repo>.md` 或 `default.md`。
- 已 request `loop-agent` 的 DAG implementer prompts 可 inline 最多三个 human-gated learned Markdown sections。
- Learned guidance 为 advisory，永不替代 writeSet governance、Decision Gate policy 或 shell verification。

## Sidecar interventions

`pi-prompt` 与 `cursor-prompt` 是 sidecar interventions，不是 workflow state。

用 `pi-prompt` 做短时 read-only planning、log explanation 或 failure diagnosis。Read-only 时传 read-only tools 并写明不 edit files：

```bash
loop-agent pi-prompt \
  --cwd <repo-root> \
  --tools read,grep,find,ls \
  --timeout 2400000 \
  "Read the task source and diagnose the failure. Do not edit files."
```

用 `cursor-prompt` 做 bounded multi-file diagnosis 或 small repair，prompt 须含：

- task id
- exact objective
- allowed paths
- forbidden paths
- hard constraints
- expected verification
- instruction to preserve unrelated files

Sidecar output 为 advisory。若须成为 task evidence，通过 loop-agent run/task artifacts promote 或 summarize；completed DAG 与 one-shot run facts 保持只读。

## Model and executor boundaries

- Agent DAG 用 DAG JSON `executorModels` 加 node `executor` / `complexity`；不要从 repo `harness.json.models` 推断 DAG models。
- DAG `shell` 与 `static` nodes 不用 models。
- `harness.json.models.<step>` 下 historical step models 是 legacy metadata，不是新 DAG work 的 routing。
- `pi-prompt` / `cursor-prompt` models 来自 CLI flags 或 runtime defaults，须 per intervention 选择。
- Pi DAG nodes 默认 read-only planning/review/diagnosis；声明 `toolProfile: "write"` 时是 bounded writers，须有 explicit write scope。
- 受治理 writer 固定为 `implement-pi` / `repair-pi`，须有 explicit write scope；`cursor-prompt` 不进入 DAG schema。
- Shell nodes 产出 deterministic verification facts 与 gates。

## Artifacts and facts boundary

- `.harness/tasks/<task-id>/` 是 task runtime state。
- `.harness/tasks/<task-id>/loop/` 是 loop runtime projection；不替代 task source 或 repo specs。
- `.harness/dag-runs/{active,paused,completed}/<run-id>/` 是 DAG run fact storage。Completed facts 为 read-only。
- `.harness/runs/{active,completed,failed}/<run-id>/` 是 one-shot Pi/Cursor evidence。Completed/failed facts 为 read-only。
- `.harness/task-pool/` 是伴生 CLI `agent-worker`（Worker TaskSpec pipeline）的 runtime state：batch artifacts、Task Pool JSONL/state、晨报和 failure handoffs。默认被忽略，不提交。
- Root `artifacts/` 是 legacy/current-work summary space，不是 DAG read-only scratchpad，也不是新 DAG work 的 default handoff。
- Long-term conclusions 属于 repo governance docs、progress、reports、decisions、tests 或 scripts。

除非 task 显式 promote trimmed report 到 repo governance docs，不要提交 `.harness/dag-runs/`、`.harness/runs/`、`.harness/cache/` 或 `.harness/task-pool/` 的 runtime histories。

## Baseline, dirty workspace, and verification

Complex implementation 前：

1. Check current directory 与 target repo。
2. Read repo entrypoints（`README`、`AGENTS`、`harness.json`、governance index）。
3. Capture affected area 的 minimal baseline verification。
4. 若 workspace dirty，选一：
   - isolated worktree，或
   - explicit user confirmation 在当前 workspace 工作并 preserve/possibly include existing changes。
5. Record known baseline failures，足以区分 pre-existing failures 与 task regressions。

Verification 应从 target repo verification matrix 选择。Cross-repo documentation refactors 时在 each affected repo 跑 checks。

## Handoff requirements

每个 task handoff 应回答：

1. What changed and why。
2. 用了哪条 workflow path：DAG（经 CLI）、operator 元数据维护、或显式 sidecar（须说明非默认）。
3. 若曾考虑绕过 CLI / 主会话直接写实现，必须写明 **未采用** 及改走的 doctor/reconcile/重跑路径；禁止把「主会话救火写码」写成合法 path。
4. Executors used 及其 boundaries。
5. Verification commands run 与 results。
6. DAG / one-shot / loop refs（如有）。
7. Remaining risks 与 follow-up tasks。
8. 是否应将 new rules promote 到 docs、tests、scripts 或 shared skill references。
