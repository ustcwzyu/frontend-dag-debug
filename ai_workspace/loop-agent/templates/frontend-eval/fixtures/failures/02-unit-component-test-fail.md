# Failure fixture: unit/component test fail

- **fixtureId**: `fe-fail-unit-component-test`
- **triggerSignal**: `frontend-behavior-verify-shell` 非零（vitest 断言失败）
- **expectedGateBehavior**: behavior 失败 → review 不得 pass；closeout 阻断
- **repairable (M3 预标注)**: `repairable`
- **Browser**: not-run；不得用「应在浏览器正常」抵消

## 场景

组件测试期望文案/状态与实现不一致。

## 期望

- 失败命令为生成期冻结入口
- 禁止删测 / `.skip` 伪装通过（review 应标 Important）
