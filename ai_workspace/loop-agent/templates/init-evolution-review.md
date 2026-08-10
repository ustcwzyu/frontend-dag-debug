# Init Evolution Review

Date:
Base: `<full commit SHA or resolvable --base ref>`
Head: `<full commit SHA for the reviewed HEAD>`

`bash scripts/check-init-evolution-needed.sh --strict --base <ref>` 接受 Base 精确匹配该 `<ref>`、Head 为当前 `HEAD` 或其可解析祖先提交的报告。历史报告、`working tree` 等不可解析文字不能为其他变更范围放行严格检查。当 Head 是祖先时，`reportHead..HEAD` 区间内出现新的 `model-review` 高影响路径会使报告失效；仅 `advisory` 或 `surface-check` 的后续变化不影响已完成的高影响审查。

## Changed Surface

- 

## Decision

Choose one:

- No init impact
- Surface check only
- Init update required

Rationale:

## Updates Made

- 

## Verification

```bash
# commands and results
```

## Residual Risk

- 
