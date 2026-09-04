# 文档索引 / Documentation Index

本目录是 `frontend-dag-debug` 的 loop-agent 治理根目录，用于沉淀目标项目的持久工程上下文：决策、契约、计划、验证、报告与交接资料，与具体语言、框架或业务领域无关。

This directory is the loop-agent governance root for `frontend-dag-debug`. It records durable engineering context for the target project, independent of language, framework, or business domain.

## 核心文档 / Core Documents

- `development-principles.md` - 仓库开发原则 / repository development principles
- `architecture/runtime-boundaries.md` - runtime 层边界与依赖方向 / runtime layer boundaries and dependency direction
- `feature-workflow.md` - 有边界的功能工作流 / bounded feature workflow
- `verification-matrix.md` - 治理与项目专属验证命令 / governance and project-specific verification commands
- `loop-agent-harness.md` - 目标项目如何使用 loop-agent / how this target project uses loop-agent

## 方法论 / Methodology

- `harness-methodology-tdd.md` - 行为变更与缺陷修复的 TDD 纪律 / TDD discipline for behavior changes and bug fixes
- `harness-methodology-verification.md` - 完成声明前的验证纪律 / verification discipline before completion claims
- `harness-methodology-debugging.md` - 修复前的系统性调试工作流 / systematic debugging workflow before fixes

## 制品目录 / Artifacts

- `design/README.md` - 设计笔记与实现契约 / design notes and implementation contracts
- `exec-plans/active/README.md` - 活跃执行计划 / active execution plans
- `exec-plans/completed/README.md` - 已完成执行计划 / completed execution plans
- `progress/README.md` - 进度交接日志 / progress handoff logs
- `reports/README.md` - 验证与审计报告 / verification and audit reports
- `decisions/README.md` - 架构决策 / architecture decisions
- `templates/README.md` - 模板入口与类别说明 / template entrypoint and category guide
- `templates/` - 可复用的计划、报告与 DAG 模板 / reusable planning, reporting, and DAG templates
- `templates/production-readiness-checklist.md` - 低/中风险单仓库 DAG 任务的 production readiness 检查清单 / production readiness checklist for low/medium-risk single-repo DAG work
- `templates/worker-dogfood-setup.md` - 发布控制器下的真实 Worker sample setup / real Worker sample setup with a published controller
- `templates/worker-dogfood-evidence.md` - Worker sample、Observe、morning report 与 QA coverage evidence / Worker evidence template

## 验证 / Verification

```bash
bash scripts/check-repo.sh
bash scripts/ci-tests.sh
bash scripts/ci.sh
```

本项目的 `ci-tests.sh` 会从 `package.json` 确定性执行现有的 `typecheck`、`test`、`build` 脚本；当前项目未定义 `lint` 脚本，因此不会臆造该门禁。完整验证由 `ci.sh` 串行组合治理检查与这些项目检查。 / This project's `ci-tests.sh` deterministically runs the existing `typecheck`, `test`, and `build` scripts from `package.json`. No lint gate is invented because the project does not currently define one; `ci.sh` combines governance and project checks serially.
