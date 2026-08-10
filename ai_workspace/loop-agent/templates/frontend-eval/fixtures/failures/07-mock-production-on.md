# Failure fixture: Mock production-on / real-request commented out

- **fixtureId**: `fe-fail-mock-production-on`
- **triggerSignal**: 生产入口默认启用 Mock、注释真实请求、或 production import test mocks
- **expectedGateBehavior**: design/review 至少 Important → request-revision；static production/default-real-path 检查应失败或 review 阻断
- **repairable (M3 预标注)**: `repairable` 若仅激活边界错误；`non-repairable` 若故意绕过合同
- **Browser**: not-run；Mock UI 观感不得当真实联调

## 场景

```ts
// fetch('/api/users')
return mockUsers;
```

或 `mock.enable()` 无 dev/test 守卫。

## 期望

- 计入潜在 `mock_real_integration_false_claim` 若 closeout 美化
- 与 mock workflow 生产默认真实路径规则一致
