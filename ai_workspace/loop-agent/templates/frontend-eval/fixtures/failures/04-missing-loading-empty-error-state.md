# Failure fixture: missing loading/empty/error state

- **fixtureId**: `fe-fail-missing-ui-states`
- **triggerSignal**: plan/design 或 review 发现 applicable 异步列表缺少 loading/empty/error
- **expectedGateBehavior**: first/final design 应 request-revision；若漏到实现则 review request-revision
- **repairable (M3 预标注)**: `repairable`（补状态 UI + 测试）
- **Browser**: not-run

## 场景

仅实现 success 列表渲染。

## 期望

- design checklist 含 UI States
- M1 合同将强制 applicable states 映射
