---
name: loop-agent
description: >-
  Use when implementing features, processing PRDs or requirements, running structured loop-agent workflows, creating harness tasks, using Agent DAG, run-dag, pi-prompt planning/review, cursor-prompt one-shot sidecar intervention, initializing a target project with loop-agent, checking init update status, applying a safe init update, or converging website/governance docs after user-visible changes in loop-agent. Triggers: loop-agent, workflow, structured development, harness task, Agent DAG, docs converge, Converge Docs, 文档收敛, 结构化开发, 工作流, 需求实现, PRD 实现, 初始化 loop-agent, loop agent 初始化, loop agent初始化, loop-agent 初始化, 初始化更新校验, loop agent初始化更新校验, 检查初始化更新, 初始化安全更新, loop agent初始化安全更新, 应用初始化更新. 强路由：loop-agent 帮我完成需求, 帮我实现, 帮我修复, 帮我开发, 使用 loop-agent 完成, 按 loop-agent 流程处理, 通用需求实现；这些表达确定性地进入 Agent DAG/CLI（new-task, dag run-task, dag validate, run-dag），主会话编排而不直接写业务实现.
references:
  - path: references/harness-policy.md
    required: true
  - path: references/hybrid-dag.md
    required: true
  - path: references/verification-and-failure-handling.md
    required: true
---

# loop-agent Workflow

Entry: routing and hard rules. Required details come from frontmatter references；`command-reference.md` stays optional below.

## 默认立场

- 主入口是 **Agent DAG**（经 `loop-agent` / 可选 `agent-worker` CLI）。
- 宿主仅作 **Compatibility / Operator Assist**：主会话编排 CLI、审 writeSet、读 status/doctor/report、处理 human gate、验证与 handoff；不写业务代码。
- **严禁**主会话绕过 CLI 用宿主 Edit/Write 改业务实现，或 CLI 失败后「救火改文件」。
- DAG `pi` executor 默认 read-only；`toolProfile: "write"` 时为 bounded writer；sidecar 须 per call 收窄。
- Shell verification 是事实源；长期结论写回 `ai_workspace/loop-agent/`、`docs/decisions/` 或 `skills/`。

## 唯一推荐执行路径

```bash
loop-agent new-task <task-id> "Title"
# PRD-first default: detailed PRD → import-prd → task source prepare --apply
# no hand-written/LLM source by default
loop-agent import-prd <task-id> --file <prd.md>
loop-agent task source prepare <task-id> --use-imported-prd --allowed-path "<glob>" --apply --json
# plan create for non-trivial work (see references/source-and-plan-practice.md)
loop-agent dag run-task <task-id> --profile auto --strict-models
# default draft: .harness/tasks/<task-id>/dag.json
loop-agent dag validate --dag .harness/tasks/<task-id>/dag.json --strict-models --strict-governance
loop-agent run-dag --dag .harness/tasks/<task-id>/dag.json --cwd <repo-root>
```

执行前审阅 `profileRouting`、`governanceProfile`、writer `writeSet`、`forbiddenPaths`、decision gate mode。

## 进阶主题路由

| 主题 | Reference |
|---|---|
| Harness policy、Loop、SePO-lite | `references/harness-policy.md` |
| Agent DAG topology、writeSet、recovery | `references/hybrid-dag.md` |
| Operator commands、`agent-worker` | `references/command-reference.md` |
| 独立验证、failure handling、closeout | `references/verification-and-failure-handling.md` |

## Hard Rules

1. Use vertical tracer bullets across real integration layers；each needs independent acceptance and verification.
2. Autonomy ≠ governance profile: declare AFK/HITL in human gate; choose `--profile` by risk.
3. Source materials mandatory: `source/需求.md`、`source/执行约束.md`、优先 `source/references/*` originals。
4. Structured task config only: `referenceDocs` uses `{ path, name? }[]`, never a string array；`verifyCommands` uses `{ label, command, timeoutMs? }[]`, never a string array。
5. Agent DAG is the implementation workflow；review three-way checks references + derived source + implementation。
6. 主会话不绕过 CLI 直接写业务代码；失败只走 doctor/reconcile/human gate/重跑。
7. DAG `pi` executor read-only unless `toolProfile: "write"`；completed run facts read-only；不得从 read-only DAG/sidecar 写 root `artifacts/`。
8. No hidden state in chat only；verify before completion.
9. Client recovery：`init --client-recovery=auto|project|user|off`；只有 `user` 写 Pi settings；check/update 遵守 ownership。

## References

Required（按需 inline）：`references/harness-policy.md`、`references/hybrid-dag.md`、`references/verification-and-failure-handling.md`

Optional 索引见 `references/README.md`；常用：`command-reference.md`、`long-running-loop.md`、`orchestrator-and-interventions.md`、`docs-converge.md`。
