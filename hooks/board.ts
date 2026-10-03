// Pure helpers for the dashboard under the sky: no `$`, so they are testable.
import type { RickyFile, RickyTodo } from '../types'

export const ACTIVITY_MAX = 6
// tools whose calls the task list already shows
export const TASK_TOOLS = new Set(['TodoWrite', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet'])
export const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** A path relative to `cwd` when inside it, else with $HOME shortened. */
export function relPath(path: string, cwd: string, home = ''): string {
  if (cwd && path.startsWith(cwd + '/')) return path.slice(cwd.length + 1)
  if (home && path.startsWith(home + '/')) return '~' + path.slice(home.length)
  return path
}

/** One short line saying what a tool call works on. */
export function detailOf(tool: string, input: unknown, cwd: string): string {
  const i = (input ?? {}) as Record<string, unknown>
  switch (tool) {
    case 'Bash':
      return str(i.command).split('\n')[0] ?? ''
    case 'Read':
    case 'Edit':
    case 'Write':
      return relPath(str(i.file_path), cwd)
    case 'NotebookEdit':
      return relPath(str(i.notebook_path), cwd)
    case 'Grep':
      return `"${str(i.pattern)}"${i.path ? ' ' + relPath(str(i.path), cwd) : ''}`
    case 'Glob':
      return str(i.pattern)
    case 'WebFetch':
      return str(i.url).replace(/^https?:\/\//, '')
    case 'WebSearch':
      return str(i.query)
    case 'Agent':
      return str(i.description)
    case 'Skill':
      return str(i.skill)
    default:
      return ''
  }
}

/** Shorter names for MCP tools: mcp__server__tool -> server·tool */
export function toolLabel(tool: string): string {
  const m = /^mcp__(.+?)__(.+)$/.exec(tool)
  return m ? `${m[1]}·${m[2]}` : tool
}

/** TodoWrite replaces the list; keep each in-progress item's start time. */
export function applyTodoWrite(
  prev: RickyTodo[],
  todos: { content: string; status: RickyTodo['status']; activeForm?: string }[],
  now: number,
): RickyTodo[] {
  return todos.map(t => {
    const todo: RickyTodo = { content: t.content, status: t.status }
    if (t.status === 'in_progress') {
      const before = prev.find(p => p.content === t.content)
      todo.startedAt = before?.status === 'in_progress' && before.startedAt ? before.startedAt : now
      if (t.activeForm) todo.label = t.activeForm
    }
    return todo
  })
}

export function noteEdit(files: RickyFile[], path: string, isNew: boolean): RickyFile[] {
  const hit = files.find(f => f.path === path)
  if (hit) return files.map(f => (f.path === path ? { ...f, edits: f.edits + 1 } : f))
  return [...files, { path, edits: 1, isNew }]
}

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export function clock(at: number): string {
  const d = new Date(at)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

export function progressBar(done: number, total: number, width: number): { on: string; off: string } {
  const n = total === 0 ? 0 : Math.round((done / total) * width)
  return { on: '█'.repeat(n), off: '█'.repeat(width - n) }
}
