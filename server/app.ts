// Express 应用工厂：不 listen，便于测试注入 DB 路径。
// 路由：内容（routes/capabilities/lab/lessons）、认证（register/login）、进度（GET/PUT，Bearer）。
import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { openDb, type ProgressRow, type RouteRow } from './db.ts'
import {
  hashPassword,
  verifyPassword,
  extractBearerToken,
  findUserByUsername,
  findUserByToken,
  createSession,
} from './auth.ts'

export interface AppOptions {
  dbPath: string
  staticDir?: string
}

interface RouteDto {
  id: string
  name: string
  audience: string
  duration: string
  lessonCount: string
  summary: string
  stages: string[]
  firstLesson: string
  traceStates: string[]
}

interface ProgressDto {
  firstLessonCompleted: boolean
  evaluationScore: number | null
  weeklyLabCompleted: boolean
  updatedAt: string
}

function routeToDto(row: RouteRow): RouteDto {
  return {
    id: row.id,
    name: row.name,
    audience: row.audience,
    duration: row.duration,
    lessonCount: row.lesson_count,
    summary: row.summary,
    stages: JSON.parse(row.stages_json) as string[],
    firstLesson: row.first_lesson,
    traceStates: JSON.parse(row.trace_states_json) as string[],
  }
}

function progressToDto(row: ProgressRow): ProgressDto {
  return {
    firstLessonCompleted: row.first_lesson_completed === 1,
    evaluationScore: row.evaluation_score,
    weeklyLabCompleted: row.weekly_lab_completed === 1,
    updatedAt: row.updated_at,
  }
}

function readProgress(db: DatabaseSync, userId: number): ProgressRow {
  const row = db
    .prepare(
      `SELECT user_id, first_lesson_completed, evaluation_score,
              weekly_lab_completed, updated_at
       FROM progress WHERE user_id = ?`,
    )
    .get(userId) as ProgressRow | undefined
  if (row) return row
  return {
    user_id: userId,
    first_lesson_completed: 0,
    evaluation_score: null,
    weekly_lab_completed: 0,
    updated_at: '',
  }
}

function defaultProgress(): ProgressDto {
  return {
    firstLessonCompleted: false,
    evaluationScore: null,
    weeklyLabCompleted: false,
    updatedAt: new Date().toISOString(),
  }
}

export function createApp(options: AppOptions): Express {
  const app = express()
  const db = openDb(options.dbPath)
  app.use(express.json())

  // 内容端点
  app.get('/api/v1/routes', (_req, res) => {
    const rows = db
      .prepare(
        `SELECT id, name, audience, duration, lesson_count, summary,
                stages_json, first_lesson, trace_states_json
         FROM routes`,
      )
      .all() as unknown as RouteRow[]
    res.json({ data: rows.map(routeToDto) })
  })

  app.get('/api/v1/capabilities', (_req, res) => {
    const rows = db
      .prepare('SELECT title, desc FROM capabilities ORDER BY id')
      .all() as unknown as { title: string; desc: string }[]
    res.json({ data: rows })
  })

  app.get('/api/v1/lab', (_req, res) => {
    const row = db
      .prepare(
        `SELECT title, goal, input, tools, criteria, duration
         FROM lab WHERE id = 1`,
      )
      .get() as unknown as {
      title: string
      goal: string
      input: string
      tools: string
      criteria: string
      duration: string
    }
    res.json({ data: row })
  })

  app.get('/api/v1/lessons/:routeId', (req, res) => {
    const routeId = req.params.routeId
    if (routeId !== 'beginner' && routeId !== 'beginner-2') {
      res.status(404).json({ code: 'LESSON_NOT_FOUND', message: `lesson not found for route: ${routeId}` })
      return
    }
    const row = db
      .prepare('SELECT id, html FROM lessons WHERE id = ?')
      .get(routeId) as unknown as { id: string; html: string }
    if (!row) {
      res.status(404).json({ code: 'LESSON_NOT_FOUND', message: `lesson not found for route: ${routeId}` })
      return
    }
    const header =
      routeId === 'beginner-2'
        ? {
            kicker: '入门路线 · 第 02 课',
            title: '接入第一个 Tool：声明可验证的工具调用',
            meta: '预计用时：60–90 分钟 · 完整交付：七份本地文件',
          }
        : {
            kicker: '入门路线 · 第 01 课',
            title: '从一次模型调用到可验证的 Agent Run',
            meta: '预计用时：60–90 分钟 · 完整交付：五份本地文件',
          }
    res.json({
      data: {
        routeId: row.id,
        ...header,
        html: row.html,
      },
    })
  })

  // 认证端点
  app.post('/api/v1/auth/register', (req, res) => {
    const { username, password } = req.body ?? {}
    if (typeof username !== 'string' || username.length < 1 || username.length > 32) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'username must be a string of 1–32 characters' })
      return
    }
    if (typeof password !== 'string' || password.length < 1) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'password must be a non-empty string' })
      return
    }
    const existing = findUserByUsername(db, username)
    if (existing) {
      res.status(409).json({ code: 'USERNAME_TAKEN', message: `username already exists: ${username}` })
      return
    }
    const hash = hashPassword(password)
    const now = new Date().toISOString()
    const result = db
      .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
      .run(username, hash, now)
    const userId = Number(result.lastInsertRowid)
    // 初始化一份空进度，保证登录后读取结构一致
    db.prepare(
      'INSERT OR IGNORE INTO progress (user_id, first_lesson_completed, evaluation_score, weekly_lab_completed, updated_at) VALUES (?, 0, NULL, 0, ?)',
    ).run(userId, now)
    const token = createSession(db, userId)
    res.status(201).json({ data: { token, username } })
  })

  app.post('/api/v1/auth/login', (req, res) => {
    const { username, password } = req.body ?? {}
    if (typeof username !== 'string' || username.length < 1 || username.length > 32) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'username must be a string of 1–32 characters' })
      return
    }
    if (typeof password !== 'string' || password.length < 1) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'password must be a non-empty string' })
      return
    }
    const user = findUserByUsername(db, username)
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'invalid username or password' })
      return
    }
    const token = createSession(db, user.id)
    res.json({ data: { token, username: user.username } })
  })

  // 认证中间件：解析 Bearer 令牌 → 挂载 req 令牌与用户
  app.use('/api/v1/progress', (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req)
    if (!token) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'missing or invalid token' })
      return
    }
    const user = findUserByToken(db, token)
    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'missing or invalid token' })
      return
    }
    ;(req as Request & { userId?: number }).userId = user.id
    next()
  })

  // 进度端点（受保护）
  app.get('/api/v1/progress', (req, res) => {
    const userId = (req as Request & { userId?: number }).userId as number
    const row = readProgress(db, userId)
    const dto = row.updated_at === '' ? defaultProgress() : progressToDto(row)
    res.json({ data: { progress: dto } })
  })

  app.put('/api/v1/progress', (req, res) => {
    const userId = (req as Request & { userId?: number }).userId as number
    const body = req.body ?? {}
    const { firstLessonCompleted, evaluationScore, weeklyLabCompleted } = body
    if (typeof firstLessonCompleted !== 'boolean') {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'firstLessonCompleted must be a boolean' })
      return
    }
    if (weeklyLabCompleted !== undefined && typeof weeklyLabCompleted !== 'boolean') {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'weeklyLabCompleted must be a boolean' })
      return
    }
    if (![true, false].includes(firstLessonCompleted)) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'firstLessonCompleted must be a boolean' })
      return
    }
    let score: number | null = null
    if (evaluationScore !== null && evaluationScore !== undefined) {
      if (
        typeof evaluationScore !== 'number' ||
        !Number.isInteger(evaluationScore) ||
        evaluationScore < 0 ||
        evaluationScore > 10
      ) {
        res.status(400).json({
          code: 'INVALID_INPUT',
          message: 'evaluationScore must be an integer between 0 and 10 or null',
        })
        return
      }
      score = evaluationScore
    }
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO progress (user_id, first_lesson_completed, evaluation_score, weekly_lab_completed, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         first_lesson_completed = excluded.first_lesson_completed,
         evaluation_score = excluded.evaluation_score,
         weekly_lab_completed = excluded.weekly_lab_completed,
         updated_at = excluded.updated_at`,
    ).run(
      userId,
      firstLessonCompleted ? 1 : 0,
      score,
      weeklyLabCompleted ? 1 : 0,
      now,
    )
    const row = readProgress(db, userId)
    if (row.updated_at === '') {
      // 理论不可达：INSERT 已写入；兜底返回刚保存的 dto
      res.json({
        data: {
          progress: {
            firstLessonCompleted,
            evaluationScore: score,
            weeklyLabCompleted,
            updatedAt: now,
          },
        },
      })
      return
    }
    res.json({ data: { progress: progressToDto(row) } })
  })

  // /api/* fallback：未匹配 API 路径一律 404 JSON（置于静态之前）
  app.use('/api', (_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'path not found' })
  })

  // 生产静态托管：若 dist/ 存在则托管，非 /api 的 GET 回退 index.html（SPA）
  const staticDir = options.staticDir ?? join(process.cwd(), 'dist')
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(join(staticDir, 'index.html'))
    })
  }

  // 统一错误兜底：不泄露堆栈；body-parser 等 4xx 错误按状态回显
  app.use(
    (err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status ?? err.statusCode
      if (status && status >= 400 && status < 500) {
        res.status(status).json({ code: 'INVALID_INPUT', message: 'malformed request body' })
        return
      }
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'internal server error',
      })
    },
  )

  return app
}