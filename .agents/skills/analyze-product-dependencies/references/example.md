# V3 输出示例

## API 索引与详情

````md
## 2. API 索引
| API | Method + Path | Operation ID | 用户故事 | AC | 变更 |
|---|---|---|---|---|---|
| API-001 | GET /api/v1/orders/{orderId}/refund-status | getRefundStatus | BE-US-001 | AC-BE-001 | 新增 |

## 3. API 详情
### API-001 查询退款状态
> `GET /api/v1/orders/{orderId}/refund-status`

#### 基本信息
| 字段 | 值 |
|---|---|
| Operation ID | getRefundStatus |
| 变更类型 | 新增 |
| 幂等性 | 只读请求天然幂等 |

#### Path 参数
| 参数 | 类型 | 必填 | 语义 |
|---|---|---|---|
| orderId | string | 是 | 订单标识 |

#### 成功响应
- HTTP：200
```json
{"data":{"refundStatus":"processing"}}
```

#### 错误响应
| 状态码 | 错误码 | 条件 |
|---|---|---|
| 403 | FORBIDDEN | 资源访问被拒绝 |
```json
{"code":"FORBIDDEN","message":"forbidden"}
```

````

无 Path、Query、Body 或专属 Header 时省略对应章节。

分页接口在 Query 参数中定义可选的每页条数：

```md
#### Query 参数
| 参数 | 类型 | 必填 | 允许值 | 语义 |
|---|---|---|---|---|
| pageSize | integer | 否 | 10 \| 20 \| 50 \| 100 | 每页条数 |
| cursor | string | 否 | - | 下一页游标 |
```

字段与 code 定义前先在内部搜索仓库共享定义，命中时直接复用；API 文档不生成“复用检查”或搜索证据。

## Dependency 影响文件与 API 映射

```md
### BE-US-001 查询退款状态
- 验收标准：AC-BE-001
- API 文档引用：API-001
- 影响文件：
  - F1 modify `src/refund/refund.controller.ts`：增加查询入口
  - F2 modify `src/refund/refund.service.ts`：组合退款状态
- 路由/入口：F1 注册退款状态路由
- Controller/Handler：F1 校验身份和订单 ID
- Service/领域逻辑：F2 组合状态

## API 实现映射
| API | Operation ID | 方法与路径 | 代码入口 |
|---|---|---|---|
| API-001 | getRefundStatus | GET /api/v1/orders/{orderId}/refund-status | F1 |
```

`影响文件` 是完整路径清单；其余字段使用 F 编号引用。非 API 后端故事不生成 API 文档。
