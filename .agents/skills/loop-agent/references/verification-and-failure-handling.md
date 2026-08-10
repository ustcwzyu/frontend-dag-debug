# Verification 与失败处理

选择 verify strategy knobs、解读 verify 结果、决定失败后是否继续，或 closeout workflow/runtime/ai_workspace/loop-agent/skill 变更时使用本文。

## Verify strategy 与 completion audit

## Production Readiness v0.1

低/中风险单 repo DAG 任务如果声明 production-ready v0.1，必须按 `ai_workspace/loop-agent/production-readiness.md` 和 `ai_workspace/loop-agent/templates/production-readiness-checklist.md` 收口。

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

product-line taxonomy 的事实源是 `ai_workspace/loop-agent/design/state-and-failure-taxonomy.md`。

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

### supervised repair gate 与 runtime contract 失败

- `repair artifact gate failed: ... no unique governed Pi writer` / `declares repairNodeId "..." but no task with that id exists`：DagSpec 的 `shell.repairArtifactGate` 未声明 `repairNodeId`，或声明的修复节点缺失、不是 gate 直接下游、不是受治理 Pi writer（`executor: pi`、`toolProfile: write`、`writePolicy: exclusive`、`allowedPaths`/`writeSet` 非空且不与 `forbiddenPaths` 冲突）。用当前 controller 重新生成 supervised DAG，或按上述契约补齐修复节点，不要靠改节点名绕过。
- `repair artifact field "rootCause" must be a non-empty string`：`request-revision` 的 `REPAIR_ARTIFACT_JSON.rootCause` 为空时 parser 不再容错，诊断必须明确根因。只有 `verdict: "pass"` 且 `rootCause` 为空白时才会被确定性规范化为 `No repair required.`，其余字段（fixScope、verdict mismatch、writer 边界）保持 fail-closed。
- `missing DECISION_ENVELOPE_JSON fenced block` / `decision-envelope-invalid`：`DECISION_ENVELOPE_JSON` info string 的 Markdown 围栏必须存在且唯一。Parser 接受三反引号及更长围栏，但 opening/closing fence 必须同长度，closing 同行只能有空白；不匹配围栏、裸 JSON、多个围栏、malformed JSON、schema-invalid 与 semantic-invalid 仍 fail-closed。若错误 payload 含 `taskId`、`gate`、`verdict`、`summary` 或 `decision: proceed-to-closeout`，说明 decision prompt/schema 漂移；用包含 canonical schema 示例的当前 controller 重新生成 DAG，不要放宽 parser 接受 legacy 结构。
- `incompatible DAG runtime contract` / `runtime contract requires ...`：DagSpec 的 `runtimeContract` 要求的能力超出当前 controller。升级 controller 或用当前 controller 重新生成 DAG；该 preflight 在任何节点执行前失败，不会留下半执行的 run。
- `controller identity drifted` / `artifact was tampered with`：resume 时的 controller 与 run 创建时冻结的 identity 不一致（package 内容、binary 或 fingerprint 变化），或 `controller-identity.json` 被篡改。启动新 run，而不是在漂移后 resume；completed run facts 保持只读。

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

显式 `cursor-prompt` sidecar（非默认路径）完成后，主会话必须**独立跑验证命令**，不得用手改代码「补成绿色」：

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

Cursor / 主会话自述完成不算 verification fact；以上命令的 exit code 与输出才是完成声明的证据。

### 失败处理（Compatibility / Operator Assist）

主会话定位为 operator，**不是**失败后的实现后备通道。

| 失败类型 | 主会话允许 | 主会话禁止 |
|---|---|---|
| 业务/测试失败 | 在同一 bounds 内 **重跑** DAG writer / repair 节点；`dag doctor` / `dag report` | 直接 Edit 业务实现「先修好再说」 |
| Workflow / runtime 失败 | `dag doctor`、`dag reconcile-run`、记 human gate、升级/重装已发布 controller 后 **新 run**；必要时修 **task source / DAG JSON** 再 validate | 主会话手动完成 scoped implementation 以绕过 CLI |
| Write guard / path 冲突 | 收紧 `allowedPaths`/`writeSet` 后 regenerate/revalidate | 扩大权限后由主会话直接写 |
| 需求/架构不清 | Decision Gate / human approval | 边猜边改业务代码 |
| 意外残留（tmp/scratch） | handoff 前删除 scratch；记录在 report | 把清理当成「顺便重构实现」 |

**默认恢复序列**：diagnose（doctor/report）→ classify → reconcile 或 replan → CLI 重跑 → shell verify。
**永远不要**：`loop-agent` / `agent-worker` 失败 ⇒ 主会话直接改仓库实现。

### Closeout 规则
workflow/runtime/ai_workspace/loop-agent/skill 变更结束时：
```bash
loop-agent docs audit
loop-agent handoff check <task-id>
```

active exec plan 实质完成时，用 `docs archive` 归档并更新 active/completed 索引，勿留 stale active status。

failed DAG run 不应生成成功式 closeout。它应该生成 failure handoff，至少包含 what failed、evidence、classification、recommended follow-up、safe retry conditions 和 human decision needed。
