---
artifact_version: "3.0"
artifact_type: product-requirement
requirement_id: task-stats-api-frontend
project_root: ../../..
requirement_status: complete
analysis_scope: frontend
source_requirement: ./source-requirement.md
source_product_analysis: ./product-analysis.md
source_clarification: ./requirement-clarification.md
---

# 产品需求：前端任务统计展示

## 1. 需求概述

任务看板通过 request adapter 调用既有统计 API，展示服务返回的任务计数；请求失败时保留本地统计。后端仅作为接口文档契约，不在本需求实现。

## 2. 业务目标

- 提供清晰可恢复的服务统计反馈。
- 允许开发和测试模拟真实接口成功与失败。

## 3. 需求范围

### 3.1 已确认需求

- API 契约来源：`../task-stats-api/api-documentation.md`（只读）。
- 仅实现前端 UI、适配器、dev/test mock 和测试。
- 不改变任务编辑、筛选和 localStorage 行为。

### 3.2 非目标

- 后端 handler、数据库、认证、部署和真实后端联调。

### 3.3 默认假设

- API base URL 和字段以只读 API 文档为准；请求适配器默认使用真实请求，mock 仅显式 dev/test 启用。

### 3.4 未决事项

无。

## 4. 业务规则

- 统计输入为完整任务快照，筛选不改变输入。
- 请求失败不清空任务、不把本地统计静默替换为 0。
- mock 验证不代表真实后端联调完成。

## 5. 前端用户故事

### FE-US-001 展示服务任务统计

- 角色：任务看板使用者
- 目标：查看当前任务快照的服务统计，并在服务不可用时继续使用本地统计
- 价值：统计反馈清晰且可恢复
- 入口：打开任务看板、添加任务或切换完成状态
- 验收标准：AC-FE-001、AC-FE-002

## 6. 前端输出规范

### FE-US-001 展示服务任务统计

- 页面/组件：现有任务看板统计区域
- 展示内容：总数、待完成数、已完成数和服务状态提示
- 交互动作：任务变化触发 `POST /api/v1/tasks/summary`；筛选不改变请求快照
- UI 状态：loading、success、empty、error
- 表单校验：沿用现有任务标题非空规则；仅发送 API 契约规定的任务快照
- 权限可见性：本地页面对所有访问者可见
- 边界处理：失败保留本地计数和任务数据；空列表显示三个 0

#### AC-FE-001 服务成功时展示统计

Given：
- 当前有 2 个待完成和 1 个已完成任务。
- 统计 transport 可返回成功响应。

When：
- 页面加载或任务状态变化触发统计请求。

Then：
- 页面展示服务返回的 `total=3`、`pending=2`、`done=1`。
- 请求期间显示 loading，请求完成显示 success。
- 切换筛选不改变数字。

异常场景：
- 请求失败时保留本地统计并显示服务不可用提示。

#### AC-FE-002 空列表和失败可恢复

Given：
- 列表为空或统计 transport 暂不可用。

When：
- 请求空快照或请求失败，随后服务恢复且发生下一次任务变化。

Then：
- 空列表显示 `total=0`、`pending=0`、`done=0`。
- 失败显示“统计服务暂不可用”并保留本地统计。
- 恢复后下一次变化可重新成功。

异常场景：
- 错误 JSON 或非 2xx 不得清空任务、白屏或把本地计数静默替换为 0。

## 7. 决策追溯

无澄清决策；范围来自 `./source-requirement.md`，API 字段来自只读 API 文档。
