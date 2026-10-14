// The press probe: a ring buffer of the last PRESSLOG_MAX Client pointer events, keys and numbers only; off by default.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { PRESSLOG_EVENTS_KEY, PRESSLOG_KEY, PRESSLOG_MAX, appendLog, cleanPosted } from '../hooks/core/presslog'
import type { PostedEvent, PressLogEvent } from '../hooks/core/presslog'
import { setPressLog } from '../hooks/ui/firstclick'
import { test } from './slow'

const NOW = Date.parse('2026-10-13T12:00:00Z')
const props = { title: 'Vaken', isFocused: false, bodyColumns: 60, placement: 'inline' as const, scroll: { bodyRows: 120, offset: 0, total: 120 }, view: {} }

type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null)
const walk = (n: Node): Node[] => [n, ...kids(n).flatMap(walk)]
const clients = (root: unknown): Node[] => walk(root as Node).filter(n => n.type === 'Client' && String(n.key ?? n.props?.key ?? '').startsWith('fc-'))

function engine(on: On, mem: Map<string, unknown>, writes: string[]) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    writes.push(e.key)
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', () => ({ value: undefined }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  return clock
}

const world = () => new Map<string, unknown>([['cockpit:firstrun', 'done'], ['cockpit:setting:look.view', 'custom']])
const debugWrites = (writes: string[]): string[] => writes.filter(k => k.startsWith('cockpit:debug'))

test('the ring buffer keeps the last PRESSLOG_MAX events, each once, numbers and keys only', () => {
  let log: PressLogEvent[] = []
  let seen: number | undefined
  const recent: PostedEvent[] = []
  for (let n = 1; n <= 250; n += 1) {
    recent.push({ n, type: n % 2 === 0 ? 'up' : 'down', x: n % 7, y: 1, columns: 40, rows: 2 })
    const r = appendLog(log, 'fc-o-other-1', recent.slice(-8), seen, NOW + n)
    log = r.log
    seen = r.seen
  }
  expect(log).toHaveLength(PRESSLOG_MAX)
  expect(log[0]?.n).toBe(250 - PRESSLOG_MAX + 1)
  expect(log[log.length - 1]).toEqual({ key: 'fc-o-other-1', n: 250, type: 'up', x: 250 % 7, y: 1, columns: 40, rows: 2, at: NOW + 250 })
  expect(new Set(log.map(e => e.n)).size).toBe(PRESSLOG_MAX)
  const again = appendLog(log, 'fc-o-other-1', [{ n: 1, type: 'down', x: 0, y: 0, columns: 40, rows: 2 }], seen, NOW)
  expect(again.log[again.log.length - 1]?.n).toBe(1)
  // Only known events with numbers pass; a word where a number goes, a move and anything else is dropped, and no other field is kept.
  expect(cleanPosted([{ n: 1, type: 'down', x: 1, y: 2, columns: 3, rows: 4, text: 'secret' }, { n: 2, type: 'move', x: 1, y: 2, columns: 3, rows: 4 }, { n: 3, type: 'up', x: '1', y: 2, columns: 3, rows: 4 }, 'x', null])).toEqual([{ n: 1, type: 'down', x: 1, y: 2, columns: 3, rows: 4 }])
  expect(cleanPosted('nope')).toEqual([])
})

test('off (the default): no Client is told to log, a click and a post write nothing; on: the command turns it on, the clicks are kept, off stops it', async ($, on) => {
  setPressLog(false)
  const mem = world()
  const writes: string[] = []
  engine(on, mem, writes)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props })
  const drawn = clients(await ui.drawn())
  expect(drawn.length).toBeGreaterThan(5)
  expect(drawn.filter(c => (c.props?.props as { log?: unknown } | undefined)?.log !== undefined)).toEqual([])
  const keyOf = (n: Node | undefined): string => String(n?.key ?? n?.props?.key ?? '')
  let where = keyOf(drawn[0])
  await ui.pointer({ type: 'down', x: 2, y: 1, button: 'left', in: where })
  await ui.pointer({ type: 'up', x: 2, y: 1, button: 'left', in: where })
  await ui.post({ log: [{ n: 1, type: 'down', x: 1, y: 1, columns: 9, rows: 2 }] }, { in: where })
  expect(debugWrites(writes)).toEqual([])
  expect(mem.has(PRESSLOG_EVENTS_KEY)).toBe(false)

  const said = (await $.command.run({ command: 'vaken-help', args: 'run presslog on' })) as { text: string }
  expect(said.text).toMatch(/^Press log: on\./)
  expect(mem.get(PRESSLOG_KEY)).toBe(true)
  await ui.redraw()
  const logging = clients(await ui.drawn())
  expect(logging.every(c => (c.props?.props as { log?: unknown } | undefined)?.log === true)).toBe(true)
  where = keyOf(logging[0])
  await ui.pointer({ type: 'down', x: 3, y: 1, button: 'left', in: where })
  await ui.pointer({ type: 'up', x: 3, y: 1, button: 'left', in: where })
  const kept = mem.get(PRESSLOG_EVENTS_KEY) as PressLogEvent[]
  expect(kept.map(e => [e.key, e.type, e.x, e.y])).toEqual([
    [where, 'down', 3, 1],
    [where, 'up', 3, 1],
  ])
  for (const e of kept) for (const v of [e.columns, e.rows, e.at, e.n]) expect(typeof v).toBe('number')
  const shown = (await $.command.run({ command: 'vaken-help', args: 'run presslog' })) as { text: string }
  expect(shown.text).toContain(`${where} up at 3,1`)

  await $.command.run({ command: 'vaken-help', args: 'run presslog off' })
  expect(mem.get(PRESSLOG_KEY)).toBe(false)
  await ui.redraw()
  const quiet = clients(await ui.drawn())
  expect(quiet.filter(c => (c.props?.props as { log?: unknown } | undefined)?.log !== undefined)).toEqual([])
  where = keyOf(quiet[0])
  const before = debugWrites(writes).length
  await ui.pointer({ type: 'down', x: 3, y: 1, button: 'left', in: where })
  await ui.pointer({ type: 'up', x: 3, y: 1, button: 'left', in: where })
  await ui.post({ log: [{ n: 99, type: 'down', x: 1, y: 1, columns: 9, rows: 2 }] }, { in: where })
  expect(debugWrites(writes).length).toBe(before)
  await ui.unmount()
  setPressLog(false)
})
