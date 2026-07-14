# One-shot Run Evidence（`.harness/runs/`）

当你使用 `cursor-prompt`、Pi `cursor` tool、`promote-run`，或在治理检查中看到 `.harness/runs/active` warning 时，读本文。

## 目录职责

`.harness/runs/` 保存一次性工具调用的运行证据。它不是 task 状态源，也不是 Agent DAG run 目录。

```text
.harness/runs/active/<run-id>/      # 正在执行或异常残留的 one-shot tool run
.harness/runs/completed/<run-id>/   # 成功完成的 one-shot run evidence
.harness/runs/failed/<run-id>/      # 失败的 one-shot run evidence
```

每个 run directory 通常包含：

```text
run.md
meta.json
artifacts/
```

`run.md` 是人类可读摘要；`meta.json` 是机器可读 run metadata；`artifacts/` 是该次 one-shot 的交付物目录。

## 什么时候创建

会创建 `.harness/runs/` 的常见入口：

- `loop-agent cursor-prompt ...`
- Pi `cursor` tool / loop-agent cursor tool 的 one-shot Cursor 调用
- 内部 two-phase one-shot logging：先 `createActiveCursorRun()`，再 `finalizeCursorRunLog()`

创建条件：

- 调用的 `cwd` 必须是含 `.harness/` 的 harness repo。
- `cursor-prompt` 会先创建 `.harness/runs/active/<run-id>/`，再把结果归档。
- 成功时整个目录移动到 `.harness/runs/completed/<run-id>/`。
- 失败、timeout 或 cancel 时整个目录移动到 `.harness/runs/failed/<run-id>/`。

当前 `pi-prompt` 不创建 `.harness/runs/`。它是 one-shot helper，但不维护 run evidence、task state、verification 或 handoff artifact。

## 与 task / DAG 的关系

| 目录 | 含义 | 是否代表 task 完成 |
|---|---|---|
| `.harness/tasks/<task-id>/` | task 运行态状态源 | 是 task 状态源 |
| `.harness/runs/<state>/<run-id>/` | one-shot tool run evidence | 否，只是一次执行证据 |
| `.harness/dag-runs/<state>/<run-id>/` | Agent DAG run facts | 否，只是 DAG run facts |

completed one-shot evidence 若要进入 task artifacts，使用：

```bash
loop-agent promote-run <task-id> --run-id <run-id>
loop-agent closeout task <task-id>
```

`promote-run` 只读 `.harness/runs/completed/**`，生成或更新 task `artifacts/修改记录.md` / `artifacts/验证结果.md`，不修改 completed run facts。

## Active 目录清理

`.harness/runs/active/` 只应存在 live one-shot run。治理检查发现 active 内容时会 warning：

```text
[HARNESS RUNTIME WARNING] .harness/runs/active contains runtime entries
```

处理规则：

- 如果确有 one-shot 正在执行，可以保留；必要时用 `HARNESS_ALLOW_ACTIVE_TOOL_RUNS=1` 跑治理检查。
- 如果是已完成、失败或中断残留，应移动到 `completed/` / `failed/`，或在确认无价值后删除。
- 如果是 `.DS_Store` 等系统垃圾文件，直接删除；它不是合法 run evidence。
- 不要把 active 残留当作 task 完成证据。

严格检查可用：

```bash
HARNESS_STRICT_ACTIVE_TOOL_RUNS=1 bash scripts/check-harness-runtime-clean.sh
```

## 不要做什么

- 不要提交 `.harness/runs/**` 运行态内容。
- 不要手动改写 `.harness/runs/completed/**` 或 `.harness/runs/failed/**` 事实。
- 不要把 `.harness/runs/active/**` 当作长期记录。
- 不要把 one-shot evidence 直接等同于 task artifacts；需要汇总时用 `promote-run`。
