// The phone note for Claude while a phone is attached, and the phone words of /vaken: show, run, pic.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { PHONE_NOTE_SECTION_ID, PHONE_NOTE_SETTINGS, PHONE_NOTE_TEXT, PHONENOTE_STRINGS, checkShow, phoneNoteOn, picPrompt, picTarget, runPrompt, showPrompt } from '../hooks/core/phonenote'
import { PHONE_MODE_MAX_MS } from '../hooks/core/phonecmds'
import { forgetHello, forgetPhones } from '../hooks/features/phone'
import { checkRegistry } from '../hooks/core/settings'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'
import { posix } from './fspath'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const ROOT = '/w/me'

function world(on: On, seed: Record<string, unknown> = {}, files: Record<string, string> = {}) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  // Plain mode is on by default; it is held off here so only the phone note is seen.
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
  on('session.root', () => ({ value: ROOT }) as never)
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  const ran: string[][] = []
  on('process.run', (_$, e) => {
    ran.push([...e.argv])
    return { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  const opened: string[] = []
  on('ui.open', (_$, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } } as never
  })
  // `files`: a path and where it really lands.
  on('fs.stat', (_$, raw) => {
    const e = { ...raw, path: posix(raw.path) }
    if (e.path === ROOT) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false, ...(e.resolve ? { realPath: ROOT } : {}) } } as never
    const real = files[e.path]
    if (real === undefined) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 10, mtimeMs: 0, isLink: real !== e.path, ...(e.resolve ? { realPath: real } : {}) } } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.attach', (_$, e) => ({ clientId: e.clientId }))
  on('session.detach', (_$, e) => ({ clientId: e.clientId }) as never)
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }) as never)
  const submitted: string[] = []
  on('prompt.submit', (_$, e) => {
    submitted.push(e.text)
    return { text: e.text, context: e.context } as never
  })
  return { clock, mem, submitted, opened, ran }
}

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as never
const sectionIds = async ($: EngineInterface): Promise<string[]> => ((await $.prompt.compose(FACTS)) as unknown as { sections: Array<{ id: string }> }).sections.map(s => s.id)
const start = ($: EngineInterface): Promise<unknown> => $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
const mobile = ($: EngineInterface): Promise<unknown> => $.session.attach({ surface: 'mobile', clientId: 'mobile:default' })
const typed = async ($: EngineInterface, args: string, kind = 'composer'): Promise<string> => ((await $.command.run({ command: 'vaken', args, origin: { kind } } as never)) as { text: string }).text

test('the setting: On by default, On and Off, a short note, every word in Swedish', () => {
  expect(checkRegistry(PHONE_NOTE_SETTINGS)).toEqual([])
  expect(PHONE_NOTE_SETTINGS[0]?.key).toBe('phone.note')
  expect(PHONE_NOTE_SETTINGS[0]?.default).toBe('on')
  expect(PHONE_NOTE_SETTINGS[0]?.options.map(o => o.value)).toEqual(['on', 'off'])
  const sv = byEnglish('sv')
  for (const w of PHONENOTE_STRINGS) expect(sv[w] ?? '').not.toBe('')
  expect(PHONE_NOTE_TEXT.split('\n').length).toBeLessThanOrEqual(6)
  expect(PHONE_NOTE_TEXT).toContain('never the link')
})

test('the note is on only while a phone is attached, not Off, and ends when a phone never says it left', () => {
  expect(phoneNoteOn('on', [], NOW)).toBe(false)
  expect(phoneNoteOn('on', [NOW - 1_000], NOW)).toBe(true)
  expect(phoneNoteOn('off', [NOW - 1_000], NOW)).toBe(false)
  expect(phoneNoteOn('on', [NOW - PHONE_MODE_MAX_MS - 1], NOW)).toBe(false)
})

test('through the engine: no phone, no note; a phone joins, the note; it leaves, gone; Off, none', async ($, on) => {
  forgetHello()
  forgetPhones()
  world(on)
  await start($)
  expect(await sectionIds($)).toEqual(['intro'])
  await mobile($)
  expect(await sectionIds($)).toEqual(['intro', PHONE_NOTE_SECTION_ID])
  expect(JSON.stringify(await $.prompt.compose(FACTS))).toContain('The person is on a phone now.')
  await $.command.run({ command: 'vaken-settings', args: 'phone.note off', origin: { kind: 'composer' } } as never)
  expect(await sectionIds($)).toEqual(['intro'])
  await $.command.run({ command: 'vaken-settings', args: 'phone.note on', origin: { kind: 'composer' } } as never)
  expect(await sectionIds($)).toEqual(['intro', PHONE_NOTE_SECTION_ID])
  await $.session.detach({ surface: 'mobile', clientId: 'mobile:default' } as never)
  expect(['after', ...(await sectionIds($))]).toEqual(['after', 'intro'])
})

test('a desktop that joins gets no note', async ($, on) => {
  forgetPhones()
  world(on)
  await start($)
  await $.session.attach({ surface: 'desktop', clientId: 'desktop:default' })
  expect(await sectionIds($)).toEqual(['intro'])
})

test('the path check: inside the project only, never a secret file', () => {
  expect(checkShow('src/app.ts', ROOT, '/home/test')).toEqual({ ok: true, path: '/w/me/src/app.ts' })
  expect(checkShow('../other/x.txt', ROOT, '/home/test')).toEqual({ ok: false, why: 'outside' })
  expect(checkShow('/etc/passwd', ROOT, '/home/test')).toEqual({ ok: false, why: 'outside' })
  expect(checkShow('~/notes.txt', ROOT, '/home/test')).toEqual({ ok: false, why: 'outside' })
  expect(checkShow('.env', ROOT, '/home/test')).toEqual({ ok: false, why: 'secret' })
  expect(checkShow('keys/server.pem', ROOT, '/home/test')).toEqual({ ok: false, why: 'secret' })
  expect(checkShow('.env.example', ROOT, '/home/test').ok).toBe(true)
  expect(checkShow('  ', ROOT, '/home/test')).toEqual({ ok: false, why: 'empty' })
})

test('/vaken show refuses outside, secret, missing and a link that leads out; it submits nothing then', async ($, on) => {
  const w = world(on, {}, { '/w/me/out.txt': '/etc/hosts', '/w/me/README.md': '/w/me/README.md' })
  await start($)
  expect(await typed($, 'show ../x.txt')).toBe('That file is outside this project, so vaken does not send it.')
  expect(await typed($, 'show .env')).toBe('That looks like a file with secrets, so vaken does not send it.')
  expect(await typed($, 'show gone.md')).toBe('There is no file at gone.md.')
  expect(await typed($, 'show out.txt')).toBe('That file is outside this project, so vaken does not send it.')
  expect(await typed($, 'show')).toBe('Type a file after /vaken show, for example /vaken show README.md.')
  await w.clock.advance(1_000)
  expect(w.submitted).toEqual([])
})

test('/vaken show submits the fixed prompt with the path, and only for the person typing', async ($, on) => {
  const w = world(on, {}, { '/w/me/README.md': '/w/me/README.md' })
  await start($)
  expect(await typed($, 'show README.md', 'plugin')).toBe('This step needs you to type it in this session.')
  await w.clock.advance(1_000)
  expect(w.submitted).toEqual([])
  expect(await typed($, 'show README.md')).toBe('Asked Claude to send README.md.')
  // The prompt goes a moment after the command ends.
  await w.clock.advance(1_000)
  expect(w.submitted).toEqual([showPrompt('/w/me/README.md')])
  expect(w.submitted[0]).toContain('your tool that sends files to the person')
})

test('/vaken run refuses an empty command and submits the fixed prompt otherwise; vaken runs nothing itself', async ($, on) => {
  const w = world(on)
  await start($)
  const before = w.ran.length
  expect(await typed($, 'run')).toBe('Type a command after /vaken run, for example /vaken run npm test.')
  expect(await typed($, 'run   ')).toBe('Type a command after /vaken run, for example /vaken run npm test.')
  expect(w.submitted).toEqual([])
  expect(await typed($, 'run npm test')).toBe('Asked Claude to run it and show the short output. Claude still asks before a risky step.')
  await w.clock.advance(1_000)
  expect(w.submitted).toEqual([runPrompt('npm test')])
  expect(w.submitted[0]).toContain('Please run exactly this command')
  expect(w.ran.length).toBe(before)
})

test('the picture target: a port or a localhost address; any other host is refused', () => {
  expect(picTarget('')).toEqual({ kind: 'dev' })
  expect(picTarget('3000')).toEqual({ kind: 'url', url: 'http://localhost:3000/' })
  expect(picTarget('localhost:5173/about')).toEqual({ kind: 'url', url: 'http://localhost:5173/about' })
  expect(picTarget('http://127.0.0.1:8080')).toEqual({ kind: 'url', url: 'http://127.0.0.1:8080/' })
  expect(picTarget('https://example.com')).toEqual({ kind: 'refused' })
  expect(picTarget('localhost.example.com:3000')).toEqual({ kind: 'refused' })
  expect(picTarget('99999')).toEqual({ kind: 'refused' })
  expect(picPrompt('/w/me/.claude/cockpit-eyes/x/phone-390.png')).toContain('/w/me/.claude/cockpit-eyes/x/phone-390.png')
})

test('/vaken pic refuses an outside page and says when no dev server is found; it submits nothing then', async ($, on) => {
  const w = world(on)
  await start($)
  expect(await typed($, 'pic https://example.com')).toBe('Only a page on this computer: type a port or a localhost address.')
  expect(await typed($, 'pic')).toBe('No dev server found. Type its port, for example /vaken pic 3000.')
  // The reason when it is known, and one next step
  expect(await typed($, 'pic 3000')).toBe('No picture was taken: Google Chrome was not found. Install it, then try again.')
  await w.clock.advance(1_000)
  expect(w.submitted).toEqual([])
})

test('plain /vaken still opens the pane, and its chat answer leaves Phone mode to the phone', async ($, on) => {
  const w = world(on)
  await start($)
  // Open at start already opened it once; only the command's opens count here
  w.opened.length = 0
  const text = await typed($, '')
  expect(w.opened.length).toBe(1)
  expect(text).not.toContain('Phone mode')
  expect(w.submitted).toEqual([])
})
