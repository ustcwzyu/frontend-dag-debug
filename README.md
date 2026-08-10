# frontend-dag-debug

> 本文件是项目入口。上面一行保留项目名称；下方 loop-agent managed block 由 deterministic CLI 生成。本文件正文人类可维护，用于描述项目概览、技术栈、目录结构、运行/验证命令等。初始化模型应根据目标项目实际文件补全本节正文。

## 项目概览

「Agent 学习实验室」：中文优先、响应式、零后端依赖的 Agent 学习单页网站。首页呈现站点主张「让 Agent 不再靠运气工作」、入门/构建/进阶三条可切换学习路线（任一时刻恰好一条选中，aria-pressed 与内容同步）、六类能力地图、编码真实 Agent 四阶段（输入 → 计划 → 工具 → 评估）的可交互执行轨迹，以及本周实验「研究助手」（约 45 分钟）。

全部路线与课程数据静态内联于 `src/main.ts`：页面无网络请求、无第三方运行时依赖，路线切换不写 localStorage。旧的 hello world、问候弹窗与任务看板已不再挂载首页；`src/task-board.ts` 模块与其纯函数测试原样保留。

## 技术栈与目录结构

- TypeScript 6：页面逻辑与类型检查
- Vite 8：本地开发、生产构建和预览
- `src/`：前端源码、样式与 task-board 领域逻辑
- `public/`：静态资源
- `.harness/`：本地任务与 DAG 运行事实
- `ai_workspace/loop-agent/`：loop-agent 治理文档、计划、报告与模板
- `.agents/skills/`：仓库本地可审计的角色指令
- `scripts/`：治理与项目验证入口

## 开发与验证

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
bash scripts/check-repo.sh
bash scripts/ci.sh
```

当前验证命令：

- `npm test`：`node --test` 运行 `test/homepage.test.mjs`（站点身份、默认唯一选中、路线切换同步、轨迹四阶段、六类能力、本周实验、无网络/无存储断言、reduced-motion 媒体查询、meta/favicon/README 断言）与 `test/task-board.test.mjs`（task-board 纯函数断言全部保留 + 旧首页挂载强绑定断言）。
- `npm run typecheck`：`tsc --noEmit`（tsconfig include: src）。
- `npm run build`：`tsc && vite build`，产出 `dist/`。

视觉签名：首屏执行轨迹编码真实 Agent 阶段并尊重 `prefers-reduced-motion`；token 配色使用 PRD 指定的 Mist `#e7eef2` / Ink `#10263a` / Deep Navy `#0b1b2a` / Signal Coral `#ff5a36` / Spring `#9fe3c2` / Circuit Lilac `#c9c4ff`，无渐变、无外部字体（condensed 显示栈 + `ui-monospace` 数据标签）。

任务源与 DAG 运行事实位于对应的 `.harness/tasks/` 和 `.harness/dag-runs/` 目录。

### 前端 DAG 调试

当前已使用 npm 发布版 `@tea-agent/loop-agent@0.16.17` 完成初始化；日常治理命令直接使用全局 `loop-agent`。本仓库的 `dag:*` npm 脚本仍保留为相邻 `loop-agent` 源码仓库的前端 DAG 调试入口，用于验证开发中的本地候选构建：

```bash
# 仅在调试相邻 loop-agent 源码候选时，先构建本地 CLI
(cd ../loop-agent && npm run build)

# 在本项目中生成、校验并按需执行 DAG
npm run dag:generate
npm run dag:validate
npm run dag:run

# 使用已发布控制器执行常规任务时，直接调用全局 CLI
loop-agent --version
```

每个行为任务在执行 DAG 前先提交预置红灯验收测试，DAG 实现成功后测试转绿。当前 `npm test` 覆盖新首页行为与 task-board 纯函数回归。

带后端接口的需求必须先提供原始需求文档；随后按 `Product Requirement → dependency-analysis → api-documentation → DAG` 生成可追溯输入，未提供原始需求时不得臆造 API 契约。

<!-- LOOP_AGENT_INIT_START -->
## loop-agent 治理

本仓库已初始化为 `frontend-dag-debug` 的 loop-agent harness 项目。loop-agent 负责 Agent DAG 生成、校验、执行与收口，并保留运行态事实。下面的内容是 deterministic CLI 生成的保守入口；目标项目的具体语义（技术栈、模块、运行命令、验证命令）应由初始化模型根据实际文件补全。

### 项目入口

- `README.md`（本文件）：人类首次进入项目和 agent 开工的首入口，应同时覆盖项目概览与开发/验证入口。
- `harness.json`：loop-agent entrypoints、验证命令与 adapter 设置。
- `AGENTS.md`：agent 在本仓库的工作协议。
- `ai_workspace/loop-agent/README.md` - 治理文档索引（含原则、工作流、验证矩阵与方法论）

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
loop-agent task advance <task-id> "任务标题" \
  --prd <prd.md> \
  --allowed-path "<glob>" \
  --verify "typecheck:npm run typecheck" \
  --json
# 审查 writeSet gate digest 后：
loop-agent task advance <task-id> --approve-gate "write-set-review:<digest>" --json
loop-agent task status <task-id> --json
```

详细工作流见 `ai_workspace/loop-agent/feature-workflow.md`；验证矩阵见 `ai_workspace/loop-agent/verification-matrix.md`。任务 source 仍必需（`source/需求.md` / `source/执行约束.md`），默认由 `task advance --prd` 从详细 PRD 确定性派生，而不是主会话手写或 LLM 写 md。高级任意 DagSpec 才用 `dag validate|execute|report`，不进入标准 happy path。

执行后使用 `loop-agent dag report --run-id <run-id> --markdown` 和 `loop-agent dag doctor --run-id <run-id> --markdown` 读取事实与诊断失败。失败 run 不做成功式 closeout；使用 `loop-agent dag closeout-draft --run-id <run-id>` 生成 failure handoff。

### 文档导航

- `ai_workspace/loop-agent/README.md` - 治理文档索引（含原则、工作流、验证矩阵与方法论）
- `ai_workspace/loop-agent/development-principles.md` - 仓库开发原则
- `ai_workspace/loop-agent/architecture/runtime-boundaries.md` - runtime 层边界与依赖方向
- `ai_workspace/loop-agent/feature-workflow.md` - 有边界的功能工作流
- `ai_workspace/loop-agent/verification-matrix.md` - 治理与项目专属验证命令
- `ai_workspace/loop-agent/loop-agent-harness.md` - 目标项目如何使用 loop-agent
- `AGENTS.md` - agent 工作协议
- `harness.json` - loop-agent 入口与验证命令配置

Windows 上运行 `scripts/*.sh` 时使用 Git Bash 或兼容 Bash。实际文件操作使用平台原生路径；`/` 仅用于稳定仓库引用、Markdown/JSON 证据引用和 glob 约定。
<!-- LOOP_AGENT_INIT_END -->
