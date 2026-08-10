# Sprint Contract

## 目标（Objective）

描述有边界的工作块。

## 交付物（Deliverables）

- 

## 非目标（Non-goals）

- 

## 验证（Verification）

```bash
bash scripts/check-repo.sh
npm run typecheck
npm test
```

Windows 上通过 Git Bash 或已配置的兼容 Bash 运行脚本。实际文件操作用平台原生路径。

## 失败条件（Failure Conditions）

- 必需验证无法运行或失败
- 工作需要超出本 contract 的范围
- 实现改动了无关文件
