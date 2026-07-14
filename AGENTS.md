# AGENTS.md

<!-- LOOP_AGENT_INIT_START -->
## loop-agent 治理

本仓库已初始化为 `frontend-dag-debug` 的 loop-agent harness 项目。

### 默认立场

- 仓库是记录系统：决策、契约、计划、验证、报告和交接应进入可追踪文件。
- 一次只推进一个有边界、可验证的工作块。
- 实现前先搜索现有代码、文档、脚本和测试，避免重复造轮子。
- Shell 验证是完成依据；模型建议不能替代命令证据。
- 保留无关的用户改动，不要回退自己没有做的修改。
- 委托模型写入前，必须把写入边界写成结构化 `task.json.allowedPaths` / `task.json.forbiddenPaths`，再审查生成 DAG 的 writer `writeSet`；不要只依赖 `source/执行约束.md` 的自然语言约束。

### 初始化闭环

当用户要求在本仓库初始化 loop-agent，或发现 `README.md` / `docs/verification-matrix.md` 仍停留在通用初始化状态时，模型应在同一轮工作中完成初始化闭环，不要把补全文档和验证矩阵留给用户交互。

标准流程：

1. 运行 `loop-agent init instructions --repo-root .` 获取完整初始化指引。
2. 运行 `loop-agent init --repo-root . --profile full --merge` 完成确定性脚手架。
3. 立即读取目标项目的 README、manifest/build/config 文件和顶层源码/模块目录，识别项目类型、模块、运行入口和验证命令。
4. 基于真实项目文件补全或修正根 `README.md`、`docs/verification-matrix.md`，必要时适配 `scripts/ci-tests.sh`。
5. 运行 `loop-agent init doctor --repo-root .`、`loop-agent inspect --repo-root .`、`loop-agent docs audit --repo-root .` 和 quick verification。

如果仓库信息不足，写明“尚未从仓库文件中识别到 ...”以及下一步需要的事实；不要留下泛化占位符，也不要只提示用户稍后手填。

### 文档收敛

完成实现和验证后，必须检查 `README.md`、`AGENTS.md`、`CHANGELOG.md`（如果目标项目维护）、治理文档、skills references、初始化模板和脚本说明是否仍与实际行为一致。只更新与本次变更相关的内容；如果决定不更新，应在交接里写明理由。

### 开始顺序

改文件前先完成：

1. 运行 `pwd`。
2. 阅读 `README.md`。
3. 阅读 `harness.json`。
4. 阅读 `docs/README.md`。
5. 实现类工作继续阅读 `docs/development-principles.md`、`docs/feature-workflow.md` 和 `docs/verification-matrix.md`。
6. 涉及测试、验证声明或调试时继续阅读 `docs/harness-methodology-tdd.md`、`docs/harness-methodology-verification.md` 和 `docs/harness-methodology-debugging.md`。
7. 查看最近提交、相关 plan/progress/report，并检查 `git status --short --branch`。
8. 运行与本次任务相关的最小基线验证。

### Agent DAG 路径

默认使用 Agent DAG 作为实现工作流：

```bash
loop-agent new-task <task-id> "任务标题"
# write .harness/tasks/<task-id>/source/需求.md
# write .harness/tasks/<task-id>/source/执行约束.md
loop-agent dag run-task <task-id> --profile auto --strict-models --output <temp-dir>/<task-id>-dag.json
loop-agent dag validate --dag <temp-dir>/<task-id>-dag.json --strict-models --strict-governance
loop-agent run-dag --dag <temp-dir>/<task-id>-dag.json --cwd .
```

任务 source 是必需项。`source/需求.md` 写目标、范围、非目标、验收标准和相关链接；`source/执行约束.md` 写允许路径、禁止路径、受保护变更、不变量、预期验证和失败条件。

委托写入前，还要把允许/禁止路径同步到 `.harness/tasks/<task-id>/task.json` 的 `allowedPaths` / `forbiddenPaths` 字段，并在执行前审查生成 DAG 的 writer `writeSet` 是否窄且准确。

凡是影响项目公共契约、执行入口、交付流水线、自动化/治理、数据模型、安全或权限模型、跨模块行为、用户可见工作流的改动，都必须在编辑实现文件前先创建任务、写好两个 source 文件、生成 DAG，并审查 DAG/writeSet。

执行 DAG 前必须审查 profile routing、governance profile、writer 的 `writeSet`、`allowedPaths`、`forbiddenPaths`、shell verification 和 decision gate mode。不要执行占位或过宽的写入范围。

### DAG 诊断与收口

执行后优先使用 `loop-agent dag report --run-id <run-id> --markdown` 读取 run facts；失败或 paused run 使用 `loop-agent dag doctor --run-id <run-id> --markdown` 诊断。失败 DAG run 不应写成成功 closeout，应使用 `loop-agent dag closeout-draft --run-id <run-id>` 生成 failure handoff，保留 what failed、evidence、classification、recommended follow-up、safe retry conditions 和 human decision needed。

### 运行态与 Skills

- `.harness/tasks/` 保存任务状态和 source 材料。
- `.harness/dag-runs/` 与 `.harness/runs/` 保存运行事实；已完成事实只读。
- `skills/` 保存仓库本地 skill 指令；本地缺失时 runtime 可回退到 npm 包内置 skills。
- 示例内置在工具中；优先使用 `loop-agent examples list` 和 `loop-agent examples show <name>` 查看，不默认提交到目标仓库。

### 验证

使用 `docs/verification-matrix.md` 选择验证命令。常用门禁：

```bash
bash scripts/check-repo.sh
bash scripts/ci-governance.sh
bash scripts/ci-tests.sh
bash scripts/ci.sh
loop-agent inspect
loop-agent doctor
loop-agent docs audit
```

`scripts/ci-tests.sh` 必须反映目标项目真实语言和工具链。初始化生成版本会保守探测常见入口；当已知项目专属命令时，应按目标项目实际情况适配。

Windows 上运行 `scripts/*.sh` 时使用 Git Bash 或兼容 Bash。实际文件操作使用平台原生路径；`/` 仅用于稳定仓库引用、Markdown/JSON 证据引用和 glob 约定。

### 交接

较大的交接应说明改了什么、为什么这样改、验证命令和结果、影响到的 docs/tests/scripts/contracts、剩余风险和下一步。长期结论应进入 docs/progress、docs/reports、docs/exec-plans、docs/decisions、测试、脚本或模板。
<!-- LOOP_AGENT_INIT_END -->
