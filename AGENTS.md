# AGENTS.md

<!-- LOOP_AGENT_INIT_START -->
## loop-agent 治理

本仓库已初始化为 `frontend-dag-debug` 的 loop-agent harness 项目。

### 默认立场

- 仓库是记录系统：决策、契约、计划、验证、报告和交接应进入可追踪文件。
- 一次只推进一个有边界、可验证的工作块；实现前先搜索现有代码、文档、脚本和测试。
- Shell 验证是完成依据；模型建议不能替代命令证据。
- 保留无关的用户改动，不要回退自己没有做的修改。
- 委托模型写入前，必须把写入边界写成结构化 `task.json.allowedPaths` / `task.json.forbiddenPaths`，再审查生成 DAG 的 writer `writeSet`；不要只依赖 `source/执行约束.md` 的自然语言约束。
- 本仓库对 openCode 等主会话的定位是 **Compatibility / Operator Assist**：主会话编排 CLI 与只读诊断，**不是**默认实现 agent。

### 主会话硬约束（Compatibility / Operator Assist）

主会话（含 openCode、Cursor Chat、其他宿主 agent）= **operator-only**；skills 与本文件是纪律文档，**不能**替代 `task.json` / DAG `writeSet` / runtime 执法。

| 类别 | 规则 |
| --- | --- |
| **允许** | 已发布 `loop-agent` / `agent-worker` CLI；只读 status/doctor/report/inspect/observe；准备 `source/*` 与 `task.json` 边界；human gate；shell 验证与 handoff。 |
| **禁止** | 绕过 CLI 用宿主 Edit/Write/ApplyPatch 直接改业务实现；CLI/DAG 失败后「救火改文件」；用聊天自述代替 shell 验证。 |
| **失败时** | 先 `dag report` / `dag doctor`；优先 `dag rerun --from-node` 安全子图续跑；仅契约/源真变或 plan 不合格时同 task 重 advance / `dag rerun-task`；paused 用 approve→`dag resume`。 |
| **实现写入** | 业务代码 **只** 经受治理 DAG writer（`implement-pi` / `repair-pi`）经 `task advance`（批准 writeSet gate 后长跑）。 |

**永远不要**：`loop-agent` / `agent-worker` 失败 ⇒ 主会话直接改仓库实现；也勿因 provider 抖动或只读节点失败**新建无关 task-id**。

### 自然语言入口路由

| 用户表达 | 入口 | 执行动作 |
| --- | --- | --- |
| loop-agent 初始化 / loop agent 初始化 / loop agent初始化 / 初始化 loop-agent | 初始化 | 完成确定性初始化闭环 |
| loop-agent初始化更新 / loop-agent 初始化更新 / 更新 loop-agent 初始化内容 / 升级 loop-agent 初始化 | 初始化升级闭环 | 直接运行 `init upgrade`；自动安全更新、返回单文件语义合并任务并 `--continue` 至稳定终态，禁止停在只读检查或 `needs-model-merge` |
| 初始化更新校验 / 检查初始化更新 / loop-agent 初始化更新校验 / loop agent初始化更新校验 / 只检查，不要修改 | 更新校验 | 严格只读报告，不创建 upgrade run、不写入 |
| 初始化对齐 / 升级后对齐 / reconcile 初始化 / loop-agent 初始化对齐 | 初始化升级闭环 | 直接运行 `init upgrade`，而非拼接低层 safe-update 命令 |
| 初始化安全更新 / 应用初始化更新 / loop-agent 初始化安全更新 / loop agent初始化安全更新 | 初始化升级闭环 | 直接运行 `init upgrade`，由 controller 处理安全更新与验证 |
| loop-agent 帮我完成 / 帮我实现 / 帮我修复 / 帮我开发 <需求>；使用 loop-agent 完成 <X>；按 loop-agent 流程处理 <X> | 通用需求实现 | 先提供 PRD 与 `allowedPaths` / `forbiddenPaths` / verify，再 `task advance` → 审查 writeSet gate → `task advance --approve-gate`；主会话不得直接修改业务实现 |
| 从失败节点继续 / 续跑 / 不要重开任务 / 从 plan 或 code-review 接着跑 | DAG 中途恢复 | **不是**新 `task advance`：`dag report` → `dag rerun --from-node … --plan` → 带 `plan-hash` 执行（见失败默认恢复序） |

**初始化升级闭环（写入型）**：主会话收到上述写入型表达时自动调用统一入口，并在 controller 返回的具体单文件 `allowedPaths` 内完成必要语义合并后使用 `--continue`。不得停在 `check-update`、`needs-safe-update`、`needs-model-merge` 或 `verification-pending`。默认安装/合并项目 `.opencode/plugins/`、`.pi/extensions/` 与 `.pi/settings.json`；Pi 必须 trust 项目才能加载，默认严禁写 `~/.pi/agent/settings.json`。

```bash
loop-agent init upgrade --repo-root . --json
loop-agent init upgrade --repo-root . --run-id <run-id> --continue --json
loop-agent init upgrade --repo-root . --run-id <run-id> --report --markdown
```

**更新校验（只读）**：只读执行下面命令；**不得自动**执行 `apply-safe`、模型合并或创建 upgrade run。

```bash
loop-agent init check-update --repo-root . --markdown
```

**低层兼容命令（仅诊断/恢复，不是自然语言写入入口）**：`init reconcile`、`init update --bootstrap-surface` 与 `init update --apply-safe` 保留给 controller 诊断、旧自动化和人工排障。主会话收到任何写入型“初始化更新 / 初始化对齐 / 安全更新”表达时，必须唯一进入 `init upgrade`，不得改为直接调用这些低层命令，也不得在它们返回 `needs-model-merge` 后停止。surface 缺失、human decisions、活跃 DAG/Worker 或 Worker 状态无法确认时仍必须零写入。

```bash
# 只读诊断
loop-agent init check-update --repo-root . --markdown
# 低层兼容恢复；不得替代写入型自然语言的统一 init upgrade 入口
loop-agent init reconcile --repo-root .
loop-agent init update --repo-root . --bootstrap-surface
loop-agent init update --repo-root . --apply-safe
```

### 初始化闭环

当用户要求初始化 loop-agent（“初始化 loop-agent”“loop agent 初始化”“loop agent初始化”“loop-agent 初始化”），或发现 `README.md` / `ai_workspace/loop-agent/verification-matrix.md` 仍停留在通用初始化状态时，模型应在同一轮工作中完成初始化闭环，不要把补全文档和验证矩阵留给用户交互。

1. 运行 `loop-agent init instructions --repo-root .`。
2. 运行 `loop-agent init --repo-root . --profile full --merge`。
3. 基于真实项目文件补全根 `README.md`、`ai_workspace/loop-agent/verification-matrix.md`，必要时适配 `scripts/ci-tests.sh`。
4. 运行 `loop-agent init doctor --repo-root .`、`loop-agent inspect`、`loop-agent docs audit` 并完成 quick verification。

信息不足时写明尚未识别到的事实；不要留下泛化占位符。

### 文档收敛

完成实现和验证后，必须检查 `README.md`、`AGENTS.md`、`CHANGELOG.md`（如果目标项目维护）、治理文档、skills references、初始化模板和脚本说明是否仍与实际行为一致。只更新与本次变更相关的内容；如果决定不更新，应在交接里写明理由。

### 开始顺序

pwd → `README.md` → `harness.json` → `ai_workspace/loop-agent/README.md` → 实现类再读 principles/feature-workflow/verification-matrix；测试纪律读 harness-methodology-*；`git status`；最小基线验证。

### Agent DAG 路径

```bash
loop-agent task advance <task-id> "任务标题" \
  --prd <path-to-prd.md> \
  --allowed-path "<glob>" \
  --forbidden-path ".harness/**" \
  --verify "<label>:<command>" \
  --json
# 审查 writeSet gate digest 后：
loop-agent task advance <task-id> --approve-gate "write-set-review:<digest>" --json
loop-agent task status <task-id> --json
# 非微小或跨会话任务（推荐）：loop-agent plan create <plan-id> "<title>"
# 有 plan 时收尾：loop-agent plan complete <plan-id> --summary "..."
```

`--verify` 命令应取项目 `AGENTS.md` / `ai_workspace/loop-agent/verification-matrix.md` 登记的验证命令（不要假定 `npm run typecheck` 存在）；`--verify` 可选，省略时自动从 package.json scripts 或既有 managed `task.json.verifyCommands` 推导建议。

`source/需求.md` 与 `source/执行约束.md` 仍必需（M8/M9），但默认由 `task advance --prd` 投影生成，而不是主会话手写。`plan create` 不是 `task advance` 的硬依赖。写入前同步 `task.json.allowedPaths` / `task.json.forbiddenPaths` 并审查 writer `writeSet`。高级任意 DagSpec 才用 `dag validate|execute|report`，不进入标准 happy path。

凡是影响项目公共契约、执行入口、交付流水线、自动化/治理、数据模型、安全或权限模型、跨模块行为、用户可见工作流的改动，都必须在编辑实现文件前先通过 `task advance` 建立 managed contract / writeSet gate，并审查 gate digest。

### 任务类型路由（taskKind）

- 用户明确提出后端测试、接口/API 测试、pytest，或语境明确为后端的自动化测试时，必须把 `.harness/tasks/<task-id>/task.json` 的 `taskKind` 设置为 `"backend-test"`，不得保留默认 `standard`。
- `backend-test` 是 `taskKind`，不是 `--profile` 的可选值；运行 `task advance` 时继续使用 `--profile auto`。
- 仅出现“自动化测试”且无法判断前后端时，先阅读任务源与目标项目技术栈再决定，禁止无条件路由到 `backend-test`。
- 用户提示词明确是前端实现需求（例如前端页面、UI、组件或交互开发）时，必须把 `.harness/tasks/<task-id>/task.json` 的 `taskKind` 设置为 `"frontend-implementation"`，不得保留默认 `standard`。
- `frontend-implementation` 是 `taskKind`，不是 `--profile` 的可选值；运行 `task advance` 时继续使用 `--profile auto`，也可按需显式选择 `minimal` / `standard` / `reviewed` / `supervised`，不要把业务模板名当作 profile。
- 前端自动化测试（浏览器/UI 自动化、Playwright、E2E）继续使用 `taskKind: "frontend-test"`，不得设置为 `frontend-implementation`。

### 运行看板（只读）

```bash
agent-worker console                       # 默认 repo=当前目录，port=8790；本地图形环境 listen 后默认打开浏览器
agent-worker console --no-open             # 只启动服务，不打开浏览器
```

浏览器打开 `http://127.0.0.1:8790/`；检视面为 `http://127.0.0.1:8790/inspect/`。默认绑定本机 `127.0.0.1`；不要直接暴露到公开网络。端口被占用时不会自动更换，请用 `--port <port>` 显式指定。`agent-worker observe serve` 已下线（REMOVED / exit 2）。

### DAG 诊断与收口

live run 先用 `loop-agent dag status --run-id <run-id>` 看 lifecycle 与 liveness；用 `loop-agent dag report --run-id <run-id> --markdown` 读 facts；失败/paused 用 `loop-agent dag doctor --run-id <run-id> --markdown`。生命周期对齐先只读运行 `loop-agent dag reconcile-run --run-id <run-id>`；只有 runner 已停止且 operator 明确提供 `--action supersede|abandon --reason "..."` 时才允许变更。失败 run 用 `loop-agent dag closeout-draft --run-id <run-id>` 生成 failure handoff，不要写成成功 closeout。

**失败默认恢复序**：`dag report`/`dag doctor` → 优先 `dag rerun --from-node <node> --plan` 再带 `--plan-hash`（provider 抖动、plan/review/verify 安全下游；writer/decision/fingerprint 不合格勿硬跑）→ paused：approve→`dag resume` → 契约/源真变或 R1 不合格：同 task `task advance` / `dag rerun-task`（禁无理由新建 task-id）→ Worker-owned：`agent-worker task retry`。

Operator 须监控 live run 至终态（FINISHED / FAILED / partial_failed）或 Decision Gate 需要 approve；可在节点/rank 变化、verify/closeout、stall 或需 approve 时简短汇报（告知非请求确认）。判活须组合 runner heartbeat、session events 与 `dag doctor` liveness/provider meaningful progress（heartbeat alone ≠ progress）。bounded writer 运行期间不得并发修改工作区（write guard / write-guard 会把越界 diff 错误归因到 writer）；只读 status/doctor/report 与 approve/reject/resume 仍允许。恢复：report/doctor → **优先** `dag rerun --from-node` → 必要时 rerun-task/同 task advance → shell verify。**禁止**把主会话直接 Edit 业务代码当作恢复手段。

### 运行态与验证

- `.harness/tasks/`、`.harness/dag-runs/`、`.harness/runs/` 保存运行事实；已完成事实只读。
- `.agents/skills/` 为本地 skills；缺失时可回退 npm 包内置。
- 验证命令选择：`ai_workspace/loop-agent/verification-matrix.md`。常用：`bash scripts/check-repo.sh`、`bash scripts/ci.sh`、`loop-agent inspect`、`loop-agent doctor`、`loop-agent docs audit`。
- `scripts/ci-tests.sh` 必须反映目标项目真实工具链。Windows 脚本用 Git Bash；仓库引用用 `/`。

### 交接

交接写清变更、原因、验证证据、影响面、风险与下一步；长期结论进入 `ai_workspace/loop-agent/progress`、reports、exec-plans、decisions。
<!-- LOOP_AGENT_INIT_END -->
