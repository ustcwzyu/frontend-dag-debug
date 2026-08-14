// SQLite 持久化：users / sessions / progress / 内容表（routes、capabilities、lab、lessons）
// 使用 Node 原生 node:sqlite（DatabaseSync），不引入额外原生依赖。
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  contentRoutes,
  contentCapabilities,
  contentLab,
  lessonBeginnerHtml,
} from './content.ts'

export interface UserRow {
  id: number
  username: string
  password_hash: string
  created_at: string
}

export interface ProgressRow {
  user_id: number
  first_lesson_completed: number
  evaluation_score: number | null
  weekly_lab_completed: number
  updated_at: string
}

export interface RouteRow {
  id: string
  name: string
  audience: string
  duration: string
  lesson_count: string
  summary: string
  stages_json: string
  first_lesson: string
  trace_states_json: string
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_lesson_completed INTEGER NOT NULL DEFAULT 0,
    evaluation_score INTEGER NULL
      CHECK (evaluation_score IS NULL OR evaluation_score BETWEEN 0 AND 10),
    weekly_lab_completed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    audience TEXT NOT NULL,
    duration TEXT NOT NULL,
    lesson_count TEXT NOT NULL,
    summary TEXT NOT NULL,
    stages_json TEXT NOT NULL,
    first_lesson TEXT NOT NULL,
    trace_states_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    desc TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lab (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    goal TEXT NOT NULL,
    input TEXT NOT NULL,
    tools TEXT NOT NULL,
    criteria TEXT NOT NULL,
    duration TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    html TEXT NOT NULL
  );
`

function seed(db: DatabaseSync): void {
  const insertRoute = db.prepare(`
    INSERT OR REPLACE INTO routes
      (id, name, audience, duration, lesson_count, summary, stages_json, first_lesson, trace_states_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const route of contentRoutes) {
    insertRoute.run(
      route.id,
      route.name,
      route.audience,
      route.duration,
      route.lessonCount,
      route.summary,
      JSON.stringify(route.stages),
      route.firstLesson,
      JSON.stringify(route.traceStates),
    )
  }

  const insertCapability = db.prepare(`
    INSERT OR REPLACE INTO capabilities (id, title, desc) VALUES (?, ?, ?)
  `)
  contentCapabilities.forEach((capability, index) => {
    insertCapability.run(index + 1, capability.title, capability.desc)
  })

  const insertLab = db.prepare(`
    INSERT OR REPLACE INTO lab
      (id, title, goal, input, tools, criteria, duration)
    VALUES (1, ?, ?, ?, ?, ?, ?)
  `)
  insertLab.run(
    contentLab.title,
    contentLab.goal,
    contentLab.input,
    contentLab.tools,
    contentLab.criteria,
    contentLab.duration,
  )

  const insertLesson = db.prepare(`
    INSERT OR REPLACE INTO lessons (id, html) VALUES (?, ?)
  `)
  insertLesson.run('beginner', lessonBeginnerHtml)
}

/**
 * 打开（必要时创建）数据库并初始化表结构与内容种子。
 * dbPath 为 ':memory:' 时返回独立内存库（测试用）；否则确保父目录存在。
 */
export function openDb(dbPath: string): DatabaseSync {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true })
  }
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  seed(db)
  return db
}
