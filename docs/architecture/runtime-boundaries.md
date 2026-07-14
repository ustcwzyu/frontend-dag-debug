# Runtime Boundaries

本文定义 `frontend-dag-debug` 的 runtime 层边界、允许的依赖方向和治理检查入口。初始化版本是语言中立（language-neutral）模板；初始化模型应根据目标项目真实目录和技术栈补充具体层名、模块边界和例外。

## 默认分层

```text
Interface / Entry layer
  └─ CLI、HTTP API、UI 页面、job 入口或其他用户/系统入口

Application / Use-case layer
  └─ 一次用户意图或业务动作的编排接口

Domain / Workflow layer
  └─ 核心业务规则、状态机、工作流或领域模型

Executors / Integrations layer
  └─ 外部工具、SDK、数据库、消息队列、浏览器、模型或 shell 适配

Worker adapter layer (optional)
  └─ 产品线 TaskSpec / Task Pool / local Observe 适配；通过已发布 loop-agent CLI 执行，不在进程内耦合 target command 或 application 层

Infrastructure / Store layer
  └─ 文件系统、数据库、缓存、运行事实、原子写入和生命周期副作用

Governance layer
  └─ scripts/check-*.sh、CI、文档审计、边界检查和验证矩阵
```

## 依赖方向

- Entry layer 可以依赖 Application / Use-case layer。
- Application / Use-case layer 可以依赖 Domain / Workflow、Infrastructure 和 Integrations。
- Domain / Workflow layer 不应依赖 Entry layer 的格式化、argv、HTTP/UI 细节。
- Executors / Integrations 不应依赖 Entry layer 的输出格式。
- Worker adapter 应把 `.harness/task-pool/` 作为独立运行事实区；它通过 CLI/subprocess contract 调用 loop-agent，不能复制或直接耦合 target command/application 实现。
- Infrastructure / Store 应集中副作用，不把 raw path mutation 或持久化细节扩散给上层。

## 目标项目适配

初始化后请根据真实项目结构补充：

- 入口目录和入口文件。
- 核心业务/domain/workflow 模块。
- infrastructure/store/integration 模块。
- 允许的例外、迁移计划和对应验证命令。

## Governance hooks

```bash
bash scripts/check-architecture-boundaries.sh
bash scripts/check-repo.sh
```

`scripts/check-architecture-boundaries.sh` 是保守模板：只有当目标项目存在可识别目录时才启用对应 import 检查。不要为了通过脚本删除真实边界问题；应更新本文或修正依赖方向。
