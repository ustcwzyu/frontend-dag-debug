---
name: code-review-core
description: 用于只读 code review 节点，产出带文件与行号引用的优先级 findings。
---

# Code Review Core

本 skill 用于 reviewer 节点。

## Review 重点

- 优先关注 correctness、行为回归、security、数据丢失与缺失验证。
- findings 须 grounded 在具体文件与行号。
- 区分 blocking findings 与次要 maintainability 备注。
- 检查测试是否证明变更行为，文档是否与面向用户的变更一致。
- 若无 findings，明确说明，并指出 residual test gap（如有）。

## Output

按 severity 排序列出 findings。仅当无 blocking findings 时，才写 `VERDICT: pass`。
