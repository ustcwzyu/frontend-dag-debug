---
artifact_version: "3.0"
artifact_type: product-analysis
requirement_id: task-stats-api-frontend
project_root: ../../..
analysis_scope: frontend
analysis_status: no-clarification-required
source_requirement: ./source-requirement.md
repository_root: ../../..
---

# 产品分析：前端任务统计展示

## 1. 原始需求

原始输入见 `./source-requirement.md`；后端契约只读引用 `../task-stats-api/api-documentation.md`。

## 2. 需求概述

任务看板通过可替换请求适配器消费统计 API，并在请求不可用时保持本地可用性；实现范围限定为前端。

## 3. 业务目标

- 展示服务统计的 loading、success、empty 与 error 状态。
- 允许开发和测试用 mock 复现成功及失败响应。
- 保持筛选、任务编辑和 localStorage 行为不变。

## 4. 需求分析

### 4.1 明确需求

- 仅生成前端故事，不生成后端故事或实现映射。
- API 方法、路径、请求和响应字段以只读 API 文档为准。
- 任务变化触发请求，筛选变化不改变统计输入。
- 请求失败使用本地统计兜底并提示服务不可用。
- mock 显式 dev/test-only，production 默认关闭。

### 4.2 推断需求

- 请求适配器允许测试注入成功和失败 transport。
- 真实请求路径保留，mock 不得默认进入 production。

### 4.3 待确认问题

无；API 字段和错误结构由只读文档确定。

### 4.4 初步非目标

- 后端实现、真实联调、认证、数据库和部署。

## 5. 外部事实

### 5.1 知识库事实

- 状态：not-integrated。

### 5.2 代码库事实

- `CODE-FACT-001`：任务类型、统计和初始化入口位于 `src/task-board.ts`；页面组装由 `src/main.ts` 完成。
- `CODE-FACT-002`：仓库使用 Vite + TypeScript 和 Node.js 内置测试运行器。
- `CODE-FACT-003`：当前没有后端目录或现成统计 request adapter。

## 6. 初步前端用户故事

### FE-US-001 展示服务任务统计

- 角色：任务看板使用者
- 目标：查看当前任务快照的服务统计，并在服务失败时继续查看本地统计
- 价值：获得稳定、可验证的统计反馈
- 入口：打开页面、添加任务或切换完成状态
- 验收关注点：成功、loading、empty、error、筛选不影响快照

## 7. 初步前端输出规范

### FE-US-001 展示服务任务统计

- 页面/组件：现有任务看板统计区域
- 展示内容：总数、待完成数、已完成数和服务状态提示
- 交互动作：任务快照变化后自动请求；筛选仅影响可见列表
- UI 状态：loading、success、empty、error；失败保留本地计数
- 表单校验：沿用现有任务标题规则；发送 API 文档规定的任务快照
- 权限可见性：本地页面对所有访问者可见
- 边界处理：空列表显示 0；失败不得清空任务或静默归零
- 依赖：只读 API 文档和 request adapter/mock
