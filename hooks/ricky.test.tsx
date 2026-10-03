import { expect, mock, test } from 'claude-code/testing'

import { applyTodoWrite, detailOf, noteEdit, progressBar, relPath } from './board'
import { bandScene, base64, BAND_ROWS, frameFor, paneScene } from './scene'

const PANE = {
  plugin: 'ricky-pixel-mod',
  component: 'Pane',
  requestId: 'ricky',
  props: {
    title: '✦ Ricky',
    isFocused: false,
    bodyColumns: 44,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('base64 matches the standard encoding', async () => {
  const enc = new TextEncoder()
  expect(base64(enc.encode('foo'))).toBe('Zm9v')
  expect(base64(enc.encode('fo'))).toBe('Zm8=')
  expect(base64(enc.encode('f'))).toBe('Zg==')
})

test('scenes pack exactly columns * rows cells', async () => {
  // 3 u32 per cell -> 12 bytes -> 16 base64 chars per cell
  expect(paneScene(40, 18, 'idle', 0).length).toBe(40 * 18 * 16)
  expect(bandScene(30, 'fly', 7).length).toBe(30 * BAND_ROWS * 16)
})

test('each mood has its frames', async () => {
  expect(frameFor('shock', 3)).toBe('shock')
  expect(frameFor('idle', 30)).toBe('blink')
  expect(['happy', 'happy2']).toContain(frameFor('happy', 5))
})

test('the pane draws the night sky raster', async ($, on) => {
  mock.clock(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'sky' }))?.type).toBe('Raster')
  await ui.unmount()
})

test('a failed tool shocks Ricky, then she settles', async ($, on) => {
  const clock = mock.clock(on)
  on('tool.call', () => ({ result: 'boom', isError: true }))
  const ran = await $.tool.call({ tool: 'mcp__test__spell', input: {} })
  expect(ran.isError).toBe(true)
  await clock.advance(3000)
})

test('board helpers summarise tool calls', async () => {
  expect(relPath('/p/src/a.ts', '/p')).toBe('src/a.ts')
  expect(detailOf('Bash', { command: 'npm test\nmore' }, '/p')).toBe('npm test')
  expect(detailOf('Grep', { pattern: 'x', path: '/p/hooks' }, '/p')).toBe('"x" hooks')
  const todos = applyTodoWrite([], [{ content: 'a', status: 'in_progress', activeForm: 'doing a' }], 100)
  expect(todos[0]).toEqual({ content: 'a', status: 'in_progress', startedAt: 100, label: 'doing a' })
  expect(applyTodoWrite(todos, [{ content: 'a', status: 'in_progress' }], 999)[0]?.startedAt).toBe(100)
  expect(noteEdit(noteEdit([], 'f', true), 'f', false)).toEqual([{ path: 'f', edits: 2, isNew: true }])
  expect(progressBar(3, 5, 10)).toEqual({ on: '██████', off: '████' })
})

test('the pane lists tasks, recent calls and edited files', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  on('tool.call', ($, e) => (e.tool === 'mcp__test__fail' ? { result: 'no', isError: true } : { result: 'ok' }))
  await $.tool.call({ tool: 'mcp__test__fail', input: {} })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const drawn = JSON.stringify(await ui.drawn()).replace(/"cells":"[^"]*"/, '')
  expect(drawn).toContain('最近动作')
  expect(drawn).toContain('✗')
  expect(drawn).toContain('test·fail')
  expect(drawn).not.toContain('✦ 任务') // no tasks yet: hidden
  await ui.unmount()
})
