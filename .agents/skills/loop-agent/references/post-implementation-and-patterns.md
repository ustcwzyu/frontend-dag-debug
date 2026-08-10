# 实现后处理与常见模式

用于 post-verify handoff、多 item PRD 处理、fast bounded task、快速 status 检查与 Pi timeout 处理。

## 实现后处理

DAG run、promotion、closeout 和最终验证完成后：

1. 检查 git diff 确认预期变更
2. 用 git commit 并 push
3. 用户说「继续」时，跑 `status` 看 task 是否 `completed`，再创建下一个 task

## 常见模式

### 处理多 item PRD

```
0. plan create <feature-plan> "…"（整份 PRD 一个 plan，多 task 共用）
1. new-task <id>-r1 → import-prd（同一 PRD 或切片说明）→ 派生 需求.md → dag … → promote/closeout
2. new-task <id>-r2 → 重复
3. plan complete <feature-plan> --summary "…"
```

详见 `source-and-plan-practice.md` 案例 A/C。

### Bounded task 路径

```
1. new-task <id>
2. 有 PRD 文件：import-prd → task source prepare --use-imported-prd --apply（默认不手写两 source）
3. 非微小：plan create（或挂到已有 active plan）
4. dag run-task <id> --profile auto --strict-models
5. dag validate --dag .harness/tasks/<id>/dag.json --strict-models --strict-governance
6. run-dag --dag .harness/tasks/<id>/dag.json --cwd <repo-root>
7. promote-run / closeout / final verification
8. 有 plan：plan complete
```

默认 DAG 草稿：`.harness/tasks/<id>/dag.json`。何时可跳过 import/plan：见 `source-and-plan-practice.md`。

**关键**：实现 work 由 DAG node 和 executor 执行；main session 负责审 DAG、审 writeSet、跑验证和 handoff。

### 跨所有 task 快速 status

```bash
loop-agent stats
```

### 处理 pi timeout

- 默认每 step timeout 现为 30 分钟 — 通常足够
- pi step 仍 timeout 时，用 `stats` 看 duration 分布
- Bash tool call 应用宽松 timeout：analyze/plan 300s，implement 480s+，verify/retrospective 240s+
- 失败时优先读 `dag report` / `dag doctor`，再决定 repair DAG、bounded Cursor fix 或暂停
