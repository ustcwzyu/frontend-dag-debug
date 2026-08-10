# Requirement Clarification V3 输出契约

```yaml
---
artifact_version: "3.0"
artifact_type: requirement-clarification
requirement_id: <lowercase-slug>
project_root: ../../..
analysis_scope: frontend | backend | both
clarification_status: pending | complete
clarification_rounds: 0 | 1 | 2 | 3
source_product_analysis: ./product-analysis.md
target_product_requirement: ./product-requirement.md
---
```

文件与 Product Analysis、Product Requirement 位于同一需求目录。

## 无需澄清

只生成三个章节：澄清结论、来源、合并结果。`clarification_rounds` 必须为 `0`。澄清结论写明 `no-clarification-required` 和理由；不得生成 `BR-*`、`Q-*`、`DEC-Q-*`。

## 需要澄清

固定章节：澄清来源、决策分支、问题记录、决策索引。定义 3–6 个 `BR-*` 分支，表格包含分支 ID、名称、优先级、依赖和状态。

问题核心字段：澄清轮次、分支、优先级、影响范围、推荐答案、推荐理由、用户回答、最终决策、决策来源、状态、决策标记、目标位置。`clarification_rounds` 必须为 `1`–`3`，每个问题的澄清轮次不得超过该值。

条件字段：有前置依赖时写依赖问题；存在真实备选时写备选方案；决策来源为 `code-evidence` 时写代码证据；状态为 `pending-non-blocking` 时写未确认影响。

状态使用 confirmed、default-confirmed、pending-blocking、pending-non-blocking；决策来源使用 user、source-requirement、code-evidence、confirmed-default。决策标记必须为 `DEC-Q-*`。

`complete` 要求全部分支 resolved；P0/P1 必须由用户明确回答并使用 confirmed/user；P2 可确认、使用已确认默认值，或在写明影响后延后。complete 时每个决策标记必须出现在 Product Requirement 的决策追溯中。

每轮在用户回答后重新识别模糊点，有必要才再澄清。最多 3 轮；第 3 轮后仍有 P0/P1 时产物必须保持 `pending`，不得继续追问或自行填补决策。
