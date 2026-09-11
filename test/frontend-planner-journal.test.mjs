// 规划任务启动学习会话的静态契约与纯函数覆盖。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  createEmptyDraft,
  hasJournalDraftContent,
  isValidDraft,
  startJournalSession,
} from '../src/journal.ts'
import {
  createPlannerMissionSnapshot,
  normalizeFocusQueue,
} from '../src/planner.ts'

const plannerSource = readFileSync(new URL('../src/planner.ts', import.meta.url), 'utf8')
const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')

const snapshot = {
  id: 'mission-1',
  title: '完成第一课实验',
  route: 'beginner',
  priority: 'high',
  estimateMinutes: 30,
  dueDate: '2026-09-11',
  notes: '记录一次可复现 run',
}

test('[planner-start] 初始骨架不触发覆盖确认，真实会话内容触发覆盖确认', () => {
  assert.equal(hasJournalDraftContent(createEmptyDraft()), false)
  assert.equal(hasJournalDraftContent(createEmptyDraft(snapshot)), true)
  const edited = createEmptyDraft()
  edited.steps[0] = true
  assert.equal(hasJournalDraftContent(edited), true)
})

test('[planner-start] 启动快照只携带任务上下文，旧 journal payload 仍兼容', () => {
  const draft = createEmptyDraft(createPlannerMissionSnapshot({
    ...snapshot,
    status: 'active',
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
  }))
  assert.deepEqual(draft.taskSnapshot, snapshot)
  assert.equal(draft.steps.filter(Boolean).length, 0)
  assert.equal(isValidDraft(createEmptyDraft()), true)
  assert.equal(isValidDraft(draft), true)
  assert.equal(
    isValidDraft({ ...createEmptyDraft(), score: 11 }),
    false,
  )
  assert.equal(
    isValidDraft({ ...createEmptyDraft(), elapsedSeconds: Number.NaN }),
    false,
  )
})

test('[planner-start] 专注队列启动入口与 main 显式依赖已接通', () => {
  assert.match(plannerSource, /data-action="focus-start"/)
  assert.match(plannerSource, /hasJournalDraft\(\)/)
  assert.match(plannerSource, /createPlannerMissionSnapshot\(mission\)/)
  assert.match(plannerSource, /startJournalSession\(/)
  assert.match(mainSource, /hasJournalDraft:\s*\(\) => hasJournalDraftContent\(loadJournalDraft\(\)\)/)
  assert.match(mainSource, /navigate\('#\/progress'\)/)
  assert.match(styleSource, /planner-focus__item \[data-action='focus-start'\]/)
})

test('[planner-start] 队列归一化仍排除完成任务', () => {
  const missions = [{ id: 'mission-1', status: 'done' }, { id: 'mission-2', status: 'active' }]
  assert.deepEqual(normalizeFocusQueue(['mission-1', 'mission-2'], missions), ['mission-2'])
})

test('[planner-start] 任务快照边界校验拒绝漂移或越界字段', () => {
  assert.equal(
    isValidDraft({ ...createEmptyDraft(snapshot), taskSnapshot: { ...snapshot, title: ' ' } }),
    false,
  )
  assert.equal(
    isValidDraft({ ...createEmptyDraft(snapshot), taskSnapshot: { ...snapshot, dueDate: '2026-02-30' } }),
    false,
  )
  assert.equal(
    isValidDraft({ ...createEmptyDraft(snapshot), taskSnapshot: { ...snapshot, notes: 'x'.repeat(301) } }),
    false,
  )
})

test('[planner-start] 覆盖确认发生在启动写入与导航之前', () => {
  const confirmation = plannerSource.indexOf("window.confirm('当前学习会话已有草稿")
  const plannerWrite = plannerSource.indexOf('missions = changeMissionStatus', confirmation)
  const journalWrite = plannerSource.indexOf('startDeps.startJournalSession', confirmation)
  const navigation = plannerSource.indexOf('startDeps.navigateToProgress', confirmation)
  assert.ok(confirmation >= 0)
  assert.ok(confirmation < plannerWrite)
  assert.ok(confirmation < journalWrite)
  assert.ok(confirmation < navigation)
})

// 仅验证可构建的集成边界；真实交互由 frontend-test 流程负责。
void startJournalSession
