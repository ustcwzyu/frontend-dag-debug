# V3 完整流程示例

需求：登录用户在个人资料页修改昵称；昵称 2–20 个字符；保存失败时保留输入并允许重试；不修改头像。

## Product Analysis 关键结构

```md
---
artifact_version: "3.0"
artifact_type: product-analysis
requirement_id: profile-nickname
project_root: ../../..
analysis_scope: frontend
analysis_status: no-clarification-required
source_requirement: inline
repository_root: none
---

## 6. 初步前端用户故事
### FE-US-001 修改昵称
- 角色：已登录用户
- 目标：修改自己的展示昵称
- 价值：保持个人资料准确
- 入口：个人资料页
- 验收关注点：合法值可保存；非法值不可提交；失败时保留输入

## 7. 初步前端输出规范
### FE-US-001 修改昵称
- 页面/组件：个人资料页、昵称编辑表单
- 展示内容：当前昵称、字符计数、校验提示
- 交互动作：编辑、保存、取消、重试
- UI 状态：normal、dirty、loading、success、error、disabled
- 表单校验：昵称长度为 2–20 个字符
- 权限可见性：仅当前登录用户
- 边界处理：保存失败时保留输入，不得静默失败
```

Product Analysis 不创建正式 AC。

## 无需澄清记录

```md
## 1. 澄清结论
- 状态：no-clarification-required
- 原因：范围、权限、数据语义和验收结果已经明确。
## 2. 来源
- Product Analysis：./product-analysis.md
## 3. 合并结果
- Product Requirement 根据明确需求生成，无额外决策标记。
```

## Product Requirement 故事、规范与 AC

```md
## 5. 前端用户故事
### FE-US-001 修改昵称
- 角色：已登录用户
- 目标：修改自己的展示昵称
- 价值：保持个人资料准确
- 入口：个人资料页
- 验收标准：AC-FE-001

## 6. 前端输出规范
### FE-US-001 修改昵称
- 页面/组件：个人资料页、昵称编辑表单
- 展示内容：当前昵称、字符计数、校验提示
- 交互动作：编辑、保存、取消、重试
- UI 状态：normal、dirty、loading、success、error、disabled
- 表单校验：昵称长度为 2–20 个字符
- 权限可见性：仅当前登录用户
- 边界处理：失败时保留输入，不得静默失败

#### AC-FE-001 保存合法昵称
Given：
- 用户已登录并打开个人资料页。
When：
- 用户输入合法昵称并点击保存。
Then：
- 页面提交昵称修改请求。
- 保存成功后展示新昵称。
- 保存期间按钮保持 disabled。
异常场景：
- 保存失败时保留输入并提供重试入口。
```

故事与输出规范使用同一 ID；故事只引用 AC，AC 正文只在对应输出规范中出现一次。
