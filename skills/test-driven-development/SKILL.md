---
name: test-driven-development
description: 用于需要回归覆盖的行为变更与 bug 修复。保持小循环：写失败测试 → 变绿 → 仅在 green 后 refactor。
---

# Test-Driven Development

本 skill 用于会改变 runtime 行为的 implementation 节点。

## 规则

- 行为是新增或已损坏时，在 production code 之前写或更新聚焦测试。
- 运行聚焦测试，确认因预期原因失败。
- 做最小实现变更使测试变绿。
- refactor 仅在 green 之后，且仍在同一 bounded write set 内。
- 能测真实本地 module 时，不要用 broad mock。

## Output

报告 red 命令、green 命令，以及仍需要的 broader verification。
