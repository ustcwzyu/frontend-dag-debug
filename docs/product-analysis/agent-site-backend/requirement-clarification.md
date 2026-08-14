---
artifact_version: "3.0"
artifact_type: requirement-clarification
requirement_id: agent-site-backend
project_root: ../../..
analysis_scope: both
source_product_analysis: ./product-analysis.md
requirement_status: complete
total_clarification_rounds: 3
---

# Requirement Clarification：Agent 学习实验室后端服务

## 澄清总览

共 3 轮澄清。所有 P0/P1 决策均已确认，无未决阻断项；无 P2 延后项。

## 第 1 轮：交付形态、技术栈与需求文档

### Q-001 后端承担职责

- 推荐答案：完整 API 服务（数据 API + 持久化 + 前端改造，做成完整前后端项目）。
- 用户回答：完整 API 服务。
- 最终决策：交付完整 API 服务——数据 API + SQLite 持久化 + 前端改造。DEC-Q-001
- 目标位置：PRD 需求概述、需求范围；FE-US-*；BE-US-*。

备选：仅做数据 API、仅做进度持久化、仅搭骨架——均被用户否决。

### Q-002 后端技术栈

- 推荐答案：Node.js + Express（与现有 TypeScript/Vite 同语言，类型可共享）。
- 用户回答：Node.js + Express。
- 最终决策：后端使用 Node.js + Express + TypeScript。DEC-Q-002
- 目标位置：PRD 默认假设、BE-US-* 输出规范。

### Q-003 是否有现成需求文档

- 用户回答：没有，先帮我分析设计。
- 最终决策：由本流程先产出 Product Analysis → Clarification → Product Requirement → Dependency Analysis → API Documentation，再进入实现 DAG。DEC-Q-003
- 目标位置：本 requirement 产物链条。

## 第 2 轮：持久化与契约变化

### Q-004 后端持久化方式

- 推荐答案：JSON 文件存储（零额外依赖）。
- 用户回答：SQLite。
- 最终决策：持久化使用 SQLite；基于 Node v26 原生 `node:sqlite`（CODE-FACT-006 实测可用），不引入额外原生依赖。DEC-Q-004
- 目标位置：PRD 默认假设、BE-US-003 数据读写。

### Q-005 现有首页测试「零网络请求、课程数据内联」断言是否接受更新

- 推荐答案：接受契约变化。
- 用户回答：接受契约变化（推荐）。
- 最终决策：站点由「零后端」变为「有后端」，首页测试中基于源码内联的断言按新契约更新；课程内容断言改从服务端契约与降级兜底数据验证。DEC-Q-005
- 目标位置：PRD 需求范围、非目标；FE-US-001 验收标准。

## 第 3 轮：内容范围、进度语义与降级策略

### Q-006 哪些内容搬去后端

- 推荐答案：数据走 API，第一课保持静态。
- 用户回答：全部内容 API 化。
- 最终决策：路线、能力地图、本周实验与第一课完整课程内容全部由后端 API 提供；前端加载成功后用服务数据渲染。DEC-Q-006
- 目标位置：PRD 已确认需求；FE-US-001；BE-US-001；API 文档 lesson 端点。

### Q-007 学习进度持久化语义（站点无账号体系）

- 推荐答案：匿名 clientId + 进度。
- 用户回答：简易账号登录。
- 最终决策：新增简易账号登录（本地演示用，用户名+密码，无邮箱/验证码/找回），登录后按用户保存学习进度；进度含第一课完成状态、评估分、本周实验完成标记。DEC-Q-007
- 目标位置：PRD 已确认需求；FE-US-002/FE-US-003；BE-US-002/BE-US-003。

### Q-008 后端服务不可用时前端表现

- 推荐答案：降级内联兜底。
- 用户回答：降级内联兜底（推荐）。
- 最终决策：API 失败（网络错误或非 2xx）时前端回退内联数据渲染，页面照常可用并提示「服务不可用」；进度保存失败仅提示不清空本地状态。DEC-Q-008
- 目标位置：PRD 业务规则；FE-US-001 验收标准；前端输出规范边界处理。

## 决策汇总

| 决策 | 内容 | 影响 |
|---|---|---|
| DEC-Q-001 | 完整 API 服务：数据 API + 持久化 + 前端改造 | 范围与用户故事 |
| DEC-Q-002 | Node.js + Express + TypeScript，与前端同语言 | 技术栈与依赖 |
| DEC-Q-003 | 无现成需求文档，由本流程生成契约链 | 产物流程 |
| DEC-Q-004 | SQLite 持久化（Node 原生 node:sqlite） | 后端存储 |
| DEC-Q-005 | 接受契约变化：测试断言按新契约更新 | 前端测试 |
| DEC-Q-006 | 全部内容 API 化（含第一课） | 内容端点与前端渲染 |
| DEC-Q-007 | 简易账号登录 + 按用户进度 | 认证端点与进度端点 |
| DEC-Q-008 | API 失败时内联兜底 + 服务不可用提示 | 前端降级行为 |