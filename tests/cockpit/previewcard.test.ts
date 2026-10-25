// The Preview card: the dev server and pictures at three sizes in one card, from the readings of the dev ports.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { lsofAllArgv, parseCurl, parseListeners, parseLsof } from '../hooks/core/eyesdev'
import type { Io } from '../hooks/core/io'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { devFact, frontEdits, isFrontFile, previewCardText, previewLoud, previewNudge, previewShort, previewShown, previewState, previewView } from '../hooks/core/previewcard'
import type { PreviewFacts } from '../hooks/core/previewcard'
import { SETTINGS } from '../hooks/core/settings'
import { lineCard } from '../hooks/features/home/linecards'
import { CARD_IDS, LINE_CARD_IDS, cardLoudness } from '../hooks/features/home/logic'
import type { LoudFacts } from '../hooks/features/home/logic'
import { PREVIEW_FRESH_MS, PREVIEW_QUIET_MS, forgetPreview, loadPreview, picturePrompt } from '../hooks/features/home/preview'
import { lookPreview } from '../hooks/features/home/rowact'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = Date.parse('2026-10-10T10:00:00Z')
const id = (s: string): string => s

const LSOF = (port: number): string => `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    42424 me   23u  IPv6 0x1      0t0  TCP *:${port} (LISTEN)\n`
// A second lsof asks where the listening program runs (-d cwd): `serverCwd` says.
let serverCwd = '/work/app'
const lsofAnswer = (listening: Record<number, string>, line: string): { exitCode: number; stdout: string } => {
  if (line.includes('-d cwd')) return { exitCode: 0, stdout: `p42424\nfcwd\nn${serverCwd}\n` }
  const ports = (/-iTCP:([\d,]+)/.exec(line)?.[1] ?? '').split(',').map(Number).filter(p => listening[p] !== undefined)
  return ports.length === 0 ? { exitCode: 1, stdout: '' } : { exitCode: 0, stdout: `${LSOF(ports[0] as number)}${ports.slice(1).map(p => LSOF(p).split('\n')[1]).join('\n')}\n` }
}
const page = (status: number, body: string) => parseCurl(0, `${body}\n${status} 0.043`)
const up = (port = 5173) => devFact(port, { command: 'node', pid: 1 }, page(200, '<html><body>Hello</body></html>'))
const broken = devFact(3000, { command: 'node', pid: 1 }, page(500, 'Internal Server Error'))
const silent = devFact(8080, { command: 'java', pid: 2 }, undefined)
const facts = (over: Partial<PreviewFacts> = {}): PreviewFacts => ({ edits: 0, changed: false, auto: false, ...over })

test('the dev server fact reads the dev-server lines, and the state says up, error, no answer or none', () => {
  expect(parseLsof(0, LSOF(5173))?.command).toBe('node')
  expect(up().line).toBe('Port 5173: up, answers 200 in 0.04 s.')
  expect(previewState(facts({ dev: up() }))).toBe('up')
  expect(previewState(facts({ dev: broken }))).toBe('error')
  expect(previewState(facts({ dev: devFact(5173, { command: 'node', pid: 1 }, page(200, 'Unhandled Runtime Error at x')) }))).toBe('error')
  expect(previewState(facts({ dev: silent }))).toBe('silent')
  expect(previewState(facts())).toBe('none')
})

test('the short line says only what is true now', () => {
  expect(previewShort(facts(), id)).toBe('No dev server')
  expect(previewShort(facts({ dev: up() }), id)).toBe('Port 5173 is up')
  expect(previewShort(facts({ dev: broken }), id)).toBe('The page shows an error')
  expect(previewShort(facts({ dev: silent }), id)).toBe('Port 8080 does not answer')
})

test('the card shows only where a dev server was found or a screen file was edited', () => {
  expect(previewShown(facts())).toBe(false)
  expect(previewShown(facts({ dev: silent }))).toBe(true)
  expect(previewShown(facts({ edits: 1 }))).toBe(true)
})

test('the nudge needs the setting on, an edit since the last look and a page that answers; off by default, and never when nothing listens', () => {
  expect(previewNudge(facts({ dev: up(), edits: 2, changed: true }))).toBe(false)
  expect(previewNudge(facts({ dev: up(), edits: 2, changed: true, auto: true }))).toBe(true)
  expect(previewNudge(facts({ dev: up(), edits: 2, changed: false, auto: true }))).toBe(false)
  expect(previewNudge(facts({ edits: 2, changed: true, auto: true }))).toBe(false)
  expect(previewNudge(facts({ dev: silent, edits: 2, changed: true, auto: true }))).toBe(false)
  expect(previewShort(facts({ dev: up(), edits: 2, changed: true, auto: true }), id)).toBe('Changed – look now')
})

test('loudness: an error page, a silent server and the nudge warn; a server that is up is normal; otherwise calm', () => {
  expect(previewLoud(undefined)).toBe('none')
  expect(previewLoud(facts({ edits: 1 }))).toBe('none')
  expect(previewLoud(facts({ dev: up() }))).toBe('up')
  expect(previewLoud(facts({ dev: broken }))).toBe('error')
  expect(previewLoud(facts({ dev: silent }))).toBe('error')
  expect(previewLoud(facts({ dev: up(), edits: 1, changed: true, auto: true }))).toBe('changed')
  const base: LoudFacts = { limits: [], here: false, others: 0, didToday: 0, proof: 'none', agents: { any: false, stuck: false }, computer: { gaugeOn: false, full: false }, skillsUsed: false }
  expect([cardLoudness({ ...base, preview: 'error' }, NOW).preview, cardLoudness({ ...base, preview: 'changed' }, NOW).preview, cardLoudness({ ...base, preview: 'up' }, NOW).preview, cardLoudness(base, NOW).preview]).toEqual(['warn', 'warn', 'normal', 'calm'])
})

test('screen files are html, css, tsx, jsx, vue and svelte; tests and node_modules are not', () => {
  for (const p of ['/work/app/index.html', '/work/app/src/app.css', '/work/app/src/Button.tsx', '/work/app/a.jsx', '/work/app/b.vue', '/work/app/c.svelte']) expect(isFrontFile(p)).toBe(true)
  for (const p of ['/work/app/server.ts', '/work/app/Button.test.tsx', '/work/app/node_modules/x/y.css', '/work/app/README.md', '/work/app/noext']) expect(isFrontFile(p)).toBe(false)
})

test('the rows: the server, then the three sizes only when the page answers; a press is a typed action', () => {
  const v = previewView(facts({ dev: up() }), id)
  // The first row points to the app's own browser pane, a fact row with no press
  expect(v.groups.map(g => g.head)).toEqual(['', 'Dev server', 'Pictures'])
  expect(v.groups[0]?.rows.map(r => [r.key, r.title, r.right, r.press])).toEqual([['app', "Live view: the app's browser pane", undefined, undefined]])
  expect(v.lines).not.toContain("Live view: the app's browser pane")
  expect(v.groups[1]?.rows.map(r => [r.title, r.right])).toEqual([['Port 5173', 'up · 200']])
  expect(v.groups[2]?.rows.map(r => [r.title, r.right])).toEqual([['Phone size', 'Take a picture'], ['iPad size', 'Take a picture'], ['Desktop size', 'Take a picture']])
  expect(v.groups[2]?.rows.map(r => r.press)).toEqual([{ do: 'look', width: 390 }, { do: 'look', width: 768 }, { do: 'look', width: 1280 }])
  const err = previewView(facts({ dev: broken }), id)
  expect(err.groups[1]?.rows[0]?.right).toBe('error · 500 · Internal Server Error')
  expect(err.groups).toHaveLength(3)
  const none = previewView(facts({ edits: 1 }), id)
  expect(none.short).toBe('No dev server')
  expect(none.groups.map(g => g.head)).toEqual(['', 'Dev server'])
  expect(previewView(facts({ dev: silent }), id).groups[1]?.rows[0]?.right).toBe('no answer')
  // A nudge leads; the app's pane row follows it
  const nudge = previewView(facts({ dev: up(), edits: 1, changed: true, auto: true }), id)
  expect(nudge.groups[0]?.rows[0]).toMatchObject({ title: 'Changed – look now', right: 'Take all three', press: { do: 'look', width: 'all' } })
  expect(nudge.groups[1]?.rows[0]?.key).toBe('app')
})

test('the line card: a press becomes the typed action with its width, and no row in it holds another card', () => {
  const v = lineCard('preview', { now: NOW, ledger: [], halted: false, modes: {}, preview: facts({ dev: up() }) })
  const acts = v.groups?.flatMap(g => g.rows.map(r => r.action))
  expect(acts).toEqual([undefined, undefined, lookPreview(390), lookPreview(768), lookPreview(1280)])
  expect(v.short).toBe('Port 5173 is up')
  expect(v.title).toBe('Preview')
})

test('the text twin says where the pictures are, and says nothing where the card is not shown', () => {
  expect(previewCardText(facts())).toEqual([])
  expect(previewCardText(undefined)).toEqual([])
  expect(previewCardText(facts({ dev: up() }))).toEqual(['Preview: Port 5173 is up', 'Pictures at phone, iPad and desktop size: press a row on the Preview card, when it shows.'])
  expect(previewCardText(facts({ edits: 1 }))).toEqual(['Preview: No dev server'])
})

const ROOT = '/work/app'
type Fake = { io: Io; runs: string[]; toasts: string[] }
function fakeIo(listening: Record<number, string>): Fake {
  const runs: string[] = []
  const toasts: string[] = []
  const io = {
    now: async () => NOW,
    run: async (argv: readonly string[]) => {
      runs.push(argv.join(' '))
      if (argv[0] === 'lsof') {
        return { ...lsofAnswer(listening, argv.join(' ')), stderr: '' }
      }
      if (argv[0] === 'curl') return { exitCode: 0, stdout: `${listening[Number(/localhost:(\d+)/.exec(argv.join(' '))?.[1])] ?? ''}\n200 0.01`, stderr: '' }
      return { exitCode: 1, stdout: '', stderr: '' }
    },
    toast: (t: string) => toasts.push(t),
    invalidate: () => undefined,
  } as unknown as Io
  return { io, runs, toasts }
}

test('a server that runs in another folder is not shown, one inside the project is, and with no folder known nothing is claimed', async () => {
  forgetPreview()
  serverCwd = '/work/other'
  const f = fakeIo({ 5173: '<html>ok</html>' })
  expect(await loadPreview(f.io, false, NOW, ROOT)).toBeUndefined()
  expect(f.runs.some(r => r.startsWith('curl'))).toBe(false)
  forgetPreview()
  serverCwd = '/work/app/web'
  expect(await loadPreview(f.io, false, NOW, ROOT)).toMatchObject({ port: 5173 })
  forgetPreview()
  expect(await loadPreview(f.io, false, NOW, undefined)).toBeUndefined()
  forgetPreview()
  serverCwd = '/work/app'
})

test('the reading finds the first usual port that listens, asks only that one for its page, and keeps the answer for a while', async () => {
  forgetPreview()
  const f = fakeIo({ 4173: '<html>ok</html>', 8000: 'x' })
  const first = await loadPreview(f.io, false, NOW, ROOT)
  expect(first).toMatchObject({ port: 4173, who: 'node', status: 200 })
  expect(f.runs.filter(r => r.startsWith('curl'))).toHaveLength(1)
  const lsofRuns = f.runs.filter(r => r.startsWith('lsof')).length
  expect(lsofRuns).toBe(2)
  await loadPreview(f.io, false, NOW + PREVIEW_FRESH_MS - 1, ROOT)
  expect(f.runs).toHaveLength(lsofRuns + 1)
  forgetPreview()
})

const later = async (): Promise<void> => {
  for (let k = 0; k < 30; k += 1) await Promise.resolve()
}

test('with no screen file edited the reading is asked for again only after 5 minutes; an edit brings it back to 30 seconds', async () => {
  forgetPreview()
  const before = frontEdits.n
  const f = fakeIo({ 5173: '<html>ok</html>' })
  await loadPreview(f.io, false, NOW, ROOT)
  const first = f.runs.length
  await loadPreview(f.io, false, NOW + PREVIEW_FRESH_MS + 1, ROOT)
  await later()
  expect(f.runs).toHaveLength(first)
  frontEdits.n += 1
  await loadPreview(f.io, false, NOW + PREVIEW_FRESH_MS + 2, ROOT)
  await later()
  expect(f.runs.length).toBeGreaterThan(first)
  const second = f.runs.length
  await loadPreview(f.io, false, NOW + PREVIEW_FRESH_MS + 3, ROOT)
  await loadPreview(f.io, false, NOW + PREVIEW_QUIET_MS + PREVIEW_FRESH_MS + 10, ROOT)
  await later()
  expect(f.runs.length).toBeGreaterThan(second)
  frontEdits.n = before
  forgetPreview()
})

test('one lsof asks for every usual port, and the rows are read per port', () => {
  expect(lsofAllArgv()).toEqual(['lsof', '-nP', '-iTCP:3000,3001,4173,5173,8000,8080', '-sTCP:LISTEN'])
  const text = 'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    11 me   23u  IPv6 0x1      0t0  TCP *:8000 (LISTEN)\nnode    22 me   24u  IPv4 0x2      0t0  TCP 127.0.0.1:5173 (LISTEN)\n'
  const found = parseListeners(0, text)
  expect([...found.keys()].sort()).toEqual([5173, 8000])
  expect(found.get(5173)).toEqual({ command: 'node', pid: 22 })
  expect(parseListeners(1, text).size).toBe(0)
})

test('a hidden card reads nothing, and nothing listening is no dev server', async () => {
  forgetPreview()
  const f = fakeIo({})
  expect(await loadPreview(f.io, true, NOW, ROOT)).toBeUndefined()
  expect(f.runs).toEqual([])
  expect(await loadPreview(f.io, false, NOW, ROOT)).toBeUndefined()
  expect(f.runs.every(r => r.startsWith('lsof'))).toBe(true)
  forgetPreview()
})

test('the card is a line card with its own Show or Hide, hidden on a new install (the app shows the page itself), the setting preview.auto is on by default (Recommended), notes are 12 words or fewer and every new word has a Swedish line', () => {
  expect(LINE_CARD_IDS).toContain('preview')
  expect(CARD_IDS).toContain('preview')
  const s = SETTINGS.find(x => x.key === 'cards.preview')
  expect(s).toMatchObject({ label: 'Preview', default: 'hide' })
  expect(s?.note.split(/\s+/).length).toBeLessThanOrEqual(12)
  expect(SETTINGS.find(x => x.key === 'detail.preview')).toMatchObject({ label: 'Preview' })
  const auto = SETTINGS.find(x => x.key === 'preview.auto')
  expect(auto).toMatchObject({ group: 'Page pictures', default: 'on' })
  expect(auto?.options.map(o => o.value)).toEqual(['off', 'on'])
  expect(auto?.note.split(/\s+/).length).toBeLessThanOrEqual(12)
  expect(auto?.label.split(/\s+/).length).toBeLessThanOrEqual(3)
  const words = englishOf('preview')
  expect(words.filter(w => !VIEW_STRINGS.includes(w))).toEqual([])
  expect(words.filter(w => (SV[w] ?? '') === '')).toEqual([])
  for (const w of ['Phone', 'Pictures', 'On', 'Off']) expect(SV[w] ?? '').not.toBe('')
  const sv = previewView(facts({ dev: up(), edits: 1, changed: true, auto: true }), w => SV[w] ?? w)
  expect(sv.short).toBe('Ändrad – titta nu')
  expect(sv.groups.map(g => g.head)).toEqual(['', '', 'Utvecklingsserver', 'Bilder'])
  expect(sv.groups[1]?.rows[0]?.title).toBe('Direktvy: appens webbläsarpanel')
  expect(sv.groups[3]?.rows.map(r => r.title)).toEqual(['Storlek: Telefon', 'Storlek: iPad', 'Storlek: Dator'])
})

const MIN = 60_000
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} }

function harness(on: On, seed: Record<string, unknown>, listening: Record<number, string>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', 'cockpit:setting:detail': 'explained', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
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
  const runs: string[] = []
  on('process.run', (_$, e) => {
    runs.push(e.argv.join(' '))
    const line = e.argv.join(' ')
    if (e.argv[0] === 'lsof') {
      return { value: { ...lsofAnswer(listening, line), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
    }
    if (e.argv[0] === 'curl') return { value: { exitCode: 0, stdout: `${listening[Number(/localhost:(\d+)/.exec(line)?.[1])] ?? ''}\n200 0.02`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
    const out = e.argv[0] === 'git' && e.argv[1] === 'rev-parse' ? 'feat-x\n' : ''
    return { value: { exitCode: e.argv[0] === 'sh' ? 1 : 0, stdout: out, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', () => ({ value: undefined }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return { mem, toasts, runs }
}
const world = (now: number, over: Record<string, unknown> = {}) => ({
  'cockpit:firstrun': 'done',
  'cockpit:setting:detail.preview': 'explained',
  // Preview starts hidden on a new install; this person chose Auto, so it shows where a dev server answers
  'cockpit:setting:cards.preview': 'auto',
  // The project folder, written by the session at its start; the dev server is shown only when it runs there.
  'cockpit:projectof:test-session': '/work/app',
  'cockpit:session:test-session': { sessionId: 'test-session', cwd: '/work/app', model: 'm', state: 'idle', startedAt: now - 60 * MIN, updatedAt: now - 2000, lastEventAt: now - 2000, stateSince: now - 3 * MIN, title: 'Fix login', branch: 'feat-x' },
  ...over,
})
const textOf = async (ui: { find: (q: unknown) => Promise<unknown> }, text: RegExp): Promise<boolean> => (await ui.find({ type: 'Text', text })) !== undefined
const mountPane = ($: Parameters<Parameters<typeof test>[1]>[0]) => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })

test('the pane shows the card where a dev server answers: its port and answer, and the three sizes; a press on Phone takes one picture and says so', { timeoutMs: 15_000 }, async ($, on) => {
  forgetPreview()
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world(NOW), { 5173: '<html>ok</html>' })
  const ui = await mountPane($)
  expect(await textOf(ui, /^Preview$/)).toBe(true)
  expect(await textOf(ui, /^Port 5173$/)).toBe(true)
  expect(await textOf(ui, /^up · 200$/)).toBe(true)
  for (const t of ['Phone', 'iPad', 'Desktop']) expect(await textOf(ui, new RegExp(`^${t} size$`))).toBe(true)
  await ui.press({ key: 'press-ol-preview:look-390-0' })
  await clock.settle()
  expect(w.toasts.some(t => /Taking the picture in the background/.test(t))).toBe(true)
  expect(w.runs.some(r => r.includes('localhost:5173'))).toBe(true)
  await ui.unmount()
  forgetPreview()
})

test('the picture taken last is a row with its size and age; its press asks Claude to look at that file', () => {
  const v = lineCard('preview', { now: NOW, ledger: [], halted: false, modes: {}, t: id, preview: { dev: devFact(5173, { command: 'node', pid: 1 }, { status: 200, seconds: 0.02, head: '<html>' }), edits: 0, changed: false, auto: false, picture: { width: 390, path: '/work/app/shots/localhost-5173-390.png', at: NOW - 2 * 60_000 }, now: NOW } })
  const row = (v.groups ?? []).flatMap(g => g.rows).find(r => r.key === 'picture')
  expect(row).toMatchObject({ title: 'Picture · Phone size · 2 min ago', action: { kind: 'seePicture', path: '/work/app/shots/localhost-5173-390.png', width: 390 } })
  expect(picturePrompt('/p/a.png', 390)).toMatch(/^Look at the picture \/p\/a\.png/)
})

test('a new install never shows the card, even where a dev server answers: the app\'s browser pane shows the page', { timeoutMs: 15_000 }, async ($, on) => {
  forgetPreview()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const fresh: Record<string, unknown> = world(NOW)
  delete fresh['cockpit:setting:cards.preview']
  const w = harness(on, fresh, { 5173: '<html>ok</html>' })
  const ui = await mountPane($)
  expect(await textOf(ui, /^Preview$/)).toBe(false)
  expect(w.runs.some(r => r.includes('localhost:5173'))).toBe(false)
  await ui.unmount()
  forgetPreview()
})

test('the card is left out where there is no dev server and no screen file was edited, and appears when one was edited', { timeoutMs: 15_000 }, async ($, on) => {
  forgetPreview()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  harness(on, world(NOW), {})
  const none = await mountPane($)
  expect(await textOf(none, /^Preview$/)).toBe(false)
  await none.unmount()
  forgetPreview()
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/server.ts', old_string: 'a', new_string: 'b' } as never)
  const other = await mountPane($)
  expect(await textOf(other, /^Preview$/)).toBe(false)
  await other.unmount()
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/src/App.tsx', old_string: 'a', new_string: 'b' } as never)
  const edited = await mountPane($)
  expect(await textOf(edited, /^Preview$/)).toBe(true)
  expect(await textOf(edited, /^No dev server$/)).toBe(true)
  await edited.unmount()
  forgetPreview()
})

test('with preview.auto off an edit adds no nudge; with it on, the row says Changed – look now, and a press clears it', { timeoutMs: 15_000 }, async ($, on) => {
  forgetPreview()
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world(NOW), { 5173: '<html>ok</html>' })
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/src/App.css', old_string: 'a', new_string: 'b' } as never)
  await $.tool.call({ tool: 'Write', file_path: '/work/app/index.html', content: '<p>x</p>' } as never)
  w.mem.set('cockpit:setting:preview.auto', 'off')
  const off = await mountPane($)
  expect(await textOf(off, /^Changed – look now$/)).toBe(false)
  await off.unmount()
  w.mem.set('cockpit:setting:preview.auto', 'on')
  const ui = await mountPane($)
  expect(await textOf(ui, /^Changed – look now$/)).toBe(true)
  await ui.press({ key: 'press-ol-preview:changed-0' })
  await clock.settle()
  await ui.redraw()
  expect(await textOf(ui, /^Changed – look now$/)).toBe(false)
  expect([...w.mem.keys()].filter(k => k.includes('preview'))).toEqual(['cockpit:setting:detail.preview', 'cockpit:setting:cards.preview', 'cockpit:setting:preview.auto'])
  await ui.unmount()
  forgetPreview()
})

test('a press with no dev server up takes no picture and says to start one', { timeoutMs: 15_000 }, async ($, on) => {
  forgetPreview()
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = harness(on, world(NOW), {})
  await $.tool.call({ tool: 'Edit', file_path: '/work/app/src/App.tsx', old_string: 'a', new_string: 'b' } as never)
  const ui = await mountPane($)
  expect(await ui.find({ key: 'press-ol-preview:look-390-0' })).toBeUndefined()
  await clock.settle()
  expect(w.toasts).toEqual([])
  await ui.unmount()
  forgetPreview()
})
