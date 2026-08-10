# 更新 loop-agent 并刷新初始化能力

日期：2026-07-17

## 结果

- 全局 `@tea-agent/loop-agent` 从 `0.10.0` 更新到 `0.12.0`，本工作块后续固定使用该已发布控制器。
- 执行 `loop-agent init --repo-root . --profile full --merge`，治理根由 `docs` 迁移到 `ai_workspace/loop-agent`。
- 刷新根 README、AGENTS managed block、`harness.json`、治理脚本矩阵和 `.agents/skills/` 投影。
- 根据真实 Vite + TypeScript 项目补全新验证矩阵；`scripts/ci-tests.sh` 已能依次探测并运行 `typecheck`、`test`、`build`，无需额外定制逻辑。
- 保留初始化前已有的弹窗实现及其 README、旧验证矩阵改动，没有修改或回退业务源码。

## 工作流

- 为公共治理面变更创建 task `2026-07-17-update-loop-agent-init`，写入结构化允许/禁止路径。
- 生成并严格验证 supervised DAG，审查 writer `writeSet`、shell verification 和 `record-only` Decision Gate。
- 没有执行模型 writer；按 `init instructions` 的确定性初始化路径由主会话运行 CLI merge，并完成项目适配。

## 验证证据

以下命令在初始化和适配后以 exit 0 完成：

- `loop-agent init doctor --repo-root .`
- `loop-agent inspect --repo-root .`
- `loop-agent docs audit --repo-root .`
- `bash scripts/check-repo.sh`
- `bash scripts/ci.sh`
- `loop-agent handoff check 2026-07-17-update-loop-agent-init`（0 error，1 warning：未执行模型 DAG，因而没有 decision log）

完整 CI 包含 TypeScript 类型检查、2 个 Node.js 行为测试和 Vite 生产构建。

## 文档收敛与剩余说明

- 本目标仓库没有 `website/`，无需站上文档更新。
- 旧 `docs/` 治理树包含初始化前的用户内容，因此未删除；当前权威治理入口以 `harness.json` 指向的 `ai_workspace/loop-agent` 为准。
- repo-local skill 文件沿用仓库已提交的 CRLF 行尾。普通 `git diff --check` 会把 changed-line 的 CR 显示为 trailing whitespace；这不是本次新增的行尾约定。
