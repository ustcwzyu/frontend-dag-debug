<!-- CODEGRAPH_START -->
## CodeGraph

如果仓库根目录存在 `.codegraph/`，在理解或定位代码前优先使用 CodeGraph，再考虑 rg/fd 或手动读文件。
<!-- CODEGRAPH_END -->

# AGENTS.md

本仓库采用“人类掌舵，智能体执行”的工程方式。目标不是一次性写完所有代码，而是在一个可持续演进、可交接、可验证的系统里做小步增量。

`AGENTS.md` 是地图，不是百科。顶层只保留开工协议、会话协议与文档导航；长期知识、方法论、决策、计划、报告和模板应进入 `docs/`。

## 默认立场

- 仓库是记录系统：决策、契约、计划、测试、报告优先落到仓库，而不是停留在聊天里。
- 一次只推进一个清晰工作块；主会话按 Orient → Select → Contract → Implement → Verify → Handoff 治理，runtime 真实流程以 `src/workflows/` 为准。
- 先验证基线，再叠加改动；如果当前基线已坏，优先定位基线问题。
- Do not consider backward compatibility. Ignore legacy code/libraries.
- 完成定义必须可验证；不能靠删测试、降标准或模糊描述制造“完成”。
- 搜索先于实现；先查现有代码、文档、脚本、测试，避免重复造轮子或误判系统能力。
- 受治理 Agent runtime 只有 Pi：DAG writer 固定为 `implement-pi` / `repair-pi`；`cursor-prompt` 仅是显式手工 one-shot sidecar，不进入 Loop auto-execute 或 Delegate 自动写入。
- 在 DAG runtime 中，搜索/侦察是显式节点：标准路径是 Contract → Scout → Plan → Implement → Verify → Closeout/Handoff。
- init surface、runtime 边界、command registry、skill entry 和架构 import 方向是可机器校验的治理契约；相关细节以 `docs/init-surface.manifest.json`、`docs/architecture/runtime-boundaries.md`、`src/cli/command-definitions.ts`、`skills/loop-agent/` 和 `scripts/check-*.sh` 为准，顶层 `AGENTS.md` 只指路，不重复维护事实源。
- 本仓库既是 loop-agent 源项目，也是目标项目初始化体验的默认模板；任何新增命令、脚本、文档、skill、模板或发布包内容，都要判断它应由 npm 包内置提供，还是由 `loop-agent init` 投影到目标项目，避免出现“本项目能用、初始化项目缺能力”。
- 委托模型写入前，必须把写入边界写成结构化 `task.json.allowedPaths` / `task.json.forbiddenPaths`，再审查生成 DAG 的 writer `writeSet`；不要只依赖 `source/执行约束.md` 的自然语言约束。
- Shell 搜索优先 `rg`，按名找文件优先 `fd`；脚本确为 Bash 脚本时使用 Git Bash 或已配置的兼容 Bash，不要求 Windows 环境适配 POSIX 路径。
- 用 loop-agent 迭代本仓库时，控制器必须来自已发布的 npm 安装包；首次安装或有意升级可用 `@tea-agent/loop-agent@latest`，但一次自举任务启动后不要中途升级控制器，并记录 `npm list -g @tea-agent/loop-agent --depth=0` 显示的实际版本。不要用当前工作区的 `npm link` 或 `npm run dev` 控制可能改动 CLI、DAG runtime、executor、package metadata 或 build output 的任务。
- 反复出现的约束要固化为文档、脚本、检查项、测试或模板。
- 除非用户明确要求，不要自行引入外部 SDD、spec-first、brainstorming 等方法论的强制设计文档、审批门或专用目录；本仓库的工作流程以本文件和 `docs/` 中的治理规则为准。
- 对非微小的实现或修复，`exec-plan` 只负责记录 Contract、进度和验证证据，不能替代 Agent DAG。除非用户明确要求 one-shot，或在计划中记录了适用的 escape hatch 与理由，否则在改动实现文件前必须完成 `task advance`（含结构化 `allowedPaths` / `forbiddenPaths` 与 writeSet 审查）；随后 `--approve-gate` 长跑，不得主会话直接改实现。
- 禁止占位实现；除非 contract 明确约定为脚手架且标出后续闭环。

## 开始顺序

改文件前必须先完成：

1. 运行 `pwd`。
2. 阅读 `README.md`。
3. 阅读 `harness.json`。
4. 阅读 `docs/README.md`。
5. 如果存在 `CONTEXT.md`，阅读项目术语表，避免混用任务源、执行约束、契约、计划等领域概念。
6. 如果是实现类工作，继续阅读：
   - `docs/governance/development-principles.md`
   - `docs/governance/feature-workflow.md`
   - `docs/governance/verification-matrix.md`
7. 如果任务涉及命令入口、执行流程、executor、初始化投影、skills、脚本矩阵、发布包范围或治理检查，继续阅读：
   - `docs/architecture/runtime-boundaries.md`
   - `docs/runtime/loop-agent-harness.md`
8. 如果任务涉及测试纪律、验证声明或调试，继续阅读：
   - `docs/governance/harness-methodology-tdd.md`
   - `docs/governance/harness-methodology-verification.md`
   - `docs/governance/harness-methodology-debugging.md`
9. 查看最近提交、相关执行计划、progress/report，确认当前上下文。
10. 检查 `git status --short --branch`。
11. 运行本次任务相关的最小基线验证。
12. 如果用户提到"后端测试"、"接口测试"、"pytest"、"自动化测试"，在任务 `task.json` 中设置 `taskKind: "backend-test"` 再 `task advance`；不要用 `--profile backend-test`（CLI 不接受该值，专用模板只走 taskKind）。知识回写用 `taskKind: "knowledge-sync"`（须 `featureId`），图谱开荒用 `taskKind: "knowledge-graph-bootstrap"`。`--profile` 仅表示治理强度：`auto|minimal|standard|reviewed|supervised`。
13. 如果用户提到"看板"、"observe"、"监控面板"、"启动看板"，使用 `agent-worker console` 启动统一 Operator Console（默认 repo=当前目录、port=8790；本地图形环境默认打开浏览器，`--no-open` 禁止）；`/inspect/` 提供只读检视。`agent-worker observe serve` 已下线（REMOVED / exit 2）。
14. 如果用户要求“合并 `<source>` 到 `<target>`”或“合并 origin/main 到当前分支”，先阅读 `docs/operations/branch-merge-guideline.md`，按影响自动选择快速、标准或深度模式；始终冻结 source SHA、审查双方功能、运行 merge-tree、生成 source-SHA 合并报告，并在提交前再次 fetch 防止主干前进。

## 会话协议

1. Orient：读入口文档、相关专题、最近变更和现有实现。
2. Select：只选一个清晰工作块；避免把重构、新功能、文档迁移混在一轮里。
3. Contract：写清本轮交付物、非目标、完成标准、验证方法和失败条件。
4. Implement：做最小增量实现，同步维护必要文档、脚本和测试。
5. Verify：优先跑快速反馈，再跑必要的真实路径验证。
6. Converge Docs：检查 README、AGENTS.md、CHANGELOG.md、docs/README.md、相关治理文档、skills references、website docs、初始化模板和脚本说明是否仍与实际行为一致；只更新与本次变更相关的内容，不做顺手文档迁移。
7. Handoff：更新 progress/report/plan 中有长期价值的信息，写清风险、剩余项和下一步。

这套会话协议不是 DAG runtime 的节点序列。复杂实现默认采用 Agent DAG；具体节点拓扑、profile routing、writer 选择和 runner 行为以 `docs/governance/feature-workflow.md` 与 `src/workflows/` 为准。主 agent 负责拆任务、写 contract、把允许/禁止路径写入结构化 task config、审查 DAG/writeSet/profile/shell verification、盯验证与 handoff。微小任务或 DAG runtime 自身修复也应优先使用 DAG，或使用 one-shot `pi-prompt` / `cursor-prompt` escape hatch 并记录边界与验证证据。

## 项目地图

- `CONTEXT.md`：项目术语表，定义 loop-agent、任务源、执行约束等领域语言
- `src/`：loop-agent 运行时代码
- `test/`：Vitest 测试套件
- `bin/loop-agent.js`：CLI 可执行入口
- `skills/`：loop-agent 源仓库和 npm 包内置 skill 指令与参考资料；目标项目初始化后只生成 `.agents/skills/`，不再生成根 `skills/`。初始化还会向目标项目 `.gitignore` 合并 loop-agent managed block，忽略 `.harness/tasks/*`、`.harness/dag-runs/*`、`.harness/runs/*`、`.harness/evaluation/`、`.harness/dogfood-evidence/`、`.harness/init-surface.json`、`.harness/task-pool/*`、`.task-pool/`、`.worktrees/` 等运行态事实，但保留 `.harness/prompts/` 和目录占位可共享，不会整目录忽略 `.harness/`。
- `.harness/`：任务、DAG、run、cache 和 live state 等运行态目录
- `docs/`：治理文档、计划、报告和模板
- `website/`：Docusaurus 用户文档站
- `scripts/`：验证和维护脚本

## 工作规则

- 每次任务只推进一个清晰、有边界的工作块。
- 保留无关的用户改动，不要回退自己没有做的修改。
- 优先沿用现有 helper、目录边界和局部模式，再考虑新增抽象。
- 长期决策写入 `docs/`，不要只留在聊天里。
- 分支合并遵循 `docs/operations/branch-merge-guideline.md`；快速模式只用于可证明的低风险/no-op 合并，涉及冲突、init/package/runtime/release/public API 时必须升级为标准或深度模式。
- 后端测试、接口/API 测试、pytest 或明确的后端自动化测试，必须把 `.harness/tasks/<task-id>/task.json` 的 `taskKind` 设置为 `"backend-test"`，不得保留默认 `standard`。`backend-test` 是 `taskKind`，不是 `--profile` 的可选值；`task advance` 继续使用 `--profile auto` 选择治理等级。仅说“自动化测试”且前后端不明时，先根据任务源和项目技术栈判断，禁止无条件路由。
- 本地 Operator Console：`agent-worker console`（默认 repo=当前目录、port=8790；`--no-open` 可禁止自动打开浏览器），访问 `http://127.0.0.1:8790/`；其中 `/inspect/` 为只读运行检视。默认绑定本机 `127.0.0.1`；可用 `--host 0.0.0.0` / `--debug`，不要直接暴露到公开网络。端口被占用时不会自动更换，请用 `--port <port>` 显式指定。
- 面向使用者的新增、修改、删除或修复，应同步更新根目录 `CHANGELOG.md`；保持版本级摘要即可，不写过细技术细节。
- 面向用户的中文更新日志、README 和说明文档应使用自然、结果导向的表达：先说明用户能获得什么或问题如何改善，保留必要的命令和产品术语，避免逐字翻译、内部实现细节和无意义的中英混杂。
- 涉及 `loop-agent init` 或目标项目投影的改动，必须同步考虑目标项目生成物：`AGENTS.md`、`README.md`、`harness.json`、`ai_workspace/loop-agent/`、`scripts/`、`.agents/skills/`、`.harness/prompts`、`.gitignore`（loop-agent runtime managed block）和 npm 包内置 assets；目标项目根 `docs/` 和根 `skills/` 的旧投影需要由 `init update --apply-safe` 安全迁移或退役。
- 涉及初始化能力演化时，按 `docs/init-surface.manifest.json` 与 `scripts/check-init-evolution-needed.sh` 分级处理：小改 advisory，中等 surface-check，高影响才需要模型审查；不要把所有小改动升级成重流程。
- 通用脚本、skill 和模板可以复制或投影；项目相关 README、验证命令、发布/维护脚本必须基于模板和目标项目真实文件生成，不假定目标项目是 TypeScript、Node、前端、后端或工具项目。
- 涉及 CLI command、skill entry、runtime boundary、import 方向或发布包范围时，同步更新对应文档、catalog/definition、治理脚本和测试，避免 README、skill reference、CLI help、npm 包内容互相漂移。
- 完成相关更新后必须做文档收敛：如果 README、AGENTS.md、CHANGELOG.md、docs、skills、website、初始化生成模板或脚本说明不需要更新，应在交接里写明理由。
- 不提交占位实现。
- 没有新鲜验证证据时，不声明工作完成。
- 发现新 bug、技术债或契约漂移时，写回当前 plan、progress 或 report，而不是只在对话里提一句。
- 涉及 harness 流程变化时，优先把变化落到 `harness.json`、模板、脚本或治理文档，而不是只改提示词。

## 验证

用 `docs/governance/verification-matrix.md` 选择命令。常用门禁：

```bash
npm run typecheck
npm test
npm run build
node bin/loop-agent.js --help
bash scripts/check-repo.sh
bash scripts/ci.sh
```

Windows 上运行 `scripts/*.sh` 时使用 Git Bash 或已配置的兼容 Bash。CLI、Node 代码、模板和提示词里的实际文件路径必须兼容 macOS 与 Windows：优先使用平台原生临时目录和 `path`/`os.tmpdir()`；仅在 repo 引用、JSON/Markdown 证据引用和 glob 约定中使用 `/` 作为稳定分隔符。

文档站相关变更还需要按范围运行：

```bash
npm run docs:build
```

按变更类型补充定向验证：

- 初始化能力或目标项目投影：运行 `test/init-command.test.ts`，并在临时目标项目执行 `loop-agent init --profile full --merge`、`loop-agent init doctor`、`loop-agent inspect`、`loop-agent docs audit` 和目标项目 `bash scripts/check-repo.sh`。
- init surface 或初始化能力演化：运行 `bash scripts/check-init-evolution-needed.sh` 和 `bash scripts/check-init-surface.sh`；高影响或发布前按需使用 `--strict` 并参考 `skills/init-capability-evolution/` 与 `docs/templates/init-evolution-review.md`。
- runtime boundary / command registry / skill entry：运行 `bash scripts/check-architecture-boundaries.sh`、`bash scripts/check-command-registry-drift.sh`、`bash scripts/check-skill-entry.sh`，并确保 `bash scripts/check-repo.sh` 覆盖这些检查。
- 发布包范围：运行 `npm run build`、`node bin/loop-agent.js --help` 和 `npm pack --dry-run`，确认初始化所需静态资料在 package files 中。

## 交接

较大的工作结束时记录：

- 改了什么
- 为什么这样改
- 执行过哪些验证命令以及结果
- 是否影响契约、文档、测试或脚本
- 剩余风险
- 后续工作

## 禁止事项

- 不要在未读相关文档的前提下直接大改。
- 不要一次混合重构、新功能和文档大迁移而没有清晰边界。
- 不要把仅存在于对话里的约束当作长期知识。
- 不要在缺少验证的情况下宣称完成。
- 不要假设系统没有某个能力；先搜索再判断。
- 不要用 stub、假数据通路或注释承诺替代真正交付。
- 不要把个人机器的绝对路径写入仓库级 `AGENTS.md`、README、模板或发布包资料；个人工具配置应留在用户级配置或本机会话上下文。
- 不要只更新 loop-agent 本仓库体验而遗漏目标项目初始化体验；新增能力如果不能通过 npm 内置资料或 `loop-agent init` 到达目标项目，必须写清原因和替代入口。
