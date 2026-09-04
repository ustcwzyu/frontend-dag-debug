# 2026-09-04-jest-migration — 交付记录

## Summary

测试框架全量迁移到 Jest（用户批准 PRD，taskKind=standard）。运行 `20260904-jest-migration`：
**9/9 FINISHED，status=finished，verdict=pass**，lifecycle 依次完成
run-succeeded → promotion-completed → closeout-completed。

## Changes（git status 核验，均在 writeSet 内）

- `package.json`：`test` 改为 `node --experimental-vm-modules node_modules/jest/bin/jest.js`；
  devDeps 新增 `jest@^30.5.1`、`babel-jest`、`@babel/core`、`@babel/preset-typescript`
- `package-lock.json`：依赖安装生成（含 jest 生态，网络可用）
- `jest.config.mjs`（新建）：ESM + `test/*.test.mjs` 默认发现（免登记）
- `test/**`：8 个旧测试文件改写为 jest 风格（含 archive/exporter 自指 test 入口正则更新）；
  `test/frontend-planner.test.mjs`（planner 任务产物）在迁移覆盖内
- `README.md`、`ai_workspace/loop-agent/verification-matrix.md`：测试命令同步收敛

## Verification Evidence（DAG shell 节点执行）

- verify-shell：`npm test`（jest）/ `npm run typecheck` / `npm run build` 均 exit 0 → FINISHED
- verify-pi + governance-standard-gate-shell：FINISHED；closeout-pi：FINISHED
- 运行 verdict=pass；promotion/closeout 已完成

## 未动（合规）

- `src/**`、`server/**`、`docs/**`、`scripts/**`、`.harness/**`、`.agents/**`、harness.json、vite/tsconfig：
  本任务零修改（src/main.ts 等 M 项为 planner 任务遗留工作区内容，非本轮引入，未触碰；
  `ai_workspace/.../backend-test-dag.json` 为历史脏，未触碰）
- `harness.json` 三档维持用户此前的 `zen-spark/muse-spark-1.3-contributor-free`（本轮执行器即此模型全绿）

## 后续

- planner 任务（2026-09-01-learning-mission-planner-frontend）的 review 卡点（新测试未被执行）
  已被本迁移从根上消除：jest 默认发现 `test/*.test.mjs`，无需 package.json 登记。
  planner 任务本身仍停在 partial_failed（manual-review），是否重跑收尾待用户决策。
