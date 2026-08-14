// 会话令牌持久化（localStorage）。
// 本文件是 main.ts 之外唯一含 localStorage 字面量的模块（架构裁决 R1/R2）。
// key 与 task-board 的 `frontend-dag-debug:tasks` 严格区分。
import type { SessionData } from './types.ts'

const SESSION_KEY = 'frontend-dag-debug:auth'

export function loadSession(): SessionData | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionData
    if (typeof parsed.token !== 'string' || typeof parsed.username !== 'string') {
      return null
    }
    return { token: parsed.token, username: parsed.username }
  } catch {
    return null
  }
}

export function saveSession(session: SessionData): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // 存储不可用（隐私模式/配额）：静默失败，登录态仅存于内存
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // 存储不可用：忽略
  }
}