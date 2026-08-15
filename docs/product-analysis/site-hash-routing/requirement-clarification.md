---
artifact_version: "3.0"
artifact_type: requirement-clarification
requirement_id: site-hash-routing
project_root: ../../..
source_requirement: ./source-requirement.md
source_product_analysis: ./product-analysis.md
clarification_status: complete
---

# 需求澄清记录：单页站点拆分为多路由页面

## 澄清问题（P1 级）

### P1-1 路由形态

问题：路由用哪种形态？

- 选项 A：Hash 路由（`#/`、`#/lesson/beginner`），零依赖，纯前端模块，无需 server 改动。
- 选项 B：History API 真路径（`/`、`/lessons/beginner`），URL 更干净，依赖 server SPA fallback 与 vite 配置。

用户决策（DEC-SR-001）：**Hash 路由，零依赖**。不支持降级到主页。

### P1-2 页面划分

问题：页面怎么划分？

- 选项 A：两页（主页 + 课程页），进度面板留主页。
- 选项 B：三页（主页 / 课程 / 进度）。

用户决策（DEC-SR-002）：**登录也要一个页面吧，然后主页、课程、进度**——共四页：
- `#/login` 登录/注册页
- `#/` 主页（hero + 路线选择 + 能力地图 + 本周实验）
- `#/lesson/:routeId` 课程页（第一课阅读区）
- `#/progress` 进度页（进度面板 + 学习会话工作台）

### P1-3 测试契约变化

问题：路由化必然重构 main.ts 结构，现有测试断言如何处理？

- 选项 A：接受测试更新——homepage/frontend-api 部分源正则断言随结构变化更新，由实现同步维护新断言。
- 选项 B：尽量零改动——用源文本顺序技巧，路由化靠显示/隐藏实现，拆分不彻底。

用户决策（DEC-SR-003）：**接受测试更新**。但架构裁决断言（main.ts 无 fetch/localStorage/XMLHttpRequest/location.reload 字面量、课程区无交互控件、style.css 恰 1 处 @keyframes、:focus-visible 3px coral、prefers-reduced-motion、en dash 60–90 分钟、零网络/零账号文案、README 断言）必须保持绿色。

## 默认假设（未提问，按分析结论）

- 未知 hash → 404 兜底页 + 返回主页链接。
- 已登录访问 #/login → 自动跳转 #/progress。
- 未登录访问 #/progress → 显示"请先登录"提示与登录链接，不强制跳转。
- 内容数据（routes/capabilities/lab/lesson）由 loadCourseContent 首次加载后模块级缓存，多页共享，不重复 fetch。
- 课程页 builder/advanced 无内容：空锚点占位 + "内容筹备中"提示（保持 homepage 锚点断言语义）。
- 路由切换不丢失登录态与工作台草稿（auth 模块变量 + localStorage 保持）。

## 未决事项

无。
