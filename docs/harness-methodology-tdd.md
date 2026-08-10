# Harness Methodology: Test-Driven Development

从 Superpowers `test-driven-development` skill 中提取的 TDD 纪律，适配本仓库 harness 工作流。

## Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

在测试之前写的任何实现代码，必须在写测试前删除。不是"留作参考"、不是"边写测试边改"——删除就是删除，从零开始实现。

## RED-GREEN-REFACTOR 循环

### RED：写一个失败测试

写一个最小的测试，展示代码应该做什么。

**要求：**
- 一个行为
- 清晰的命名
- 真实代码（除非不可避免才 mock）

```
✅ test('rejects empty email', async () => {
     const result = await submitForm({ email: '' });
     expect(result.error).toBe('Email required');
   })

❌ test('retry works', ...)  // 名字模糊
❌ test('validates email and domain and whitespace')  // 一次测太多
```

### Verify RED：看着它失败

**不可跳过。**

```bash
npm test path/to/test.test.ts
```

确认：
- 测试**失败**（不是报错）
- 失败原因是你预期的（因为功能还没实现，而不是拼写错误）
- 测试通过？→ 你在测已有行为，修正测试。测试报错？→ 修复错误，重新跑到真的失败为止。

### GREEN：最小实现

写刚好能让测试通过的最简单代码。不要加功能、不要重构其他代码、不要"顺手优化"。

### Verify GREEN：看着它通过

**不可跳过。**

```bash
npm test path/to/test.test.ts
```

确认：
- 测试通过
- 其他测试依然通过
- 输出干净（无 error、warning）

### REFACTOR：清理

只在 GREEN 之后：
- 消除重复
- 改善命名
- 提取辅助函数

保持测试绿色。不添加行为。

## 为什么顺序重要

**"我先写实现再补测试"** → 实现后写的测试立即通过，这什么都证明不了。你可能测了错误的东西、漏了边界情况、从未见过它抓到 bug。测试先行迫使你看到测试失败，证明它确实在测有意义的东西。

**"我已经手工测过了"** → 手工测试是临时的。没有记录、不能重跑、压力下容易忘。"刚刚试了能用" ≠ 全面覆盖。自动化测试是系统性的，每次跑得一样。

**"删掉已写代码太浪费"** → 沉没成本谬误。时间已经花了。现在的选择是：(a) 删掉重写 TDD（X 小时，高信心）vs (b) 保留它然后补测试（30 分钟，低信心，大概率有 bug）。保留不可信的代码才是真正的浪费。

## TDD 与 Harness 工作流的对齐

| TDD 阶段 | Harness 步骤 |
|----------|-------------|
| RED | Contract → 写验收标准（含测试预期） |
| GREEN | Implement → 最小实现 |
| REFACTOR | Verify 通过后可做受控清理 |
| 循环 | 下一个工作块 |

## 验证清单

在标记工作完成前：

- [ ] 每个新函数/方法有对应测试
- [ ] 看过每个测试在实现前失败
- [ ] 每个测试因预期原因失败（功能缺失，不是拼写错误）
- [ ] 为每个测试写了最小实现
- [ ] 所有测试通过
- [ ] 输出干净（无 error、warning）
- [ ] 测试使用真实代码（仅在不可避免时 mock）
- [ ] 边界情况和错误路径已覆盖

无法勾完所有框 → 跳过了 TDD → 从 RED 重新开始。

## 反模式

- **测试 mock 行为而非真实行为**：mock 只在调用外部 API/DB 等不可避免时使用
- **给生产类加仅测试用的方法**：设计接口应同时对生产者和消费者友好
- **不理解依赖就 mock**：先理解数据流，再 mock

## Bug 修复的 TDD

发现 bug → 先写复现它的失败测试 → RED-GREEN-REFACTOR → 测试即证明修复有效且防止回归。

永远不要在没有测试的情况下修 bug。

## 当卡住时

| 问题 | 解法 |
|------|------|
| 不知道怎么写测试 | 先写期望的 API 调用方式；先写断言 |
| 测试太复杂 | 设计太复杂，简化接口 |
| 必须 mock 一切 | 代码耦合太重，用依赖注入 |
| 测试 setup 巨大 | 提取辅助函数；还是复杂？简化设计 |

## 参考

- Harness 工作流：`docs/feature-workflow.md`
- 验证矩阵：`docs/verification-matrix.md`
- Sprint Contract 模板：`docs/templates/sprint-contract.md`
