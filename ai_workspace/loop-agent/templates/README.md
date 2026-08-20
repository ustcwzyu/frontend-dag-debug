# 模板库

本目录保存可复用的执行计划、报告、DAG、schema、评测与产品线初始化模板。这里的文件是“可以拿来使用的起点”，不是某次任务的执行证据。

`docs/templates/README.md` 随 npm 包发布，并由 full init 复制到目标治理根；旧项目可通过 `init check-update` / `init update --apply-safe` 追踪缺失的模板入口和受管模板。源仓专用的文档治理脚本不会默认复制到目标项目。

## 通用任务、报告与治理

- `init-managed-agents.md` — **package-only**：目标项目 `AGENTS.md` managed block 的可编辑正文真源（`__LOOP_AGENT_PROJECT_NAME__` / `__LOOP_AGENT_GOVERNANCE_ROOT__` 占位符；由 `init` 渲染注入，**不**复制到目标治理 `templates/`）。
- `project-start-checklist.md` — 开工检查。
- `feature-spec.md`、`sprint-contract.md` — 功能规格与短周期合同。
- `exec-plan.md`、`progress-log.md`、`qa-report.md` — 执行计划、交接与验证报告。
- `adr.md` — 架构决策记录。
- `branch-merge-report.md` — source-SHA 分支合并报告。
- `init-evolution-review.md` — 初始化能力演化审查。
- `production-readiness-checklist.md` — Production Readiness 检查。
- `agent-worker-production-readiness-checklist.md` — agent-worker Feature/Task Pool Production Readiness v1 campaign 检查清单。
- `worker-dogfood-setup.md`、`worker-dogfood-evidence.md` — 已发布控制器下的 Worker dogfood 设置与证据。
- `interactive-ui-round2-experiment.md` — 交互式 UI 对照实验。

## Agent DAG

- `agent-dag.base.json`、`agent-dag.supervised-implementation.json`、`agent-dag.final-verification.json` — 通用 DAG 拓扑。
- `agent-dag.schema.json`、`agent-dag-report.schema.json`、`agent-dag-decision-envelope.schema.json` — DAG、报告和决策 envelope schema。
- `hybrid-dag.json` — hybrid DAG 示例。
- `agent-dag-authority-surface-audit.prompt.md` — 权威面审查提示。
- `agent-dag-decision-gate.prompt.md`、`agent-dag-decision-gate-dogfood-report.md` — 决策门与 dogfood 报告。
- `agent-dag-process-supervisor.prompt.md` — 过程监督提示。
- `agent-dag-review-verdict.prompt.md` — review verdict 提示。

## Backend-test

- `backend-test-dag.json` — backend-test DAG 模板；其中 `generate-backend-md-cases-pi` 是唯一允许 `writer-empty-diff` 重试的 writer（总共两次，仅限 post-write-guard attribution 确认的空 diff）。
- `backend-test-dag.classify.prompt.md`、`backend-test-dag.generate-pytest.prompt.md`、`backend-test-dag.review-cases.prompt.md`、`backend-test-dag.retrospect.prompt.md` — 分类、生成、审查和复盘提示。
- `backend-test-analysis.schema.json`、`backend-test-execution.schema.json`、`backend-test-result.schema.json`、`backend-test-case-manifest.schema.json` — 分析、执行、结果与用例清单 schema。

## Frontend

- `frontend-task-requirement.md`、`frontend-task-constraints.md`、`frontend-design-contract.md` — 前端任务输入与设计合同。
- `frontend-implementation-contract.schema.json` — 前端实现合同 schema。
- `frontend-test-dag.json` — frontend-test DAG 模板；其 deterministic checklist 会拒绝 alternative executable instructions，仅允许 allowlisted `playwright-cli` command。Pi generator/reviser 的 runtime writeSet 仅授权下列目标项目生成路径（不是本仓库文档索引目标）：

  ~~~text
  testcase/frontend/cases/FE-*.md
  testcase/frontend/cases/index.md
  testcase/frontend/cases/manifest.draft.json
  ~~~

  Pi writer writeSet 不包含 final manifest（文件名 manifest.json）。依赖 checklist 的 exclusive shell materializer 是 final manifest 的唯一写入者，以 temp+rename 原子生成 final，后续 map 只消费该 materializer 输出。
- `frontend-test-dag.retrieve-context.prompt.md`、`frontend-test-dag.generate-cases.prompt.md`、`frontend-test-dag.review-cases.prompt.md`、`frontend-test-dag.review-execution.prompt.md`、`frontend-test-dag.retrospect.prompt.md` — 上下文、用例、审查、执行审查和复盘提示。
- `frontend-test-case-checklist.md` — 前端测试用例检查清单。
- `frontend-test-standard-scenarios.v1.json` — frontend-test 标准场景规范（generate 覆盖 must 场景；运行时可物化到目标项目 testcase/frontend/rag 下的 standard-scenarios.v1.json）。

## 知识同步与配置

- `knowledge-sync-dag.json`、`knowledge-graph-bootstrap-dag.json` — 知识同步与图谱初始化 DAG。
- `knowledge-sync-draft.schema.json` — 知识同步草稿 schema。
- `harness.schema.json` — `harness.json` 的 IDE JSON Schema。

## 子目录

- `product-line/README.md` — Feature、Task、Acceptance、Graph、Closeout 等产品线骨架。
- `evaluation/` — 通用评测模板与 schema。
- `frontend-eval/` — 前端评测模板、功能样例和失败 fixture。

新增、删除或重命名模板时，应同步本页、`docs/init-surface.manifest.json` 和相关 init/package 测试；完整性由 `scripts/check-doc-governance.mjs` 枚举校验。
