# Functional fixture: pure local no-remote interaction

- **fixtureId**: `fe-func-pure-local-no-remote`
- **taskTitle**: 实现纯前端计数器与本地 localStorage 偏好
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `small`（M4 前仅标注）
- **expectedGateIntensity**: mock assess 仍存在但策略应为 not-needed
- **expectedMockStrategy**: `not-needed`（正证据：无远程 API）
- **Browser**: **out-of-scope / not-run**

## 需求要点

- 状态仅存组件 state / localStorage。
- 不添加 Mock 框架或 API client。
- 交互可用 vitest + testing-library 验证。

## allowedPaths 建议

```text
src/widgets/Counter/**
test/widgets/Counter/**
```

## expected verification 形态

- Static + behavior（本地交互）
- 无 mock-verify 节点
