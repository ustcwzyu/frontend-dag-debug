# Functional fixture: permission / auth-gated UI

- **fixtureId**: `fe-func-permission-auth-ui`
- **taskTitle**: 管理后台菜单按角色隐藏未授权入口
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `high-risk`（M4 前仅标注）
- **expectedGateIntensity**: dual design 保留；权限矩阵进 plan
- **expectedMockStrategy**: 若角色来自 API 则 Mock/adapter；纯 prop 驱动可为 not-needed
- **Browser**: **out-of-scope / not-run**

## 需求要点

- 未授权不渲染危险操作；无权限 empty/forbidden 态。
- 不得在客户端硬编码绕过鉴权当作完成。
- 安全相关不得扩大 writeSet 到服务端密钥配置。

## allowedPaths 建议

```text
src/features/admin/nav/**
src/hooks/usePermission/**
test/features/admin/**
```

## expected verification 形态

- Static + 权限矩阵单测/组件测
