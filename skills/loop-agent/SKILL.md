---
name: loop-agent
description: >-
  Use when implementing features, processing PRDs or requirements, running structured loop-agent workflows, creating harness tasks, using Agent DAG, run-dag, pi-prompt planning/review, or Cursor bounded implementation in loop-agent. Triggers: loop-agent, workflow, structured development, harness task, Agent DAG, 结构化开发, 工作流, 需求实现, PRD 实现.
references:
  - path: references/harness-policy.md
    required: true
  - path: references/hybrid-dag.md
    required: true
  - path: references/verification-and-failure-handling.md
    required: true
  - path: references/command-reference.md
    required: true
---

# loop-agent Workflow

这是 `loop-agent` 的入口文档，只负责 trigger、routing 和硬规则。较长的 command details、workflow 细节与失败处理放在 `references/`，按需加载。

## Canonical Harness Policy

Shared loop-agent harness workflow 规则见 `references/harness-policy.md`。Repo-local `docs/loop-agent-harness.md` / `specs/loop-agent-harness.md` 应保持为 local runtime path、governance root、verification commands 的 thin adapters。

## 默认立场

- 主入口是 **Agent DAG**。
- 主会话负责编排、审 writeSet、复核验证与 handoff。
- DAG `pi` executor 默认用于 read-only planning / review / diagnosis；当节点声明 `toolProfile: "write"` 时用于 bounded implementation / repair；Pi 模型矩阵保持 LOW=`gpt-5.3-codex-spark`、MED=`glm-5.2`、HIGH=`gpt-5.5`。
- `pi-prompt` 与 `cursor-prompt` 都是一次性 full-capability helper；用作 sidecar 时必须在 prompt 和 tool/model 参数里显式收窄。
- Cursor 是显式启用的可选 bounded write backend；默认 no-Cursor DAG 使用 `executor: "pi"` + `toolProfile: "write"`，必须给出 allowed / forbidden paths。
- Shell verification 是事实源；任何完成声明都必须有本轮命令输出。
- 长期结论写回 `docs/exec-plans/`、`docs/reports/`、`docs/progress/` 或 `./skill/`。

## 唯一推荐执行路径

```bash
loop-agent new-task <task-id> "Task Title"
# Prefer immutable original PRD first:
# loop-agent import-prd <task-id> --file <path-to-original-prd.md>
# write derived <repo-root>/.harness/tasks/<task-id>/source/需求.md
# write <repo-root>/.harness/tasks/<task-id>/source/执行约束.md

loop-agent dag run-task <task-id> --profile auto --strict-models --output <temp-dir>/<task-id>-dag.json
loop-agent dag validate --dag <temp-dir>/<task-id>-dag.json --strict-models --strict-governance
loop-agent run-dag --dag <temp-dir>/<task-id>-dag.json --cwd <repo-root>
```

`loop-agent` 默认指 npm 上已发布的全局 CLI。自举迭代 loop-agent 本仓库时，首次安装或有意升级可用 `npm install -g @tea-agent/loop-agent@latest`，但一次自举任务启动后不要中途升级控制器，并记录 `npm list -g @tea-agent/loop-agent --depth=0` 显示的实际版本。不要用当前工作区的 `npm link` 或 `npm run dev` 控制可能改动 CLI、DAG runtime、executor、package metadata 或 build output 的任务。`npm run dev -- <args>` 只用于源码调试和聚焦 CLI 开发。

`<temp-dir>` 表示平台原生临时目录。macOS 和 Windows 都应使用实际平台路径；`/` 只用于 repo refs、JSON/Markdown 证据 refs 和 glob 约定。

执行前必须审阅：

- `profileRouting`
- `governanceProfile`
- writer `writeSet`
- writer `forbiddenPaths`
- shell verification commands
- decision gate mode

## Pi Sidecar 入口规则

短时规划、审查、失败归因可使用 full-capability `pi-prompt`，默认模型是 `glm-5.2`：

- 只读 sidecar 必须显式传 `--tools read,grep,find,ls`，并在 prompt 中写明不编辑文件。
- 高复杂度 one-shot 诊断可显式加 `--model gpt-5.5`。
- 输出是 advisory，不能替代 deterministic verification；发现必须写回 task source、report、progress 或 exec plan。

## Bounded Write Execution

需要写代码时，默认使用 DAG `pi` executor 的 write tool profile。Pi writer 节点必须包含 task id、目标、allowed paths、forbidden paths、writeSet、硬约束和预期验证，并在执行后由主会话独立运行 shell verification。

Cursor 只作为显式启用的可选 bounded write backend。调用示例与细节见 `references/pi-prompt.md`、`references/harness-policy.md` 和 `references/verification-and-failure-handling.md`。

Pi writer prompt 与 Cursor prompt 都必须包含：

- task id
- exact objective
- allowed paths
- forbidden paths
- hard constraints
- expected verification
- instruction to preserve unrelated files

bounded writer 完成后，主会话必须独立复核；命令清单见 `references/verification-and-failure-handling.md` 的 "Cursor bounded write 后的独立复核"。

## 进阶主题路由

以下主题只在 references 中维护细节，不在本文展开：

| 主题 | Reference |
|---|---|
| Long-Running Loop（`loop` init/status/run/record-round/add-signal/closeout、auto mode、signals） | `references/long-running-loop.md` |
| Three-Pass Convergence、repair artifact、spine audit、knowledge curate、SePO-lite prompt evolution | `references/harness-policy.md` |
| Operator commands（status/doctor/report/closeout/promote/inspect/spine/knowledge/docs/handoff） | `references/command-reference.md` |
| 伴生 CLI `agent-worker`（TaskSpec / Task Pool / batch / morning report） | `references/command-reference.md` |
| Post-Cursor 独立验证、verify knobs、failure handling、closeout | `references/verification-and-failure-handling.md` |

## Source Layout

新代码优先从这些目录进入：

| Area | Entry |
|---|---|
| CLI command tree / help / commander program | `src/cli/` |
| DAG workflow | `src/workflows/dag/` |
| Long-running loop workflow | `src/workflows/loop/` |
| Task runtime | `src/task/` |
| Executors | `src/executors/` |
| Worker TaskSpec pipeline（伴生 CLI `agent-worker`） | `src/worker/` |
| Run records / promotion / closeout | `src/records/` |
| Governance | `src/governance/` |
| Shared helpers | `src/shared/` |
| Repo adapters | `src/adapters/` |

不要新增平行兼容入口。CLI public export 的唯一入口是 `src/cli/index.ts`；commander command tree 和 help 实现在 `src/cli/program.ts`。

## Hard Rules

1. One task = one bounded work chunk.
2. Source materials are mandatory: `source/需求.md` and `source/执行约束.md`. Prefer immutable originals under `source/references/` via `import-prd` or Worker `source_docs`; treat `需求.md` as a derived contract.
3. Agent DAG is the implementation workflow. Review must three-way check references + derived source + implementation when originals exist.
4. DAG `pi` executor stays read-only unless the node sets `toolProfile: "write"`; `pi-prompt` / `cursor-prompt` are full-capability one-shot helpers and must be bounded per call.
5. Pi writer nodes and optional Cursor write execution must be bounded by explicit allowed / forbidden paths.
6. Completed DAG and one-shot run facts are read-only.
7. Do not write root `artifacts/` from read-only DAG or sidecar steps.
8. Do not keep hidden workflow state in chat only; write durable conclusions to repo artifacts.
9. Verify before completion.

## References

Required（frontmatter 已声明）：

- `references/harness-policy.md`
- `references/hybrid-dag.md`
- `references/verification-and-failure-handling.md`
- `references/command-reference.md`

Optional（按需加载）：

- `references/orchestrator-and-interventions.md`
- `references/long-running-loop.md`
- `references/task-workflow.md`
- `references/pi-prompt.md`
- `references/one-shot-runs.md`
- `references/pi-subagent-assisted-mode.md`
- `references/model-routing.md`
- `references/multi-worktree.md`
- `references/post-implementation-and-patterns.md`
