// 认证：密码单向散列（scrypt + 每用户随机 salt）、会话令牌签发与 Bearer 解析。
// 演示环境令牌不设过期；账号密码一律不落明文。
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { Request } from 'express'
import type { UserRow } from './db.ts'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  )
}

export function createToken(): string {
  return randomBytes(32).toString('hex')
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1] : null
}

export function findUserByUsername(
  db: DatabaseSync,
  username: string,
): UserRow | undefined {
  return db
    .prepare('SELECT id, username, password_hash, created_at FROM users WHERE username = ?')
    .get(username) as UserRow | undefined
}

export function findUserByToken(
  db: DatabaseSync,
  token: string,
): UserRow | undefined {
  return db
    .prepare(
      `SELECT u.id, u.username, u.password_hash, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as UserRow | undefined
}

export function createSession(db: DatabaseSync, userId: number): string {
  const token = createToken()
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    new Date().toISOString(),
  )
  return token
}
