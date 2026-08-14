# Agent 学习实验室 — 前端改造 PRD

## 来源与任务类型

- 来源：用户会话，2026-08-10。原始要求：“改造一下项目，改成一个学习Agents相关内容的网站”。
- 任务类型：`frontend-implementation`。
- 目标受众：已掌握基本编程、准备系统学习 AI Agent 构建方法的中文开发者。
- 页面唯一任务：让访问者在 5 分钟内理解 Agent 学习版图，选择一条路线，并开始第一课。

## 设计命题

网站名为「Agent 学习实验室 / Agent Learning Lab」。它不是产品营销页，也不是一组没有关系的课程卡片；页面本身应像一次可观察的 Agent run。

视觉系统：

- Mist `#E7EEF2`：主纸面背景。
- Ink `#10263A`：主要正文与结构线。
- Deep Navy `#0B1B2A`：深色执行轨迹面板。
- Signal Coral `#FF5A36`：唯一高优先级动作色。
- Spring `#9FE3C2`：成功/已掌握状态。
- Circuit Lilac `#C9C4FF`：工具/记忆辅助状态。
- 显示字：`Arial Narrow` / `Aptos Narrow` / `DIN Condensed` 本机 fallback；正文：`PingFang SC` / `Microsoft YaHei` / system-ui；数据与标签：ui-monospace。
- 不使用渐变、外部字体、远程图片或第三方 UI 库。

布局方向：

```text
┌─ header: wordmark ───────────── anchors ─── status ┐
├───────────────────────┬─────────────────────────────┤
│ thesis + route CTA    │ interactive Agent run trace │
│ large condensed type  │ input → plan → tools → eval │
├───────────────────────┴─────────────────────────────┤
│ path switcher + one changing curriculum detail      │
├──────────────────────────┬──────────────────────────┤
│ capability field guide   │ weekly build / checklist │
├──────────────────────────┴──────────────────────────┤
│ final CTA + concise footer                           │
└─────────────────────────────────────────────────────┘
```

页面记忆点是右侧“执行轨迹图”：四个真实阶段通过结构线连接，活动 token 沿路径移动；切换学习路线后，节点标签、状态和推荐课程内容同步更新。动画仅在未启用 `prefers-reduced-motion` 时运行。

## 范围

允许交付：

- 更新 `index.html` 的语言、标题、描述和主题色。
- 重构 `src/main.ts` 为完整语义化单页，并实现本地学习路线切换交互。
- 重构 `src/style.css` 为响应式视觉系统。
- 更新 `public/favicon.svg` 为代码原生的 Agent 节点图标。
- 更新 `test/homepage.test.mjs`，并仅调整 `test/task-board.test.mjs` 中与旧首页挂载强绑定的断言。
- 更新 `README.md` 的人类维护项目概览、目录和验证说明；必须保留 loop-agent managed block 原样。

## 非目标

- 不实现后端、登录、支付、搜索服务、真实课程播放、学习进度云同步或多页路由。
- 不请求或臆造 API / Mock 契约；Mock 策略应为 `not-needed`。
- 不删除或编辑 `src/task-board.ts`；其纯函数和独立测试继续保留，旧任务看板仅不再挂载到首页。
- 不修改 `.harness/**` 运行事实、`ai_workspace/**`、`.agents/**`、`scripts/**`、`package.json` 或依赖锁文件。
- 不发布、不部署、不提交或推送 Git。

## 需求与业务规则

### REQ-AGENT-001 — 清晰的学习站点身份

首页必须以「Agent 学习实验室」作为产品身份，并用“让 Agent 不再靠运气工作”或同等清晰的主张说明学习目标。首屏包含直接跳到学习路线的主 CTA 和查看能力地图的次 CTA。

### REQ-AGENT-002 — 可选择的三条学习路线

提供“入门 / 构建 / 进阶”三条路线。每条路线有明确受众、预计周期、课程数量、阶段列表与可执行的第一课动作。

### REQ-AGENT-003 — Agent 核心能力内容

内容至少覆盖模型与提示、工具调用、记忆与上下文、规划与编排、评估与可观测性、安全与边界六类能力；文案从学习者可控制和可验证的角度书写。

### REQ-AGENT-004 — 执行轨迹视觉签名

首屏展示输入、计划、工具、评估四阶段 Agent run trace。轨迹必须编码真实概念和状态，不只是装饰；学习路线切换时轨迹或其状态文字应同步变化。

### REQ-AGENT-005 — 真实实践入口

展示一个“本周实验”项目，目标为构建一个会查资料、带引用回答并能接受评估的研究助手；明确输入、工具、成功标准和约 45 分钟时长。

### REQ-AGENT-006 — 响应式与可访问性

桌面与 390px 移动视口均无横向溢出、裁切或遮挡。交互使用原生 button/link；路线按钮暴露 `aria-pressed`，所有焦点可见，颜色对比可读，并尊重 `prefers-reduced-motion`。

### REQ-AGENT-007 — 站点元数据与项目说明

`index.html` 使用 `lang="zh-CN"`，标题与描述准确描述 Agent 学习网站；favicon 与视觉主题一致。README 人类维护区更新为新站点说明与当前验证命令。

### BR-AGENT-001 — 静态、本地、确定性

所有路线与课程数据保存在前端源码中；页面无网络请求、无第三方运行时依赖。切换路线不会写 localStorage 或发送数据。

### BR-AGENT-002 — 路线交互一致性

任一时刻恰好一个路线按钮为选中状态。点击其他路线后，`aria-pressed`、活动样式、路线名称、周期、课程数、简介和阶段列表在同一交互中更新；主 CTA 指向当前路线的第一课锚点。

### BR-AGENT-003 — 文案与术语

界面中文优先，保留 Agent、Tool、Memory、Eval 等必要英文术语并给出中文语境；禁止空洞营销词、伪造学员数、评分、合作品牌或课程完成数据。

### BR-AGENT-004 — 旧调试 UI 退出首页

新首页不再显示 `hello world`、问候弹窗、旧任务看板或“刷新列表”。`src/task-board.ts` 保留不动，避免把首页替换扩大成历史功能删除。

## 验收标准

### AC-AGENT-001 — 首屏导航与主张

Given 访问者打开首页，When 页面完成加载，Then 可见站点名、核心主张、两类 CTA、课程路线/能力地图/实践项目导航，且首屏不是旧 hello world 调试界面。

### AC-AGENT-002 — 默认路线

Given 页面首次加载，When 未做选择，Then “入门”路线为唯一 `aria-pressed="true"` 的选项，详情显示适合首次构建 Agent 的受众、周期、课程数和第一课。

### AC-AGENT-003 — 路线切换

Given 当前为入门路线，When 点击“构建”或“进阶”，Then 选中状态与详情内容同步变化，并保持恰好一个路线被选中；页面不刷新且不发起网络请求。

### AC-AGENT-004 — 内容覆盖

Given 访问者浏览完整页面，When 查看能力地图，Then 能找到模型/提示、Tool、Memory、规划、Eval/可观测性、安全/边界六类具体学习主题。

### AC-AGENT-005 — 执行轨迹与本周实验

Given 访问者查看首屏轨迹和实践区，When 阅读结构信息，Then 轨迹包含输入/计划/工具/评估四阶段及可辨识状态，本周实验包含研究助手目标、输入、工具、成功标准和 45 分钟时长。

### AC-AGENT-006 — 桌面视觉

Given 视口约 1440×900，When 浏览页面与切换路线，Then hero 采用不对称双栏，结构线与内容对齐，无 overlap、clipping 或不可读文本，浏览器 console 无 error。

### AC-AGENT-007 — 移动视觉

Given 视口 390×844，When 浏览首屏、路线、能力和实践区，Then 内容变为清晰单列或可控布局，无横向 overflow，按钮可点击，文字不裁切。

### AC-AGENT-008 — 键盘与动效偏好

Given 只使用键盘，When Tab 到路线按钮与链接并触发，Then 可见 focus 状态且路线能切换；Given 系统启用 reduced motion，Then 轨迹动画与平滑滚动被禁用。

### AC-AGENT-009 — 硬验证

Given writer 完成每个行为切片，When 运行聚焦测试，Then 先有符合预期的 RED 再进入 GREEN；最终 `npm test`、`npm run typecheck`、`npm run build` 均退出 0。

## 写入边界与受保护改动

允许路径仅为：

- `index.html`
- `src/main.ts`
- `src/style.css`
- `public/favicon.svg`
- `test/homepage.test.mjs`
- `test/task-board.test.mjs`
- `README.md`

禁止路径至少包括：

- `.harness/**`
- `.agents/**`
- `ai_workspace/**`
- `scripts/**`
- `src/task-board.ts`
- `package.json`
- `package-lock.json`
- `artifacts/**`

工作区中现有初始化迁移、skills、governance docs、旧 DAG facts、`src/task-board.ts` 与其纯函数测试均为受保护用户改动。writer 只能在上述允许路径中完成本需求，并必须保留 README managed block。

## 验证命令

- `npm test`
- `npm run typecheck`
- `npm run build`

浏览器补充验收：`npm run dev -- --host 127.0.0.1` 后检查 `http://127.0.0.1:5173/` 的 1440×900 与 390×844 视口、路线点击/键盘、横向 overflow、console errors 与 reduced-motion 样式。
