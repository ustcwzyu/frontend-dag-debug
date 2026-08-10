# Failure fixture: unapproved dependency add

- **fixtureId**: `fe-fail-unapproved-dependency`
- **triggerSignal**: diff 出现未授权 `package.json` / lockfile 依赖新增
- **expectedGateBehavior**: design 应预先拒绝；若发生则 review Important + request-revision；任务 forbidden 含 package 时 write-guard 阻断
- **repairable (M3 预标注)**: `non-repairable`（依赖策略/人工批准）
- **Browser**: not-run

## 场景

为方便引入大型 UI 库未在计划 Dependency Policy 批准。

## 期望

- 计入 `unapproved_dependency_count`
- 不得以 build 通过单独放行
