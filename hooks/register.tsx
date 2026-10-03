import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { RickyActivity, RickyAgent, RickyFile, RickyMood, RickyTodo } from '../types'
import {
  ACTIVITY_MAX,
  applyTodoWrite,
  clock,
  detailOf,
  EDIT_TOOLS,
  formatElapsed,
  noteEdit,
  progressBar,
  TASK_TOOLS,
  toolLabel,
} from './board'
import { stringsFor } from './i18n'
import { BAND_ROWS, bandScene, paneScene } from './scene'

const PANE = 'ricky'
const PANE_ROWS = 18
const TICK_MS = 200
const GOLD = '#c99a12'
const PURPLE = '#8a5cf0'
const LAVENDER = '#e4dcff'
const ROSE = '#d0457a'

const moodAtom = atom({ plugin: 'ricky-pixel-mod', key: 'mood' } as const, 'idle')
const todosAtom = atom({ plugin: 'ricky-pixel-mod', key: 'todos' } as const, [])
const activityAtom = atom({ plugin: 'ricky-pixel-mod', key: 'activity' } as const, [])
const agentsAtom = atom({ plugin: 'ricky-pixel-mod', key: 'agents' } as const, [])
const filesAtom = atom({ plugin: 'ricky-pixel-mod', key: 'files' } as const, [])

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)] as T

// What the timer needs synchronously. Anything a drawing reads lives in $.state.
// A reload re-runs this module, starting over.
const live = {
  tick: 0,
  mood: 'idle' as RickyMood,
  inTurn: false,
  toolsRunning: 0,
  revert: undefined as { cancel: () => void } | undefined,
  spinnerWord: 'Ricky',
  cwd: '',
  hasClock: false, // an in-progress task or a running agent shows a ticking time
  pane: { cols: 0, isLive: false },
  band: undefined as { requestId: string; cols: number; isLive: boolean } | undefined,
}

async function setMood($: EngineInterface, next: RickyMood, holdMs?: number) {
  live.revert?.cancel()
  live.revert = undefined
  live.mood = next
  await update($, moodAtom, () => next)
  if (holdMs) {
    live.revert = $.clock.after(holdMs, () => {
      void setMood($, live.inTurn ? (live.toolsRunning > 0 ? 'fly' : 'think') : 'idle')
    })
  }
}

async function refreshClockFlag($: EngineInterface) {
  const todos = (await read($, todosAtom)) as RickyTodo[]
  const agents = (await read($, agentsAtom)) as RickyAgent[]
  live.hasClock = agents.length > 0 || todos.some(t => t.status === 'in_progress')
}

/** Record what a finished task tool did to the task list. */
async function applyTaskTool($: EngineInterface, tool: string, input: Record<string, unknown>, result: unknown) {
  const now = await $.clock.now()
  if (tool === 'TodoWrite' && Array.isArray(input.todos)) {
    const todos = input.todos as Parameters<typeof applyTodoWrite>[1]
    await update($, todosAtom, prev => applyTodoWrite((prev ?? []) as RickyTodo[], todos, now))
  } else if (tool === 'TaskCreate') {
    const id = (result as { task?: { id?: string } } | undefined)?.task?.id
    const content = String(input.subject ?? '')
    await update($, todosAtom, prev => [...((prev ?? []) as RickyTodo[]), { ...(id ? { id } : {}), content, status: 'pending' as const }])
  } else if (tool === 'TaskUpdate') {
    const id = String(input.taskId ?? '')
    const status = input.status as string | undefined
    await update($, todosAtom, prev =>
      ((prev ?? []) as RickyTodo[])
        .filter(t => !(t.id === id && status === 'deleted'))
        .map(t => {
          if (t.id !== id) return t
          const next: RickyTodo = { ...t, ...(typeof input.subject === 'string' ? { content: input.subject } : {}) }
          if (status === 'pending' || status === 'in_progress' || status === 'completed') next.status = status
          if (next.status === 'in_progress') {
            next.startedAt = t.status === 'in_progress' && t.startedAt ? t.startedAt : now
            if (typeof input.activeForm === 'string') next.label = input.activeForm
          } else {
            delete next.startedAt
            delete next.label
          }
          return next
        }),
    )
  }
  await refreshClockFlag($)
}

export const register: Register = (on, options) => {
  const t = stringsFor(options.language)
  live.spinnerWord = t.spinnerWords[0] ?? 'Ricky'

  on('session.start', async ($, e, next) => {
    live.mood = (await read($, moodAtom)) as RickyMood
    live.cwd = await $.session.cwd()
    await refreshClockFlag($)
    await $.command.register({ name: 'ricky', description: t.commandDescription })
    void $.ui.open({ id: PANE, title: '✦ Ricky' })

    $.clock.every(TICK_MS, () => {
      live.tick += 1
      if (live.pane.isLive && live.pane.cols > 0) {
        void $.ui
          .blit({ requestId: PANE, key: 'sky', cells: paneScene(live.pane.cols, PANE_ROWS, live.mood, live.tick) })
          .then(r => {
            if (r.deny) live.pane.isLive = false
          })
        // keep the elapsed times ticking, once a second
        if (live.hasClock && live.tick % 5 === 0) $.ui.invalidate('ui.render')
      }
      const b = live.band
      if (b?.isLive) {
        void $.ui
          .blit({ requestId: b.requestId, key: 'ribbon', cells: bandScene(b.cols, live.mood, live.tick) })
          .then(r => {
            if (r.deny) b.isLive = false
          })
      }
    })

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, todosAtom, () => [])
      await update($, activityAtom, () => [])
      await update($, agentsAtom, () => [])
      await update($, filesAtom, () => [])
      live.hasClock = false
    }
    return next(e)
  })

  on('command.run', { command: 'ricky' }, async $ => {
    await $.ui.open({ id: PANE, title: '✦ Ricky' })
    return { text: t.commandReply }
  })

  on('turn.start', async ($, e, next) => {
    live.inTurn = true
    live.spinnerWord = pick(t.spinnerWords)
    await setMood($, 'think')
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const now = await $.clock.now()
    const isMain = !e.agentId
    const input = e as unknown as Record<string, unknown> // a tool's own fields sit on the event
    const id = e.tool_use_id ?? `${e.tool}-${now}`
    const detail = detailOf(e.tool, input, live.cwd)
    const isLogged = isMain && !TASK_TOOLS.has(e.tool)

    live.toolsRunning += 1
    if (live.mood !== 'shock') await setMood($, 'fly')

    if (isLogged) {
      const entry: RickyActivity = { id, at: now, tool: toolLabel(e.tool), detail, status: 'running' }
      await update($, activityAtom, list => [...((list ?? []) as RickyActivity[]), entry].slice(-ACTIVITY_MAX))
    }
    if (isMain && e.tool === 'Agent') {
      const card: RickyAgent = {
        id,
        type: String(input.subagent_type ?? 'agent'),
        description: String(input.description ?? ''),
        startedAt: now,
        calls: 0,
      }
      await update($, agentsAtom, list => [...((list ?? []) as RickyAgent[]), card])
      live.hasClock = true
    }
    if (!isMain) {
      // a subagent's call: pin its loop id to the oldest card without one
      await update($, agentsAtom, list => {
        const cards = (list ?? []) as RickyAgent[]
        const owner = cards.find(c => c.agentId === e.agentId) ?? cards.find(c => !c.agentId)
        if (!owner) return cards
        return cards.map(c =>
          c === owner ? { ...c, agentId: e.agentId, calls: c.calls + 1, current: { tool: toolLabel(e.tool), detail } } : c,
        )
      })
    }

    const ran = await next(e)

    live.toolsRunning = Math.max(0, live.toolsRunning - 1)
    if (isLogged) {
      const status = ran.isError ? 'err' : 'ok'
      await update($, activityAtom, list =>
        ((list ?? []) as RickyActivity[]).map(a => (a.id === id ? { ...a, status } : a)),
      )
    }
    if (isMain && e.tool === 'Agent') {
      await update($, agentsAtom, list => ((list ?? []) as RickyAgent[]).filter(c => c.id !== id))
      await refreshClockFlag($)
    }
    if (!ran.isError && TASK_TOOLS.has(e.tool)) await applyTaskTool($, e.tool, input, 'result' in ran ? ran.result : undefined)
    if (!ran.isError && EDIT_TOOLS.has(e.tool) && detail) {
      const isNew = e.tool === 'Write' && (ran as { result?: { type?: string } }).result?.type === 'create'
      await update($, filesAtom, list => noteEdit((list ?? []) as RickyFile[], detail, isNew))
    }

    if (ran.isError) await setMood($, 'shock', 2500)
    else if (live.toolsRunning === 0 && live.mood !== 'shock') await setMood($, 'think')
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e)
    live.inTurn = false
    live.toolsRunning = 0
    if (e.reason === 'answer') await setMood($, 'happy', 4000)
    else if (e.reason === 'error') await setMood($, 'shock', 3000)
    else await setMood($, 'idle')
    return next(e)
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) live.pane.isLive = false
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    const { Box, Raster, Text } = $.ui.resolve(e)
    const cols = Math.max(34, e.props.bodyColumns)
    live.pane = { cols, isLive: true }
    const m = (await read($, moodAtom)) as RickyMood
    const todos = (await read($, todosAtom)) as RickyTodo[]
    const activity = (await read($, activityAtom)) as RickyActivity[]
    const agents = (await read($, agentsAtom)) as RickyAgent[]
    const files = (await read($, filesAtom)) as RickyFile[]
    const now = await $.clock.now()

    const done = todos.filter(t => t.status === 'completed').length
    const bar = progressBar(done, todos.length, Math.max(10, Math.min(26, cols - 24)))
    const pct = todos.length ? Math.round((done / todos.length) * 100) : 0

    return (
      <Box flexDirection="column">
        <Raster key="sky" columns={cols} rows={PANE_ROWS} cells={paneScene(cols, PANE_ROWS, m, live.tick)} />

        {todos.length > 0 && (
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Text>
              <Text color={GOLD} bold>{t.tasks}</Text>
              {`  ${done}/${todos.length}  `}
              <Text color={PURPLE}>{bar.on}</Text>
              <Text color={LAVENDER}>{bar.off}</Text>
              {`  ${pct}%`}
            </Text>
            {todos.map(t =>
              t.status === 'completed' ? (
                <Text wrap="truncate-end">
                  {' '}
                  <Text color={PURPLE}>✓</Text> <Text dimColor>{t.content}</Text>
                </Text>
              ) : t.status === 'in_progress' ? (
                <Text wrap="truncate-end">
                  {' '}
                  <Text color={GOLD}>◆ {t.label ?? t.content}</Text>
                  {t.startedAt ? <Text dimColor>{`  ${formatElapsed(now - t.startedAt)}`}</Text> : null}
                </Text>
              ) : (
                <Text dimColor wrap="truncate-end">
                  {' ○ '}
                  {t.content}
                </Text>
              ),
            )}
          </Box>
        )}

        {agents.length > 0 && (
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Text>
              <Text color={GOLD} bold>{t.subagents}</Text>
              <Text dimColor>{`  ${t.running(agents.length)}`}</Text>
            </Text>
            {agents.map(a => (
              <Box flexDirection="column" marginLeft={1} paddingLeft={1} borderStyle="single" borderColor={PURPLE}>
                <Text wrap="truncate-end">
                  <Text color={PURPLE} bold>{a.type}</Text> {a.description}
                  <Text dimColor>{`  ${formatElapsed(now - a.startedAt)} · ${t.calls(a.calls)}`}</Text>
                </Text>
                {a.current && (
                  <Text wrap="truncate-end">
                    <Text color={GOLD}>›</Text> {a.current.tool} <Text dimColor>{a.current.detail}</Text>
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        )}

        {activity.length > 0 && (
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Text color={GOLD} bold>{t.recent}</Text>
            {[...activity].reverse().map(a => (
              <Text wrap="truncate-end">
                <Text dimColor>{clock(a.at)}</Text>{' '}
                {a.status === 'running' ? (
                  <Text color={GOLD}>›</Text>
                ) : a.status === 'ok' ? (
                  <Text color={PURPLE}>✓</Text>
                ) : (
                  <Text color={ROSE}>✗</Text>
                )}{' '}
                {a.tool.padEnd(6)} <Text dimColor>{a.detail}</Text>
              </Text>
            ))}
          </Box>
        )}

        {files.length > 0 && (
          <Box flexDirection="column" marginTop={1} paddingX={1}>
            <Text>
              <Text color={GOLD} bold>{t.filesChanged}</Text>
              <Text dimColor>{`  ${files.length}`}</Text>
            </Text>
            {files.map(f => (
              <Text wrap="truncate-start">
                {' '}
                {f.path}{'  '}
                {f.isNew && f.edits === 1 ? <Text color={PURPLE}>{t.newFile}</Text> : <Text dimColor>{t.edits(f.edits)}</Text>}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface !== 'terminal') return next(e)
    const { Raster } = $.ui.resolve(e)
    const cols = Math.max(26, e.props.bodyColumns - 2)
    live.band = { requestId: e.requestId, cols, isLive: true }
    const m = (await read($, moodAtom)) as RickyMood

    return <Raster key="ribbon" columns={cols} rows={BAND_ROWS} cells={bandScene(cols, m, live.tick)} />
  })

  on('ui.render', { component: 'Spinner' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, word: live.spinnerWord, suffix: ' ✦' } }),
  )

  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text color={GOLD}>{t.turnDone(formatElapsed(e.props.durationMs))}</Text>
  })
}
