# Scaffold samples (generated snapshots)

> **身份**：由 `agent-worker feature scaffold` **同一套 typed builders** 生成的只读快照，供人阅读与防漂移对照。  
> **不是** 运行中的 dogfood Feature，**不是** 默认模板源（生成器仍以 `src/worker/feature/scaffold.ts` 为准）。  
> **不要** 复制进 `features/` 当业务 Feature；日常请直接跑 `feature scaffold`。

## 目录

| 子目录 | 模板 | 快照 feature_id |
| --- | --- | --- |
| `backend-only/` | pure backend | `F-2099-901` |
| `frontend-only/` | pure frontend | `F-2099-902` |
| `fe-with-api/` | contract + BE + FE | `F-2099-903` |

ID 使用 `F-2099-*` 号段，避免与 `features/F-2026-*` dogfood 混淆。

## 刷新 / 校验

```bash
# 按当前 scaffold 实现重写本目录
node --import tsx/esm scripts/generate-scaffold-samples.mjs

# CI / 本地：快照必须与当前 builder 一致
node --import tsx/esm scripts/generate-scaffold-samples.mjs --check
npx vitest run test/worker/feature/scaffold-samples.test.ts
```

`scripts/check-repo.sh` 会调用 `--check`。若你改了 scaffold 模板语义，请先 generate 再提交快照。

## 与真实 Packet 的关系

| 路径 | 用途 |
| --- | --- |
| 本目录 | 文档可读快照 + 漂移门禁 |
| `features/F-2026-*` | 仓库内真实 / dogfood Feature |
| 用户目标仓 `features/F-YYYY-NNN/` | `feature scaffold --repo <target>` 写入处 |
