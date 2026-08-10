# Backend Test DAG Generate Pytest Prompt Template

## Purpose

供 `generate-backend-pytest-pi` 使用。该节点是 `executor: "pi"`、`role: "implementer"`、`toolProfile: "write"` 的受限 writer，只把经过独立 Review 和 advisory Markdown 校验的最终用例转换为 pytest 资产；第 4 节点报告为 FAIL 时仍继续，但不得据此发明缺失行为。

## 当前合同

- 输入：最终 `testcase/md/**`、run-owned 环境报告与 Markdown 校验报告，以及有界的 pytest config / `conftest.py`。
- 禁止重新读取 `source/**`、新增测试场景、重新分配 AC、执行 pytest、修改生产代码/配置或输出业务 JSON。
- 写入范围：`testcase/**/test_*.py`、`testcase/**/helpers/**`、`testcase/**/factories/**`。
- pytest 可以使用模块级 `test_*` 函数，也可以使用 pytest 测试类中的 `test_*` 方法；不得为了追溯强迫目标项目放弃现有 class-based 风格。
- 每个最终 Markdown Case ID 必须出现在至少一个真实测试函数/方法区域中，优先同时出现在函数/方法名和 docstring：

```python
class TestOrderApi:
    def test_BE_ORDER_001_create_order(self) -> None:
        """BE-ORDER-001 创建合法订单。"""
        ...
```

- 断言只来自 `### 预期结果` / `### Expected Results`；setup 只来自必选 `### 前置条件`，以及存在时的 `### 测试数据`、`### 自动化映射` 或对应历史英文分节。
- 每条可自动化 Case 应在 `自动化映射` / `Automation Notes` 明确写出目标 pytest 脚本；第 6 节点只扫描这些脚本，不递归扫描无关历史 `test_*.py`。
- 每次接口请求必须通过统一日志 helper 或等价 client wrapper 打印请求与响应诊断信息：请求日志至少包含 HTTP method、URL/path、query 与 JSON/body/payload 参数摘要；响应日志至少包含 status code 与 JSON/text/body 结果摘要。日志必须能出现在 pytest stdout/stderr，不能改变断言或把失败伪装成通过。
- 日志输出前必须递归脱敏 `authorization`、`proxy-authorization`、`cookie`、`set-cookie`、`token`、`password`、`secret`、`api key`、`credential` 等 key/header；禁止打印完整 Authorization/Cookie。序列化后的 request/response body 必须有明确长度上限和截断标识，避免大对象淹没 pytest/pytest-html/报告证据。
- 禁止 `skip` / `xfail`、吞断言、宽异常静默通过、mock 替代真实目标、删除用例或弱化断言。
- best-effort 清理只能捕获所选 HTTP client 实际抛出的窄 transport exception，例如 `requests.RequestException` 或 `urllib.error.URLError`；禁止 `except:`、`except Exception`、`except BaseException` 后 `pass`。
- 同一 Case ID 可以由多个 pytest 函数覆盖；额外映射会进入 traceability 报告，但不能伪造未在 Markdown 中定义的业务场景。
- 生成 pytest 文件名必须与 Markdown 模块一一对应：`testcase/md/<module>.md` → `testcase/test_<module>.py`（`<module>` 为文件名去 `.md` 后小写、非字母数字转 `_`）。即使 Markdown `自动化映射` 写了别的路径，也必须写模块 stem 路径，不得额外发明 `test_be_*` 前缀。
- 测试失败必须诚实保留，后续节点只执行一次 pytest，并从同一 pytest-html 报告生成 HTML/facts。

## 推荐输出

写入文件后，用简短中文总结：

1. 生成或更新了哪些测试文件；
2. Case ID → 脚本 → pytest 函数/方法映射；
3. 复用的 fixture/config；
4. 仍存在的环境或自动化缺口。

不得输出 chain-of-thought，不得执行 pytest。
