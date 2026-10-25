// An open card's header row at 288 pt (and 36 columns, 316.8 pt with 8.8 pt cells): when the title, the dot and the Fold leave no room for the status word,
// the word goes on a second line under the title (Pull requests, Other sessions, This session), in English and Swedish; wide, the header stays one row.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { APPEARS } from '../hooks/core/cardrules'
import { PR_SHARED_KEY, parsePrView } from '../hooks/core/crewpr'
import { forgetProjectSet } from '../hooks/core/io'
import { setLang } from '../hooks/core/lang'
import { glanceBelow, glanceShown, glanceTrailPt } from '../hooks/ui/kit'
import { columnPt, TEXT_CHAR_PT } from '../hooks/ui/tokens'
import { test } from './slow'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const MIN = 60_000
const W288 = 288 / columnPt()
const W36 = 36
const W700 = 700 / columnPt()

const props = (cols: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: cols, placement: 'inline' as const, scroll: { bodyRows: 200, offset: 0, total: 200 }, view: {} })
type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Ui = { find: (q: unknown) => Promise<Node | undefined>; findAll: (q: unknown) => Promise<Node[]>; press: (q: unknown) => Promise<void>; redraw: (p?: unknown) => Promise<void>; drawn: () => Promise<Node>; unmount: () => Promise<void> }

function engine(on: On) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}
const seed = (id: string, over: Record<string, unknown>) => ({ sessionId: id, cwd: `/work/${id}`, model: 'claude-opus-5', state: 'working', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const run = (name: string) => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS', startedAt: '2026-10-11T11:40:00Z', completedAt: '2026-10-11T11:50:00Z' })
// One open pull request of this session's branch ("1 open"), or none known ("Not checked")
const shared = (known: boolean): Record<string, unknown> =>
  known ? { [PR_SHARED_KEY]: { '/work/app/.git\nfeat-x': { at: NOW - 2 * MIN, branch: 'feat-x', view: parsePrView({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'https://example.test/pull/12', statusCheckRollup: [run('unit')] }) } } } : {}
const world = (lang: string, known = true) => ({
  ...shared(known),
  ...Object.fromEntries(APPEARS ? Object.keys(APPEARS).map(id => [`cockpit:setting:cards.${id}`, 'show']) : []),
  'cockpit:setting:look.view': 'custom',
  'cockpit:setting:look.language': lang,
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': seed('test-session', { cwd: '/work/app', branch: 'feat-x', state: 'waiting', contextPercent: 38, costUsd: 12.4 }),
  ...Object.fromEntries(Array.from({ length: 11 }, (_, n) => [`cockpit:session:s${n + 2}`, seed(`s${n + 2}`, { state: 'waiting', stateSince: NOW - (12 + n) * MIN })])),
})

const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) walk(c, out)
  return out
}
const keyOf = (n: Node): string | undefined => n.key ?? (n.props?.key as string | undefined)
const textsOf = (n: Node): string[] => walk(n).flatMap(x => (x.children ?? []).filter((c): c is string => typeof c === 'string'))

async function mountOpen($: Parameters<Parameters<typeof test>[1]>[0], on: On, lang: string, cols: number, ids: string[], known = true): Promise<Ui> {
  forgetProjectSet()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  mock.store(on, world(lang, known))
  engine(on)
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: props(cols) })) as unknown as Ui
  for (const id of ids) {
    await ui.press({ key: `press-glance-${id}-0` })
    await ui.redraw(props(cols))
  }
  return ui
}

// The header of a card: the Glance row and, when there is one, the line of its word; the status word is a Text in it, apart from the title
async function head(ui: Ui, id: string) {
  const root = await ui.drawn()
  const line = walk(root).find(n => keyOf(n) === `${id}-word-line`)
  const row = walk(root).find(n => keyOf(n) === `glance-${id}`)
  expect(row, `${id} header row`).toBeDefined()
  return { line, row }
}

const IDS = ['others', 'here']
// This session's open body says its state and cost (State and Cost rows), so its open header is the title alone: no word on the row and no second line
const BODY_SAYS = ['here']
// At 288 pt both languages move Other sessions' word under the title; 36 columns are wider since the cells grew (316.8 pt), and there its word fits the row
const LINE_BY: Record<string, string[]> = { en: ['others'], sv: ['others'] }
const lineBy = (lang: string, cols: number): string[] => (cols === W288 ? (LINE_BY[lang] ?? []) : [])

for (const lang of ['en', 'sv']) {
  for (const [label, cols] of [['288 pt', W288], ['36 columns', W36]] as const) {
    test(`an open card with no room for its word draws it on a second line under the title: ${label}, ${lang}`, { timeoutMs: 60_000 }, async ($, on) => {
      const ui = await mountOpen($, on, lang, cols, IDS)
      try {
        for (const id of IDS) {
          const { line, row } = await head(ui, id)
          if (BODY_SAYS.includes(id)) {
            expect(line, `${id}: nothing to move under the title`).toBeUndefined()
            expect(textsOf(row as Node).filter(x => x.trim() !== ''), `${id}: the row is the title alone`).toHaveLength(1)
            continue
          }
          if (line === undefined) {
            // The row said its word itself (its short form, or the whole one): nothing to move
            expect(textsOf(row as Node).length, `${id}: the row says its word`).toBeGreaterThan(1)
            expect(lineBy(lang, cols), `${id} has no room in ${lang} but no second line`).not.toContain(id)
            continue
          }
          const word = textsOf(line).join('')
          expect(word.length, `${id}: the line says a word`).toBeGreaterThan(0)
          // The row itself no longer holds the word: only the title
          expect(textsOf(row as Node), `${id}: the row has the title, the word is under it`).not.toContain(word)
          // Left-aligned under the title: the line is a row from the start, not pushed to the end
          expect(line.props?.justifyContent).toBeUndefined()
        }
        // What each language must put under the title (This session's English "Your turn" fits the row)
        for (const id of lineBy(lang, cols)) expect((await head(ui, id)).line, `${id}: second line`).toBeDefined()
      } finally {
        await ui.unmount()
        setLang('en')
      }
    })
  }
}

// Pull requests with no answer yet says "Not checked": in Swedish ("Inte kontrollerad") the row has no room; in English its short form "Unchecked" fits the row
// at 36 columns (316.8 pt), and at 288 pt, with the wider letters, the word goes under the title too
for (const [label, cols] of [['288 pt', W288], ['36 columns', W36]] as const) {
  test(`Pull requests with no answer yet at ${label}, Swedish: the word goes under the title`, { timeoutMs: 60_000 }, async ($, on) => {
    const ui = await mountOpen($, on, 'sv', cols, ['prs'], false)
    try {
      const { line, row } = await head(ui, 'prs')
      expect(textsOf(line as Node).join('')).toBe('Inte kontrollerad')
      expect(textsOf(row as Node)).not.toContain('Inte kontrollerad')
    } finally {
      await ui.unmount()
      setLang('en')
    }
  })
  test(`Pull requests with no answer yet at ${label}, English: ${cols === W288 ? 'the word goes under the title' : 'the short form stays on the row'}`, { timeoutMs: 60_000 }, async ($, on) => {
    const ui = await mountOpen($, on, 'en', cols, ['prs'], false)
    try {
      const { line, row } = await head(ui, 'prs')
      if (cols === W288) {
        expect(textsOf(line as Node).join('')).toBe('Not checked')
        expect(textsOf(row as Node)).not.toContain('Not checked')
        return
      }
      expect(line, 'it fits the row').toBeUndefined()
      expect(textsOf(row as Node)).toContain('Unchecked')
    } finally {
      await ui.unmount()
      setLang('en')
    }
  })
}

test('wide (700 pt) the header stays one row with its word on it, and no second line is drawn', { timeoutMs: 60_000 }, async ($, on) => {
  const ui = await mountOpen($, on, 'en', W700, [...IDS, 'prs'])
  try {
    for (const id of IDS) {
      expect(await ui.find({ key: `${id}-word-line` }), `${id}: no second line`).toBeUndefined()
    }
  } finally {
    await ui.unmount()
    setLang('en')
  }
})

test('glanceBelow: only an open row that lost its word, the first form that fits the whole row, never a closed or flipped row', () => {
  setLang('en')
  const g = { value: 'Not checked', short: 'Unchecked', dot: 'neutral' as const, isOpen: true, widthPt: 262, onPress: () => undefined }
  const trail = glanceTrailPt({ isFull: false })
  expect(glanceShown('Pull requests', g, trail)).toBe('')
  expect(glanceBelow('Pull requests', g, trail)).toBe('Not checked')
  // The whole word does not fit the row: its short form (a row just as wide as "Unchecked" by the average letter)
  expect(glanceBelow('Pull requests', { ...g, widthPt: 'Unchecked'.length * TEXT_CHAR_PT }, trail)).toBe('Unchecked')
  // A closed row, a flipped row and a row that says its word are as before
  expect(glanceBelow('Pull requests', { ...g, isOpen: false }, 0)).toBe('')
  expect(glanceBelow('Pull requests', { ...g, back: 'Back' }, trail)).toBe('')
  expect(glanceBelow('Pull requests', { ...g, widthPt: 700 }, trail)).toBe('')
  expect(glanceBelow('Pull requests', { ...g, value: '' }, trail)).toBe('')
})
