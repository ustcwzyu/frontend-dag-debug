# Task Workflow 规则

本文只保留 legacy task 目录和 source material 的读取规则。历史顺序式 `run analyze|plan|spec|implement|verify|auto|loop|continue` 工作流已经移除，不再作为 micro、fallback 或 compatibility 执行路径。

## 当前执行入口

所有需要可恢复、可验证、可交接的实现工作都走 DAG 路径：

```bash
loop-agent new-task <task-id> "Task Title"
loop-agent dag run-task <task-id> --profile auto --strict-models --output <temp-dir>/<task-id>-dag.json
loop-agent dag validate --dag <temp-dir>/<task-id>-dag.json --strict-models --strict-governance
loop-agent run-dag --dag <temp-dir>/<task-id>-dag.json --cwd <repo-root>
```

`<temp-dir>` 表示平台原生临时目录。实际文件路径必须兼容 macOS 和 Windows；只有 repo refs、JSON/Markdown 证据 refs 和 glob 约定默认使用 `/`。

当目标仓库是 loop-agent 本仓库时，`loop-agent` 命令必须来自 npm 上已发布的安装包。首次安装或有意升级可用 `@tea-agent/loop-agent@latest`，但一次自举任务启动后不要中途升级控制器，并记录 `npm list -g @tea-agent/loop-agent --depth=0` 显示的实际版本。不要用当前工作区的 `npm link` 或 `npm run dev` 控制会改动 CLI、DAG runtime、executor、package metadata 或 build output 的任务；源码开发和 focused debugging 才使用 `npm run dev -- <args>`。

低风险的一行修正文档或配置时，可以由 main session 做 surgical patch，但仍必须记录 scope 并运行对应验证命令。

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

- 用户原始 PRD 用 `loop-agent import-prd <task-id> --file <prd>` 归档到 `source/references/`，禁止 AI 改写。
- `需求.md` 是派生执行契约：写清目标、验收标准、非目标，并用 REQ/AC 或原文锚点映射回 references。
- `执行约束.md` 写清允许文件、禁止改动、硬约束和验证命令。
- 若 `docs/` 已有权威 plan/spec/PRD，优先 `import-prd` 复制，再在 `需求.md` 引用；避免把长 PRD 直接改写成唯一 source。
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

## Verification

完成声明必须来自新鲜验证证据。按目标 repo 的 `docs/verification-matrix.md` 选择最小证明命令；loop-agent 自身常用：

```bash
npm run typecheck
npm test
bash scripts/check-repo.sh
bash scripts/ci.sh
```

Windows 上通过 Git Bash 或配置好的兼容 Bash 运行 `scripts/*.sh`；不要把 POSIX 路径假设写入 CLI、模板或 task source。
