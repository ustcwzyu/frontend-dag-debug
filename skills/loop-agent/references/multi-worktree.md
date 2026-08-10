# Multi-Worktree 并行模式

同时驱动两个及以上独立 loop-agent task、委派到 isolated worktree、或 harvest 已完成工作时使用本文。

## Multi-Worktree 并行模式

需要**同时推进两个及以上独立 loop-agent task** 时，用 multi-worktree mode 隔离编辑与测试。

> **Historical（已移除）**：`subagent list|start|attach|stop|wait|wakeup`、`dashboard` 与 `delegate --supervised` 已随 tmux 白盒 lifecycle 移除。并行观察请用各 task 的 `status`、worktree 内 `logs/`，或 Agent DAG `dag status` / `dag report`。

### 何时启用

- 有 ≥ 2 个可独立推进的 task id，且希望在不同 worktree 中并发运行
- 或希望主 repo 保持干净供审阅，而 leaf executor 在 worktree 内跑 `implement`/`verify`
- 单一顺序 task 可跳过 — 直接 Agent DAG 或 main-session surgical patch 足够

### 核心命令

```bash
loop-agent delegate <task-id> [--executor pi|cursor] [--base <branch>] [--branch <name>] [--no-symlink] [--auto-run] [--no-auto-run]
loop-agent harvest <task-id> [--squash] [--no-archive] [--keep-worktree]
loop-agent worktree list
```

`delegate` 是一步原子操作：校验 `task.json` + `source/需求.md` + `source/执行约束.md` → 在 branch `task/<task-id>` 上创建 `git worktree .worktrees/<task-id>` → 同步 `source/` 与 `task.json` 到 worktree → 相对 symlink `./node_modules` → cursor 默认 in-process SDK direct；Pi `--auto-run` 已移除并会提示 DAG 路径。

`harvest` 是对称 closeout：仅当 `task.status === "completed"` 才运行，然后 merge（默认 `--no-ff`，或 `--squash`），将 `artifacts/`、`logs/`、`.workflow_state.json` 归档回主 repo，移除 worktree + branch。

### 主窗口职责（勿与 executor 重叠）

1. delegate 前与用户 refine `需求.md` / `执行约束.md`
2. `delegate` 返回后**不要**碰 `plan` 或 `implement` — 让 worktree 内 executor 跑
3. 用 `status <task-id>` 与 worktree 内 `logs/workflow.log`、`logs/executor.jsonl` 观察进度
4. task 报告 verify-passed 后，用 `git -C .worktrees/<task-id> log -p main..` 审 diff，再跑 `harvest`
5. task 失败则**不要** harvest — 进入 worktree 排障并重跑 verify

### 生命周期概览

```
delegate → executor 跑 spec/implement/verify → completed → harvest → archive + cleanup
                                          ↘ failed   → worktree 内排障（不 harvest）
```

### 失败处理

- `delegate` fail-fast：任何 source/conflict 错误在创建 worktree 前 abort
- `harvest` 拒绝 failed/active task；merge conflict 时打印 conflict 文件（手动解决后重跑）
- `worktree list` 只读；从任意窗口运行都不影响 in-flight delegate

### 与 Agent DAG 的关系

Agent DAG 是默认 autonomous path；`delegate`/`harvest` 是 cursor-direct 的 worktree escape hatch。多 task 并行时，每个 task 独立 `delegate`，完成后分别 `harvest`。

详见 `docs/cursor-executor-usage.md` 与 `docs/loop-agent-harness.md`。
