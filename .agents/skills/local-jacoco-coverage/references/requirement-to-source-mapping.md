# Requirement → Source Mapping — 把需求文档对齐到覆盖率 scope

Step 3 切片分析的核心难点不是调 CLI，而是**把需求文档正确映射成 `(requirementIds, sourceScope)`**。映射错了，覆盖率数字再准也没意义。本文件给出可审计的映射纪律。

## 1. 需求 ID 归一化（BLOCKING）

runtime 归一化器只接受 `^(?:REQ|BR|AC)-[A-Z0-9]+(?:-[A-Z0-9]+)*$`（见 `runtime-alignment.md` §4）。需求文档里的原始编号通常不直接合规，必须先归一化：

| 需求文档里的写法 | 归一化结果 | 说明 |
| --- | --- | --- |
| `3.2 创建订单`（章节标题） | `BR-CREATE-ORDER` | 章节级业务规则 |
| `US-创建订单-001`（用户故事） | `AC-CREATE-ORDER-001` | 故事级验收标准 |
| `REQ-001`（已合规） | `REQ-001` | 原样 |
| `BR_PAYMENT_001` | `BR-PAYMENT-001` | 下划线 → 连字符 |

规则：

- 前缀三选一：`REQ`（顶层需求）/ `BR`（业务规则）/ `AC`（验收标准）。拿不准用 `BR`。
- body 只能是大写字母、数字、单连字符；全部大写；中文/下划线/空格先 slugify。
- 一个需求可挂多个 ID（如 `BR-CREATE-ORDER` + `AC-CREATE-ORDER-001`），切片时一起传。

**归一化结果必须写进 mapping 文件并回显给用户确认**，不要只在聊天里说。

## 2. sourceScope 来源（禁止臆测）

`--source-scope` 必须是**仓库里真实存在**的源码相对路径。允许的来源，按优先级：

1. **backend-test DAG facts**：Step 2 的 `contracts/backend-test-case-manifest.json` / `reports/backend-test-markdown-pytest-correspondence.md` 里映射的 pytest symbol → 生产代码路径。这是最可信来源，因为它是"本轮测试实际触达的代码"。
2. **定向事实搜索**：`rg` 或 CodeGraph 按需求关键词（如"创建订单"）定位 controller/service 类。
3. **需求文档显式声明**：PRD 里如果写了"涉及 `OrderService`"，可作为线索，但仍需在仓库里验证路径存在。

**禁止**：直接把需求文档里的中文术语当文件名猜路径（如把"订单服务"猜成 `OrderService.java` 而不去仓库验证）。

路径规范：

- 相对仓库根，正斜杠，逗号分隔。
- 不得含 `..`（runtime 会拒绝 unsafe source scope path）。
- 粒度到**类文件**（`.java`），不要给到包目录（runtime 按 file 过滤）。

## 3. mapping 文件格式

落到 `docs/test-reports/coverage/requirement-source-mapping.json`，与 `run-coverage-analysis.sh` 的输入一致：

```json
{
  "requirements": [
    {
      "ids": ["BR-CREATE-ORDER", "AC-CREATE-ORDER-001"],
      "sourceScope": [
        "src/main/java/com/yourcompany/order/OrderService.java",
        "src/main/java/com/yourcompany/order/OrderController.java"
      ],
      "rationale": "PRD §3.2 创建订单；pytest symbol test_create_order 映射到 OrderService.create（manifest facts）"
    },
    {
      "ids": ["BR-CANCEL-ORDER"],
      "sourceScope": [
        "src/main/java/com/yourcompany/order/OrderService.java"
      ],
      "rationale": "PRD §3.3 取消订单；仅 OrderService.cancel 被测试触达"
    }
  ]
}
```

`rationale` 字段是给审计用的，说明"为什么这个需求对应这些路径"；脚本不消费它，但 review 时必填。

## 4. 解读覆盖率切片时的 GAP 判定

拿到 `loop-agent coverage report` 的输出后，按 `missingData` 与 counter 区分：

| 情况 | 判定 | 动作 |
| --- | --- | --- |
| scope 文件都在 artifact 里，line% > 0 | COVERED | 记录数值 |
| scope 文件部分在 artifact、部分不在 | PARTIAL | 标注哪些文件未命中 |
| scope 文件全不在 artifact（`source-scope-not-found-in-artifact`） | GAP | 测试完全没触达；回灌 backend-test Coverage Matrix 的 `GAP` |
| JaCoCo 收集降级（无 `jacoco.xml`） | unavailable | 先修基础设施（见 `runtime-alignment.md` §6），**不要**当 0% |

## 5. 反模式

- ❌ 把整个模块 `src/main/java/com/yourcompany/**` 塞进一个需求的 scope —— 稀释了切片意义，等于没切。
- ❌ 用需求文档里的业务术语当路径，不在仓库验证 —— 会得到 `source-scope-not-found-in-artifact`。
- ❌ 一个 source 文件只挂一个需求，但它实际服务多个需求 —— 会让多个需求覆盖率虚高。
- ❌ 把 `unavailable` 当 0% 写进报告 —— 误导后续决策。
- ❌ 用 `loop-agent coverage report` 之外的工具自己解析 `jacoco.xml` 再手填数字 —— 绕过归一化器，数字不可审计。
