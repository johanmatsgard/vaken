// Where it went and Finish safely (ideas Q6, Q7): this session's spend by cause on the Plan limits card, with one fix when a cause clearly leads,
// and one press that saves the handover note and asks Claude to stop at a safe point when the window runs out before the work ends.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { BIG_LINES } from '../hooks/core/lean'
import { LONG_TOOL_CHARS, WHERE_CAUSE, WHERE_FIX, WHERE_LABEL, WHERE_LEAN_SAID, WHERE_MIN_TURNS, WHERE_NEXT, WHERE_WORDS, addTool, addTurn, emptyState, leanCutsRead, parseState, sizeKindOf, turnOf, whereFixOf, whereOf } from '../hooks/core/cost'
import type { CostState } from '../hooks/core/cost'
import { FINISH_PRESS, FINISH_WORDS, finishMem, finishPrompt } from '../hooks/core/continuity'
import { runFinish, runWhereFix } from '../hooks/features/home/actions'
import type { HomeEngine } from '../hooks/features/home/engine'
import type { Io } from '../hooks/core/io'
import { nextMem } from '../hooks/core/actions'
import { leanMem } from '../hooks/core/lean'
import { byEnglish } from '../hooks/i18n/table'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { flags } from '../hooks/features/home/state'
import { BASE_SEEDS, HOME, HOUR, NOW, SETUP_BASE, engine, kids, nameOf, propsAt, walk } from './statefixtures'
import type { Mem, Node, Pane, World } from './statefixtures'

const SV = byEnglish('sv')
const usage = (input: number, write: number, output: number, read: number) => ({ input_tokens: input, cache_creation_input_tokens: write, output_tokens: output, cache_read_input_tokens: read, model: 'claude-opus-5' })

// A session of `turns` main answers, each bringing `brought` new tokens; `agents` agent answers of the same size
function session(o: { turns: number; brought: number; agents?: number; read?: number; big?: boolean; shell?: number; other?: number }): CostState {
  const s = emptyState(NOW)
  for (let n = 0; n < o.turns; n += 1) addTurn(s, turnOf(usage(0, o.brought, 500, 20_000), NOW, 1000, false)!)
  for (let n = 0; n < (o.agents ?? 0); n += 1) addTurn(s, turnOf(usage(0, o.brought, 500, 20_000), NOW, 1000, true)!)
  if (o.read !== undefined) addTool(s, o.read, 'read', o.big === true)
  if (o.shell !== undefined) addTool(s, o.shell, 'shell')
  if (o.other !== undefined) addTool(s, o.other, 'other')
  return s
}

test('the kinds: Read is a file read, the shell its own, an agent answer is left out (agents count by their turns)', () => {
  expect(sizeKindOf('Read', false)).toBe('read')
  expect(sizeKindOf('Bash', true)).toBe('shell')
  expect(sizeKindOf('Grep', false)).toBe('other')
  expect(sizeKindOf('mcp__x__y', false)).toBe('other')
  expect(sizeKindOf('Agent', false)).toBeUndefined()
  expect(sizeKindOf('Task', false)).toBeUndefined()
})

test('sizes only: a big read counts once as big; the sizes survive a save and an odd stored value gives zeros', () => {
  const s = emptyState(NOW)
  addTool(s, LONG_TOOL_CHARS + 1, 'read', true)
  // long but not one Lean would cut (a part Claude asked for): not a big read
  addTool(s, LONG_TOOL_CHARS + 1, 'read')
  addTool(s, 100, 'read')
  addTool(s, 50, 'shell')
  addTool(s, 10)
  expect(s.sizes).toEqual({ read: 2 * LONG_TOOL_CHARS + 102, shell: 50, other: 0, bigReads: 1 })
  expect(s.tools.n).toBe(5)
  expect(parseState(JSON.parse(JSON.stringify(s)), NOW).sizes).toEqual(s.sizes)
  expect(parseState({ sizes: { read: 'x', shell: -1 } }, NOW).sizes).toEqual({ read: 0, shell: 0, other: 0, bigReads: 0 })
  // the state holds numbers only, never text
  expect(JSON.stringify(s.sizes)).not.toMatch(/[a-z]{3,}:/)
})

test('too little to say: under the minimum turns or tokens there is no Where it went', () => {
  expect(whereOf(session({ turns: WHERE_MIN_TURNS - 1, brought: 50_000 }))).toBeUndefined()
  expect(whereOf(session({ turns: WHERE_MIN_TURNS, brought: 100 }))).toBeUndefined()
})

test('big reads lead clearly: the top cause is file reads, and the fix is Lean All long output, or compact once Lean already cuts', () => {
  const w = whereOf(session({ turns: 5, brought: 20_000, read: 4 * 80_000, big: true, shell: 4 * 2_000 }))!
  expect(w.top).toBe('reads')
  expect(w.clear).toBe(true)
  const sum = Object.values(w.parts).reduce((a, b) => a + b, 0)
  expect(Math.round(sum)).toBe(100)
  expect(whereFixOf(w, false)).toBe('lean')
  expect(whereFixOf(w, true)).toBe('compact')
})

test('reads lead but none is one Lean would cut: Lean would change nothing, so the fix is a compact, not Lean', () => {
  const w = whereOf(session({ turns: 5, brought: 20_000, read: 4 * 80_000, shell: 4 * 2_000 }))!
  expect(w.top).toBe('reads')
  expect(w.bigReads).toBe(0)
  expect(whereFixOf(w, false)).toBe('compact')
  // output leads: Lean still cuts long tool output
  const out = whereOf(session({ turns: 5, brought: 20_000, shell: 4 * 80_000 }))!
  expect(out.top).toBe('output')
  expect(whereFixOf(out, false)).toBe('lean')
})

test('a read counts as big only when Lean would cut it: more lines than its limit and no exact part asked for', () => {
  const lines = (n: number): string => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n')
  expect(leanCutsRead('Read', { file_path: '/w/a.ts' }, lines(BIG_LINES + 1))).toBe(true)
  expect(leanCutsRead('Read', { file_path: '/w/a.ts' }, lines(BIG_LINES))).toBe(false)
  expect(leanCutsRead('Read', { file_path: '/w/a.ts', offset: 10, limit: 2000 }, lines(BIG_LINES + 1))).toBe(false)
  expect(leanCutsRead('Read', { file_path: '/w/CLAUDE.md' }, lines(BIG_LINES + 1))).toBe(false)
  expect(leanCutsRead('Bash', { command: 'cat a' }, lines(BIG_LINES + 1))).toBe(false)
})

test('agents lead: the fix asks for fewer agents; plain turns lead: compact; nothing stands out: no fix (the card stays calm)', () => {
  const agents = whereOf(session({ turns: 3, brought: 10_000, agents: 30 }))!
  expect(agents.top).toBe('agents')
  expect(whereFixOf(agents, false)).toBe('agents')
  const turns = whereOf(session({ turns: 10, brought: 10_000 }))!
  expect(turns.top).toBe('turns')
  expect(whereFixOf(turns, false)).toBe('compact')
  const even = whereOf(session({ turns: 4, brought: 10_000, agents: 1, read: 4 * 13_000, shell: 4 * 13_000 }))!
  expect(even.clear).toBe(false)
  expect(whereFixOf(even, false)).toBeUndefined()
})

test('a tool size never makes a part above all that was brought in', () => {
  const w = whereOf(session({ turns: 3, brought: 10_000, read: 10_000_000 }))!
  expect(w.parts.reads).toBeLessThanOrEqual(100)
  expect(w.parts.turns).toBeGreaterThanOrEqual(0)
})

test('every text is in the table, English and Swedish; each fix says what it does', () => {
  for (const s of [...WHERE_WORDS, ...FINISH_WORDS]) expect(SV[s], s).toBeDefined()
  for (const f of ['lean', 'compact', 'agents'] as const) expect(WHERE_NEXT[f].startsWith(WHERE_FIX[f])).toBe(true)
  expect(Object.values(WHERE_CAUSE).length).toBe(4)
})

test('the Finish safely request is fixed: a safe point, no commit it was not asked for, the note path, where it stopped', () => {
  const p = finishPrompt('/home/me/.vaken/brief.md')
  expect(p).toMatch(/safe point/)
  expect(p).toMatch(/Do not commit anything I did not ask you to commit/)
  expect(p).toContain('/home/me/.vaken/brief.md')
  expect(p).toMatch(/where you stopped/)
})

function fakeEng(write = true): { eng: HomeEngine; sent: string[]; toasts: string[]; files: Map<string, string>; store: Map<string, unknown> } {
  const sent: string[] = []
  const toasts: string[] = []
  const files = new Map<string, string>()
  const store = new Map<string, unknown>()
  const io = {
    now: async () => NOW,
    home: async () => '/home/me',
    sessionId: async () => 'sid-1',
    get: async (k: string) => store.get(k),
    set: async (k: string, v: unknown) => void store.set(k, v),
    del: async (k: string) => void store.delete(k),
    keys: async () => [...store.keys()],
    read: async (p: string) => files.get(p) ?? '',
    write: async (p: string, t: string) => {
      if (!write) throw new Error('no room')
      files.set(p, t)
    },
    run: async () => ({ exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }),
    ask: async () => '',
    complete: async () => ({ text: '' }),
    toast: (t: string) => void toasts.push(t),
    invalidate: () => undefined,
  } as unknown as Io
  const eng = { io: () => io, cwd: async () => '/w/app', submit: async (t: string) => void sent.push(t), command: async () => undefined } as unknown as HomeEngine
  return { eng, sent, toasts, files, store }
}

test('Finish safely idle: the handover note first, then one fixed request as a message', async () => {
  const f = fakeEng()
  nextMem.busy = false
  finishMem.note = undefined
  await runFinish(f.eng)
  expect(f.files.size).toBe(1)
  // the note is the fresh-start brief (features/continuity.ts), named as the person reads it
  const shown = '~/.claude/cockpit/briefs/brief-sid1.md'
  expect([...f.files.keys()][0]).toBe('/home/me/.claude/cockpit/briefs/brief-sid1.md')
  expect(f.sent).toEqual([finishPrompt(shown)])
  expect(finishMem.note).toBeUndefined()
  expect(f.toasts.at(-1)).toContain(shown)
})

test('Finish safely while Claude works: the request waits for the next step, no message is sent now', async () => {
  const f = fakeEng()
  nextMem.busy = true
  await runFinish(f.eng)
  expect(f.sent).toEqual([])
  expect(finishMem.note).toBe(finishPrompt('~/.claude/cockpit/briefs/brief-sid1.md'))
  nextMem.busy = false
  finishMem.note = undefined
})

test('no handover note, no request', async () => {
  const f = fakeEng(false)
  nextMem.busy = false
  finishMem.note = undefined
  await runFinish(f.eng)
  expect(f.sent).toEqual([])
  expect(finishMem.note).toBeUndefined()
  expect(f.toasts.length).toBe(1)
})

test('the lean fix sets Lean session to All long output; the agents fix sends one request, never while Claude works', async () => {
  const f = fakeEng()
  const was = leanMem.mode
  await runWhereFix(f.eng, 'lean')
  expect(f.store.get('cockpit:setting:lean.mode')).toBe('all')
  expect(leanMem.mode).toBe('all')
  leanMem.mode = was
  nextMem.busy = true
  await runWhereFix(f.eng, 'agents')
  expect(f.sent).toEqual([])
  nextMem.busy = false
  await runWhereFix(f.eng, 'agents')
  expect(f.sent.length).toBe(1)
  expect(f.sent[0]).toMatch(/at most one agent at a time/)
})

test('the lean fix says it worked only when the setting was written; a failed write says so and leaves Lean as it was', async () => {
  const f = fakeEng()
  const was = leanMem.mode
  leanMem.mode = 'off'
  const real = f.eng.io()
  f.eng.io = () => ({ ...real, set: async () => { throw new Error('no room') } }) as ReturnType<HomeEngine['io']>
  await runWhereFix(f.eng, 'lean')
  expect(leanMem.mode).toBe('off')
  expect(f.toasts.at(-1)).toBe('Could not change Lean session. Change it in Settings.')
  expect(f.toasts).not.toContain(WHERE_LEAN_SAID)
  leanMem.mode = was
})

// ---- the card, in the real pane
const R5 = new Date(NOW + 3 * HOUR).toISOString()
const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => find(c, pred)).find(x => x !== undefined))
const texts = (card: Node): string[] =>
  walk(card)
    .filter(n => n.type === 'Text')
    .map(n => (n.children ?? []).filter((c): c is string => typeof c === 'string').join(''))
    .filter(x => x !== '')

async function mountCard($: unknown, on: Parameters<typeof engine>[0], seed: (m: Mem) => void, open?: string): Promise<string[]> {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', 'explained')
  seed(w.mem)
  engine(on, w)
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  const api = $ as { session: { start: (a: unknown) => Promise<unknown> }; ui: { mount: (a: unknown) => Promise<unknown> } }
  // The cost hooks read this session's stored spend at the start
  await api.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  const ui = (await api.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(420) })) as Pane
  await ui.redraw()
  // The row itself is the press that opens it (OpenLine's cover)
  if (open !== undefined) {
    await ui.press({ key: `press-ol-${open}-0` })
    await ui.redraw()
  }
  const root = await ui.drawn()
  await ui.unmount()
  flags.openWhat = undefined
  const card = find(root, n => nameOf(n) === 'limit' && n.props?.borderStyle === 'round') ?? find(root, n => nameOf(n) === 'limit')
  return card === undefined ? [] : texts(card)
}

const readsLead = (m: Mem) => m.set('cockpit:cost:s:test-session', JSON.parse(JSON.stringify(session({ turns: 5, brought: 20_000, read: 4 * 80_000, big: true }))))

const readsSeed = (m: Mem) => {
  m.set('cockpit:usage:app', { at: NOW - 30_000, plan: 'Max', windows: [{ label: '5-hour limit', percent: 40, resetsAt: R5 }] })
  readsLead(m)
}
test('the card: one dim Where it went row with the top cause, no press shown before the row opens', { timeoutMs: 120_000 }, async ($, on) => {
  const shut = await mountCard($, on, readsSeed)
  expect(shut).toContain(WHERE_LABEL)
  expect(shut.some(s => s.startsWith('file reads '))).toBe(true)
  expect(shut.join(' | ')).not.toContain(WHERE_FIX.lean)
})

test('the card: Where it went opened shows the parts and the one fix', { timeoutMs: 120_000 }, async ($, on) => {
  const open = await mountCard($, on, readsSeed, 'limit-where')
  const said = open.join(' | ')
  expect(said).toMatch(/file reads \d+%, tool output \d+%, agents \d+%, plain turns \d+%/)
  expect(said).toContain('Big file reads: 1.')
  expect(said).toContain(WHERE_FIX.lean)
})

const runsOut = (m: Mem) => {
  m.set('cockpit:usage:app', { at: NOW - 30_000, plan: 'Max', windows: [{ label: '5-hour limit', percent: 80, resetsAt: R5 }] })
  m.set('cockpit:usage:hist', { '5-hour limit': [[NOW - 2 * HOUR, 20], [NOW - HOUR, 50], [NOW - 600_000, 78]] })
}
test('the card: a runs-out forecast keeps its problem row; Finish safely waits behind the row press', { timeoutMs: 120_000 }, async ($, on) => {
  const shut = await mountCard($, on, runsOut)
  expect(shut.some(s => s.startsWith('Runs out '))).toBe(true)
  expect(shut).not.toContain(FINISH_PRESS)
})

test('the card: the problem row opened offers Finish safely', { timeoutMs: 120_000 }, async ($, on) => {
  const open = await mountCard($, on, runsOut, 'limit-finish')
  expect(open.join(' | ')).toContain(FINISH_PRESS)
})
