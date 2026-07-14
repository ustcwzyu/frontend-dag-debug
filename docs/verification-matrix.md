# 验证矩阵

使用能够证明声明的最窄命令。该项目是 Vite + TypeScript 前端调试项目；治理检查由 loop-agent 生成，项目验证以 TypeScript 编译和 Vite 生产构建为准。

| 声明 | 最低验证 | 更强验证 |
|---|---|---|
| loop-agent 治理有效 | `bash scripts/check-repo.sh` | `bash scripts/ci-governance.sh` |
| TypeScript 与生产构建有效 | `npm run build` | `bash scripts/ci-tests.sh` |
| 首页包含需求文本 | `rg -ni "hello world" src index.html` | 启动 `npm run dev` 后进行浏览器检查 |
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

`scripts/ci-tests.sh` 会识别 `package.json` 中的 `build` 脚本并运行 `npm run build`。当前项目没有独立测试框架；首页任务的行为验收使用文本检查，并可在需要时通过浏览器补充人工或自动化验证。
