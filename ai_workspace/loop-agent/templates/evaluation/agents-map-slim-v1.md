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
- 先验证基线，再叠加改动；完成定义必须可验证，不能靠删测试、降标准或模糊描述制造“完成”。
- Do not consider backward compatibility. Ignore legacy code/libraries.
- 搜索先于实现；受治理 Agent runtime 只有 Pi（`implement-pi` / `repair-pi`）；`cursor-prompt` 仅为显式手工 one-shot sidecar。
- DAG 标准路径：Contract → Scout → Plan → Implement → Verify → Closeout/Handoff。
- 机器校验契约真源：`docs/init-surface.manifest.json`、`docs/architecture/runtime-boundaries.md`、`src/cli/command-definitions.ts`、`skills/loop-agent/`、`scripts/check-*.sh`；本文件只指路。
- 本仓库既是源项目也是 init 默认模板；新增能力必须判断 npm 内置 vs `loop-agent init` 投影。
- 委托写入前必须结构化 `task.json.allowedPaths` / `forbiddenPaths`，并审查 DAG writer `writeSet`。
- Shell 搜索优先 `rg`，按名找文件优先 `fd`；脚本用 Git Bash / 兼容 Bash。
- 用 loop-agent 迭代本仓库时，控制器必须来自已发布 npm 包（记录实际版本）；启动后不要中途升级；不要用工作区 `npm link` / `npm run dev` 控制可能改 CLI/runtime/package 的任务。
- 反复出现的约束固化为文档、脚本、检查、测试或模板；禁止占位实现（除非 contract 标明脚手架）。
- 非微小实现：`exec-plan` 不能替代 Agent DAG；除非用户要求 one-shot 或计划记录 escape hatch，否则改实现前完成 `new-task`、结构化路径、`dag run-task`、`dag validate` 与 writeSet 审查。
- 不要自行引入外部 SDD/spec-first 等强制平行治理树；以本文件与 `docs/` 为准（ADR 0006）。

## 开始顺序

改文件前必须先完成：

1. `pwd` → 读 `README.md`、`harness.json`、`docs/README.md`；有 `CONTEXT.md` 则读术语表。
2. 实现类工作继续读：`docs/governance/development-principles.md`、`docs/governance/feature-workflow.md`、`docs/governance/verification-matrix.md`。
3. 涉及命令/executor/init/skills/发布包/治理检查时继续读：`docs/architecture/runtime-boundaries.md`、`docs/runtime/loop-agent-harness.md`。
4. 涉及测试纪律/验证声明/调试时继续读：`docs/harness-methodology-*.md`。
5. 查看最近提交、相关 plan/progress/report；`git status --short --branch`；跑最小基线验证。
6. 后端/接口/pytest → `taskKind: "backend-test"`（不是 `--profile`）；知识回写 `knowledge-sync`；图谱开荒 `knowledge-graph-bootstrap`。`--profile` 仅 `auto|minimal|standard|reviewed|supervised`。
7. 看板/observe → `agent-worker console`（默认 repo=当前目录、port=8790；兼容 `agent-worker console serve --repo . --port 8790`）（`/inspect/` 只读）；`observe serve` 仅为兼容入口。
8. 分支合并 → 先读 `docs/operations/branch-merge-guideline.md`。

## 会话协议

1. Orient → 2. Select（一块）→ 3. Contract → 4. Implement → 5. Verify → 6. Converge Docs → 7. Handoff。

这不是 DAG 节点序列。复杂实现默认 Agent DAG；主 agent 拆任务、写 contract、结构化路径、审查 DAG/writeSet/profile/shell verification。微小任务可用 one-shot escape hatch 并记录边界与验证证据。

## 项目地图

- `CONTEXT.md`：术语表
- `src/`：运行时；`test/`：Vitest；`bin/loop-agent.js`：CLI
- `skills/`：源仓库/npm 内置 skills；目标项目只生成 `.agents/skills/`
- `.harness/`：运行态（tasks/dag-runs/runs 等；init 会 gitignore 运行事实，保留 prompts 与占位）
- `docs/`：治理；`website/`：用户文档站；`scripts/`：检查与 CI

## 工作规则（增量约束）

- 保留无关用户改动；优先沿用现有 helper/目录边界。
- 长期决策写入 `docs/`；面向用户变更更新 `CHANGELOG.md`（结果导向中文）。
- init/投影变更必须同步目标项目生成物与 package assets；init evolution 按 `docs/init-surface.manifest.json` 分级。
- CLI/skill entry/runtime boundary/发布包变更同步 catalog、脚本与测试。
- 没有新鲜验证证据时不声明完成；新债写入 plan/progress/report。

## 验证

权威源：`docs/governance/verification-matrix.md`。常用：

```bash
npm run typecheck && npm test && npm run build
node bin/loop-agent.js --help
bash scripts/check-repo.sh
bash scripts/ci.sh
```

文档站变更：`npm run docs:build`。init / architecture / skill entry / pack 定向验证见 verification-matrix。

## 交接

记录：改了什么、为什么、验证命令与结果、契约/文档/测试影响、剩余风险、后续工作。

## 禁止事项

- 未读相关文档就大改；一次混合无关重构/新功能/文档大迁移。
- 把对话约束当长期知识；缺验证宣称完成；假设系统没有某能力（先搜索）。
- stub/假数据通路替代交付；把本机绝对路径写入仓库级 AGENTS/README/模板/发布包。
- 只更新本仓库体验而遗漏目标项目 init 体验。
