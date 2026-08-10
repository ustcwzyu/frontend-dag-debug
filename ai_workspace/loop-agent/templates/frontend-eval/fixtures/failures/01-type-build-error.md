# Failure fixture: type / build error

- **fixtureId**: `fe-fail-type-build-error`
- **triggerSignal**: `frontend-static-verify-shell` 非零（tsc 或 build 失败）
- **expectedGateBehavior**: static 失败阻断 behavior/review 成功路径；不得 closeout pass
- **repairable (M3 预标注)**: `repairable`（局部类型/导入修复）
- **Browser**: 不得宣称 Browser 证据

## 场景

Writer 引入错误 prop 类型或缺失导出，导致 typecheck/build 失败。

## 期望

- 新鲜 stdout/stderr 归档
- review 不得在 static 失败时 VERDICT: pass
- M3：可进入 bounded repair；M0 仅记录
