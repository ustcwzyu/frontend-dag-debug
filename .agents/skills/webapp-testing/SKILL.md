---
name: webapp-testing
description: 任务明确涉及 browser 渲染行为时，用于前端或本地 web UI 验证。
---

# Webapp Testing

仅当任务包含 browser UI 或本地 web app 时使用本 skill。

## 规则

- 优先使用项目现有的 dev server 与 test tooling。
- 当 visual 或 interaction 行为重要时，用 browser 或文档化的 UI test 命令验证渲染行为。
- UI 有变更时，检查 desktop 与 mobile 布局的 overlap、clipping、blank state。
- 默认不添加 networked services 或第三方 scan。

## Output

报告确切的 server 命令、URL、browser/test 命令与观察结果。
