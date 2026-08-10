# Frontend-implementation Smoke Targets 策略（M0）

## 原则

1. **仅使用平台临时目录**（`os.tmpdir()` / CI runner temp），**不得**在 loop-agent 仓库根写入可运行 app、`node_modules` 或构建产物。  
2. **不启动浏览器**；不安装 Playwright/Cypress；不声明 Browser verification。  
3. M0 只冻结**目标描述与生成约定**；真正从 fixture 物化临时项目在 **M1+ dogfood** 时实施。  
4. 临时项目生命周期：创建 → 最小依赖安装（仅 temp）→ 跑冻结 static/behavior 命令 → 删除；失败日志可复制到 run-owned harness 目录，不进 git。

## 三类可控目标

| targetId | 栈 | 最小信号 | 建议 static | 建议 behavior | Browser |
|----------|----|----------|-------------|---------------|---------|
| `react-vitest-min` | React + Vitest + TypeScript | `package.json` scripts: `typecheck`, `build`/`vite build`, `test`；`src/**/*.tsx` | `npm run typecheck`（+ build 若存在） | `npm test` / `npx vitest run` | not-run |
| `nextjs-min` | Next.js（App Router 信号） | `app/` 或 `pages/` + `"next"` dependency；`"use client"` 边界样例 | `npm run typecheck` / `next build`（temp only） | 聚焦 unit/component test，**不** `next start` 作完成证据 | not-run |
| `vue-vitest-min` | Vue 3 + Vitest | `*.vue` + vitest config | `npm run typecheck` 或 `vue-tsc` | `npm test` | not-run |

## 临时项目生成约定（M1+ 实施）

```text
ROOT="$(mktemp -d "${TMPDIR:-/tmp}/fe-eval-XXXXXX")"
# 从 docs/templates/frontend-eval/fixtures/... 渲染 package.json / 源文件骨架
# npm install --prefix "$ROOT"   # 仅 temp
# 在 $ROOT 执行冻结 verify 命令
# rm -rf "$ROOT"
```

约束：

- fixture **不得**内嵌密钥、真实 PII、恶意脚本。  
- 依赖版本钉死在 fixture 清单，避免 eval 漂移。  
- 不得 `npm link` 工作区 loop-agent 作为被测 app 依赖（controller 版本另按任务约束）。

## 与 functional / failure fixtures 映射

| fixture 类别 | 优先 target |
|--------------|-------------|
| simple component / style | react-vitest-min, vue-vitest-min |
| form validation | react-vitest-min |
| list/detail | react-vitest-min, nextjs-min |
| API + Mock | react-vitest-min（+ MSW 骨架） |
| permission UI | react-vitest-min, nextjs-min |
| SSR / server-client boundary | nextjs-min |
| shared component API | react-vitest-min |
| pure local no-remote | 任一 |
| failure: type/build | 任一 |
| failure: mock production-on | react-vitest-min + mock 骨架 |

## 明确不做

- 不在本仓库 `website/**` 或 examples 中落永久 dogfood app 作为 M0 必需项。  
- 不把 `scripts/check-repo.sh` 全量当作前端 app 验证。  
- 不提交 temp 安装树或截图基线。
