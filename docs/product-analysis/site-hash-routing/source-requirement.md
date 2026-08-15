---
artifact_type: source-requirement
requirement_id: site-hash-routing
project_root: ../../..
---

# 原始需求：单页站点拆分为多路由页面

用户原话："能不能把现在的内容分一下路由 单页很挤"——当前 Agent 学习实验室是单页 SPA（hero、路线选择、第一课完整课程区、能力地图、本周实验、进度面板、学习会话工作台全部堆在一个页面里），需要按内容拆分路由，缓解单页拥挤。

用户澄清（DEC-SR-001~003）：
- DEC-SR-001：路由形态 = Hash 路由（零依赖，无 history API / server 改动）；不支持降级到主页。
- DEC-SR-002：页面划分 = 四页：登录页（#/login）、主页（#/）、课程页（#/lesson/:routeId）、进度页（#/progress）。
- DEC-SR-003：路由化必然重构 main.ts 结构，现有测试源正则断言（homepage.test.mjs / frontend-api.test.mjs）接受随结构变化更新；但架构裁决（main.ts 无 fetch/localStorage 字面量、课程区无交互控件、style.css 恰 1 处 @keyframes 等）保持。

用途：第二轮前端需求，验证本项目前端实现工作流（frontend-implementation 任务类型）全链路。
