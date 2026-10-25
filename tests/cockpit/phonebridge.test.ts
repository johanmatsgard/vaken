// The phone found by where a prompt came from (the Remote Control bridge), the phone words as prompt text, and the number menu.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { CHANGED_PROMPT, CONTINUE_PROMPT, MENU_WINDOW_MS, PHONE_NOTE_SECTION_ID, TESTS_PROMPT, menuOpen, menuPick, menuText, runPrompt, showPrompt, vakenWords } from '../hooks/core/phonenote'
import { PHONE_MODE_MAX_MS } from '../hooks/core/phonecmds'
import { ORIGINS_KEY, forgetHello, forgetPhones } from '../hooks/features/phone'
import { byEnglish } from '../hooks/i18n/table'
import { test } from './slow'
import { posix } from './fspath'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const ROOT = '/w/me'
const SV = byEnglish('sv')

function world(on: On, files: Record<string, string> = {}) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  // Plain mode is on by default; it is held off here so only the phone note is seen.
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:plain.mode': 'off', 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1 }))
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
  const session = mock.session(on)
  on('session.id', () => ({ value: 'me' }))
  on('session.root', () => ({ value: ROOT }) as never)
  on('session.cwd', () => ({ value: ROOT }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  const opened: string[] = []
  on('ui.open', (_$, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } } as never
  })
  on('fs.stat', (_$, raw) => {
    const e = { ...raw, path: posix(raw.path) }
    if (e.path === ROOT) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false, ...(e.resolve ? { realPath: ROOT } : {}) } } as never
    const real = files[e.path]
    if (real === undefined) throw new Error('ENOENT')
    return { value: { kind: 'file', size: 10, mtimeMs: 0, isLink: real !== e.path, ...(e.resolve ? { realPath: real } : {}) } } as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'base', scope: 'shared' }] }) as never)
  const reached: string[] = []
  on('prompt.submit', (_$, e) => {
    reached.push(e.text)
    return { text: e.text, context: e.context } as never
  })
  const rows = (): string[] => session.appended().map(r => (r.message.content[0] as { text: string }).text)
  return { clock, mem, session, rows, reached, opened }
}

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as never
const sectionIds = async ($: EngineInterface): Promise<string[]> => ((await $.prompt.compose(FACTS)) as unknown as { sections: Array<{ id: string }> }).sections.map(s => s.id)
const start = async ($: EngineInterface): Promise<void> => {
  forgetHello()
  forgetPhones()
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
}
type Sent = { text?: string; drop?: string }
const send = async ($: EngineInterface, text: string, kind = 'bridge'): Promise<Sent> => (await $.prompt.submit({ text, origin: { kind } } as never)) as Sent

test('the words as text: /vaken alone, show, run and pic; another command or word is not ours', () => {
  expect(vakenWords('/vaken')).toEqual({ kind: 'menu' })
  expect(vakenWords('  /vaken  ')).toEqual({ kind: 'menu' })
  expect(vakenWords('/vaken show README.md')).toEqual({ kind: 'show', rest: 'README.md' })
  expect(vakenWords('/vaken run npm test')).toEqual({ kind: 'run', rest: 'npm test' })
  expect(vakenWords('/vaken pic 3000')).toEqual({ kind: 'pic', rest: '3000' })
  expect(vakenWords('/vaken pic')).toEqual({ kind: 'pic', rest: '' })
  expect(vakenWords('/vaken-usage')).toBeUndefined()
  expect(vakenWords('/vaken inbox')).toBeUndefined()
  expect(vakenWords('please /vaken show x')).toBeUndefined()
})

test('the menu: five choices and the reply line, every word in Swedish; a digit picks a line only inside the window', () => {
  const en = menuText(s => s).split('\n')
  expect(en).toEqual(['Reply with a number.', '1. What changed (short)', '2. Run the tests', '3. Picture of my app', '4. Continue', '5. Status'])
  expect(menuText(s => SV[s] ?? s)).not.toContain('Run the tests')
  expect(menuPick('1')).toEqual({ kind: 'prompt', text: CHANGED_PROMPT })
  expect(menuPick(' 2 ')).toEqual({ kind: 'prompt', text: TESTS_PROMPT })
  expect(menuPick('3')).toEqual({ kind: 'pic' })
  expect(menuPick('4')).toEqual({ kind: 'prompt', text: CONTINUE_PROMPT })
  expect(menuPick('5')).toEqual({ kind: 'status' })
  for (const no of ['6', '0', '12', '1.', 'one', '']) expect(menuPick(no)).toBeUndefined()
  expect(menuOpen(undefined, NOW)).toBe(false)
  expect(menuOpen(NOW, NOW + MENU_WINDOW_MS - 1)).toBe(true)
  expect(menuOpen(NOW, NOW + MENU_WINDOW_MS)).toBe(false)
})

test('a prompt through the bridge turns the phone note on with no attach; a prompt typed at the Mac turns it off', async ($, on) => {
  const w = world(on)
  await start($)
  expect(await sectionIds($)).toEqual(['intro'])
  expect((await send($, 'how is it going?')).text).toBe('how is it going?')
  expect(await sectionIds($)).toEqual(['intro', PHONE_NOTE_SECTION_ID])
  expect(Object.keys(w.mem.get('cockpit:awake:phone') as object)).toEqual(['me:bridge'])
  await send($, 'back at the desk', 'composer')
  expect(await sectionIds($)).toEqual(['intro'])
  expect(w.mem.get('cockpit:awake:phone')).toEqual({})
  expect(w.mem.get(ORIGINS_KEY)).toEqual({ bridge: NOW, composer: NOW })
})

test('the bridge stint ends by itself after the Phone mode hours; a plugin prompt changes nothing', async ($, on) => {
  const w = world(on)
  await start($)
  await send($, 'hi')
  await send($, 'from a plugin', 'plugin')
  expect(await sectionIds($)).toEqual(['intro', PHONE_NOTE_SECTION_ID])
  await w.clock.advance(PHONE_MODE_MAX_MS)
  expect(await sectionIds($)).toEqual(['intro'])
})

test('the first prompt of a phone stint says hello once, with the phone words even when nothing waits', async ($, on) => {
  const w = world(on)
  await start($)
  await send($, 'hi')
  expect(w.rows()).toEqual(['On the phone: /vaken for a menu, or /vaken show, /vaken run, /vaken pic.'])
  expect(w.session.appended()[0]?.message.type).toBe('system')
  await send($, 'and again')
  expect(w.rows()).toHaveLength(1)
  expect(w.reached).toEqual(['hi', 'and again'])
})

test('/vaken as text from the phone: the menu, not a prompt; a digit then becomes its fixed prompt once', async ($, on) => {
  const w = world(on)
  await start($)
  const menu = await send($, '/vaken')
  expect(menu.drop).toBe(menuText(s => s))
  expect(w.rows()).toContain(menuText(s => s))
  expect(w.reached).toEqual([])
  expect((await send($, '1')).text).toBe(CHANGED_PROMPT)
  // The window closed with that prompt: a digit is an answer to Claude now.
  expect((await send($, '2')).text).toBe('2')
  await send($, '/vaken')
  expect((await send($, ' 2 ')).text).toBe(TESTS_PROMPT)
  await send($, '/vaken')
  expect((await send($, '4')).text).toBe(CONTINUE_PROMPT)
  expect(w.reached).toEqual([CHANGED_PROMPT, '2', TESTS_PROMPT, CONTINUE_PROMPT])
})

test('a digit is never taken outside the window, after other words, or from the Mac', async ($, on) => {
  const w = world(on)
  await start($)
  expect((await send($, '1')).text).toBe('1')
  await send($, '/vaken')
  await w.clock.advance(MENU_WINDOW_MS)
  expect((await send($, '1')).text).toBe('1')
  await send($, '/vaken')
  await send($, 'something else')
  expect((await send($, '1')).text).toBe('1')
  await send($, '/vaken')
  expect((await send($, '1', 'composer')).text).toBe('1')
  expect((await send($, '1')).text).toBe('1')
  // At the Mac, /vaken as text is left alone (it runs as the command when Claude is idle).
  expect((await send($, '/vaken', 'composer')).text).toBe('/vaken')
})

test('5 is the short status, 3 the picture word; neither goes to Claude when there is nothing to send', async ($, on) => {
  const w = world(on)
  await start($)
  await send($, '/vaken')
  expect((await send($, '5')).drop).toBe('- Nothing needs you.\n- Phone mode: asks once · Settings > Attention')
  await send($, '/vaken')
  expect((await send($, '3')).drop).toBe('No dev server found. Type its port, for example /vaken pic 3000.')
  expect(w.reached).toEqual([])
})

test('/vaken show, run and pic as text: the fixed prompt goes in place of the text, a refusal goes to the person', async ($, on) => {
  const w = world(on, { '/w/me/README.md': '/w/me/README.md' })
  await start($)
  expect((await send($, '/vaken show README.md')).text).toBe(showPrompt('/w/me/README.md'))
  expect((await send($, '/vaken show .env')).drop).toBe('That looks like a file with secrets, so vaken does not send it.')
  expect((await send($, '/vaken run npm test')).text).toBe(runPrompt('npm test'))
  expect((await send($, '/vaken run')).drop).toBe('Type a command after /vaken run, for example /vaken run npm test.')
  expect((await send($, '/vaken pic https://example.com')).drop).toBe('Only a page on this computer: type a port or a localhost address.')
  // Typed at the Mac while Claude works, the words arrive as text too.
  expect((await send($, '/vaken run ls', 'composer')).text).toBe(runPrompt('ls'))
  // Not from the person: left as it is.
  expect((await send($, '/vaken run ls', 'plugin')).text).toBe('/vaken run ls')
  expect((await send($, '/vaken-usage')).text).toBe('/vaken-usage')
  expect(w.reached).toEqual([showPrompt('/w/me/README.md'), runPrompt('npm test'), runPrompt('ls'), '/vaken run ls', '/vaken-usage'])
})

test('/vaken typed as a command on the phone: the menu, no pane; at the Mac the pane as before', async ($, on) => {
  const w = world(on)
  await start($)
  // Open at start already opened it once; only the command's opens count here
  w.opened.length = 0
  const phone = (await $.command.run({ command: 'vaken', args: '', origin: { kind: 'bridge' } } as never)) as { text: string }
  expect(phone.text).toBe(menuText(s => s))
  expect(w.opened).toEqual([])
  expect(await sectionIds($)).toEqual(['intro', PHONE_NOTE_SECTION_ID])
  expect((await send($, '2')).text).toBe(TESTS_PROMPT)
  const mac = (await $.command.run({ command: 'vaken', args: '', origin: { kind: 'composer' } } as never)) as { text: string }
  expect(mac.text).not.toContain('Phone mode')
  expect(w.opened.length).toBe(1)
})
