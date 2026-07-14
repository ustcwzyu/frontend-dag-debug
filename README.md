# frontend-dag-debug

> 本文件是项目入口。上面一行保留项目名称；下方 loop-agent managed block 由 deterministic CLI 生成。本文件正文人类可维护，用于描述项目概览、技术栈、目录结构、运行/验证命令等。初始化模型应根据目标项目实际文件补全本节正文。

## 项目概览

这是一个用于调试 loop-agent 前端 Agent DAG 工作流的最小项目。项目保留 Vite 默认页面作为初始基线，首个任务将由前端专用 DAG 把首页改为 `hello world`。

## 技术栈与目录结构

- TypeScript 6：页面逻辑与类型检查
- Vite 8：本地开发、生产构建和预览
- `src/`：前端源码与样式
- `public/`：静态资源
- `.harness/`：本地任务与 DAG 运行事实
- `docs/`、`scripts/`、`skills/`：loop-agent 治理、验证与角色指令

## 开发与验证

```bash
npm install
npm run dev
npm run build
bash scripts/check-repo.sh
bash scripts/ci.sh
```

首个本地任务 ID 为 `add-homepage-hello-world`。任务源位于 `.harness/tasks/add-homepage-hello-world/source/`，其 `taskKind` 为 `frontend-implementation`，可用于生成前端专用 DAG。

### 前端 DAG 调试

当前 npm 发布版 `0.10.0` 可用于初始化，但尚未包含当前 `frontend` 分支的 `frontend-implementation` task schema。此调试项目与 `loop-agent` 目录同级，因此以下脚本使用 `../loop-agent/bin/loop-agent.js` 的本地构建产物：

```bash
# 在同级 loop-agent 仓库中构建一次本地候选 CLI
(cd ../loop-agent && npm run build)

# 在本项目中生成、校验并按需执行 DAG
npm run dag:generate
npm run dag:validate
npm run dag:run
```

执行 DAG 前，`npm test` 应因首页还没有 `hello world` 而失败；执行成功后该测试应转绿。这是首个需求的预置验收测试，不是项目初始化故障。

<!-- LOOP_AGENT_INIT_START -->
## loop-agent 治理

本仓库已初始化为 `frontend-dag-debug` 的 loop-agent harness 项目。loop-agent 负责 Agent DAG 生成、校验、执行与收口，并保留运行态事实。下面的内容是 deterministic CLI 生成的保守入口；目标项目的具体语义（技术栈、模块、运行命令、验证命令）应由初始化模型根据实际文件补全。

### 项目入口

- `README.md`（本文件）：人类首次进入项目和 agent 开工的首入口，应同时覆盖项目概览与开发/验证入口。
- `harness.json`：loop-agent entrypoints、验证命令与 adapter 设置。
- `AGENTS.md`：agent 在本仓库的工作协议。
- `docs/README.md` - 治理文档索引（含原则、工作流、验证矩阵与方法论）

### 开发与验证入口

开发、测试和门禁命令（按目标项目实际技术栈补全；下面是 loop-agent 治理脚本）：

```bash
bash scripts/check-repo.sh
bash scripts/ci-governance.sh
bash scripts/ci-tests.sh
bash scripts/ci.sh
loop-agent inspect
loop-agent doctor
loop-agent docs audit
```

`scripts/ci-tests.sh` 必须反映目标项目真实语言和工具链。初始化生成版本会保守探测常见入口；当已知项目专属命令时，应按目标项目实际情况适配，并在 verification-matrix.md 中同步登记。

### loop-agent 工作流入口

默认使用 Agent DAG 作为实现工作流：

```bash
loop-agent new-task <task-id> "任务标题"
# write .harness/tasks/<task-id>/source/需求.md
# write .harness/tasks/<task-id>/source/执行约束.md
loop-agent dag run-task <task-id> --profile auto --strict-models --output <temp-dir>/<task-id>-dag.json
loop-agent dag validate --dag <temp-dir>/<task-id>-dag.json --strict-models --strict-governance
loop-agent run-dag --dag <temp-dir>/<task-id>-dag.json --cwd .
```

详细工作流见 `docs/feature-workflow.md`；验证矩阵见 `docs/verification-matrix.md`。任务 source 是必需项：`source/需求.md` 写目标、范围、非目标、验收标准和相关链接，`source/执行约束.md` 写允许路径、禁止路径、受保护变更、不变量、预期验证和失败条件。

执行后使用 `loop-agent dag report --run-id <run-id> --markdown` 和 `loop-agent dag doctor --run-id <run-id> --markdown` 读取事实与诊断失败。失败 run 不做成功式 closeout；使用 `loop-agent dag closeout-draft --run-id <run-id>` 生成 failure handoff。

### 文档导航

- `docs/README.md` - 治理文档索引（含原则、工作流、验证矩阵与方法论）
- `docs/development-principles.md` - 仓库开发原则
- `docs/architecture/runtime-boundaries.md` - runtime 层边界与依赖方向
- `docs/feature-workflow.md` - 有边界的功能工作流
- `docs/verification-matrix.md` - 治理与项目专属验证命令
- `docs/loop-agent-harness.md` - 目标项目如何使用 loop-agent
- `AGENTS.md` - agent 工作协议
- `harness.json` - loop-agent 入口与验证命令配置

Windows 上运行 `scripts/*.sh` 时使用 Git Bash 或兼容 Bash。实际文件操作使用平台原生路径；`/` 仅用于稳定仓库引用、Markdown/JSON 证据引用和 glob 约定。
<!-- LOOP_AGENT_INIT_END -->
