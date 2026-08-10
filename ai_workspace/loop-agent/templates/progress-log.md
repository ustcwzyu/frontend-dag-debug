# 进度日志模板

> 仅在确实需要跨会话交接时复制到 `docs/progress/YYYY-MM-DD-<topic>.md`。
> 当前交接入口由 `docs/progress/README.md` 维护；完整验证证据写到 `docs/reports/`。

## 生命周期

- **新建**：当前任务尚未结束、下一次会话需要明确恢复步骤、且 active plan 状态不足以安全交接时，才在此新增 `YYYY-MM-DD-<topic>.md`，并更新 `docs/progress/README.md`。
- **进行中**：只写当前事实、剩余风险和下一步；不写完整合同正文或长期报告。
- **结束**：任务结束后，把仍有长期价值的交接迁入 `docs/reports/handoffs/`，更新 `docs/reports/handoffs/README.md` 索引；没有长期价值的临时交接不应继续占据当前入口。
- **入口唯一**：`docs/progress/` 是当前交接入口；已结束的历史交接一律从 `docs/reports/handoffs/` 查找。`harness.json.artifacts.progressDir` 继续指向本目录，目标项目初始化契约保持不变。

## 日期 / 会话

## 变更内容

## 已验证项

## 新发现的 Bug / 技术债 / 漂移

- Bugs:
- Debt:
- Drift:

## 已知缺口 / 风险

## 推荐下一步
