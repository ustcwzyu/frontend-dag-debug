# Functional fixture: list/detail page

- **fixtureId**: `fe-func-list-detail-page`
- **taskTitle**: 实现订单列表与详情路由页面
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `standard`
- **expectedGateIntensity**: dual design + 状态覆盖（loading/empty/error/success）
- **expectedMockStrategy**: 有 API 时 `native` 或 `request-adapter`；policy=auto
- **Browser**: **out-of-scope / not-run**

## 需求要点

- 列表分页或筛选；详情根据 id 加载。
- loading / empty / error / success 四态可测。
- Real Integration Gap 在 closeout 保留（若仅 Mock）。

## allowedPaths 建议

```text
src/pages/orders/**
src/components/orders/**
src/api/orders/**
test/pages/orders/**
```

## expected verification 形态

- Static + behavior（路由/组件测试，非 e2e 浏览器）
