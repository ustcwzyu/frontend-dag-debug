# Failure fixture: fixture schema drift vs API contract

- **fixtureId**: `fe-fail-fixture-schema-drift`
- **triggerSignal**: Mock fixture 字段与接口文档冲突；design gate 或 review 发现；或 mock 专项测试失败
- **expectedGateBehavior**: design request-revision 或 review request-revision；不得发明字段硬通过
- **repairable (M3 预标注)**: `non-repairable` 若根因是 spec 冲突未裁决；局部拼写且 contract 已明确时可为 repairable
- **Browser**: not-run

## 场景

Handler 返回 `userName` 而契约为 `name`。

## 期望

- Mock assess / design 要求 contract-aligned
- closeout 不得宣称真实联调成功
