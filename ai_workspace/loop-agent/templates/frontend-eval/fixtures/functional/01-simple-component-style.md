# Functional fixture: simple component / style

- **fixtureId**: `fe-func-simple-component-style`
- **taskTitle**: 调整 Button 次要样式以匹配设计 token
- **expectedRoute**: `frontend-implementation`
- **expectedRiskLevel**: `small`（M4 前仅标注）
- **expectedGateIntensity**: standard dual design + mock assess；无 API 时倾向 `not-needed`
- **expectedMockStrategy**: `not-needed`（无远程数据）
- **Browser**: **out-of-scope / not-run**

## 需求要点

- 修改既有展示型组件 className / CSS module / token 引用。
- 不改变公共 props API。
- 覆盖 hover/disabled 若设计要求；无 loading/empty 则 N/A 并说明。

## allowedPaths 建议

```text
src/components/Button/**
src/styles/**
test/components/Button/**
```

## expected verification 形态

- Static: `typecheck` + `build`（fallback 可接受）
- Behavior: 组件单测或 style snapshot 类 vitest（无浏览器）
- 无 `frontend-mock-verify-shell`
