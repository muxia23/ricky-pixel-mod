export type RickyMood = 'idle' | 'think' | 'fly' | 'happy' | 'shock'

export type RickyTodo = {
  /** TaskCreate's id; absent for TodoWrite items */
  id?: string
  content: string
  /** what to show while in progress (TodoWrite's activeForm) */
  label?: string
  status: 'pending' | 'in_progress' | 'completed'
  /** when it went in_progress, ms */
  startedAt?: number
}

export type RickyActivity = {
  id: string
  at: number
  tool: string
  detail: string
  status: 'running' | 'ok' | 'err'
}

export type RickyAgent = {
  id: string
  /** the subagent loop's id, learned from its first tool call */
  agentId?: string
  type: string
  description: string
  startedAt: number
  calls: number
  current?: { tool: string; detail: string }
}

export type RickyFile = { path: string; edits: number; isNew: boolean }

declare module 'claude-code' {
  interface PluginState {
    'ricky-pixel-mod': {
      mood: RickyMood
      todos: RickyTodo[]
      activity: RickyActivity[]
      agents: RickyAgent[]
      files: RickyFile[]
    }
  }
}
