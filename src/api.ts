// API 客户端：封装 /api/v1 调用与响应形状校验。
// 本文件是 main.ts 之外唯一含 fetch() 字面量的模块（架构裁决 R2）。
import type { ProgressData } from './types.ts'

export interface RouteData {
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

export interface CapabilityData {
  title: string
  desc: string
}

export interface LabData {
  title: string
  goal: string
  input: string
  tools: string
  criteria: string
  duration: string
}

export interface LessonData {
  routeId: string
  kicker: string
  title: string
  meta: string
  html: string
}

export interface AuthResponse {
  token: string
  username: string
}

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    let message = `request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { message?: string }
      if (typeof body.message === 'string' && body.message) {
        message = body.message
      }
    } catch {
      // 非 JSON 错误体：保持默认消息
    }
    throw new Error(message)
  }
  const body = (await res.json()) as { data: T }
  return body.data
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export async function loadCourseContent(): Promise<{
  routes: RouteData[]
  capabilities: CapabilityData[]
  lab: LabData
  lesson: LessonData
}> {
  const [routesRes, capabilitiesRes, labRes, lessonRes] = await Promise.all([
    fetch(`${BASE}/routes`),
    fetch(`${BASE}/capabilities`),
    fetch(`${BASE}/lab`),
    fetch(`${BASE}/lessons/beginner`),
  ])
  for (const res of [routesRes, capabilitiesRes, labRes, lessonRes]) {
    if (!res.ok) {
      throw new Error(`request failed with status ${res.status}`)
    }
  }
  const [routesBody, capabilitiesBody, labBody, lessonBody] = (await Promise.all([
    routesRes.json(),
    capabilitiesRes.json(),
    labRes.json(),
    lessonRes.json(),
  ])) as { data: unknown }[]

  const routes = (routesBody.data as RouteData[]).filter((route: RouteData) =>
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    isStringArray(route.stages) &&
    isStringArray(route.traceStates),
  )
  if (routes.length === 0) {
    throw new Error('routes payload is empty or malformed')
  }

  const capabilities = capabilitiesBody.data as CapabilityData[]
  if (
    !Array.isArray(capabilities) ||
    capabilities.some((c) => typeof c?.title !== 'string' || typeof c?.desc !== 'string')
  ) {
    throw new Error('capabilities payload is malformed')
  }

  const lab = labBody.data as LabData
  if (
    !lab ||
    typeof lab.title !== 'string' ||
    typeof lab.goal !== 'string' ||
    typeof lab.duration !== 'string'
  ) {
    throw new Error('lab payload is malformed')
  }

  const lesson = lessonBody.data as LessonData
  if (
    !lesson ||
    typeof lesson.routeId !== 'string' ||
    typeof lesson.html !== 'string' ||
    lesson.html.length === 0
  ) {
    throw new Error('lesson payload is malformed')
  }

  return { routes, capabilities, lab, lesson }
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export async function getProgress(token: string): Promise<ProgressData> {
  const data = await request<{ progress: ProgressData }>('/progress', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data.progress
}

export async function putProgress(token: string, progress: ProgressData): Promise<ProgressData> {
  const data = await request<{ progress: ProgressData }>('/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(progress),
  })
  return data.progress
}