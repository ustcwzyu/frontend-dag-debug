// 零依赖纯前端 hash 路由模块（BR-RT-001 / BR-RT-002）。
//
// 固定路由表：
//   '' / '#' / '#/'                      → home
//   '#/lesson/beginner|builder|advanced' → lesson
//   '#/progress'                         → progress
//   '#/archive'                          → archive
//   '#/export'                           → export
//   '#/login'                            → login
//   其余（含 '#/lesson/unknown'）        → not-found
//
// 本文件不 import 任何本地模块、不触碰 document；parseHash 可在 Node 测试中直接导入，
// navigate / startRouter 仅在浏览器运行时使用 window，模块级零副作用、零网络、零存储。

export type RouteId = 'beginner' | 'builder' | 'advanced'

export type PageName = 'home' | 'lesson' | 'progress' | 'archive' | 'export' | 'login' | 'not-found'

export interface ParsedRoute {
  page: PageName
  routeId: RouteId | null
}

const LESSON_ROUTE_IDS: readonly RouteId[] = ['beginner', 'builder', 'advanced']

/** 按固定路由表解析 hash，未知 hash（含 #/lesson/unknown）一律 not-found（BR-RT-001）。 */
export function parseHash(hash: string): ParsedRoute {
  const value = (hash ?? '').trim()
  if (value === '' || value === '#' || value === '#/') {
    return { page: 'home', routeId: null }
  }
  if (value === '#/progress') {
    return { page: 'progress', routeId: null }
  }
  if (value === '#/archive') {
    return { page: 'archive', routeId: null }
  }
  if (value === '#/export') {
    return { page: 'export', routeId: null }
  }
  if (value === '#/login') {
    return { page: 'login', routeId: null }
  }
  const lessonPrefix = '#/lesson/'
  if (value.startsWith(lessonPrefix)) {
    const routeId = value.slice(lessonPrefix.length)
    if ((LESSON_ROUTE_IDS as readonly string[]).includes(routeId)) {
      return { page: 'lesson', routeId: routeId as RouteId }
    }
  }
  return { page: 'not-found', routeId: null }
}

/** 幂等导航：仅在 hash 与目标不同时赋值（AC-FE-012 / BR-RT-002）。 */
export function navigate(hash: string): void {
  if (typeof window === 'undefined') return
  if (window.location.hash !== hash) {
    window.location.hash = hash
  }
}

let routerStarted = false

/** 以模块级 routerStarted 守卫注册唯一 hashchange 监听并完成首次渲染分派（BR-RT-002）。 */
export function startRouter(dispatch: () => void): void {
  if (routerStarted) return
  routerStarted = true
  window.addEventListener('hashchange', dispatch)
  dispatch()
}
