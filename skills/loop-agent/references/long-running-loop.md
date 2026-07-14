# Long-Running Loop 详细规则

需要跨多轮记录目标、压缩记忆、round facts 引用，或使用 `loop init|status|run|record-round|add-signal|closeout` 时使用本文。`loop` 是 experimental outer workflow state：它不替代 Agent DAG，也不等同于已移除的顺序式 `run loop`。共享 policy 摘要见 `harness-policy.md` 的 "Long-running loop policy" 一节。

## 最小入口

```bash
loop-agent loop init <task-id>
loop-agent loop status <task-id>
loop-agent loop run <task-id> --action shell-verify --command "bash scripts/check-repo.sh"
loop-agent loop run <task-id> --action pi-review
loop-agent loop run <task-id> --action cursor-fix --model composer-2.5
loop-agent loop run <task-id> --action dag
loop-agent loop run <task-id> --action dag --execute
loop-agent loop run <task-id> --auto --max-rounds 3
loop-agent loop run <task-id> --auto --max-rounds 3 --allow-cursor-fix
loop-agent loop add-signal <task-id> --type human_followup --message "review this boundary before closeout"
loop-agent loop closeout <task-id>
loop-agent loop record-round <task-id> \
  --action manual \
  --result "summary" \
  --lesson "what to carry forward" \
  --next "next bounded action" \
  --decision continue \
  --ref ".harness/runs/completed/<run-id>/result.json"
```

## 状态源与记忆规则

- `loop/objective.md` 与 `loop/context.md` 是运行态投影；exec plan / task source 仍是需求状态源。
- `rounds.jsonl` 只引用 canonical facts，不复制完整 executor 日志。
- `context.md` 每轮重写为压缩记忆，不无限 append。
- `events.jsonl` 只用于 observability，覆盖 loop_start、round_start、action_start、action_finish、context_rewrite、decision、loop_finish；不要把 events 当状态源。

## Action 规则

- `loop run --action shell-verify` 是 deterministic action；命令 exit code 决定 verification result，输出摘要写入 `loop/verification/round-N.json`。
- `loop run --action pi-review` 必须保持 read-only；工具 allowlist 固定为 `read,grep,find,ls`，输出必须包含 `findingSummary`、`failureCategory`、`nextHypothesis`、`recommendedAction`、`fixScope`、`rootCause`，其中 `recommendedAction` 只能是 `implement_fix|replan|pause|done`。
- `loop run --action cursor-fix` 必须读取 task `allowedPaths` / `forbiddenPaths`，拒绝空 allowedPaths 或 allowed/forbidden overlap；对 `complexity=medium|large` 的任务，还必须已有 loop `dag` round 证据，或在 `task.json.dagFallbackReason` 中写明 DAG runtime fallback 原因。调用现有 Cursor bounded executor，并把 one-shot evidence 归档到 `.harness/runs/completed|failed/`。
- `cursor-fix` 只表示 bounded write round 已执行；它不会把 loop 标记 complete，下一步必须进入 `shell-verify` 或 review。
- `loop run --action dag` 默认是 review mode：调用 `dag run-task <task-id> --profile auto --strict-models` 生成 DAG，再用 `dag validate --strict-models --strict-governance` 校验，并记录 review packet。
- `loop run --action dag --execute` 才会调用 `run-dag`，随后读取 `dag report --json` 作为 round result；paused DAG 会让 loop 进入 `paused`。

## Auto mode 与写入边界

- `loop run --auto --max-rounds N` 使用 deterministic policy 选择下一轮 action；默认只会自动选择 shell-verify、pi-review、dag review 或 policy pause/block，不自动触发 Cursor 写入。
- 自动 `cursor-fix` 必须显式 opt-in：`task.json.loopAutoWritePolicy="enabled"`，或 `loopAutoWritePolicy="approval-required"` 加 pending approval signal / `--allow-cursor-fix`。即使 opt-in，也必须通过 `allowedPaths`/`forbiddenPaths`/DAG evidence guard；guard 失败会 pause，不会绕过写入边界。
- auto mode 遇到同类 failure streak 达阈值会 blocked，避免无限重试。

## Signals

- `loop add-signal` 写入 durable `signals.jsonl`，支持 `human_followup|approval|scope_changed|review_feedback`；urgent/scope_changed 会 pause，review feedback / human follow-up 先走 read-only Pi review，approval 触发下一轮 DAG review packet。
- Signals 不直接覆盖 `objective.md`；DAG decision envelope / approve / reject / resume 仍由 DAG action 机制管理，loop 只记录 refs。

## Closeout

- `loop closeout` 从 loop state、objective/context、rounds 和 signals 派生 `loop/closeout.md` draft；draft 会标出 workflow path（`dag` / `explicit-fallback` / `missing-dag-evidence` / `micro-or-small`）与 fallback reason。
- 非 complete 状态必须标 partial/paused/blocked，不能修改 completed facts；medium/large loop 若缺少 DAG round 且没有 `dagFallbackReason`，必须把缺失 DAG 证据列为 remaining risk。
- 完成声明仍必须由 shell verification、review verdict 和 success criteria coverage 证明。
