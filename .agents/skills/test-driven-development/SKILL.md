---
name: test-driven-development
description: 用于需要回归覆盖的行为变更与 bug 修复。保持小循环：写失败测试 → 变绿 → 仅在 green 后 refactor。禁止水平批处理。
---

# Test-Driven Development

本 skill 用于会改变 runtime 行为的 implementation 节点。

## 规则

- 行为是新增或已损坏时，在 production code 之前写或更新聚焦测试。
- 运行聚焦测试，确认因预期原因失败（RED）。
- 做最小实现变更使测试变绿（GREEN）。
- refactor 仅在 green 之后，且仍在同一 bounded write set 内。
- 能测真实本地 module 时，不要用 broad mock。

## 垂直切片：一测试一实现

- 循环是：**一个行为测试 → 最小实现 → 验证通过 → 下一个行为**。
- **禁止**「先批量写完所有测试（全部 RED），再批量实现（全部 GREEN）」的水平切片。
- 每个行为切片必须有独立验收标准与可运行的验证命令。
- 纯文档 / 机械迁移工作不强制新增测试；行为变更与 bug 修复必须走上述循环。

## Output

报告 red 命令、green 命令，以及仍需要的 broader verification。
