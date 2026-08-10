# Verification 与失败处理

选择 verify strategy knobs、解读 verify 结果、决定失败后是否继续，或 closeout workflow/runtime/docs/skill 变更时使用本文。

## Verify strategy 与 completion audit

## Production Readiness v0.1

低/中风险单 repo DAG 任务如果声明 production-ready v0.1，必须按 `docs/production-readiness.md` 和 `docs/templates/production-readiness-checklist.md` 收口。

支持范围：

- single repo
- bounded task
- explicit task source
- explicit `allowedPaths` / `forbiddenPaths` / write scope
- shell verification
- report / doctor / closeout handoff

非目标：

- automatic merge
- automatic release
- production secrets
- production database
- high-risk migration
- online Worker Pool
- writable Dynamic Workflow sharded migration

失败分类是路由字段，不是主状态；不要覆盖 `.harness/dag-runs/completed/**` 的原始事实。报告和 handoff 应保留：

```text
raw_failure_category
dag_normalized_failure_category
product_line_failure_category
recommended_follow_up
```

product-line taxonomy 的事实源是 `docs/design/state-and-failure-taxonomy.md`。

### Verify 始终在本地跑
`verify` step 跑确定性命令（check-repo.sh + tests + typecheck）。**不**调用 pi。因此快且可靠。

### Verify strategy knobs
需要更紧的 verify 控制时，用 task-level config：
```json
{
  "verifyPreset": "auto",
  "verifyMode": "serial",
  "verifyRetryCount": 0,
  "verifyFailFast": false
}
```

- `verifyPreset`：`auto | quick | standard | full`
  - `auto`：`small -> quick`，`medium -> standard`，`large -> full`
- 默认 `serial`，优先避免本机测试、构建和治理检查互相争抢资源
- 确认命令互不影响且机器资源充足时，才显式使用 `parallel`
- `verifyFailFast` 仅在 `serial` mode 有意义
- retry 保持小；用于 flaky 环境问题，不要掩盖真实失败

### 长输出处理

- DAG shell 命令和 Worker 子进程只在内存中保留最近一段 stdout/stderr，并在结果中标明是否截断及原始字节数。
- 需要完整日志时读取运行 artifact 中的 `stdout.txt`、`stderr.txt` 或 DAG 节点的 `commands/*.stdout.txt`、`commands/*.stderr.txt`；不要依赖页面摘要还原全部输出。

### Verify 后的 goal completion audit
- 有 active task goal 且 `verify` 通过时，loop-agent 跑 goal completion audit。
- 若 `source/需求.md` 仍有未勾 checklist（`- [ ]`），task **不会**以 completed 结束。
- 若确定性 requirement coverage audit 发现未覆盖需求，task **不会**以 completed 结束。
- `explicitly_out_of_scope` 需求（如 `## 非目标` 下）**不算** coverage gap。
- 独立 audit 报告用 `handoff coverage <task-id> [--json|--markdown]`。
- task status、source/artifacts、DAG outcome、verification 记录可能 drift 时用 `dag reconcile-tasks --glob '<pattern>' [--json|--markdown]`。默认仅报告；`--patch` 不能伪造 verification evidence。

### Verify 默认保存进度
`verify` 成功后，loop-agent 默认：

1. 在当前 task scope 内选文件
2. 跑 `git add`
3. 创建 commit 保存已验证进度

默认行为：

- `autoCommitAfterVerify: true`
- commit message：`chore(task): save verified progress for <taskId>`

`task.json` 可选覆盖：

```json
{
  "autoCommitAfterVerify": false,
  "autoCommitMessage": "docs(workflow): save verified progress"
}
```

最佳实践：保持 `allowedPaths` 准确。auto-commit 用 task path 约束，避免把无关 dirty 文件扫进 progress commit。

### Cursor bounded write 后的独立复核

Cursor bounded execution 完成后，主会话必须独立执行：

```bash
git status --short
git diff --stat
bash scripts/check-repo.sh
npm run lint
npm test
npm run typecheck
loop-agent inspect
loop-agent docs audit
loop-agent handoff check <task-id>
```

Cursor 自己报告的完成不算 verification fact；以上命令的 exit code 与输出才是完成声明的证据。

### 失败处理

child agent 失败时：

- **业务/测试失败**：让 child agent 在同一 task bounds 内修复
- **Workflow runtime 失败**（如 `loop-agent` runtime 问题、部分 artifact 生成、输出聚合 crash）：保持 task contract，但允许 main agent 或 child agent 在同一 scoped implementation 内手动完成，仍跑 `verify`
- **意外残留**（tmp 文件、探索性 mock、scratch 输出）：handoff 前删除

### Closeout 规则
workflow/runtime/docs/skill 变更结束时：
```bash
loop-agent docs audit
loop-agent handoff check <task-id>
```

active exec plan 实质完成时，用 `docs archive` 归档并更新 active/completed 索引，勿留 stale active status。

failed DAG run 不应生成成功式 closeout。它应该生成 failure handoff，至少包含 what failed、evidence、classification、recommended follow-up、safe retry conditions 和 human decision needed。
