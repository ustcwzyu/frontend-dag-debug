# Agent Worker Operator Reference

`agent-worker` 是 Feature Packet、TaskSpec、Task Pool 与 self-hosting release-train 操作的 outer-loop adapter。它不是 DAG executor。

## Compatibility / Operator Assist

主会话使用本 reference 时是 **operator**，不是 implementer：

| 允许 | 禁止 |
| --- | --- |
| `agent-worker` / `loop-agent` CLI | 宿主 Edit/Write 直接改业务实现 |
| 只读 doctor / observe / report / status | Worker 或 DAG 失败后「救火改文件」 |
| 冻结 controller identity、选 Ready、retry/reconcile | 跳过 published controller 手写实现收尾 |
| human gate 记录 | 用聊天完成声明代替 shell / harness 证据 |

实现写入只通过 Worker spawn 的已发布 `loop-agent` DAG。skills 不能替代 writeSet 或 controller identity。

## Routing Boundary

当工作单元是 Feature lifecycle、一组 TaskSpecs、Ready queue、Worker batch 或 candidate takeover 时，选 `agent-worker`。当工作单元是单次受治理 DAG run、node implementation、DAG diagnosis 或 DAG runtime repair 时，选 `loop-agent` CLI。

Leaf DAG nodes 不得递归启动 `agent-worker`。Worker 负责 DAG 之外的 selection 与 lifecycle state；loop-agent 负责 DAG 内的 execution facts。主会话不得绕过二者直接实现。

## Responsibilities

- 在选工前校验 Feature Packet 与 TaskSpec 关系。
- 从 Task Pool facts 选择 Ready 工作，定义 batch scope，并选择 recovery actions。
- 在可写执行前解析并冻结 controller launch identity。
- 用 pinned controller identity 启动 loop-agent 命令。
- 收集 canonical run records、reports、closeout drafts 与 failure handoff evidence。

## Feature and Task Pool Flow

0. **新建 Packet（确定性脚手架，无模型）** — 包内自洽说明见下节 *Feature Packet Scaffold*；不依赖 website 文档站。

1. 阅读 Feature Packet，校验其 TaskSpecs 与 dependency graph。
2. 从持久化的 Task Pool state 推导下一步动作；不要从 chat history 重建 lifecycle state。canonical state 键是 `{ featureId, taskId }`（路径 `.harness/task-pool/states/<featureId>/<taskId>.json`）。
3. 对可写 batch 只冻结一次 controller，并将其 identity 传播到下游 evidence。
4. 将每个选中的 TaskSpec **经 CLI** 委托给 loop-agent，使用其结构化的 allowed / forbidden paths；主会话不代替 writer。
5. 根据 canonical run facts 刷新 Feature review、reports 与 Task Pool state。
6. 重试 Failed task（CLI only；禁止主会话手改实现）：

   ```text
   agent-worker task retry <task-id> --feature-id <feature-id> --repo <repo> --reason <reason>
   ```

   跨 Feature 同名 Task 时省略 `--feature-id` 必须 fail-closed。
7. 诊断 / 迁移 legacy 扁平 state：

   ```text
   agent-worker pool doctor --repo <repo> --json
   agent-worker pool migrate-state --repo <repo>                 # dry-run
   agent-worker pool migrate-state --repo <repo> --apply --owner <owner> --reason <reason>
   ```

   doctor 只读；migrate 默认零写入，apply 失败全回滚且不改 JSONL。
8. Inspect（原 Observe）只读：推荐 `agent-worker console serve` 的 `/inspect/#/...`；兼容 `observe serve|snapshot`。canonical Task 路由为 `/api/features/:featureId/tasks/:taskId` 与 `#/feature/:featureId/task/:taskId`。8790 `/api/health` 为 `OperatorSurfaceHealthV1`；8787 仍为 `ObserveHealthV1`。
9. Official Console：`agent-worker console serve|doctor`（默认 loopback；可 `--host 0.0.0.0` / `--debug`）。Recovery CTA 为 report/doctor/decision/resume/reconcile/regenerate/打开检视；无 Cancel、无主 CTA「直接改代码」。主会话 Compatibility Assist 不得替代 Console/CLI 执法。

## Feature Packet Scaffold

确定性入口：一个纯 BE/FE 需求 → 一个 `features/F-YYYY-NNN/` Packet → Task Pool 串行掘进。主会话只跑 CLI，不手写 TaskGraph。

### 边界（v1）

| 做 | 不做 |
| --- | --- |
| 模板 + 槽位确定性生成 | 一键 LLM 生成完整合同 |
| `profile: generic` 短图 | 默认 `fullstack-v1` / 复制 `F-2026-005` 全图 |
| 显式 `--verify-command` | 猜测项目测试命令 |
| 一需求一 Feature 目录 | 跨 Feature 自动 depends / 并行 Pool |
| 写盘前同源 `task validate-feature` | 读/写 `.harness/**` 或构造 `LoopAgentClient` |

### 三模板

| 模板 | 最小图 |
| --- | --- |
| `backend-only` | `BE-IMPL-001`（需 ≥1 `--be-path`） |
| `frontend-only` | `FE-IMPL-001`（需 ≥1 `--fe-path`） |
| `fe-with-api` | `CONTRACT-001` → `BE-IMPL-001` + `FE-IMPL-001`（consumers 仅实现节点；两端 path 都要） |

v1 **不**生成 `BE-TEST` / `FE-TEST` / `FINAL-VERIFY`。`feature_id` 强制 `F-YYYY-NNN`（≥3 位序号）。输出固定 `<repo>/features/<feature-id>`；无 `--force` / `--out`；已存在目录（含空目录）一律拒绝。

### 日常命令

```text
# 可选 dry-run：完整 parse/render/validate，零写入
agent-worker feature scaffold --repo <repo> --template backend-only \
  --feature-id F-2026-010 --title "..." \
  --be-path services/example/** \
  --verify-command "npm run typecheck" --verify-command "npm test" \
  --dry-run --json

agent-worker feature scaffold --repo <repo> --template frontend-only \
  --feature-id F-2026-011 --title "..." \
  --fe-path apps/web/src/settings/** \
  --verify-command "npm test" --json

agent-worker feature scaffold --repo <repo> --template fe-with-api \
  --feature-id F-2026-012 --title "..." \
  --be-path services/api/** --fe-path apps/web/src/api/** \
  [--contract-path docs/contracts/F-2026-012/api.md] \
  --verify-command "npm test" --json

# 机器门禁 → 只读决策 → 串行掘进（固定 published controller）
agent-worker task validate-feature features/F-2026-010
agent-worker feature review --feature-dir features/F-2026-010 --repo <repo> --json
agent-worker feature run --feature-dir features/F-2026-010 --repo <repo> \
  --loop-agent-bin <published> \
  --expected-controller-version <version> \
  --expected-controller-fingerprint sha256:<hex> \
  --git-mode checkpoint --limit 1 --json

# Failed 只走官方恢复
agent-worker task retry <taskId> --feature-id F-2026-010 --repo <repo> --reason "..."
```

### Batch

```text
agent-worker feature scaffold --repo <repo> --batch <yaml-or-json> [--dry-run] [--json]
```

- 与单条 flags 互斥；每条必须显式 `feature_id` / `title` / `template` / `verify_commands`。
- 任一非法、冲突、目标已存在或写盘失败 → **整批零写入**（已提交目录回滚）。
- 示例形状（包内模板若存在）：`docs/templates/product-line/feature-scaffold-batch.example.yaml`。
- 三模板生成快照（只读、防漂移，非 live Feature）：`docs/templates/product-line/scaffold-samples/{backend-only,frontend-only,fe-with-api}/`。

### 多需求策略

1. 一个需求条目 → 一个 Feature 目录。
2. 多个 FE/BE 需求：batch scaffold 后 **串行** `feature run --limit 1`（先完 F-010 再 F-011）。
3. 后端可独立交付时：先 `backend-only`，再 `frontend-only`（跨 Feature 依赖只写文档，不做自动 depends_on）。
4. 同 Feature 内 BE+FE 原子交付用 `fe-with-api`。

### 内容与完成定义

- scaffold 只给骨架；`requirement.md` / AC 文案由人或后续「只填槽、不改 graph」skill 填充。
- v1 完成 = Packet 可 scaffold 且 Pool 可掘进到图内 Task **Done**；`verify-final` / Delivery / Closeout 为 v1.5（ADR 0007），非 scaffold 必经。
- 已知恢复限制：mid-run `SIGKILL` 可能导致 Pool `Running` 且 `runs.jsonl` 缺失时 reconcile 失败（FC-B）；勿对 worker 随意 SIGKILL；Failed 后用 `task retry`。

## Versioned Self-Hosting

- Published version N 是整个 maintenance batch 的 controller；不要在任务中途切换。
- Candidate N+1 在 takeover verification 前先构建并安装到 isolated slot。
- Candidate 命令使用绝对 package entry identities，绝不使用新解析的 global PATH 命令。
- Controller identity 与 DAG skill snapshot 应对不同漂移风险：前者钉住 runtime/package content，后者钉住单次 run 的 resolved instructions。
- 失败的 canary 或 Worker run 仍是不可变 evidence。将 retries 与后续工作链接到它，而不是覆盖失败记录。

## Non Responsibilities

- 不要在此实现 node scheduling、write-set enforcement 或 model prompts。
- 不要在本 skill 中维护一份独立的精确 CLI flags 列表；以 CLI help 与 `../../loop-agent/references/command-reference.md` 为准。
- 不要把本 skill 路由为 DAG nodes 的默认 role skill。
- 不要把主会话定位成 Worker/DAG 失败后的实现后备通道。

## Candidate Canary Boundary

Deterministic candidate canary 将 candidate package 安装到 isolated temporary slot，通过该 slot 内的绝对 Node script paths 调用 package bins，避免 model calls，并输出 machine-readable evidence，覆盖 package-root containment、entry hashes、checks 与 verdict。
