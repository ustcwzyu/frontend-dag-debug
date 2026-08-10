# Frontend-implementation Eval 指标合同（M0）

状态：M0 冻结定义；M3 前部分指标仅定义不采集。  
边界：**不包含 Browser / 视觉 / 真实页面启动**；Browser 相关一律记 `not-run` 或从分母排除（见下）。

## 通用规则

### 样本量

- **功能通过率类**：以选定 functional fixture 集为分母单元（每个 fixture × 每个 smoke target 记一次 trial，或按计划固定 trial 表）。
- **失败行为类**：以 failure fixture 集为单元；期望「正确阻断 / 正确分类」为成功，误放行为失败。
- **基线批次**：记录 `sampleSetId`、fixture 列表 hash、controller 版本、commit SHA。无记录则整批指标 `unavailable`。

### 缺失数据

| 符号 | 含义 |
|------|------|
| `N/A` | 能力尚未实现，指标定义保留但**禁止填 0** 伪装基线（例：M3 前 repair 后通过率） |
| `unavailable` | 实现已存在但本批 run 未记录分子或分母所需字段（例：无 token 账本） |
| `not-run` | 明确未执行的检查（例：Browser）；不得计入「通过」 |
| `0` | 仅当分子与分母均有完整证据且分子确实为零 |

报告必须同时写出 **分子、分母、比率、样本量 n、缺失原因**。禁止只写百分比。

### 耗时 / token 来源

| 字段 | 来源（优先序） |
|------|----------------|
| 墙钟耗时 | DAG run 起止时间戳（run.json / harness run record）；否则 shell `date` 外包测量 |
| 节点耗时 | 各 node start/end；缺失则节点级 `unavailable`，仅汇总 run 级 |
| token | executor / model usage 汇总（若 run 记录 `tokensUsed`）；否则 `unavailable`，**不得估计** |

### Browser 边界

- 任何指标不得因「未跑浏览器」而扣分或加分。  
- 不得将 Mock-backed 或 component test 记为 Browser pass。  
- 指标表中 Browser 行固定 `not-run`（本计划范围内）。

---

## 最低指标集

### 1. 首次静态通过率

- **名称**：`first_static_pass_rate`
- **分子**：第一次执行 `frontend-static-verify-shell` 即 exit 0 的 trial 数  
- **分母**：完成到 static verify 的 trial 数（writer 已跑且 static 已调度）  
- **排除**：DAG 在 writer 前被 Mock/design gate 阻断的 trial（记入 gate 阻断类，不进分母）  
- **M0**：定义 + 手工/脚本采集方式；基线可 `unavailable` 直至有 fixture dogfood

### 2. 首次行为通过率

- **名称**：`first_behavior_pass_rate`
- **分子**：第一次执行 `frontend-behavior-verify-shell` 即 exit 0 的 trial 数  
- **分母**：完成到 behavior verify 的 trial 数  
- **说明**：行为通过不等于真实 API 联调；Mock-backed 仍可计入 behavior pass，但须另计「误报」指标

### 3. repair 后最终通过率

- **名称**：`post_repair_final_pass_rate`
- **分子**：在 ≤ max repair attempts 后 static+behavior+review gate 均通过的 trial 数  
- **分母**：进入 repair 资格判定的 trial 数（repairable 失败）  
- **M0–M2**：固定记 **`N/A`**（无 frontend repair runtime）  
- **M3+**：按 failure taxonomy 采集

### 4. 需求追踪完整率

- **名称**：`requirement_trace_completeness_rate`
- **M0 分子**：`frontend-requirement-coverage-shell` 通过（或无显式 ID 时记 `not-applicable-trial`）且 closeout/plan 仍含全部绑定 ID 的 trial 数  
- **M0 分母**：含显式 REQ/BR/AC 的 trial 数  
- **语义**：M0 为 **identifier-presence**，不是文件/UI state 完整映射  
- **M1+**：改为 validated contract 中每条 ID → target/state/test 映射完整率（届时更新本文件版本）

### 5. 越界写入次数

- **名称**：`forbidden_write_count`
- **分子**：write-guard / exclusive writeSet 拒绝次数 + review 确认的越界路径写入次数（按 trial 计数事件，可 >1）  
- **分母**：含 writer 的 trial 数（用于率：`forbidden_write_rate = 分子/分母`）  
- **期望基线**：治理应使成功 closeout 的 trial 分子为 0

### 6. 错误依赖次数

- **名称**：`unapproved_dependency_count`
- **分子**：未批准新增 dependency（package.json 变更未授权、review 标记 Important 等）事件数  
- **分母**：含 writer 的 trial 数  
- **采集**：diff 检查 + review findings 标签（需约定 finding code，M0 用人工标注）

### 7. Mock / 真实联调误报次数

- **名称**：`mock_real_integration_false_claim_count`
- **分子**：closeout 或报告将 Mock-backed 证据描述为真实 API 已联通，或省略 `Real integration: pending` 的 trial 数  
- **分母**：`MOCK_STRATEGY` 为 native | browser-intercept | request-adapter 且无真实后端证据的 trial 数  
- **期望**：0

### 8. 节点数 / 模型节点数

- **名称**：`node_count`, `model_node_count`
- **定义**：  
  - `node_count` = `spec.tasks.length`  
  - `model_node_count` = `executor === "pi"`（或非 shell/static）的节点数  
- **报告**：按 topology 变体分别记录（standard / +coverage / +mock-verify / blocked）  
- **M0 基线参考（standard 无 optional）**：`node_count=16`；模型节点含 contract/scout/mock-assess/plan/design/plan-revision/final-design-review/implement/review/closeout（以 builder 为准，测试锁定 id 列表）

### 9. 墙钟耗时

- **名称**：`wall_clock_ms`
- **分子/分母**：不适用；报告 **p50 / p95 / max** 与 **n**  
- **来源**：见通用规则；缺失 → `unavailable`

### 10. Token

- **名称**：`tokens_total`
- **报告**：sum 与 per-role breakdown（若可得）；缺失 → `unavailable`  
- **禁止**：用字符数或经验公式估算后当作实测

---

## 建议采集表头（CSV / Markdown）

```text
sampleSetId, trialId, fixtureId, targetId, controllerVersion, commitSha,
topologyVariant, mockStrategy,
first_static_pass (0|1|unavailable),
first_behavior_pass (0|1|unavailable),
post_repair_final_pass (0|1|N/A|unavailable),
requirement_trace_ok (0|1|not-applicable|unavailable),
forbidden_write_count,
unapproved_dependency_count,
mock_real_false_claim (0|1|n/a),
node_count, model_node_count,
wall_clock_ms, tokens_total,
browser_status (not-run)
```

## 与 M1+ 的关系

- 指标名称稳定；分子定义可在 M1（contract）、M3（repair）版本化增补，须在 CHANGELOG/本文件注明 **metrics schema version**。  
- 当前 **metrics schema version: m0.1**。
