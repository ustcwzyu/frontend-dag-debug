# Functional fixture: shared / public component API change

- **fixtureId**: `fe-func-shared-public-component-api`
- **taskTitle**: 为设计系统 Input 增加 `size` prop 并更新导出类型
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `high-risk`（公共 API；M4 前仅标注）
- **expectedGateIntensity**: dual design；依赖与 breaking change 审查
- **expectedMockStrategy**: `not-needed`
- **Browser**: **out-of-scope / not-run**

## 需求要点

- 公共 props/类型变更需兼容策略（可选 prop 默认值或变更说明）。
- 更新导出与既有测试；不得静默删测试。
- writeSet 限于组件包约定路径。

## allowedPaths 建议

```text
packages/ui/src/Input/**
packages/ui/src/index.ts
packages/ui/src/Input/*.test.*
```

## expected verification 形态

- Static: typecheck/build
- Behavior: 组件 API 单测
