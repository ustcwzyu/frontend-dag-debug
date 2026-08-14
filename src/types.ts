// 共享前端类型：进度与课程结构（与后端 API 契约对齐）。
export interface ProgressData {
  firstLessonCompleted: boolean
  evaluationScore: number | null
  weeklyLabCompleted: boolean
  updatedAt?: string
}

export interface SessionData {
  token: string
  username: string
}