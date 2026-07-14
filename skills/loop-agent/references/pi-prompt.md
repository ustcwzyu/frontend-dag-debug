# One-shot Pi SDK Prompt Helper（`pi-prompt`）

短时 Pi SDK task、不需要完整 `.harness/tasks/<id>` workflow 时使用本文。替代 ad-hoc 临时代码脚本导入 `executeSingleSdkAttempt` 的做法。

### One-shot Pi SDK prompt helper

短时 Pi SDK task、不需要完整 `.harness/tasks/<id>` workflow 时，用 `loop-agent pi-prompt`，勿创建 ad-hoc 临时代码脚本导入 `executeSingleSdkAttempt`。`pi-prompt` 是一次性 full-capability helper；是否只读由本次调用的 prompt 与 `--tools` 决定。

```bash
loop-agent pi-prompt "Reply with exactly OK."
loop-agent pi-prompt --stdin < <temp-dir>/task.md
loop-agent pi-prompt --file <temp-dir>/task.md
loop-agent pi-prompt --cwd ~/go/src/loop-agent --tools read,grep,find,ls "Review the current diff. Do not edit files."
loop-agent pi-prompt --cwd ~/go/src/loop-agent --tools subagent,read --timeout 2400000 "Use subagent exactly once ..."
loop-agent pi-prompt --model gpt-5.5 --cwd ~/go/src/loop-agent "Deeply diagnose this failure."
loop-agent pi-prompt "Reply with exactly OK."
```

`<temp-dir>` 表示平台原生临时目录；实际命令中使用本机路径。

默认：`--provider wizard-local --model glm-5.2`；高复杂度 one-shot 可显式 `--model gpt-5.5`。按需用 `--provider`、`--model`、`--thinking`、`--tools`、`--timeout` 覆盖。

`pi-prompt` 仅用于 quick one-shot SDK call。**不**创建 `.harness/tasks/`、不跑 verification、不写 handoff artifact、不保留 workflow state。须可恢复、可验证的 implementation work 用 DAG 路径；需要隔离写入时使用 bounded Cursor 或 `delegate`。
