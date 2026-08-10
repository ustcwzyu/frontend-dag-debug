# Functional fixture: SSR / server-client boundary (Next 风格)

- **fixtureId**: `fe-func-ssr-server-client-boundary`
- **taskTitle**: 在 Next App Router 中拆分服务端数据区与客户端交互岛
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `high-risk`（M4 前仅标注）
- **expectedGateIntensity**: dual design；明确 server/client 边界与禁止事项
- **expectedMockStrategy**: server fetch 真实或 adapter；client 交互本地；禁止生产默认 Mock
- **Browser**: **out-of-scope / not-run**

## 需求要点

- `"use client"` 边界正确；不把仅服务端 API 密钥导入 client bundle。
- loading/error 在允许的边界内处理。
- smoke target 优先 `nextjs-min`（temp dir）。

## allowedPaths 建议

```text
app/dashboard/**
src/components/dashboard/**
test/dashboard/**
```

## expected verification 形态

- Static: typecheck / next build（temp）
- Behavior: 单元/组件测试；**不**将 `next start` 浏览器访问作为完成证据
