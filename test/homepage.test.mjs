import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('首页显示 hello world', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8')

  assert.match(source, /hello world/i)
})

test('按钮可打开并关闭显示“你好”的弹窗', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8')

  assert.match(source, /<button[^>]*>[^<]*打开弹窗[^<]*<\/button>/i)
  assert.match(source, /<dialog[^>]*>[\s\S]*你好[\s\S]*<\/dialog>/i)
  assert.match(source, /showModal\s*\(/)
  assert.match(source, /\.close\s*\(/)
})
