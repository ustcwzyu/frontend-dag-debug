---
name: agent-worker
description: Use when work involves agent-worker, Feature Packet, TaskSpec, Task Pool, Feature or batch orchestration, controller pinning, versioned self-hosting (自举) release trains, candidate takeover canaries (候选接棒验证), or worker failure recovery; use loop-agent instead for a single DAG implementation or DAG runtime/kernel repair.
references:
  - path: references/agent-worker-operator.md
    required: true
---

# Agent Worker Operator

当工作起点是 Feature Packet、TaskSpec、Task Pool、Worker batch 或 versioned self-hosting release train 时使用本 skill。它负责在单次 loop-agent DAG run 之外选择并监督工作。

## Compatibility / Operator Assist

- 主会话对本 skill 的定位是 **outer-loop operator**，不是实现 agent。
- **允许**：`agent-worker` / `loop-agent` CLI；只读 `pool doctor`、`observe`、status/report；冻结 controller identity；选择 Ready 工作与 recovery 命令。
- **禁止**：绕过 CLI 直接 Edit 业务实现；Worker/DAG 失败后主会话「救火改文件」。
- **失败时只允许**：保留 evidence → `task retry` / `task reconcile` / `pool mark-failed` / human gate → 再经 CLI 重跑；实现写入仍只经 published `loop-agent` DAG。
- **Official vs Compatibility**：`agent-worker console` 是 Official 本地控制面（裸入口直接启动；默认 repo=当前目录、port=8790；兼容入口 `agent-worker console serve --repo . --port 8790` 等价）。同进程提供 Operate + Inspect，Inspect 路径 `/inspect/#/...`；openCode 等主会话仍是 Compatibility Assist，二者**不是**同等保证。原 `observe serve` 为兼容期只读入口（启动时输出 `OBSERVE_SERVE_DEPRECATED`，stdout 仍只输出 URL），功能等价于 Console 的 Inspect 面。

## Route the Work

- 用 `agent-worker` 做 Feature validation 与 lifecycle 决策、Ready-task 选择、batch 推进、controller identity freeze、candidate takeover canary，以及失败 Worker run 的恢复。
- 对单个有界 DAG task、DAG diagnostics、node implementation，或 DAG runtime/kernel 修复，用 `loop-agent` CLI（仍禁止主会话直接写实现）。
- 不要让 DAG leaf node 递归启动 `agent-worker`；Worker 是 outer loop，不是另一个 node executor。

## Boundaries

- `agent-worker` 读取 Feature Packet 与 Task Pool facts，选择任务，冻结 controller identity，启动 Feature/batch lifecycle 命令，并收集 evidence。
- `loop-agent` 仍是 DAG executor，负责 Pi-only implementation nodes、write-set governance、skill snapshots 与 run facts。
- Controller identity 冻结驱动 batch 的 published package；loop-agent skill snapshot 则单独冻结注入单次 DAG run 的 instructions。
- 本 skill 不复制 command catalog。精确 flags 见 CLI help 与同级 `../loop-agent/references/command-reference.md`。
- 不要把本 skill 加入默认 DAG role skills；仅对 outer-loop operator 工作显式路由。
- 主会话 skills 文本**不能**替代 writeSet / controller identity 执法。

## Operator Flow

1. 校验 Feature Packet 与 TaskSpecs，再从 Task Pool facts 选择 Ready 工作，而不是从 chat state。Task Pool 身份是 `{ featureId, taskId }`，不是裸 taskId。
2. 在写入前解析并冻结目标 published controller；在 batch、task 与 run evidence 中保留 controller identity。
3. 将仓库**实现写入**委托给受治理的 loop-agent DAG nodes（子进程 CLI），并审查 task boundaries 与 write sets；主会话不手写实现。
4. 自举时保持 published version N 固定，由它维护 candidate N+1，再通过 deterministic isolated canary 证明 candidate takeover。
5. 失败时先保留原始 run record、evidence 与 failure handoff，再 CLI 重试或创建后续工作——**禁止**主会话直接改业务树收尾。
6. Failed task 重试使用 `agent-worker task retry <task-id> --feature-id <feature-id> --repo <repo> --reason <reason>`；跨 Feature 同名时禁止省略 `--feature-id`。
7. 升级或发现 legacy state 时先 `pool doctor`，再用 `pool migrate-state`（默认 dry-run；apply 需 `--owner` + `--reason`）。Observe 保持只读。

## References

- `references/agent-worker-operator.md`
