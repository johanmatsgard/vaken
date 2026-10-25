// The fresh-start nudge's press: Start fresh writes the hand-over brief, copies the line to paste, and says the next step. Nothing is written without the press.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { FRESH_BAND_ID, FRESH_PRESS, FRESH_TEXT, FRESH_TTL_MS, freshBriefLine } from '../hooks/core/freshstart'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const SID = 'test-session'
const SV = byEnglish('sv')
const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }

function engine(on: On) {
  const mem = new Map<string, unknown>([['cockpit:firstrun', 'done']])
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
  on('session.id', () => ({ value: SID }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  const copied: string[] = []
  on('ui.copy', (_$, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } } as never
  })
  const written: { path: string; text: string }[] = []
  on('fs.write', (_$, e) => {
    written.push({ path: String((e as { path?: unknown }).path), text: String((e as { text?: unknown; content?: unknown }).text ?? (e as { content?: unknown }).content ?? '') })
    return { value: undefined } as never
  })
  on('fs.read', () => {
    throw new Error('no file')
  })
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  return { mem, toasts, copied, written }
}

test('the words: the press and the line to paste are plain, and the press has Swedish', () => {
  expect(FRESH_PRESS).toBe('Start fresh')
  expect(freshBriefLine('~/.claude/cockpit/briefs/brief-abc.md')).toBe('Read ~/.claude/cockpit/briefs/brief-abc.md first. It is the brief of my last session.')
  expect(SV[FRESH_PRESS] ?? '').not.toBe('')
})

test('the nudge on the band offers Start fresh; a press writes the brief, copies the line and says to open a new session', { timeoutMs: 20_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = engine(on)
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  w.mem.set(`cockpit:band:${SID}`, [{ id: FRESH_BAND_ID, level: 'info', text: FRESH_TEXT, at: NOW, ttlMs: FRESH_TTL_MS }])
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  const press = (await band.find({ key: 'band-fresh' })) as { props?: { label?: string } } | undefined
  expect(press?.props?.label?.trim()).toBe(FRESH_PRESS)
  expect(w.written.filter(x => x.path.includes('/briefs/'))).toEqual([])
  await band.press({ key: 'band-fresh' })
  await band.unmount()
  // Windows writes the path with backslashes; compare with forward slashes.
  const brief = w.written.find(x => x.path.replace(/\\/g, '/').includes('/.claude/cockpit/briefs/brief-'))
  expect(brief).toBeDefined()
  expect(brief?.path.replace(/\\/g, '/').includes('/home/test/')).toBe(true)
  expect(w.copied.length).toBe(1)
  expect(w.copied[0]).toMatch(/^Read ~\/\.claude\/cockpit\/briefs\/brief-[A-Za-z0-9]*\.md first\./)
  expect(w.toasts.at(-1)).toBe(`Brief saved and copied. Open a new session and paste: ${w.copied[0]}`)
  const left = (w.mem.get(`cockpit:band:${SID}`) ?? []) as { id: string }[]
  expect(left.some(x => x.id === FRESH_BAND_ID)).toBe(false)
})

test('another notice keeps its Details word: the press shows only with the fresh-start nudge', { timeoutMs: 20_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  const w = engine(on)
  w.mem.set('cockpit:setting:detail', 'explained')
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  w.mem.set(`cockpit:band:${SID}`, [{ id: 'diet', level: 'warn', text: 'A big file was read twice.', at: NOW, ttlMs: FRESH_TTL_MS }])
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  expect(await band.find({ key: 'band-fresh' })).toBeUndefined()
  expect(await band.find({ key: 'band-details' })).toBeDefined()
  await band.unmount()
})
