# 任务看板刷新交互规范

规范 ID：`OSPEC-FE-REFRESH-001`

## 适用范围

本规范约束 `frontend-dag-debug` 任务看板的“刷新列表”交互。它是本轮
`openspec` 读取证据验证的任务相关规范。

## 必须行为

- 刷新入口使用按钮，文本为“刷新列表”，并且 `type="button"`。
- 点击后按钮进入禁用状态并显示“刷新中…”。
- 刷新完成后短暂显示“已刷新”，随后恢复“刷新列表”。
- 刷新沿用现有本地任务数据，不新增后端、网络请求或依赖。
- 当 `localStorage` 不可用时，在 `.task-board__error` 中展示“刷新失败”。
- 刷新能力不得破坏已有的 `hello world`、问候弹窗、任务新增、状态切换、
  `all|pending|done` 筛选和本地持久化行为。

## 验证证据

- 计划或设计审查必须实际读取本文件，并引用规范 ID
  `OSPEC-FE-REFRESH-001`。
- 行为验证运行 `npm test`。
- 静态验证运行 `npm run typecheck`。
- 生产构建验证运行 `npm run build`。

