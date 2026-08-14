# Agent Worker Production Readiness v1 Checklist

用于 Phase 8 campaign / 发布门禁。勾选前必须有新鲜命令输出或 report ref。

正式 pin（2026-08-09）：`@tea-agent/loop-agent@0.32.0`（tag `v0.32.0` / `b4d9e500`）。scorecard 在 burn-in / live 门禁完成前保持 **NOT_READY**。证据：`docs/reports/feature/2026-08-09-agent-worker-production-readiness-v1.md`。

## 包络与身份

- [x] 支持包络已冻结（单机/单用户/单仓）
- [x] controller packageVersion + fingerprint 已记录（`0.32.0`；npm shasum `8932749b1583523043a9889c84f9d316e57e451d`；canary fingerprint `sha256:b08404f5…`）
- [x] published canary / 隔离 install **无** npm link / workspace bin（live burn-in 仍须每日复核）
- [x] protocol/capabilities preflight（unit）通过；live preflight 仍待

## Ownership / Attempt

- [x] Running 投影不依赖 terminal ledger（unit / Phase 1）
- [x] Task-scoped events 含 featureId（unit）
- [x] dual Feature 同名 Task 隔离（unit C2）
- [x] ownership warning 按根因聚合（≤1 finding/根因）（unit）

## Lifecycle / Recovery

- [x] safe run-error → Failed → `task retry` 无需 mark-failed（unit）
- [x] Blocked 保留 contract/human 语义（unit）
- [x] resume / retry / reconcile / revise / decide 决策一致（unit）

## Lease

- [x] `{featureId, taskId}` 单 active writer（unit C3）
- [ ] begin/finalize crash injection 有 doctor finding（进程级仍缺）
- [x] 不盲目偷取 live DAG lease（unit reclaim）

## Acceptance / Delivery

- [x] Task Done ≠ AC covered（unit）
- [x] `feature verify-final` 唯一 writer（unit）
- [ ] verify-final → delivery → closeout **live** 可收口
- [x] dirty HEAD / tamper fail-closed（unit）

## Campaign / SLO

- [x] C0–C11 已执行或明确 blocked-external（partial：unit + published canary；live Pi blocked）
- [ ] burn-in 窗口达标（7 日或 30 Attempt）— **OPEN day 0**
- [ ] SLO 分子/分母已记录（正式样本不足）
- [x] promote + rollback drill 完成（install-level vs `0.31.1`）
- [ ] scorecard: READY 或合法 CONDITIONALLY_READY — 当前 **`NOT_READY`**
- [x] open P0 = 0
