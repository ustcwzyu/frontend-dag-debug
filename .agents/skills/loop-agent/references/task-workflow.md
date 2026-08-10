# Task Workflow 规则

本文只保留 legacy task 目录和 source material 的读取规则。历史顺序式 `run analyze|plan|spec|implement|verify|auto|loop|continue` 工作流已经移除，不再作为 micro、fallback 或 compatibility 执行路径。

## 当前执行入口

所有需要可恢复、可验证、可交接的实现工作都走 DAG 路径：

```bash
loop-agent new-task <task-id> "Task Title"
# 推荐：详细 PRD → import → prepare（无需手写两 source）
loop-agent import-prd <task-id> --file <prd>
loop-agent task source prepare <task-id> --use-imported-prd --allowed-path "<glob>" --apply --json
# 非微小：loop-agent plan create <plan-id> "<title>"（可与 task 解耦，见 source-and-plan-practice.md）
loop-agent dag run-task <task-id> --profile auto --strict-models
loop-agent dag validate --dag .harness/tasks/<task-id>/dag.json --strict-models --strict-governance
loop-agent run-dag --dag .harness/tasks/<task-id>/dag.json --cwd <repo-root>
```

默认 DAG 草稿为 `.harness/tasks/<task-id>/dag.json`。repo-relative 示例用 `/`；Windows 由 Node 解析本地路径。何时必须 `import-prd` / `plan create`：见 `source-and-plan-practice.md`。

当目标仓库是 loop-agent 本仓库时，`loop-agent` 命令必须来自 npm 上已发布的安装包。首次安装或有意升级可用 `@tea-agent/loop-agent@latest`，但一次自举任务启动后不要中途升级控制器，并记录 `npm list -g @tea-agent/loop-agent --depth=0` 显示的实际版本。不要用当前工作区的 `npm link` 或 `npm run dev` 控制会改动 CLI、DAG runtime、executor、package metadata 或 build output 的任务；源码开发和 focused debugging 才使用 `npm run dev -- <args>`。

主会话默认是 **Compatibility / Operator Assist**：实现工作必须走上方 DAG CLI。低风险的文档/index/task-source 元数据修正仅作 operator 维护，须记录 scope、跑验证，且**不得**扩展为业务实现或 CLI 失败后的救火写码；见 `orchestrator-and-interventions.md`。

## Source Materials

`new-task` 后至少维护：

```text
.harness/tasks/<task-id>/
  source/
    references/          # 原始 PRD / design / acceptance（不可变）
    source-manifest.json # import-prd 写入的 hash 清单
    需求.md              # 派生执行契约
    执行约束.md
  task.json
```

- 用户原始 PRD 用 `loop-agent import-prd <task-id> --file <prd>` 归档到 `source/references/`，禁止 AI 改写。**有文件就 import**。
- 默认用 `task source prepare --use-imported-prd --apply` 投影 `需求.md` / `执行约束.md` 与 managed paths；**不要**默认让 LLM/主会话手写两 source。
- 无独立 PRD 的微小任务可用 `task source prepare --from-text ... --apply` escape hatch（见 `source-and-plan-practice.md`）。
- 若 `ai_workspace/loop-agent/` 已有权威 plan/spec/PRD，优先 `import-prd` 复制，再 prepare 派生薄契约；避免把长 PRD 直接改写成唯一 source。
- 仓库级 exec-plan（`plan create`）与 harness task **解耦**：非微小实现应有 plan 或复用 active plan；微小任务可不建 plan。
- Worker / TaskSpec materialize 路径会把 `source_docs` 复制到 `source/references/`，并在派生 `需求.md` 顶部声明“冲突以 references 为准”；`acceptance_refs` 应展开为短摘要而不只写 ID。
- review 节点必须三方对照：`source/references/*`（尤其 requirement/acceptance）、派生 `需求.md`、以及实现/验证证据。

## Task State

当前 task 状态由 DAG-oriented read model 推导：

- source readiness
- DAG draft
- latest DAG run
- promotion
- closeout
- loop state
- legacy workflow snapshot

旧 `.workflow_state.json` 只能作为兼容读取输入，不是新任务 next action 或完成状态的权威来源。

## Repo Adapters

loop-agent 自动检测所在 repo，并按目标 repo 的 `harness.json` 与治理根目录选择验证入口。跨目录操作时显式传入目标仓库：

```bash
loop-agent --repo-root /path/to/target-repo <command>
```

## Task Config

新任务不应写入旧 `flow` 字段。常用字段是：

- `taskId`
- `title`
- `complexity`
- `allowedPaths`
- `forbiddenPaths`
- `hardConstraints`
- `verifyCommands` / adapter verification settings
- `dagFallbackReason`，仅用于记录为何某个长期 loop 缺少 DAG round evidence

结构化数组字段：

- `referenceDocs` 必须是 `{ path, name? }[]`，不能是路径字符串数组。
- `verifyCommands` 必须是 `{ label, command, timeoutMs? }[]`，不能是命令字符串数组。

切片形状：每个 task 应是可独立验证的垂直 tracer bullet，而不是某一层的水平批处理。Autonomy（AFK/HITL）与 governance profile（`minimal`/`standard`/`reviewed`/`supervised`）分开声明；默认 `--profile auto`。

## Verification

完成声明必须来自新鲜验证证据。按目标 repo 的 `harness.json.governanceRoot` 下 `verification-matrix.md` 选择最小证明命令；loop-agent 自身常用：

```bash
npm run typecheck
npm test
bash scripts/check-repo.sh
bash scripts/ci.sh
```

Windows 上通过 Git Bash 或配置好的兼容 Bash 运行 `scripts/*.sh`；不要把 POSIX 路径假设写入 CLI、模板或 task source。
