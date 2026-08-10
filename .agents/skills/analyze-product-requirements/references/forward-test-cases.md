# Forward-Test Cases

在独立 agent 中逐个执行，不提供预期正文，只核对不变量。

## Case 1：无需澄清

```text
Use $analyze-product-requirements --target frontend.
需求：登录用户在个人资料页修改自己的昵称；昵称 2–20 个字符；保存失败时保留输入并允许重试；不修改头像。
```

核对：三个产物都在 `<project-root>/docs/product-analysis/<requirement-id>/`；三者 `analysis_scope` 均为 `frontend`；Product Analysis 为 `no-clarification-required` 且不含正式 AC；Clarification 使用三章精简结构且没有 BR/Q/DEC；Product Requirement 为 complete；故事与同 ID 输出规范一一对应。

## Case 2：需要逐题澄清

```text
Use $analyze-product-requirements target=both.
需求：管理员可以导出用户数据。
```

核对：先列 3–6 个分支；从管理员角色和敏感字段范围开始；每轮先推荐再只问一个主要问题；收到回答后重新识别模糊点；`clarification_rounds` 和问题轮次一致且最多为 3。第 3 轮后仍有 P0/P1 时保持 pending，不再提问、不自行补全；不得回写 Product Analysis。

## Case 3：后端 API 业务需求

```text
Use $analyze-product-requirements target=backend.
需求：登录用户查询自己订单的退款状态，失败时看到可理解原因，内部错误不得泄露。
```

核对：BE 故事只保留能力、使用方、价值、触发方式和 AC 引用；同 ID 输出规范明确输入输出语义、权限和规则；不虚构最终 URL、HTTP 方法、DTO 或代码落点。

## Case 4：非 API 后端任务

```text
Use $analyze-product-requirements target=backend.
需求：每天归档 90 天前已完成通知，重复执行不得重复归档。
```

核对：触发方式明确为定时任务；包含批次、幂等、并发和失败恢复；不会把它误标为 API。

## Case 5：回答仍然模糊

```text
Use $analyze-product-requirements target=both.
需求：管理员可以导出用户数据。
第一轮询问导出字段范围时，用户回答：敏感字段按实际情况处理。
```

核对：不得把该回答标记为 confirmed；保留原始回答，最终决策写“未形成”并说明无法确定的字段；当前分支保持 unresolved；下一轮继续当前分支并明确指出手机号、邮箱等字段仍未确定，给出可直接确认的推荐方案；不得跳到文件格式或导出入口。

## Case 6：下一轮消除模糊

```text
沿用 Case 5。下一轮用户回答：导出邮箱，不导出手机号和身份证号。
```

核对：形成唯一字段规则并标记 confirmed；最终决策明确列出包含和排除字段；当前分支 resolved；重新扫描其他剩余问题和该回答新引入的模糊点；仅在仍会影响范围、规则、输出或验收时进入下一轮。

## Case 7：代码事实不得泄漏到最终需求

```text
Use $analyze-product-requirements target=backend，并提供一个仓库。
需求：仅管理员可以导出用户数据。仓库中现有权限判断位于 src/auth/permission.ts，使用 role=admin。
```

核对：Product Analysis 可记录 `CODE-FACT-*`、证据路径和现状；Clarification 可引用该证据辅助判断，但不得把现状自动视为目标决策；Product Requirement 只写“仅管理员可以导出用户数据”等产品规则，不包含 `CODE-FACT-*`、`src/auth/permission.ts`、`role=admin`、代码符号、模块结构或当前实现过程。
