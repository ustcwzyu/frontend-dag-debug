---
name: codebase-scout
description: 用于只读 scout 节点，在实现前定位现有代码、测试、文档与集成点。
---

# Codebase Scout

本 skill 用于 scout 节点。

## 规则

- 从 repo 指令、task source 与邻近测试入手。
- 可用时优先 CodeGraph；否则用 `rg` 与聚焦文件阅读。
- 在提议新抽象前，识别现有 helper 与 ownership 边界。
- 只返回事实，不做编辑。

## Output

列出相关文件、现有模式、风险，以及实现所需的最小 write surface。
