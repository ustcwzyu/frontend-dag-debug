# Functional fixture: form validation

- **fixtureId**: `fe-func-form-validation`
- **taskTitle**: 实现登录表单客户端校验与错误提示
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `standard`
- **expectedGateIntensity**: dual design；UI states 含 error/empty 输入
- **expectedMockStrategy**: `not-needed` 若仅客户端校验；若提交到 API 则为 native/request-adapter
- **Browser**: **out-of-scope / not-run**

## 需求要点

- 必填、格式、确认字段一致性。
- 提交中 loading、校验失败 error message、成功 success 反馈。
- 不得默认 Mock 掉真实提交路径。

## allowedPaths 建议

```text
src/components/LoginForm/**
src/pages/login/**
test/components/LoginForm/**
```

## expected verification 形态

- Static: typecheck/build
- Behavior: 组件/单元测试覆盖 invalid/valid 路径
