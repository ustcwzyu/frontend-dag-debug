# 验证矩阵

使用能够证明声明的最窄命令。该项目是 Vite + TypeScript 前端 + Node/Express/SQLite 后端调试项目；治理检查由 loop-agent 生成，项目验证以 TypeScript 类型检查、Node.js 行为测试和 Vite 生产构建为准。

| 声明 | 最低验证 | 更强验证 |
|---|---|---|
| target project tests are valid | `npm test` | `bash scripts/ci-tests.sh` |
| loop-agent 治理有效 | `bash scripts/check-repo.sh` | `bash scripts/ci-governance.sh` |
| TypeScript 类型有效（前端 + server） | `npm run typecheck` | `bash scripts/ci-tests.sh` |
| 首页与问候弹窗行为有效 | `npm test` | 启动 `npm run dev` 后进行浏览器点击检查 |
| 后端 API 行为有效 | `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 node --test test/server-api.test.mjs` | 启动 `npm run server` 后用 curl/浏览器验证 |
| 前端后端化契约有效（降级/登录/进度静态断言） | `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 node --test test/frontend-api.test.mjs` | `npm test` 全量 |
| hash 路由契约有效（parseHash 路由表 / router 纯净 / startRouter 守卫 / 缓存与降级 / 工作台复用 / 404 兜底） | `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 node --test test/frontend-router.test.mjs` | `npm test` 全量 |
| 学习会话工作台契约有效（八步/模板/自评/计时/草稿/同步合并与失败语义） | `HARNESS_ALLOW_ACTIVE_DAG_RUNS=1 node --test test/frontend-journal.test.mjs` | `npm test` 全量 + 真实 Express 进度 PUT e2e（`test/server-api.test.mjs`） |
| Vite 生产构建有效 | `npm run build` | `bash scripts/ci-tests.sh` |
| 完整本地交付有效 | `bash scripts/ci.sh` | 按需补充浏览器行为检查 |
| 文档或治理变更有效 | `bash scripts/check-repo.sh` | `loop-agent docs audit` 加 `bash scripts/ci-governance.sh` |
| 模型 writer 修改文件 | `git status --short` 加相关验证 | `bash scripts/ci.sh` |

## 治理命令

```bash
bash scripts/check-engineering-structure.sh
bash scripts/check-doc-index.sh
bash scripts/check-doc-links.sh
bash scripts/check-active-plan-status.sh
bash scripts/check-exec-plan-index-sync.sh
bash scripts/check-harness-runtime-clean.sh
bash scripts/check-architecture-boundaries.sh
bash scripts/check-skill-entry.sh
bash scripts/check-repo.sh
bash scripts/ci-governance.sh
bash scripts/ci-tests.sh
bash scripts/ci.sh
```

## 项目专属验证

`scripts/ci-tests.sh` 会读取 `package.json` 并依次运行已存在的 `typecheck`、`test` 和 `build` 脚本。当前行为测试使用 Node.js 内置 test runner 检查首页（含 hash 路由导航）、任务看板、后端 API、前端后端化契约、学习会话工作台与 hash 路由契约（`test/frontend-router.test.mjs`：parseHash 纯函数单元断言 + router/main 静态结构断言）；真实浏览器点击可作为按需补充证据。带后端接口的后续需求须先通过 Product Requirement、Dependency Analysis 和 API Documentation 校验器，再生成 DAG。
