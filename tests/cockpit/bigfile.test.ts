// Big-file guard: a huge file named after "@" gets one question; only the press "Send the last 200 lines instead" reads a range, anything else reads it whole.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { BIG_ASK_WAIT_MS, BIG_COUNT_MAX_BYTES, BIG_MENTION_BYTES, BIG_MENTION_LINES, BIG_STRINGS, BIG_TAIL_LINES, countLines, failedWords, isBig, isWholeMention, tailNote, tailRange, askedAbout, askWords } from '../hooks/core/bigfile'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const ROOT = '/w/app'
const SV = byEnglish('sv')
const TAIL = 'Send the last 200 lines instead'
const WHOLE = 'Send the whole file'

const linesOf = (n: number): string => Array.from({ length: n }, (_, k) => `line ${k + 1}`).join('\n') + '\n'

test('lines are counted as an editor counts them, big means over 2000 lines or 200 KB with a real saving, and the range is the last 200 lines', () => {
  expect(countLines('')).toBe(0)
  expect(countLines('a')).toBe(1)
  expect(countLines('a\n')).toBe(1)
  expect(countLines('a\nb')).toBe(2)
  expect(countLines(linesOf(2500))).toBe(2500)
  expect(isBig(BIG_MENTION_LINES, 1000)).toBe(false)
  expect(isBig(BIG_MENTION_LINES + 1, 1000)).toBe(true)
  expect(isBig(500, BIG_MENTION_BYTES + 1)).toBe(true)
  // One huge line (a minified file): the last lines save nothing, so no question
  expect(isBig(1, BIG_MENTION_BYTES * 4)).toBe(false)
  expect(isBig(BIG_TAIL_LINES * 2, BIG_MENTION_BYTES * 4)).toBe(false)
  expect(tailRange(12_000)).toEqual({ offset: 11_801, limit: 200 })
  expect(tailRange(450)).toEqual({ offset: 251, limit: 200 })
})

test('only a whole-file mention of a text file is asked about', () => {
  expect(isWholeMention('yarn.lock', undefined, undefined)).toBe(true)
  expect(isWholeMention('app.log#L10-20', undefined, undefined)).toBe(false)
  expect(isWholeMention('app.log', 10, undefined)).toBe(false)
  expect(isWholeMention('app.log', undefined, 20)).toBe(false)
  expect(askedAbout('/w/app/yarn.lock')).toBe(true)
  expect(askedAbout('/w/app/guide.pdf')).toBe(false)
  expect(askedAbout('/w/app/shot.PNG')).toBe(false)
  expect(askedAbout('/w/app/nb.ipynb')).toBe(false)
})

test('the question names the file, its lines and its size in the language, and every text has Swedish', () => {
  const en = askWords('/w/app/yarn.lock', 12_400, 480 * 1024, s => s, 'en')
  expect(en.question).toBe('yarn.lock is big: 12.4k lines, 480 KB. Send Claude only the last 200 lines?')
  expect(en.tail).toBe(TAIL)
  expect(en.whole).toBe(WHOLE)
  expect(en.head.length).toBeLessThanOrEqual(12)
  const sv = askWords('/w/app/yarn.lock', 12_400, 2 * 1024 * 1024, s => SV[s] ?? s, 'sv')
  expect(sv.question).toBe('yarn.lock är stor: 12,4k rader, 2,0 MB. Skicka bara de sista 200 raderna till Claude?')
  expect(sv.tail).toBe('Skicka de sista 200 raderna i stället')
  expect(sv.head.length).toBeLessThanOrEqual(12)
  for (const w of BIG_STRINGS) expect(SV[w] ?? '', w).not.toBe('')
  expect(failedWords('/w/app/logs/app.log', 'logs/app.log', 1000, s => s)).toBe('Could not send part of app.log. Type @logs/app.log#L801-1000 to send its last 200 lines.')
  expect(tailNote('/w/app/app.log', 1000)).toMatch(/^Only lines 801 to 1000 of 1000 of \/w\/app\/app\.log were attached/)
})

type Files = Record<string, string>
// The engine on Windows hands the fake disk C:\w\app\x for /w/app/x, so a path is looked up in the POSIX form.
const keyOf = (p: string): string => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')
function world(on: On, files: Files, seed: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:plain.mode': 'off', 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1, ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: ROOT }) as never)
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('session.surfaces', () => ({ value: ['desktop'] }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('fs.stat', (_$, e) => {
    const text = files[keyOf(e.path)]
    if (text === undefined) throw new Error('ENOENT')
    return { value: { kind: 'file', size: text.length, mtimeMs: 0, isLink: false } } as never
  })
  const reads: string[] = []
  on('fs.read', (_$, e) => {
    const text = files[keyOf(e.path)]
    if (text === undefined) throw new Error('ENOENT')
    reads.push(keyOf(e.path))
    return { value: text } as never
  })
  // The engine's own read of the mention: what range reached it
  const reached: Array<{ path: string; offset?: number; limit?: number }> = []
  const answer = { type: 'file' as 'file' | null }
  on('prompt.mention', (_$, e) => {
    reached.push({ path: e.path, ...(e.offset === undefined ? {} : { offset: e.offset }), ...(e.limit === undefined ? {} : { limit: e.limit }) })
    return { type: answer.type } as never
  })
  return { clock, mem, toasts, reads, reached, answer }
}

function answerWith(on: On, choice: string | undefined, asked: string[]): void {
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    const q = (e as unknown as { questions: Array<{ question: string }> }).questions[0].question
    asked.push(q)
    if (choice === undefined) return new Promise(() => undefined) as never
    return { result: { questions: [], answers: { [q]: choice } }, text: choice } as never
  })
}

const start = async ($: EngineInterface, interactive = true): Promise<void> => {
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: interactive } as never)
}
const BIG = `${ROOT}/yarn.lock`
const mention = ($: EngineInterface, path = BIG, extra: Record<string, unknown> = {}) => $.prompt.mention({ mention: path.slice(ROOT.length + 1), path, ...extra } as never)

test('the press "Send the last 200 lines instead" reads only the last 200 lines and tells Claude so', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(12_000) })
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  const r = await mention($)
  expect(asked.length).toBe(1)
  expect(asked[0]).toMatch(/^yarn\.lock is big: 12k lines/)
  expect(w.reached).toEqual([{ path: BIG, offset: 11_801, limit: 200 }])
  expect(r.type).toBe('file')
  expect((r.context ?? []).join('\n')).toMatch(/Only lines 11801 to 12000 of 12000/)
})

test('Send the whole file reads it whole, and the same file is not asked about again this session', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(3_000) })
  const asked: string[] = []
  answerWith(on, WHOLE, asked)
  await start($)
  await mention($)
  await mention($)
  expect(asked.length).toBe(1)
  expect(w.reached).toEqual([{ path: BIG }, { path: BIG }])
})

test('no answer in time sends the file whole, as typed', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(3_000) })
  const asked: string[] = []
  answerWith(on, undefined, asked)
  await start($)
  const pending = mention($)
  await w.clock.advance(BIG_ASK_WAIT_MS + 1000)
  await pending
  expect(asked.length).toBe(1)
  expect(w.reached).toEqual([{ path: BIG }])
})

test('the wait is short (sending is held while it is open), and a dismissed or unanswered question is not asked again for that file this session', async ($, on) => {
  expect(BIG_ASK_WAIT_MS).toBe(20_000)
  const w = world(on, { [BIG]: linesOf(3_000) })
  const asked: string[] = []
  answerWith(on, undefined, asked)
  await start($)
  const pending = mention($)
  await w.clock.advance(BIG_ASK_WAIT_MS + 1000)
  await pending
  await mention($)
  expect(asked.length).toBe(1)
  expect(w.reached).toEqual([{ path: BIG }, { path: BIG }])
})

test('the last-lines answer is kept per file too: the same file is cut the same way without a second question', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(12_000) })
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  await mention($)
  const again = await mention($)
  expect(asked.length).toBe(1)
  expect(w.reached).toEqual([{ path: BIG, offset: 11_801, limit: 200 }, { path: BIG, offset: 11_801, limit: 200 }])
  expect((again.context ?? []).join('\n')).toMatch(/Only lines 11801 to 12000 of 12000/)
})

test('one question per prompt: a second big file in the same prompt goes whole, and is asked about in the next prompt', async ($, on) => {
  const LOG = `${ROOT}/app.log`
  const w = world(on, { [BIG]: linesOf(12_000), [LOG]: linesOf(9_000) })
  on('prompt.submit', (_$, e) => ({ text: e.text, context: e.context }) as never)
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  await mention($, BIG)
  await mention($, LOG)
  expect(asked.length).toBe(1)
  expect(w.reached).toEqual([{ path: BIG, offset: 11_801, limit: 200 }, { path: LOG }])
  await $.prompt.submit({ text: 'look at @app.log' } as never)
  await mention($, LOG)
  expect(asked.length).toBe(2)
  expect(w.reached[2]).toEqual({ path: LOG, offset: 8_801, limit: 200 })
})

test('the size comes from a stat: a file over the read limit is never read to be counted, and is not asked about', async ($, on) => {
  const huge = `${ROOT}/dump.log`
  const w = world(on, { [huge]: 'x'.repeat(BIG_COUNT_MAX_BYTES + 1) })
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  await mention($, huge)
  expect(asked).toEqual([])
  expect(w.reads).toEqual([])
  expect(w.reached).toEqual([{ path: huge }])
})

test('a small file, a ranged mention and an agent are never asked about', async ($, on) => {
  const small = `${ROOT}/small.ts`
  const w = world(on, { [BIG]: linesOf(5_000), [small]: linesOf(100) })
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  await mention($, small)
  await mention($, BIG, { mention: 'yarn.lock#L1-50', offset: 1, limit: 50 })
  await mention($, BIG, { agentId: 'a1' })
  expect(asked).toEqual([])
  // The small file is never read to count: its size alone says it is small
  expect(w.reads.includes(small)).toBe(false)
  expect(w.reached.length).toBe(3)
})

test('with Lean session Off the big file is never asked about', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(5_000) }, { 'cockpit:setting:lean.mode': 'off' })
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  await mention($)
  expect(asked).toEqual([])
  expect(w.reached).toEqual([{ path: BIG }])
})

test('a run with no person at the prompt never asks', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(5_000) })
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($, false)
  await mention($)
  expect(asked).toEqual([])
  expect(w.reached).toEqual([{ path: BIG }])
})

test('in the desktop app (an SDK session) it asks once the app joins', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(5_000) })
  on('session.attach', (_$, e) => ({ clientId: e.clientId }) as never)
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($, false)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' } as never)
  await mention($)
  expect(asked.length).toBe(1)
  expect(w.reached).toEqual([{ path: BIG, offset: 4_801, limit: 200 }])
})

test('when the range cannot be read, a toast says how to type it', async ($, on) => {
  const w = world(on, { [BIG]: linesOf(1_000 + BIG_MENTION_LINES) })
  w.answer.type = null
  const asked: string[] = []
  answerWith(on, TAIL, asked)
  await start($)
  await mention($)
  expect(w.toasts.some(t => /Type @yarn\.lock#L2801-3000 to send its last 200 lines/.test(t))).toBe(true)
})
