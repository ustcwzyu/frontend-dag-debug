# Production Readiness 检查清单

声称 Production Readiness v0.1 的低/中风险单仓库 DAG 任务使用本清单。

## 范围

- [ ] 单仓库
- [ ] 单任务或小范围有边界任务
- [ ] 低或中风险
- [ ] 无生产 secret 或生产数据库访问
- [ ] 无自动 merge 或 release
- [ ] 无 DAG runtime 之外的第二套 runner
- [ ] 无可写 Dynamic Workflow sharded migration

## Task Contract

- [ ] Task source 存在于 `.harness/tasks/<task-id>/source/`
- [ ] `allowedPaths` 显式
- [ ] `forbiddenPaths` 显式
- [ ] `writeSet` 或预期写 scope 显式
- [ ] Shell 验证命令显式
- [ ] 非目标显式

## DAG 主路径

- [ ] 已运行 `loop-agent task advance <task-id> "Task title" --prd <prd.md> --allowed-path "<glob>" --json`（或 task 已存在且契约就绪）
- [ ] `task advance` 产出/刷新 `.harness/tasks/<task-id>/dag.json` 并打开 writeSet gate
- [ ] `loop-agent dag validate --dag <dag-path> --strict-models --strict-governance` 通过
- [ ] `loop-agent task advance <task-id> --approve-gate "write-set-review:<digest>" --json` 产出 run id / lifecycle 事实（advanced arbitrary DAG 才用 `dag execute`）
- [ ] `loop-agent dag report --run-id <run-id> --markdown` 可读
- [ ] `loop-agent dag doctor --run-id <run-id>` 能解释失败或 paused run

## 证据

- [ ] 记录 DAG spec path
- [ ] 记录 DAG validation 输出
- [ ] 记录 run id
- [ ] Shell 验证输出是新鲜的
- [ ] 成功路径有 promotion 与 closeout 证据
- [ ] 失败路径有 failure handoff 证据

## Failure Routing

- [ ] 存在时保留 raw failure category
- [ ] 失败 run 有 DAG normalized failure category
- [ ] 失败 run 有 product-line failure category
- [ ] 失败 run 有 recommended follow-up
- [ ] 派生 category 未覆盖已完成 DAG facts
- [ ] `Unknown` 已说明或为 fixture 有意接受

## 最终门禁

- [ ] `npm run typecheck`
- [ ] 相关定向 Vitest 文件
- [ ] `bash scripts/check-repo.sh`
- [ ] website/docs 变更时 `npm run docs:build`
- [ ] 最终 sprint closeout 前 `bash scripts/ci.sh`
