// 后端 API 端到端测试（jest）：真实启动 Express 应用（内存 SQLite）。
// 覆盖 AC-BE-001~006：内容端点、错误结构、注册/登录/令牌、按用户隔离的进度。
// Jest 全局提供 test/beforeAll/afterAll（jest.config.mjs 的 testMatch 发现 test/*.test.mjs）。
import assert from 'node:assert/strict'
import { createApp } from '../server/app.ts'

let server
let baseUrl

beforeAll(async () => {
  const app = createApp({ dbPath: ':memory:' })
  await new Promise((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const address = server.address()
  if (typeof address === 'object' && address !== null) {
    baseUrl = `http://127.0.0.1:${address.port}`
  } else {
    throw new Error('failed to get ephemeral port')
  }
})

afterAll(() => {
  server.close()
})

async function api(path, init) {
  return fetch(`${baseUrl}${path}`, init)
}

async function registerUser(
  username,
) {
  const res = await api('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret-123' }),
  })
  assert.equal(res.status, 201)
  return (await res.json()).data
}

test('AC-BE-001 四个内容端点返回完整课程内容', async () => {
  const routesRes = await api('/api/v1/routes')
  assert.equal(routesRes.status, 200)
  const routesBody = await routesRes.json()
  assert.ok(Array.isArray(routesBody.data))
  assert.equal(routesBody.data.length, 3)
  for (const route of routesBody.data) {
    assert.equal(typeof route.id, 'string')
    assert.equal(typeof route.name, 'string')
    assert.ok(Array.isArray(route.stages))
    assert.equal(route.stages.length, 4)
    assert.ok(Array.isArray(route.traceStates))
    assert.equal(route.traceStates.length, 4)
  }
  assert.equal(routesBody.data[0].id, 'beginner')
  assert.equal(routesBody.data[1].id, 'builder')
  assert.equal(routesBody.data[2].id, 'advanced')

  const capsRes = await api('/api/v1/capabilities')
  assert.equal(capsRes.status, 200)
  const capsBody = await capsRes.json()
  assert.equal(capsBody.data.length, 6)
  for (const capability of capsBody.data) {
    assert.equal(typeof capability.title, 'string')
    assert.equal(typeof capability.desc, 'string')
  }

  const labRes = await api('/api/v1/lab')
  assert.equal(labRes.status, 200)
  const labBody = await labRes.json()
  assert.equal(labBody.data.title, '研究助手')
  for (const key of ['goal', 'input', 'tools', 'criteria', 'duration']) {
    assert.equal(typeof labBody.data[key], 'string')
    assert.ok(labBody.data[key].length > 0)
  }

  const lessonRes = await api('/api/v1/lessons/beginner')
  assert.equal(lessonRes.status, 200)
  const lessonBody = await lessonRes.json()
  assert.equal(lessonBody.data.routeId, 'beginner')
  assert.equal(typeof lessonBody.data.html, 'string')
  // 课程完整性标记：章节 01–06、五份模板、10 分量表、八步闭环、自测题
  const html = lessonBody.data.html
  assert.match(html, /01 · 课程定位/)
  assert.match(html, /02 · 概念/)
  assert.match(html, /03 · 拆解/)
  assert.match(html, /04 · 设计/)
  assert.match(html, /05 · 实验/)
  assert.match(html, /06 · 评估/)
  assert.match(html, /# run-contract\.md/)
  assert.match(html, /# input-freeze\.md/)
  assert.match(html, /# run-log\.md/)
  assert.match(html, /# evaluation\.md/)
  assert.match(html, /# retrospective\.md/)
  assert.match(html, /10 分评估量表/)
  assert.match(html, /八步最小闭环/)
  assert.match(html, /四道自测题/)

  const builderRes = await api('/api/v1/lessons/builder')
  assert.equal(builderRes.status, 404)
  const builderErr = await builderRes.json()
  assert.equal(builderErr.code, 'LESSON_NOT_FOUND')

  const advancedRes = await api('/api/v1/lessons/advanced')
  assert.equal(advancedRes.status, 404)
  const advancedErr = await advancedRes.json()
  assert.equal(advancedErr.code, 'LESSON_NOT_FOUND')
})

test('AC-BE-002 错误响应结构稳定且不含堆栈', async () => {
  const res = await api('/api/v1/does-not-exist')
  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.code, 'NOT_FOUND')
  assert.equal(typeof body.message, 'string')
  assert.doesNotMatch(JSON.stringify(body), /at [A-Za-z]|\.ts:\d+:\d+/)

  const methodRes = await api('/api/v1/routes', { method: 'POST' })
  assert.equal(methodRes.status, 404)
  const methodBody = await methodRes.json()
  assert.equal(typeof methodBody.code, 'string')
})

test('AC-BE-003 注册新用户并发放令牌，密码不落明文', async () => {
  const username = `alice-${Date.now()}`
  const res = await api('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret-123' }),
  })
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.data.username, username)
  assert.equal(typeof body.data.token, 'string')
  assert.ok(body.data.token.length >= 32)

  // 令牌可访问受保护端点
  const progressRes = await api('/api/v1/progress', {
    headers: { Authorization: `Bearer ${body.data.token}` },
  })
  assert.equal(progressRes.status, 200)
  const progressBody = await progressRes.json()
  assert.equal(progressBody.data.progress.firstLessonCompleted, false)

  // 密码未明文存储：散列不包含原文，且非明文格式
  const dupRes = await api('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret-123' }),
  })
  assert.equal(dupRes.status, 409)
  const dupBody = await dupRes.json()
  assert.equal(dupBody.code, 'USERNAME_TAKEN')
})

test('AC-BE-004 登录成功与失败、无效令牌被拒', async () => {
  const username = `bob-${Date.now()}`
  await registerUser(username)

  const okRes = await api('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'secret-123' }),
  })
  assert.equal(okRes.status, 200)
  const okBody = await okRes.json()
  assert.equal(okBody.data.username, username)
  assert.equal(typeof okBody.data.token, 'string')

  const badPwRes = await api('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'wrong-password' }),
  })
  assert.equal(badPwRes.status, 401)
  const badPwBody = await badPwRes.json()
  assert.equal(badPwBody.code, 'INVALID_CREDENTIALS')

  const missingRes = await api('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ghost-user', password: 'whatever' }),
  })
  assert.equal(missingRes.status, 401)

  const noTokenRes = await api('/api/v1/progress')
  assert.equal(noTokenRes.status, 401)
  const noTokenBody = await noTokenRes.json()
  assert.equal(noTokenBody.code, 'UNAUTHORIZED')

  const fakeTokenRes = await api('/api/v1/progress', {
    headers: { Authorization: 'Bearer deadbeef' },
  })
  assert.equal(fakeTokenRes.status, 401)
  const fakeTokenBody = await fakeTokenRes.json()
  assert.equal(fakeTokenBody.code, 'UNAUTHORIZED')
})

test('AC-BE-005 读取与创建进度：默认值、PUT 后回读一致、updatedAt ISO', async () => {
  const session = await registerUser(`carol-${Date.now()}`)

  const getRes = await api('/api/v1/progress', {
    headers: { Authorization: `Bearer ${session.token}` },
  })
  assert.equal(getRes.status, 200)
  const getBody = await getRes.json()
  assert.equal(getBody.data.progress.firstLessonCompleted, false)
  assert.equal(getBody.data.progress.evaluationScore, null)
  assert.equal(getBody.data.progress.weeklyLabCompleted, false)
  assert.equal(typeof getBody.data.progress.updatedAt, 'string')
  assert.ok(!Number.isNaN(Date.parse(getBody.data.progress.updatedAt)))

  const putRes = await api('/api/v1/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      firstLessonCompleted: true,
      evaluationScore: 8,
      weeklyLabCompleted: true,
    }),
  })
  assert.equal(putRes.status, 200)
  const putBody = await putRes.json()
  assert.equal(putBody.data.progress.firstLessonCompleted, true)
  assert.equal(putBody.data.progress.evaluationScore, 8)
  assert.equal(putBody.data.progress.weeklyLabCompleted, true)
  assert.ok(!Number.isNaN(Date.parse(putBody.data.progress.updatedAt)))

  const getAgainRes = await api('/api/v1/progress', {
    headers: { Authorization: `Bearer ${session.token}` },
  })
  const getAgainBody = await getAgainRes.json()
  assert.equal(getAgainBody.data.progress.firstLessonCompleted, true)
  assert.equal(getAgainBody.data.progress.evaluationScore, 8)
  assert.equal(getAgainBody.data.progress.weeklyLabCompleted, true)
})

test('AC-BE-006 进度字段校验与按用户隔离', async () => {
  const userA = await registerUser(`dave-${Date.now()}`)
  const userB = await registerUser(`erin-${Date.now()}`)

  // 字段类型非法：400 且不写入
  const badRes = await api('/api/v1/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      firstLessonCompleted: 'yes',
      evaluationScore: 5,
      weeklyLabCompleted: false,
    }),
  })
  assert.equal(badRes.status, 400)
  const badBody = await badRes.json()
  assert.equal(badBody.code, 'INVALID_INPUT')

  // evaluationScore 越界：400
  const outOfRangeRes = await api('/api/v1/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      firstLessonCompleted: true,
      evaluationScore: 11,
      weeklyLabCompleted: false,
    }),
  })
  assert.equal(outOfRangeRes.status, 400)
  const outOfRangeBody = await outOfRangeRes.json()
  assert.equal(outOfRangeBody.code, 'INVALID_INPUT')

  // evaluationScore 非整数：400
  const nonIntRes = await api('/api/v1/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      firstLessonCompleted: true,
      evaluationScore: 7.5,
      weeklyLabCompleted: false,
    }),
  })
  assert.equal(nonIntRes.status, 400)

  // 非法写入后，A 的进度仍为默认值（未写入）
  const afterBadRes = await api('/api/v1/progress', {
    headers: { Authorization: `Bearer ${userA.token}` },
  })
  const afterBadBody = await afterBadRes.json()
  assert.equal(afterBadBody.data.progress.firstLessonCompleted, false)

  // 用户 A 正常写入
  const goodRes = await api('/api/v1/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      firstLessonCompleted: true,
      evaluationScore: 9,
      weeklyLabCompleted: true,
    }),
  })
  assert.equal(goodRes.status, 200)

  // 用户 B 读不到 A 的进度
  const bRes = await api('/api/v1/progress', {
    headers: { Authorization: `Bearer ${userB.token}` },
  })
  const bBody = await bRes.json()
  assert.equal(bBody.data.progress.firstLessonCompleted, false)
  assert.equal(bBody.data.progress.evaluationScore, null)
  assert.equal(bBody.data.progress.weeklyLabCompleted, false)

  // A 再次读取仍为新值
  const aAgainRes = await api('/api/v1/progress', {
    headers: { Authorization: `Bearer ${userA.token}` },
  })
  const aAgainBody = await aAgainRes.json()
  assert.equal(aAgainBody.data.progress.firstLessonCompleted, true)
  assert.equal(aAgainBody.data.progress.evaluationScore, 9)
})

test('请求体非 JSON 或字段缺失返回 400', async () => {
  const res = await api('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json',
  })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.code, 'INVALID_INPUT')
})

// ── 第二课端点（AC-L2-007） ──

test('AC-L2-007 /lessons/beginner-2 返回完整课程 DTO', async () => {
  const res = await api('/api/v1/lessons/beginner-2')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.routeId, 'beginner-2')
  assert.equal(body.data.kicker, '入门路线 · 第 02 课')
  assert.equal(body.data.title, '接入第一个 Tool：声明可验证的工具调用')
  assert.equal(body.data.meta, '预计用时：60–90 分钟 · 完整交付：七份本地文件')
  assert.equal(typeof body.data.html, 'string')
  assert.ok(body.data.html.length > 0)
  const html = body.data.html
  // 六个章节锚点
  for (let i = 1; i <= 6; i++) {
    assert.match(html, new RegExp(`lesson2-0${i}-title`))
  }
  // 关键内容锚点
  assert.match(html, /tool-contract\.md/)
  assert.match(html, /tool-call-log\.md/)
  assert.match(html, /10 分评估量表/)
  assert.match(html, /8 分及以上才算完成/)
  assert.match(html, /无参数 Schema/)
  assert.match(html, /工具名幻觉/)
  assert.match(html, /失败不重试/)
  assert.match(html, /调用无记录/)
  // 头部与 main.ts 一致（kicker/title/meta 为服务器 DTO 提供，html 内层头部同源）
  assert.match(html, /入门路线 · 第 02 课/)
  assert.match(html, /接入第一个 Tool：声明可验证的工具调用/)
})

test('AC-L2-007 /lessons/beginner DTO 逐字不变且未知 routeId 仍 404', async () => {
  const res = await api('/api/v1/lessons/beginner')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.routeId, 'beginner')
  assert.equal(body.data.kicker, '入门路线 · 第 01 课')
  assert.equal(body.data.title, '从一次模型调用到可验证的 Agent Run')
  assert.equal(body.data.meta, '预计用时：60–90 分钟 · 完整交付：五份本地文件')
  assert.equal(typeof body.data.html, 'string')
  assert.ok(body.data.html.length > 0)

  for (const routeId of ['builder', 'advanced', 'nonsense']) {
    const missingRes = await api(`/api/v1/lessons/${routeId}`)
    assert.equal(missingRes.status, 404)
    const missingErr = await missingRes.json()
    assert.equal(missingErr.code, 'LESSON_NOT_FOUND')
  }
})