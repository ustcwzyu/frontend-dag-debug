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
1. new-task <id>-r1  → 准备 source → dag run-task → dag validate → run-dag → promote/closeout
2. new-task <id>-r2  → 重复
3. ...
```

### Bounded task 路径
```
1. new-task <id>
2. 写 source/需求.md + source/执行约束.md
3. dag run-task <id> --profile auto --strict-models --output <temp-dir>/<id>-dag.json
4. dag validate --dag <temp-dir>/<id>-dag.json --strict-models --strict-governance
5. run-dag --dag <temp-dir>/<id>-dag.json --cwd <repo-root>
6. promote-run / closeout / final verification
```

`<temp-dir>` 表示平台原生临时目录；实际命令中使用 macOS/Windows 本机路径。

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
