# 验证方法论

完成声明需要当前证据。

## 门禁函数

1. 确定能证明声明的命令
2. 完整运行该命令
3. 读输出与 exit code
4. 修失败或报告确切失败状态
5. 然后再声明结果

## 常见门禁

| 声明 | 命令 |
|---|---|
| 治理有效 | `bash scripts/check-repo.sh` |
| TypeScript 编译通过 | `npm run typecheck` |
| 行为有覆盖 | `npm test` |
| 完整本地交付有效 | `bash scripts/ci.sh` |

## Red Flags

- 凭意图声明完成
- 依赖陈旧命令输出
- 用窄检查支撑宽声明
- 跳过失败命令的细节
