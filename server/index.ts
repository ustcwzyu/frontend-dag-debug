// 入口：仅负责监听。应用逻辑在 server/app.ts 的 createApp（便于测试注入 DB）。
import { createApp } from './app.ts'

const port = Number(process.env.PORT ?? 3001)
const app = createApp({ dbPath: process.env.DB_PATH ?? 'server/data/lab.db' })

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
})