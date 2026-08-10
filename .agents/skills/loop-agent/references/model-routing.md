# 模型配置与路由

查看或修改 loop-agent model 默认值、Agent DAG `executorModels` 或 Pi model/provider 设置时使用本文。

## 模型配置

模型设置来自 repo `harness.json`。历史 `models.<step>` 只作为旧 task metadata 兼容读取；新 DAG work 不从这里路由模型。

示例模型记录：

```json
{
  "provider": "wizard-local",
  "model": "gpt-5.3-codex-spark"
}
```

Agent DAG node 的模型来自 DAG JSON 中的 `executorModels`，并由 `dag validate --strict-models` 检查 canonical matrix 漂移。若变更模型配置，须同步更新 `harness.json`、相关测试、repo docs 与本 skill。

`executorModels.pi` 的每档值支持两种形式：裸模型名继续走内置映射或默认 `wizard-local`；`provider/model` 限定引用则显式选择 Pi provider，只在第一个 `/` 处分割并保留模型 ID 的剩余部分。provider 定义与凭证仍归 Pi 的 `~/.pi/agent/models.json` 和环境配置所有。例如不同档可分别写 `wizard-local/glm-5.2` 与 `deepseek/deepseek-v4-flash`。

`pi-prompt` 是独立 one-shot helper，不使用 `harness.json.models` 或 DAG `executorModels`。当前默认是 `wizard-local/glm-5.2`；高复杂度 one-shot 显式传 `--model gpt-5.5`。Agent DAG `pi` executor 的 canonical matrix 保持；读写 profile 共用同一矩阵：

```json
{
  "LOW": "gpt-5.3-codex-spark",
  "MED": "gpt-5.5",
  "HIGH": "gpt-5.5"
}
```

始终信任当前 repo config，而非硬编码示例：
```bash
loop-agent inspect
```
并在输出中核对 `models` 与 Agent DAG 文档中的 `executorModels` 约定。

Pi SDK runtime reuse 仍为 **default-off**（`CODE_AGENT_PI_REUSE_RUNTIME` 未设/`off`/未知）。opt-in 须显式 `auto-run`；`CODE_AGENT_PI_BACKEND=cli-only` 绕过 reuse。无 live call 的确定性 M2/M3 decision 摘要用 `pi-reuse-benchmark`（见 `command-reference.md`）。
