# frontend-dag-debug

> 本文件是项目入口。上面一行保留项目名称；下方 loop-agent managed block 由 deterministic CLI 生成。本文件正文人类可维护，用于描述项目概览、技术栈、目录结构、运行/验证命令等。初始化模型应根据目标项目实际文件补全本节正文。

## 项目概览

「Agent 学习实验室」：中文优先、响应式、Node.js + Express + SQLite 后端支撑的 Agent 学习单页网站（含无后端时的本地降级展示）。首页呈现站点主张「让 Agent 不再靠运气工作」、入门/构建/进阶三条可切换学习路线（任一时刻恰好一条选中，aria-pressed 与内容同步）、六类能力地图、编码真实 Agent 四阶段（输入 → 计划 → 工具 → 评估）的可交互执行轨迹，以及本周实验「研究助手」（约 45 分钟）。

后端（`server/`）提供内容 API（路线/能力地图/本周实验/第一课，SQLite 持久化并在首次启动自动建库种子）、简易账号注册登录（密码单向散列、令牌会话）与按用户隔离的学习进度 API；前端（`src/api.ts`）在页面加载时请求服务数据，失败时降级为内联兜底数据并提示「服务不可用」，登录面板与进度面板位于课程区之后。全部内容数据（含第一课完整 HTML）静态内联于 `src/main.ts` 并同步为服务端种子数据；旧的 hello world、问候弹窗与任务看板已不再挂载首页；`src/task-board.ts` 模块与其纯函数测试原样保留。

入门路线第一课「从一次模型调用到可验证的 Agent Run」已深化为一节完整中文静态课程（`id="first-lesson-beginner"`、`scroll-margin-top: 5.5rem`），由 hero 与路线详情两个 CTA 的 `#first-lesson-beginner` 锚点到达，预计用时 60–90 分钟，面向有基础开发经验、第一次系统学习 Agent 的学习者，零后端、零网络、零账号、零 API key。课程包含：课程定位（适合人群/用时/前置知识/完成后能力/课程产物）、六段学习路径（概念→拆解→设计→实验→评估→复盘，各含目的、学习动作、产出）、「读完 vs 完成」区分与五类交付物验收关系；「模型调用 vs Agent Run」八项差异对照表、八步最小闭环与五个边界问题；一条带 Run ID/目标/输入快照/步骤与决策/工具边界/停止条件/输出/评估/证据引用的静态 run 样例，每个字段配「解决什么问题/缺失时会发生什么」风险说明（覆盖目标模糊、输入漂移、无停止条件、无评估、无记录五类风险）；「看起来回答正确但不可验证」失败样例与改写样例；五阶段本地实验（准备/冻结/执行/评估/复盘，各含动作、检查点、产物、常见错误）与 run-contract.md、input-freeze.md、run-log.md、evaluation.md、retrospective.md 五个可直接复制的本地文本模板（pre 块，实验仅使用内联 [S1]/[S2] 资料）；四类故意失败样例（无来源/超出边界/无停止条件/无评估记录）及修复提示、10 分评估量表（8 分及以上才算完成，低于 8 分必须重跑或修订）、四道自测题与直接可读的参考答案区、复盘模板。构建/进阶路线的 `#first-lesson-builder` / `#first-lesson-advanced` 保持空锚点；课程区无交互控件（无 button/details/input/checkbox）、无 aria-live、无动画（@keyframes 保持恰好 1 个），新增表格采用局部滚动（overflow-x:auto）与长代码内容级换行，390px 视口无横向溢出；:focus-visible 描边与 prefers-reduced-motion 行为保留。

## 技术栈与目录结构

- TypeScript 6：页面逻辑与类型检查
- Vite 8：本地开发、生产构建和预览（`/api` 代理到本地后端 3001）
- Node.js + Express 5：后端 API（`server/`，Node 原生 TS type-stripping 直跑，无需编译步骤）
- SQLite（Node 内置 `node:sqlite`）：内容、账号与进度持久化，数据库文件位于 `server/data/`（已忽略入库）
- `src/`：前端源码、样式与 task-board 领域逻辑
- `server/`：Express 应用工厂（`app.ts`）、入口（`index.ts`）、数据库（`db.ts`）、认证（`auth.ts`）、内容种子（`content.ts`）
- `public/`：静态资源
- `.harness/`：本地任务与 DAG 运行事实
- `ai_workspace/loop-agent/`：loop-agent 治理文档、计划、报告与模板
- `.agents/skills/`：仓库本地可审计的角色指令
- `scripts/`：治理与项目验证入口

## 开发与验证

```bash
npm install
npm run dev
npm run server       # 或 PORT=3002 npm run server；首次启动自动建库并初始化内容
npm test
npm run typecheck
npm run build
npm run preview
bash scripts/check-repo.sh
bash scripts/ci.sh
```

开发时前后端并存：`npm run dev`（Vite，3000 端口）与 `npm run server`（API，3001 端口），Vite 将 `/api` 代理到后端；`npm run build` 后可直接 `npm run server` 由同一进程托管 `dist/` 静态资源与 API。后端不可用时前端自动降级为内联数据并提示「服务不可用」。

当前验证命令：

- `npm test`：`node --test` 运行 `test/homepage.test.mjs`（站点身份、默认唯一选中、路线切换同步、轨迹四阶段、六类能力、本周实验、第一课深化：结构/对照表/八步闭环/静态 run 样例/五阶段实验/五个模板/评估量表/自测题/静态回归断言、无网络/无存储断言、reduced-motion 媒体查询、meta/favicon/README 断言）、`test/task-board.test.mjs`（task-board 纯函数断言全部保留 + 旧首页挂载强绑定断言）、`test/server-api.test.mjs`（后端 API 端到端：内容端点、错误结构、注册/登录/令牌、按用户隔离的进度，内存 SQLite + 临时端口）与 `test/frontend-api.test.mjs`（前端契约静态断言：API 客户端端点与形状校验、令牌 key 与 task-board 隔离、降级横幅、进度面板、课程区纯净与 @keyframes 唯一性）。
- `npm run typecheck`：`tsc --noEmit`（tsconfig include: src 与 server）。
- `npm run build`：`tsc && vite build`，产出 `dist/`。
- `bash scripts/check-repo.sh`：默认在 `.harness/dag-runs/active` 非空时被 harness runtime clean 检查（scripts/check-harness-runtime-clean.sh）阻断，报告「运行态阻断」；调试运行态时用 `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 bash scripts/check-repo.sh` 得到项目检查结果（工程结构、文档索引/链接、活动计划、架构边界、skill 入口、产品线文档等全部通过后输出「仓库治理检查全部通过」）。

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
  --verify "<label>:<command>" \
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
