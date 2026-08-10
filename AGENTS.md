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
| **失败时** | `dag doctor` / `dag report` / `dag reconcile-run`（及适用 worker reconcile）；修正任务源/`task.json`/DAG 后经 CLI 重跑。 |
| **实现写入** | 业务代码 **只** 经受治理 DAG writer（`implement-pi` / `repair-pi`）经 `task advance`（批准 writeSet gate 后长跑）。 |

**永远不要**：`loop-agent` / `agent-worker` 失败 ⇒ 主会话直接改仓库实现。

### 自然语言入口路由

| 用户表达 | 入口 | 执行动作 |
| --- | --- | --- |
| loop-agent 初始化 / loop agent 初始化 / loop agent初始化 / 初始化 loop-agent | 初始化 | 完成确定性初始化闭环 |
| 初始化更新校验 / 检查初始化更新 / loop-agent 初始化更新校验 / loop agent初始化更新校验 | 更新校验 | 只读报告，不写入 |
| 初始化对齐 / 升级后对齐 / reconcile 初始化 / loop-agent 初始化对齐 | 升级对齐 | 自动应用确定性安全动作；surface 缺失、人工决策、活跃 DAG/Worker 或 Worker 状态无法确认时零写入 |
| 初始化安全更新 / 应用初始化更新 / loop-agent 初始化安全更新 / loop agent初始化安全更新 | 安全更新 | 先 check-update，再只执行确定性安全动作 |
| loop-agent 帮我完成 / 帮我实现 / 帮我修复 / 帮我开发 <需求>；使用 loop-agent 完成 <X>；按 loop-agent 流程处理 <X> | 通用需求实现 | 先提供 PRD 与 `allowedPaths` / `forbiddenPaths` / verify，再 `task advance` → 审查 writeSet gate → `task advance --approve-gate`；主会话不得直接修改业务实现 |

**更新校验（只读）**：只读执行下面命令；**不得自动**执行 `apply-safe` 或模型合并。

```bash
loop-agent init check-update --repo-root . --markdown
```

**升级对齐**：`loop-agent init reconcile --repo-root .`；surface 缺失、human decisions、活跃 DAG/Worker 或 Worker 状态无法确认时必须零写入。

**安全更新**：先 check-update；surface 缺失时仅先建立 inferred baseline，再执行确定性 safe actions。不得自动处理 model merge tasks。

```bash
loop-agent init check-update --repo-root . --markdown
loop-agent init update --repo-root . --bootstrap-surface  # 仅 surface 缺失时
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
  --verify "typecheck:npm run typecheck" \
  --json
# 审查 writeSet gate digest 后：
loop-agent task advance <task-id> --approve-gate "write-set-review:<digest>" --json
loop-agent task status <task-id> --json
# 非微小或跨会话任务（推荐）：loop-agent plan create <plan-id> "<title>"
# 有 plan 时收尾：loop-agent plan complete <plan-id> --summary "..."
```

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
agent-worker console                       # 默认 repo=当前目录，port=8790
agent-worker console serve --repo . --port 8790   # 兼容入口，等价于上面裸入口
```

浏览器打开 `http://127.0.0.1:8790/`；检视面为 `http://127.0.0.1:8790/inspect/`。默认绑定本机 `127.0.0.1`；不要直接暴露到公开网络。端口被占用时不会自动更换，请用 `--port <port>` 显式指定。`agent-worker observe serve` 仅为兼容入口。

### DAG 诊断与收口

live run 先用 `loop-agent dag status --run-id <run-id>` 看 lifecycle 与 liveness；用 `loop-agent dag report --run-id <run-id> --markdown` 读 facts；失败/paused 用 `loop-agent dag doctor --run-id <run-id> --markdown`。生命周期对齐先只读运行 `loop-agent dag reconcile-run --run-id <run-id>`；只有 runner 已停止且 operator 明确提供 `--action supersede|abandon --reason "..."` 时才允许变更。失败 run 用 `loop-agent dag closeout-draft --run-id <run-id>` 生成 failure handoff，不要写成成功 closeout。

Operator 须持续监控 live run，直到 controller 报告 run 已结束（节点/流程终态如 `FINISHED`、`FAILED` 或 `partial_failed`），或 Decision Gate **需要 approve**；不要在节点仍运行时假定完成。判活须组合 runner heartbeat、session events 与 `dag doctor` liveness/provider meaningful progress；Runner heartbeat 只证明 lease，alone ≠ progress，不得仅凭运行时长结束节点。exclusive writer（如 `implement-pi` / `repair-pi`）运行期间：主会话与其他 writer **不得并发修改工作区**，以免 write-guard 错误归因；只读 status/doctor/report/observe 与 approve/reject/resume CLI 仍允许。恢复：status/doctor/report → classify → reconcile/replan → CLI 重跑 → shell verify。**禁止**把主会话直接 Edit 业务代码当作恢复手段。

### 运行态与验证

- `.harness/tasks/`、`.harness/dag-runs/`、`.harness/runs/` 保存运行事实；已完成事实只读。
- `.agents/skills/` 为本地 skills；缺失时可回退 npm 包内置。
- 验证命令选择：`ai_workspace/loop-agent/verification-matrix.md`。常用：`bash scripts/check-repo.sh`、`bash scripts/ci.sh`、`loop-agent inspect`、`loop-agent doctor`、`loop-agent docs audit`。
- `scripts/ci-tests.sh` 必须反映目标项目真实工具链。Windows 脚本用 Git Bash；仓库引用用 `/`。

### 交接

交接写清变更、原因、验证证据、影响面、风险与下一步；长期结论进入 `ai_workspace/loop-agent/progress`、reports、exec-plans、decisions。
<!-- LOOP_AGENT_INIT_END -->
