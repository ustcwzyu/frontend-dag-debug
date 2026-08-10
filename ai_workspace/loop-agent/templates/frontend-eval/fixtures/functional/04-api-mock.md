# Functional fixture: API + Mock

- **fixtureId**: `fe-func-api-mock`
- **taskTitle**: 接入用户列表 API 并在本地用既有 MSW Mock 验证
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `standard`
- **expectedGateIntensity**: mock assess + mock contract gate；required 时可能含 mock-verify
- **expectedMockStrategy**: `native`（既有 MSW）优先
- **Browser**: **out-of-scope / not-run**

## 需求要点

- Fixture 字段对齐接口文档；禁止发明字段。
- 生产默认真实请求；Mock 仅 test/dev 显式激活。
- closeout：`Frontend status: mock-validated`，`Real integration: pending`。

## allowedPaths 建议

```text
src/features/users/**
src/mocks/**
test/features/users/**
```

## expected verification 形态

- Static（含 production/default-real-path 构建）
- Behavior（Mock 激活下状态）
- 可选 `npm run test:mock` → `frontend-mock-verify-shell`
