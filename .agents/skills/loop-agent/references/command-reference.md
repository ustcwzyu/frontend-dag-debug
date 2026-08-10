# loop-agent 命令参考

需要 loop-agent 的精确 CLI 命令、setup 命令、task lifecycle 命令、docs helper、goal 命令或 stats 时使用本文。

## loop-agent 入口

**优先在目标 repo 目录内执行命令** — loop-agent 通过 `harness.json.project` 自动检测使用哪个 repo adapter。跨目录操作时显式加 `--repo-root <target-repo>`。

默认使用全局 CLI：

```bash
loop-agent <command> ...
```

面向自举迭代和日常使用时，全局 CLI 应来自 npm 上已发布的安装包。首次安装或有意升级使用 `@latest`：

```bash
npm install -g @tea-agent/loop-agent@latest
npm list -g @tea-agent/loop-agent --depth=0
loop-agent --version
loop-agent doctor
```

一次自举任务启动后不要中途升级控制器；记录 `npm list -g` 显示的实际版本。不要在 DAG 节点中反复用 `npx @latest` 拉取，也不要使用当前工作区的 `npm link` 或 `npm run dev` 作为控制器去修改 loop-agent 本仓库的 CLI、DAG runtime、executor、package metadata 或 build output。`npm run dev -- <command> ...` 只用于源码调试和聚焦 CLI 开发。

发布包入口加载 `dist/cli.js`；开发入口加载 `src/cli.ts`。

发布包携带静态能力资料：`skills/`（包内内置，含 `loop-agent` 与 `agent-worker`；`loop-agent init` 投影时镜像为目标项目 `.agents/skills/`）、`docs/templates/`、`docs/architecture/`、`docs/skills/` 和 `examples/`。`docs/templates/init-managed-agents.md` 是 package-only 的 `AGENTS.md` managed block 渲染真源，不复制到目标治理 `templates/`；其余目标模板按 init surface 投影。`ai_workspace/loop-agent/`（默认 governanceRoot）下的 `progress/`、`reports/`、`exec-plans/`、`decisions/` 由 `loop-agent init` 在目标项目创建目录并投放 README，其中的任务正文属于目标仓库运行中生成的事实，不从 npm 包复制。

## 命令参考

## 默认选择模型

选择命令时按以下优先级：

1. **主路径 DAG**，用于常规 autonomous work：

   ```bash
   loop-agent new-task <task-id> "Task Title"
   # 推荐默认：详细 PRD → import → prepare（无需手写两 source；默认无 LLM 写 source）
   loop-agent import-prd <task-id> --file <path-to-prd.md>
   loop-agent task source prepare <task-id> \
     --use-imported-prd \
     --allowed-path "<glob>" \
     --forbidden-path ".harness/**" \
     --verify "typecheck:npm run typecheck" \
     --apply --json
   # 非微小 / 跨会话（推荐默认）：
   # loop-agent plan create <plan-id> "<title>"
   loop-agent dag run-task <task-id> --profile auto --strict-models
   loop-agent dag validate --dag .harness/tasks/<task-id>/dag.json --strict-models --strict-governance
   loop-agent run-dag --dag .harness/tasks/<task-id>/dag.json --cwd <repo-root>
   # 有 plan 时收尾：loop-agent plan complete <plan-id> --summary "..."
   ```

   省略 `--output` 时默认写入 `.harness/tasks/<task-id>/dag.json`（CLI JSON 的 `outputPath` / `defaultOutputPath` 为解析后的绝对路径）。显式 `--output` 仍可指向 temp 或任意路径（兼容旧脚本）。主路径 JSON 输出含稳定 summary：`dag run-task` 的 `message` 为 `DAG draft created`，`dag validate` 的 `message` 为 `DAG validation passed` 且含 `checks.writeSets` / `checks.decisionGates`，`run-dag` 的 `message` 为 `DAG run finished`。

   **`import-prd` / `plan create` 不是 `dag run-task` 的硬依赖**，但有 PRD 文件或非微小实现时应默认使用；决策表、反模式与案例见 `source-and-plan-practice.md`。
2. **Operator 工具**，用于 recovery、诊断、评测重放与 closeout：

   ```bash
   loop-agent eval replay --spec <path> --json
   loop-agent eval report --replay-id <id> --markdown
   loop-agent eval candidate register --manifest <path> --json
   loop-agent eval candidate show --candidate-id <id> --json
   loop-agent eval candidate list --json
   loop-agent eval candidate transition --candidate-id <id> --to <state> --reason <text> --json
   loop-agent dag status --run-id <run-id>
   loop-agent dag doctor --run-id <run-id> --markdown
   loop-agent dag report --latest --markdown
   loop-agent dag closeout-draft --run-id <run-id>
   loop-agent dag reconcile-run --run-id <run-id>
   loop-agent dag reconcile-tasks --glob '<pattern>' --markdown
   loop-agent dag final-verification <task-id> --output <temp-dir>/<task-id>-final-verification-dag.json
   loop-agent status <task-id> --json
   loop-agent instructions task-artifacts --task <task-id> --json
   loop-agent promote-run <task-id> --run-id <run-id>
   loop-agent closeout task <task-id>
   loop-agent spine audit <task-id> --markdown
   loop-agent knowledge curate --markdown --output ai_workspace/loop-agent/reports/<task-id>-learned-proposal.md
   loop-agent loop-benchmark --markdown
   ```

3. **Escape hatch**，仅用于 worktree 隔离委派、executor 调试或 one-shot 诊断：

   ```bash
   loop-agent delegate <task-id> --auto-run
   loop-agent harvest <task-id>
   loop-agent cursor-prompt --cwd <repo-root> --file /tmp/bounded-task.md
   loop-agent pi-prompt "Reply with exactly OK."
   ```

### Setup（首次）

```bash
npm install -g @tea-agent/loop-agent@latest
loop-agent --version
loop-agent --help
```

### 检查 repo harness

```bash
loop-agent inspect                                           # 当前 repo（自动检测）
loop-agent --repo-root /path/to/target-repo inspect           # 指定 repo
```

### 健康检查

```bash
loop-agent doctor
```

`doctor` 报告当前生效的 Pi backend 及 SDK/CLI 可用性。Pi step 默认 SDK-first 执行：

```bash
export CODE_AGENT_PI_BACKEND=sdk-first   # 默认：先试 Pi SDK，允许时 fallback 到 CLI
export CODE_AGENT_PI_BACKEND=cli-only    # 紧急回滚：纯 CLI 路径
```

SDK 回归或 SDK 可选依赖不可用时用 `cli-only` 诊断。CLI fallback 路径须与现有 workflow 行为兼容。

### 初始化与旧项目更新

用户中文表达到命令的映射（与目标项目 `AGENTS.md` 的“自然语言入口路由”保持一致）：

| 用户表达 | 命令 |
| --- | --- |
| loop-agent 初始化 / loop agent 初始化 / loop agent初始化 / 初始化 loop-agent | 先运行 `loop-agent init instructions --repo-root .`，再运行 `loop-agent init --repo-root . --profile full --merge`，随后补全 README/验证矩阵并复查 doctor/inspect/docs audit |
| 初始化更新校验 / loop agent初始化更新校验 / 检查初始化更新 | `loop-agent init check-update --repo-root . --markdown`（只读，不得隐含 `apply-safe`） |
| 初始化安全更新 / loop agent初始化安全更新 / 应用初始化更新 | 先 `loop-agent init check-update --repo-root . --markdown`，再 `loop-agent init update --repo-root . --apply-safe`（surface 缺失时先 `--bootstrap-surface`；human decisions 存在时停下等用户） |
| 初始化对齐 / 升级后对齐 / init reconcile / 控制器升级后对齐目标项目 | `loop-agent init reconcile --repo-root .`（统一入口：surface 缺失返回 `needs-baseline` 零写入；human decisions 返回 `needs-human-decision` 零写入；活跃 DAG/Worker 或 Worker 状态无法确认时返回 `blocked-active-runtime` 零写入；其余执行 safe actions 后复查） |
| loop-agent 帮我完成 / 帮我实现 / 帮我修复 / 帮我开发 <需求>；使用 loop-agent 完成 <X>；按 loop-agent 流程处理 <X> | 先 `loop-agent new-task <task-id> "任务标题"`，写 `source/需求.md` 与 `source/执行约束.md`，同步 `task.json.allowedPaths` / `forbiddenPaths`，再 `loop-agent dag run-task <task-id> --profile auto --strict-models`、`dag validate`、`run-dag`；主会话编排而不直接写业务实现 |

```bash
loop-agent init instructions --repo-root <target-repo>
loop-agent init --repo-root <target-repo> --profile full --merge
loop-agent init doctor --repo-root <target-repo>
loop-agent init check-update --repo-root <target-repo> --json
loop-agent init check-update --repo-root <target-repo> --markdown
loop-agent init update --repo-root <target-repo> --bootstrap-surface
loop-agent init update --repo-root <target-repo> --apply-safe
loop-agent init reconcile --repo-root <target-repo> [--json|--markdown]
```

`init check-update` 是只读升级报告，用于发现目标项目是否落后于当前包内初始化 surface。输出会区分 deterministic actions、model merge tasks、human decisions 和 recommended next。`--markdown` 会渲染可直接交给模型执行的合并指引，包含 `allowedPaths`、`forbiddenPaths`、`mergeRules` 和 `verification`。

`init update --bootstrap-surface` 为旧项目写入 `.harness/init-surface.json` 的 `inferred-baseline`，不伪装成历史 recorded baseline。`init update --apply-safe` 只执行确定性安全动作：补缺失文件、创建目录、刷新 managed block；已有但无法确认与当前包一致的文件会进入 model merge tasks，不会被覆盖。

`init reconcile` 是升级后对齐入口：surface 缺失返回 `needs-baseline` 且零写入，存在 human decisions 返回 `needs-human-decision` 且零写入，活跃 DAG/Worker 或 Worker 状态无法确认时返回 `blocked-active-runtime` 且零写入；其余情况复用 `--apply-safe` 的安全动作并复查返回 `clean`/`needs-model-merge`/`needs-safe-update`。控制器升级成功后，普通安全仓库命令结束时会自动检测目标项目是否需要 reconcile；非 TTY 只向 stderr 输出 `loop-agent init reconcile --repo-root ...` 提示且不写入目标，TTY 且无 human decisions、无活跃运行时可经明确 `y/yes` 同意后应用 deterministic safe actions。

### 查看或复制内置示例

```bash
loop-agent examples list
loop-agent examples show <name>
loop-agent examples copy <name> --output examples/<name>
```

`examples` 只读取或复制包内示例，不会自动写入目标项目。省略 `--output` 时，`copy` 会写到目标项目的 `examples/<name>`。

### 创建新 task

```bash
loop-agent new-task <task-id> "Task Title"
```

创建 `.harness/tasks/<task-id>/`，含 `source/`、`artifacts/`、`logs/` 及初始 state。`artifacts/` 默认只预种 `修改记录.md` 与 `验证结果.md`（供后续 `promote-run` / `closeout` 使用）；不再预种 L1 的 `分析报告.md`、`实现计划.md`、`复盘报告.md`。

### 导入原始 PRD（不可变事实源）

```bash
loop-agent import-prd <task-id> --file ai_workspace/loop-agent/path/to-prd.md [--name requirement] [--json]
```

把用户原始 PRD **原样复制** 到 `.harness/tasks/<task-id>/source/references/`，并写入 `source/source-manifest.json`（含 SHA-256）与 `task.json.referenceDocs`。此步骤不调用模型、不改写内容。随后用 `task source prepare --use-imported-prd --apply` 派生 managed `source/需求.md` / `执行约束.md`；冲突时以 `source/references/*` 为准。

`referenceDocs` 是 `{ path, name? }[]` 对象数组，不是路径字符串数组；`import-prd` 会确定性写入正确结构。

### Task Contract / operator machine surface

```bash
loop-agent task contract show <task-id> [--json]
loop-agent task contract validate --task <task-id> --input <path> --json
loop-agent task contract diff --task <task-id> --input <path> --json
loop-agent task contract apply --task <task-id> --input <path> --expected-revision <n> --expected-observed-hash <sha256> --request-id <id> --request-payload-sha256 <sha256> --json
loop-agent task contract adopt --task <task-id> --expected-revision <n> --expected-observed-hash <sha256> --request-id <id> --request-payload-sha256 <sha256> --json
loop-agent task contract doctor --task <task-id> --json
loop-agent task contract recover --task <task-id> --json
loop-agent operator capabilities [--json]
```

`task` 是 Task Contract 边界（show/validate/diff/apply/adopt/doctor/recover）。`operator` 返回 Operator machine envelope capabilities，供 Console/控制面做能力协商。

### Task action context / artifact instructions

```bash
loop-agent status <task-id> --json
loop-agent instructions source --task <task-id> --json
loop-agent instructions dag-draft --task <task-id> --json
loop-agent instructions task-artifacts --task <task-id> --json
loop-agent instructions promotion --task <task-id> --json
loop-agent instructions closeout --task <task-id> --json
```

`status` 是 agent 行动上下文入口，返回 `artifactPaths`、`runRefs`、`actionContext` 与 `nextActions`。`instructions` 在写入 source、DAG draft、task artifacts、promotion 或 closeout 前返回目标路径、依赖、模板、写策略与完成标准；blocked artifact 会列出 `missingDependencies`。`instructions task-artifacts` 只要求 promote 桥接的 `修改记录.md` / `验证结果.md`，不要求手写分析/计划/复盘三份 L1 报告。

### Promotion / closeout

```bash
loop-agent promote-run <task-id> --run-id <run-id>
loop-agent closeout task <task-id>
```

`promote-run` 从 completed DAG facts 或 one-shot completed run evidence 生成 task `修改记录.md` / `验证结果.md`，不调用 LLM、不修改 completed run facts。`closeout task` 从 task artifacts 生成 `ai_workspace/loop-agent/progress/YYYY-MM-DD-<slug>.md`，验证证据不足时必须写明剩余风险。

one-shot run evidence 位于 `.harness/runs/{active,completed,failed}/<run-id>/`。`cursor-prompt` 与 Pi `cursor` tool 会创建这类 run evidence；当前 `pi-prompt` 不创建 `.harness/runs/`。active 目录只应保留 live one-shot run，残留或 `.DS_Store` 等系统文件应清理。详见 `one-shot-runs.md`。

### 运行任何 step 前：准备 source materials

`new-task` 之后，先归档原始 PRD，再 `task source prepare` 派生执行契约：

```bash
loop-agent import-prd <task-id> --file <path-to-original-prd.md>
loop-agent task source prepare <task-id> \
  --use-imported-prd \
  --allowed-path "<glob>" \
  --forbidden-path ".harness/**" \
  --verify "typecheck:npm run typecheck" \
  --apply --json
```

默认无 LLM 写 source；工程边界用 flags 显式给出。不要让 AI 直接改写 `source/references/*`。高级用户仍可手工编辑后 `task contract adopt`。

### Feature-study workflow（参考代码 → 轻量实现）

例如「分析参考仓库的一项功能，并在目标仓库实现轻量版本」：

```bash
loop-agent --repo-root /path/to/target-repo study init <task-id> "Title" \
  --reference-repo codex:/Users/mac/go/src/codex \
  --reference-doc plan:/Users/mac/plans/codex-goal-feature.md \
  --reference-glob "codex-rs/**/goal*.rs"

# 编辑 source/需求.md + source/执行约束.md，然后走 DAG 路径：
loop-agent --repo-root <target-repo> dag run-task <task-id> --profile auto --strict-models --output .harness/tasks/<task-id>/dag.json
loop-agent --repo-root <target-repo> dag validate --dag .harness/tasks/<task-id>/dag.json --strict-models --strict-governance
loop-agent --repo-root <target-repo> run-dag --dag .harness/tasks/<task-id>/dag.json --cwd <target-repo>
```

目标 repo 需有 `.harness/prompts/feature-study-analyze.md` 与 `feature-study-plan.md`（缺失时从 loop-agent 复制）。

### Removed sequential workflow

历史顺序式 `run analyze|plan|spec|implement|verify|retrospective|auto|loop|continue|study` 已移除。新任务不要使用这些命令，也不要在 prompt、skill 或 docs 中把它们描述为 fallback。

### Reference helpers（compatibility）

```bash
loop-agent reference index <task-id>
```

`reference` 是 compatibility / feature-study 辅助入口，用于维护或检查参考资料索引。常规实现任务不要从 `reference` 起步；按 `new-task` + DAG 路径执行。

### Task goal lifecycle（compatibility-only / deprecated-candidate）

```bash
loop-agent goal set <task-id> "Objective text" [--token-budget <number|null>]
loop-agent goal set <task-id> "Replacement objective" --force
loop-agent goal get <task-id>
loop-agent goal pause <task-id>
loop-agent goal resume <task-id>
loop-agent goal clear <task-id>
```

- 已有 goal 且 objective 不同时，替换须显式 `--force`。
- `harness.json` 可用 `features.goals=false` 关闭此 surface。
- `status` 现含 `goal`（`objective/status/tokenBudget/tokensUsed/timeUsedSeconds/continuationRuns`）、`verifyEnv`、`maxGoalContinuationsPerRun` 及可选 `flowHint`
- 在 `source/需求.md` 用 `<!-- goal-scope -->` … `<!-- /goal-scope -->` 包裹仅 goal 验收项；范围外 `- [ ]` 不阻塞 goal 完成
- `task.json`：`verifyEnv=clean`（默认）；goal continuation 需 verify 重试时用 `flow=loop`，避免盲目 implement 循环
- continuation 是 runtime policy，不是普通用户消息：
  - continuation prompts are legacy compatibility metadata under `.harness/prompts/`
  - 触发时叠加 `.harness/prompts/objective_updated.md` 与 `.harness/prompts/budget_limit.md`
  - 将渲染文本注入隐藏 `<goal_context>...</goal_context>` 片段供 step 执行
  - 用于保持 continuation 行为一致，减少聊天式历史噪音
  - preflight 含 state/mode guard + 启动前 goal 一致性复检

### Agent DAG validation 与 execution

```bash
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json                 # 常规 validation；无 .harness/dag-runs 副作用
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --strict-models # 非 canonical executorModels 时失败
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --strict-governance # governance warning 时失败
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --strict-skills # missing/error/truncated skill 或 unresolved reference 时失败
loop-agent dag validate --dag <temp-dir>/hybrid-dag.json --strict-governance --spine-task <task-id> # 同时消费 minimal spec spine audit
loop-agent dag validate --dag ai_workspace/loop-agent/templates/agent-dag.supervised-implementation.json --strict-models --strict-governance  # role=supervisor + write-set-gate topology
cp ai_workspace/loop-agent/templates/agent-dag.supervised-implementation.json <temp-dir>/supervised-dag.json
(npx vitest run test/dag-supervised-template.test.ts test/dag-validate.test.ts test/dag-shell-executor.test.ts --reporter=dot)  # supervised template + shell.verdictGate runtime
loop-agent run-dag --dag <temp-dir>/hybrid-dag.json --cwd <repo-root>          # 执行 Agent DAG；stderr 默认输出节点进度与 30s 心跳，stdout 保持最终 JSON
loop-agent run-dag --dag <temp-dir>/hybrid-dag.json --cwd <repo-root> --progress-interval-ms 60000 # 调整心跳；--quiet 可禁用
loop-agent run-dag --dag <temp-dir>/hybrid-dag.json --init-only --canvas-path <temp-dir>/hybrid-dag.canvas.tsx # 可选 derived Canvas view
bash scripts/run-dag-safe.sh --dag <temp-dir>/hybrid-dag.json --cwd <repo-root> [--timeout-secs 7200]  # 后台运行 + 轮询，避免外层 bash timeout 杀进程（见 agent-dag-runner.md §Adaptive liveness）
loop-agent dag init-hybrid <task-id>                     # 生成可审阅的 DAG draft
loop-agent dag run-task <task-id>                        # generate + validate（安全默认；无 dag-runs；standard-compatible）
loop-agent dag workflow-plan <task-id> --profile pr-review --output .harness/tasks/<task-id>/workflows/planned/<name>.workflow.json
loop-agent dag workflow-validate --workflow .harness/tasks/<task-id>/workflows/planned/<name>.workflow.json --strict-governance
loop-agent dag workflow-compile --workflow .harness/tasks/<task-id>/workflows/planned/<name>.workflow.json --output .harness/tasks/<task-id>/workflows/compiled/<name>.dag.json --manifest .harness/tasks/<task-id>/workflows/compiled/<name>.compile-manifest.json
# compiled workflow DAGs stay explicit; they do not implicitly replace task root dag.json
loop-agent dag run-task <task-id> --profile auto         # 推断 governanceProfile，经 workflowPolicy.dag.profileRouting 路由
loop-agent dag run-task <task-id> --profile minimal      # 选择 minimal 通用路由；standard 前端任务仍可自动使用前端 DAG
loop-agent dag run-task <task-id> --profile standard     # 选择 standard 通用路由；standard 前端任务仍可自动使用前端 DAG
loop-agent dag run-task <task-id> --profile reviewed     # 选择 reviewed 通用路由；standard 前端任务仍可自动使用前端 DAG
loop-agent dag run-task <task-id> --profile supervised   # 选择 supervised implementation DAG；自动前端分类不会降级它
loop-agent dag run-task <task-id> --execute --cwd <repo-root>  # generate + validate + execute（先 narrow writeSet）
loop-agent dag run-task <task-id> --dry-run --cwd <repo-root>  # generate + validate + active dry-run snapshot
loop-agent dag status --run-id <run-id>                  # 单次 run JSON 摘要（approvalFlow, healthIssues）
loop-agent dag doctor                                    # 扫描 active/paused/completed runs；advisoryOnly health report
loop-agent dag report [--run-id <run-id>] [--lifecycle active|paused|completed|all] [--json|--markdown] [--failed-only] [--latest] [--paused-latest] [--action <recovery-action>]  # derived per-node 聚合（只读）；JSON 锁定于 ai_workspace/loop-agent/templates/agent-dag-report.schema.json；--paused-latest 聚焦最新 paused run；playbook: ai_workspace/loop-agent/agent-dag-recovery-playbook.md
loop-agent dag reconcile-run --run-id <run-id>            # 只读检查 effectiveStatus 与恢复/收口资格
loop-agent dag reconcile-run --run-id <run-id> --action supersede --reason "..." # 显式保留证据并标记为任务已另行完成
loop-agent dag reconcile-run --run-id <run-id> --action abandon --reason "..."   # 显式保留证据并收口为已放弃
loop-agent dag rerun --run-id <run-id> --from-node <node-id> --plan [--json]  # 从节点重跑资格预检（不执行）
loop-agent dag rerun --run-id <run-id> --from-node <node-id> --plan-hash <sha256> --request-id <key> --reason "..." [--json]  # 安全子图 continuation
loop-agent dag rerun-task --run-id <run-id> --reason "..." --request-id <key> [--profile auto] [--task-id <id>] [--json]  # standalone 完整任务重跑
loop-agent dag reconcile-tasks --glob '<pattern>'         # 仅报告的 task/run/artifact/verify drift audit
loop-agent dag final-verification <task-id>               # 生成 closeout DAG，closeout artifact 后再 final verify
loop-agent dag decision inspect --run-id <run-id> [--node-id <node-id>]   # dry-run envelope 重解析；除 run 缺失外 exit 0
loop-agent dag decision validate --run-id <run-id> [--node-id <node-id>]  # 同上；envelope 无效时 exit 1
loop-agent dag approve --run-id <run-id> --option <id>   # decision gate 人工 approve
loop-agent dag reject --run-id <run-id> --reason "..."   # reject paused run
loop-agent dag resume --run-id <run-id>                  # approve 后继续
```

**Decision gate（M3–M5）**：Pi node 上 `decisionGate.enabled: true` 启用 envelope 解析（M3 `record-only` 或 M4 `pause-on-human`）。M4 pause 后用 `dag approve/reject/resume/status/doctor` — 仅确定性 artifact，无新 `human`/`decision` executor。用 `dag report --paused-latest` 聚焦最新 paused run；`dag decision inspect|validate` 做 envelope dry-run（永不自动 resume/retry）。`browser` 仍 deferred。

**In-flight DAG governance**：shell verify node 内用 `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh`；run 归档到 `completed/` 后，在 DAG 外跑裸 `bash scripts/check-repo.sh`。

- `dag validate` 做 schema/topology/ranks 检查；审 `warnings` 中的显式 `executorModels` drift 与 governance lint。
- 手写临时 DAG spec 执行前用 `dag validate --strict-models`，model-matrix drift 应 fail fast。
- read-only artifact-boundary 或 DAG 内 shell governance warning 应 fail fast 时用 `dag validate --strict-governance`。
- 人工 handoff 视图用 `dag report --markdown`（summary、node timeline、failures、四段 Recovery Plan、artifacts、建议 next action）。仅 derived、advisory；需保存时重定向到平台临时目录或 `ai_workspace/loop-agent/reports/`。
- operator 聚焦最新 paused run 用 `dag report --paused-latest`（等同 `--lifecycle paused --latest`；勿与显式 `--lifecycle` 并用）。
- 需 operator 关注的 run 用 `dag report --failed-only`、`--latest`、`--action <recovery-action>` 收窄。category→action 映射见 `ai_workspace/loop-agent/agent-dag-recovery-playbook.md`。
- 只读扫描 `.harness/dag-runs/` 下所有 run 的生命周期 health issue 与建议 action 用 `dag doctor`（`advisoryOnly: true`；不 mutate facts）。
- `dag status` / `dag doctor` 的 runner heartbeat 只表示 lease；Pi meaningful progress 由 Provider/tool/output 活动决定。节点可显示 `quiet`、`suspected-stall`、`probing` 或 `needs-attention`，不要仅凭运行时长手工结束。
- Pi 默认 4h absolute max，`agent-worker` 默认不设置外层 `run-dag` wall-clock；显式 `worker.timeout_ms` 仍是 hard timeout。`termination-unconfirmed` 表示旧 attempt 的退出无法确认，禁止自动 retry，先保留现场并完成 operator 对账。
- approve/resume 前用 `dag status --run-id <id>` 看单次 lifecycle、`approvalFlow`、`hasHumanApproval`。
- lifecycle、raw status 与 liveness 冲突时先用 `dag reconcile-run --run-id <id>` 只读检查。只有 runner 已证明停止且 operator 明确给出 `supersede|abandon` 与 reason 时才允许收口；它保存原始 state，不把未执行节点标成成功。
- task status、source/artifacts、DAG outcome、verification 记录可能 drift 时用 `dag reconcile-tasks --glob '<pattern>'`。默认仅报告；`--patch` 显式且不能伪造 verification evidence。
- 大型 PRD closeout 用 `dag final-verification <task-id>` 生成确定性 DAG，final verification 在 closeout artifact 创建之后。
- 从 run facts dry-run envelope 解析用 `dag decision inspect|validate`；`validate` 在无效 envelope 时 exit 1；永不自动 resume/retry。
- Decision Gate prompt 可用 `buildDagDecisionGateEvidence()`（`src/workflows/dag/decision-evidence.ts`）做与 `dag report --json`、`ai_workspace/loop-agent/templates/agent-dag-report.schema.json` 对齐的只读摘要；不 mutate run state，不执行 retry/resume。
- 仅当有意在 `.harness/dag-runs/active/` 下要 active run snapshot 时用 `run-dag --dry-run`。
- task source 应从 `harness.json.workflowPolicy.dag.profileRouting` 与确定性 candidate `governanceProfile` 选择治理强度时用 `dag run-task --profile auto`。无 `--profile` 仅用于旧 standard-compatible 输出；`--profile minimal|standard|reviewed|supervised` 记录治理强度，不替换已识别的专用业务 workflow。
- 默认 `standard` 任务先读取 `source/需求.md` 中的结构化任务类型，再结合 `allowedPaths` 与 React/Next/Vue 项目能力做确定性分类。确认是前端项目且任务不是明确后端、混合、排除前端或仅文档/测试范围时，自动选择 `frontend-implementation`，不依赖需求关键词；普通后端实现绝不自动进入 `backend-test`。
- 新生成 DAG 会冻结任务源路径、SHA-256 和显式 `REQ/BR/AC` 到 `sourceBinding`。前端计划漏号时 `frontend-requirement-coverage-shell` 在 writer 前阻断。中断恢复应修复 task source 后重新运行 `dag run-task`，不要生成只携带上游摘要的 impl-only DAG；strict governance 会拒绝无来源绑定且无只读 planner 上游的 v3 孤立 writer。
- 显式专用 `taskKind` 保持兼容并优先于任务源分类，也不扩充 governance profile：`frontend-implementation` 可有意覆盖为带 Mock 规范评估、contract gate、design gate 和验证链的前端模板；可选 `frontendMock` 配置 auto/required/disabled、既有服务目录和专项验证命令，required 合同不完整时不会生成 writer。`backend-test` 显式选择需求分析 → 功能用例 → 评审 → pytest 生成/执行 → 复盘的后端测试工程模板。

### Saved Dynamic Workflow operator UX

```bash
loop-agent workflow list
loop-agent workflow inspect <name>
loop-agent workflow save --from /tmp/<task-id>.workflow.json --name <name>
loop-agent workflow run <name-or-path> --cwd <repo-root>
loop-agent workflow diff <name> --against /tmp/<task-id>.workflow.json
loop-agent workflow replay <run-id>
```

`workflow` 是 Dynamic Workflow 的 saved/operator surface。它读取 `WorkflowSpec`，编译为 DAG，再进入同一套 `run-dag` runtime；不会新增 executor 能力或绕过 DAG governance。真实写入任务仍应检查 compiled DAG 的 executor、writeSet、shell gates 和 completed facts 边界。

### Cursor sidecar

`cursor-worker` 已删除。人工干预使用 `cursor-prompt` one-shot sidecar；见 `ai_workspace/loop-agent/cursor-prompt-sidecar.md`。

### Eval Replay（M1，只读 completed evidence）

```bash
loop-agent eval replay --spec <replay-spec.json> [--json|--markdown] [--output <path>]
loop-agent eval report --replay-id <id> [--json|--markdown]
```

`eval replay` 只读取 `.harness/dag-runs/completed/<runId>/state.json` 与 `run.json`，要求 spec 携带两者的 SHA-256，hash 不一致时 fail closed。它将 completed DAG report 归一化为 verification、Token、耗时、executor calls、repair passes，并把 canonical scorecard 写到 `.harness/evaluation/replays/<replayId>/`。缺失 Token/耗时记录为 `null + missingFields`，不会补造为 0。

M1 是 replay-only：不执行 Pi、不启动 DAG、不实现 private verifier、固定预算 enforcement 或 candidate promotion；所有 scorecard 固定 `promotionEligible=false` 且包含 `replay_only`。

### Eval Candidate Registry（M2 W2.1–W2.2）

```bash
loop-agent eval candidate register --manifest <candidate-manifest.json> [--json|--markdown]
loop-agent eval candidate show --candidate-id <id> [--json|--markdown]
loop-agent eval candidate list [--json|--markdown]
loop-agent eval candidate transition --candidate-id <id> --to <state> --reason <text> [--json|--markdown]
```

注册不可变 Candidate Bundle 到 `.harness/evaluation/candidates/<candidateId>/`（`manifest.json` + append-only `lifecycle.jsonl`）。`bundleHash` 由 canonical payload 计算，与 `candidateId`/createdAt/lifecycle 分离；content refs 必须为 repo-relative safe path，且不得进入 evaluator/kernel/completed-facts 等 forbidden surface。`accepted` 仅是 registry 状态，**不**移动 incumbent alias、不 promotion。

Replay spec 最小结构：

```json
{
  "schemaVersion": 1,
  "replayId": "context-policy-replay-001",
  "incumbentCandidateId": "baseline",
  "challengerCandidateId": "role-context-v1",
  "evidence": [
    {
      "candidateId": "baseline",
      "taskRef": "task-a",
      "seed": 1,
      "split": "private",
      "runId": "completed-run-id",
      "stateSha256": "<64 hex>",
      "runSha256": "<64 hex>"
    }
  ]
}
```

### 检查 task status

```bash
loop-agent status <task-id>
```

### Docs governance helpers

```bash
loop-agent docs audit
loop-agent docs archive ai_workspace/loop-agent/exec-plans/active/<plan>.md
loop-agent plan list
loop-agent plan create <plan-id> "<title>"
loop-agent plan complete <plan-id> --summary "<summary>"
loop-agent plan check
loop-agent handoff check [task-id]
loop-agent handoff coverage <task-id> [--json|--markdown]
loop-agent coverage report --language python|java --input <coverage.json|jacoco.xml> --requirement-id <AC-id> --source-scope <path[,path]> [--output <path>] [--json|--markdown]
```

- `docs audit`：扫描文档腐化风险，如 active/completed 漂移、失效链接、host-gap closeout
- `docs archive`：将 active plan 迁入 completed，并自动重写常见 markdown 引用
- `plan list`：列出当前 active plans 及其解析状态
- `plan create`：优先从目标项目模板创建 active exec-plan，不存在时回退发布包内置模板；同步 `active/README.md`，拒绝重复 id、不安全文件名，失败时回滚
- `plan complete`：将 active exec-plan 标记完成、迁入 completed、追加 `--summary` 并同步 active/completed 索引；失败时回滚所有已触碰文件
- `plan check`：确定性校验 exec-plan 目录与索引之间的 missing、stale、duplicate、status mismatch；发现问题时输出 JSON 并以非零状态失败
- `handoff check`：检查任务 source / artifacts / auto-commit scope 是否满足交付闭环
- `handoff coverage`：从 `source/需求.md` 抽取 checklist / numbered / `REQ-*` 项并输出 coverage audit；未覆盖项 exit 1；`explicitly_out_of_scope` 不计为缺口

### Pi runtime reuse benchmark / decision（无 live call）

```bash
loop-agent pi-reuse-benchmark \
  --report ai_workspace/loop-agent/reports/<benchmark-report>.md \
  --json

loop-agent pi-reuse-benchmark \
  --report ai_workspace/loop-agent/reports/<benchmark-report>.md \
  --off-executor /path/to/off/executor.jsonl \
  --on-executor /path/to/on/executor.jsonl \
  --approval /path/to/approval.json \
  --markdown
```

对已有 benchmark plan/report 文件及可选 `executor.jsonl` evidence 做确定性摘要。**不**跑 live Pi call、不创建 task、不改 `CODE_AGENT_PI_REUSE_RUNTIME`（默认仍为 `off`）。输出 `defer`、`maintain-opt-in` 或 `eligible-for-human-review` — 永不 default-on。

### Loop convergence benchmark baseline（无 live call）

```bash
loop-agent loop-benchmark --markdown
loop-agent loop-benchmark --markdown --output ai_workspace/loop-agent/reports/dogfood/2026-06-30-loop-agent-loop-benchmark.md
```

生成 M0 deterministic baseline，对照 `single-repair`、`3-pass-convergence`、`3-pass-convergence+quota`。**不**跑 live Pi/Cursor call、不创建 task、不改 `convergence.enabled` 默认值。live dogfood 证据缺失时输出 `blocked` 并建议保持 opt-in。

### Long-running loop outer state（experimental）

```bash
loop-agent loop init <task-id>
loop-agent loop status <task-id>
loop-agent loop run <task-id> --action dag
loop-agent loop run <task-id> --action shell-verify --command "bash scripts/check-repo.sh"
loop-agent loop run <task-id> --action workflow --profile pr-review
loop-agent loop run <task-id> --auto --max-rounds <count>
loop-agent loop record-round <task-id> --action <name> --result "..." --lesson "..." --next "..." --decision continue
loop-agent loop add-signal <task-id> --type human_followup --message "..."
loop-agent loop closeout <task-id>
```

`loop` 是 Agent DAG 之上的长程状态和 evidence layer，记录 rounds、signals、verification summaries 和 closeout draft。它不是替代 `dag run-task` / `run-dag` 的实现路径；medium/large work 仍需要 DAG evidence 或明确 fallback reason。

### Minimal spec spine audit

```bash
loop-agent spine audit <task-id> --json
loop-agent spine audit <task-id> --markdown
```

检查 task 的 `source/需求.md`、`source/执行约束.md`、`task.json.allowedPaths` / `forbiddenPaths`、需求覆盖与 final verification command labels。`medium` / `large` task 的空 `allowedPaths`、allowed/forbidden overlap、未覆盖验收项、无 final verify command 都会让 audit 非零退出。

### Knowledge curator proposal

```bash
loop-agent knowledge curate --markdown
loop-agent knowledge curate --markdown --output ai_workspace/loop-agent/reports/<task-id>-learned-proposal.md
```

读取 `.harness/knowledge/patterns.jsonl` 中 completed convergence repair pattern，按 `failureClass + fixScope shape + invariant` 去重，生成 human-gated learned guidance proposal。命令只生成 proposal，不直接修改 `skills/loop-agent/references/learned/*.md`；输出会先通过 skill safety audit。

### Knowledge graph / query CLI

```bash
loop-agent knowledge graph-init --product-name <name>
loop-agent knowledge graph-materialize
loop-agent knowledge graph-promote
loop-agent knowledge graph-incremental-prepare --feature F-2026-004 --service <service>
loop-agent knowledge query --mode by_feature --feature F-2026-004 --json
loop-agent knowledge query --mode by_id --id SVC-order --json
loop-agent knowledge query --mode search --text "keyword" --json
```

这些子命令是 package-backed 公共入口，封装包内 knowledge runtime 资产。目标项目应使用 `loop-agent knowledge ...`，不要要求仓库内直接运行未投影的 package-only kb runtime scripts。Feature 测试知识日常写回用 `task.json.taskKind = "knowledge-sync"`（必须绑定 `featureId`）；业务图谱开荒/增量用 `taskKind = "knowledge-graph-bootstrap"`。

### Worker TaskSpec pipeline（伴生 CLI `agent-worker`）

`agent-worker` 是与 `loop-agent` 一起发布的独立 CLI（`bin/agent-worker.js -> dist/worker/cli.js`），面向“产品线 Worker”场景：把一批 TaskSpec 规约成可校验、可串行调度、可晨报的流水线。它不进入 `loop-agent` 命令树，也不自带 executor——执行权全部通过子进程委托给已发布的 `loop-agent` CLI（最终是 DAG runtime + shell verification）。

```bash
agent-worker task validate <task.yaml>            # 三层校验 TaskSpec，输出 JSON
agent-worker task explain-profile <task.yaml>     # 解释业务 type/risk -> DAG governance profile 映射
agent-worker task validate-feature <feature-dir>  # 校验完整 feature packet 的验收、依赖、TaskSpec 和验证命令
agent-worker feature scaffold --repo <repo-root> --template <backend-only|frontend-only|fe-with-api> \
  --feature-id F-YYYY-NNN --title "..." \
  [--be-path <pattern> ...] [--fe-path <pattern> ...] [--contract-path <path>] \
  --verify-command <cmd> [--verify-command <cmd> ...] \
  [--batch <yaml-or-json>] [--dry-run] [--json]
agent-worker feature review --feature-dir <feature-dir> --repo <repo-root> [--json]
agent-worker feature run --feature-dir <feature-dir> --repo <repo-root> [--dry-run] [--git-mode checkpoint] [--keep-failed-diff] [--json]
agent-worker feature doctor --feature-dir <feature-dir> --repo <repo-root> [--json]
agent-worker feature advance --feature-dir <feature-dir> --repo <repo-root> [--task-id <FINAL-VERIFY-id>] [--loop-agent-bin loop-agent] [--dry-run] [--apply --owner <owner>] [--json]
agent-worker feature verify-final --feature-dir <feature-dir> --repo <repo-root> --task-id <qa-execute-id> [--json]
agent-worker feature delivery --feature-dir <feature-dir> --repo <repo-root> [--qa-evidence <path>] [--final-verification <path>] [--waivers <path>] [--dry-run] [--json]
agent-worker feature closeout --feature-dir <feature-dir> --repo <repo-root> [--apply --owner <owner>] [--json]
agent-worker report metrics --repo <repo-root> --month <YYYY-MM> [--json]
agent-worker task draft-followup <task-id> --worker-run-id <id> --feature-dir <feature-dir> --repo <repo-root> [--json]
agent-worker feature approve-followup --feature-dir <feature-dir> --followup-id <id> --repo <repo-root> --owner <owner> [--dry-run] [--json]
agent-worker task retry <task-id> --repo <repo-root> [--reason "<已修复的原因>"]
agent-worker task reconcile <task-id> --feature-id <feature-id> --worker-run-id <id> --dag-run-id <id> --action abandon --reason "<text>" --repo <repo-root> [--force-abandon-recoverable]
agent-worker pool mark-failed --feature-id <feature-id> --task-id <task-id> --worker-run-id <id> --reason "<text>" --repo <repo-root>
agent-worker pool doctor --repo <repo-root> [--json] [--mapping <file>]
agent-worker pool migrate-state --repo <repo-root> [--apply --owner <owner> --reason <reason>] [--mapping <file>] [--json]
agent-worker feature git advance-checkpoint --feature-id <feature-id> --reason "<text>" --repo <repo-root>
agent-worker batch plan-ready --feature-dir <feature-dir> --repo <repo-root> [--limit <count>] [--json]
agent-worker batch run-ready \
  --feature-dir <feature-dir> \                   # 含 tasks/task-graph.yaml
  --repo <repo-root> \                            # 目标 repo
  [--limit <count>] [--batch-run-id <id>] \
  [--loop-agent-bin loop-agent] \
  [--check-repo] [--check-repo-command <command...>] \
  [--quiet] \
  [--pi-model <model>]                           # smoke 覆盖：所有 pi 节点强制用该模型
agent-worker report morning --repo <repo-root> [--batch-run-id <id>] [--output <path>]
agent-worker console [--repo <repo-root>] [--port 8790] [--host 127.0.0.1]  # Official 裸入口；repo 默认当前目录
agent-worker console serve --repo <repo-root> [--port 8790] [--host 127.0.0.1]  # 兼容入口，等价于裸入口
agent-worker console doctor --repo <repo-root> [--json] [--console-url <url>]
agent-worker observe serve --repo <repo-root> [--port 8787] [--host 127.0.0.1]  # 兼容入口；stderr 会提示 OBSERVE_SERVE_DEPRECATED
agent-worker observe snapshot --repo <repo-root>  # 输出 GlobalSnapshot JSON 到 stdout
```

语义要点：

- TaskSpec 声明单个任务的业务上下文、`risk_level`、可选 `capabilities`、验收与 verify 边界；`risk_level` 被确定性映射到 task complexity。`capabilities: [interactive-ui]` 不改变风险或治理 profile，只把 implement/repair writer 路由到 HIGH，并注入禁止 helper-only 逃逸的真实 UI 交付契约。AcceptanceSpec / TaskGraphSpec 声明跨任务验收引用与依赖图，ready queue 决定可运行任务并检测未知依赖/环/文件一致性。
- 业务 type（`backend-feature`/`frontend-feature`/`qa-testcode` 等）是产品线 profile，不能直接传给 `loop-agent dag run-task --profile`；Worker 会映射到 `auto`/`minimal`/`standard`/`reviewed`/`supervised`。
- materializer 把 TaskSpec 物化为 `.harness/tasks/<task-id>`：`source_docs` 原样进入 `source/references/`，派生 `需求.md` 带权威声明、Source Docs/hash 追溯，以及 `acceptance_refs` 短摘要；随后 Worker 调用 `dag run-task` / `dag validate` / `run-dag` / `dag report`。review 节点须对照 references + 派生契约 + 实现。成功路径走 `promote-run` + `closeout task`；失败路径收集 `dag doctor` / `dag closeout-draft` evidence，只允许写入 `.harness/task-pool/failure-handoffs/**`，不放宽其他 `.harness/**` 写入边界。
- Worker runtime state 落在目标 repo 的 `.harness/task-pool/`（artifacts、JSONL/state、晨报、failure handoffs）。自 0.8.0 起该目录是唯一受支持的 Task Pool runtime root；旧路径不读取、不迁移、不合并、不重映射。
- preflight 在 `new-task` 前跑 `loop-agent --version`、`inspect`、`docs-audit`、`git status --short --branch`，可选 `--check-repo`。一次夜间批处理期间不升级控制器，记录实际 `loop-agent` 版本。
- `batch run-ready` 默认在 stderr 输出人类可读进度（批次起止、每个 task 的阶段与耗时、report 决策），stdout 只保留最终 JSON，便于管道取用；加 `--quiet` 可关闭进度。
- `feature scaffold` 确定性生成 Feature Packet（`backend-only` / `frontend-only` / `fe-with-api`），默认 `profile: generic`，输出到 `<repo>/features/<feature-id>`；写盘前同源 `validate-feature`；`--batch` 全有或全无；不调用模型、不碰 `.harness/**`。
- `feature review` 只读派生 Feature 状态、required AC 覆盖、阻塞、证据和唯一下一步。默认输出简洁的人类摘要，`--json` 输出 schemaVersion 1 JSON；损坏事实会显式降级，不会写 Feature Packet 或 Task Pool。
- `feature run` 薄编排 validation、preflight、现有 run-ready、morning report、Observe snapshot 和最终 review。`--dry-run` 零写入；Git checkpoint 可用前单次最多推进一个 Ready 写任务。
- `feature run` 遇到业务 Task 失败时仍刷新证据，但返回 `needs-action` 和非零退出码；无 Ready 是正常结果，并通过 `noReadyReason` 说明 Closed、Deliverable、AwaitingQA、NeedsAction、依赖阻塞或空 Feature。
- `feature run --git-mode checkpoint` 是唯一 checkpoint 授权：要求 clean repo，在本地 `agent/<feature-id>` 分支按成功 Task commit；失败先保存 patch/untracked/boundary audit 再恢复 clean。默认不 commit；从不 stash/push/merge/创建远程 PR。`--keep-failed-diff` 会停止 Feature，不继续后续 Task。
- `feature doctor` 只读诊断 Feature 交付就绪：Task Pool 状态、dirty worktree、canonical evidence / Delivery manifest 是否存在，并给出下一步命令建议（不自动修复）。
- `feature advance`（ADR 0007）编排 `verify-final → delivery → closeout preview[/apply]`：默认 evidence 路径取自 verify-final；`--dry-run` 时 Delivery 不写盘且不 apply closeout；`--apply --owner` 在 closeout preview ready 后原子 apply。不执行实现链 Ready tasks（仍用 `feature run`）。
- `feature verify-final` 在 clean Delivery HEAD 上复用已完成的 `qa-execute` TaskSpec 运行独立 DAG，跳过 promotion/closeout，原子生成 canonical QA aggregate 和 HEAD-bound final verification；相同 HEAD 的 canonical 成功 run 可幂等复用。
- `feature delivery` 复用 transaction record，校验 Git history/trailers/changed files、成功 run、canonical QA/final verification 和 required AC，原子生成 manifest、coverage 与 `PR.md`；省略 evidence 路径时默认 `.harness/task-pool/evidence/<featureId>/{qa-pass,final-verification}.json`；`--dry-run` 零写入。`feature closeout` 默认只读复验全部 gates，显式 `--apply --owner` 才原子写回，stale facts 或 post-validation 失败会整体回滚。
- `report metrics` 按 UTC 月去重投影 Feature/Failure/Follow-up/Delivery/AC/decision/recovery/boundary 指标，同时写 JSON 与 Markdown；每项保留 numerator、denominator、sampleSize 和 missingData。
- `task draft-followup` 会按全部 failure category 生成 TaskDraft 或人工行动卡：ProductBug/TestBug/FlakyTest/DependencyFailure 可批准；EnvFailure 连续两次后才生成 ENV-CHECK；Spec/Contract/Risk/Human/Unknown 只给行动卡。人工以 `feature approve-followup --dry-run` 预览，再带非空 `--owner` 批准 TaskDraft；行动卡不能批准。批准在 staging validation 后写 TaskSpec、graph、Ready/approval/event，原失败事实不改写，并有 rename/state/approval/index/event 回滚门禁。
- `task retry` 是失败 Task 的唯一重试入口。它会保留原有运行记录和 failure handoff，并让下一次 `batch run-ready` 使用新的 `workerRunId`；不要删除运行态文件或手动修改状态来重试。
- **推荐**裸入口 `agent-worker console`（repo 默认当前目录，默认 `127.0.0.1:8790`）提供 Operate + Inspect；`console serve` 是等价兼容入口。Inspect 路径为 `/inspect/#/...`，API 仍为根 `/api/**`。`observe serve` 为兼容入口（默认 `8787`，启动时 stderr 输出 `OBSERVE_SERVE_DEPRECATED`）；`observe snapshot` 保留。Inspect/Observe 本身不会启动、暂停或重试 Task / Worker / DAG。
- 当前 Worker 仍是 v0（库 + CLI + dogfood），未接入定时/CI 驱动；`report morning` 只能从已有 Task Pool runs 汇总。

### 查看 duration statistics / context usage

```bash
loop-agent stats
loop-agent stats context --last 50
loop-agent stats context --last 50 --json
```

- `stats`：legacy step-duration 直方图（`.harness/tasks/*/logs/executor.jsonl`）。
- `stats context`：最近 N 个 DAG runs 的 **skill-resolution** 与节点 outcome 只读聚合（declared/resolved/missing/error、truncation、`unresolvedReferences.reason`、FINISHED/ERROR/SKIPPED + failureCategory）。**不**宣称模型遵循率或 skill execution rate；corrupted snapshot 记为 finding 且 `ok=false`。

### Worktree delegate / harvest（escape hatch）

```bash
loop-agent delegate <task-id> [--base <branch>] [--branch <name>] [--no-symlink] [--auto-run]
loop-agent harvest <task-id> [--squash] [--no-archive] [--keep-worktree]
loop-agent worktree create|list|remove ...
```

用于 worktree 隔离以及可选的 Pi-only DAG 执行与 merge 收口。常规 autonomous work 应优先 Agent DAG；详见 `multi-worktree.md` 与 `ai_workspace/loop-agent/cursor-prompt-sidecar.md`。

### One-shot Cursor sidecar（escape hatch）

```bash
loop-agent cursor-prompt --cwd <repo-root> "Review this task without editing files."
loop-agent cursor-prompt --cwd <repo-root> --file /tmp/bounded-cursor-task.md
loop-agent cursor-prompt --cwd <repo-root> --model composer-2.5 --timeout 1800000 --file /tmp/bounded-cursor-task.md
```

`cursor-prompt` 是 one-shot Cursor SDK helper。用于 bounded diagnosis、小修复或调试 executor；写入 prompt 必须包含 task id、objective、allowed paths、forbidden paths、verification 和 preserve-unrelated-changes 要求。需要 `CURSOR_API_KEY`。它会创建 one-shot run evidence，但 Cursor 自报成功不替代 shell verification。

> **Historical（已移除）**：`subagent list|start|wait|wakeup|attach|stop` 与 `dashboard` 已移除，不再出现在 CLI registry。
