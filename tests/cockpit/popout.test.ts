// Pop out: the footer button and its command ask the app to show this session in its own window.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { VIEW_STRINGS, setLang } from '../hooks/core/lang'
import { POPOUT_ARGS, POPOUT_BUTTON, POPOUT_FAILED, POPOUT_HELP, POPOUT_SAID, POPOUT_SERVER, POPOUT_TOOL, POPOUT_VIEW_STRINGS, popMem } from '../hooks/core/popout'
import { HIDDEN } from '../hooks/core/menu'
import { FEATURE_HELP } from '../hooks/core/registry'
import type { HomeEngine } from '../hooks/features/home/engine'
import { popOut } from '../hooks/features/home/popout'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = Date.parse('2026-10-10T12:00:00Z')
const paneProps = { title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} }
const id = (s: string): string => s

const fake = (answer: () => unknown) => {
  const calls: Array<{ server: string; tool: string; args: unknown }> = []
  const eng = {
    mcpCall: async (server: string, tool: string, args?: Record<string, unknown>) => {
      calls.push({ server, tool, args })
      return answer()
    },
  } as unknown as HomeEngine
  return { eng, calls }
}

test('the call is the app\'s ccd_window open_session_in with self and window; an answer is a success', async () => {
  popMem.failed = false
  const { eng, calls } = fake(() => ({ content: [{ type: 'text', text: 'ok' }] }))
  expect(await popOut(eng, id)).toEqual({ ok: true, text: POPOUT_SAID })
  expect(calls).toEqual([{ server: 'ccd_window', tool: 'open_session_in', args: { session_id: 'self', target: 'window' } }])
  expect([POPOUT_SERVER, POPOUT_TOOL, POPOUT_ARGS]).toEqual(['ccd_window', 'open_session_in', { session_id: 'self', target: 'window' }])
  expect(POPOUT_SAID).toBe('Opened this session in a new window. Drag it to your other screen.')
  expect(POPOUT_FAILED).toBe('Could not open a new window from here. In the Mac or PC app, right-click the session in the sidebar, then Open in → New window. A phone or a terminal cannot do this.')
})

test('an error answer says the way by hand and is tried again on the next press', async () => {
  popMem.failed = false
  const { eng, calls } = fake(() => ({ content: [{ type: 'text', text: 'the session is not on screen' }], isError: true }))
  expect(await popOut(eng, id)).toEqual({ ok: false, text: POPOUT_FAILED })
  expect(await popOut(eng, id)).toEqual({ ok: false, text: POPOUT_FAILED })
  expect(calls.length).toBe(2)
  expect(popMem.failed).toBe(false)
})

test('a server that is not there is remembered: the next press says the way by hand and does not call again', async () => {
  popMem.failed = false
  const calls: string[] = []
  const eng = {
    mcpCall: async (_s: string, tool: string) => {
      calls.push(tool)
      throw new Error('no such server')
    },
  } as unknown as HomeEngine
  expect(await popOut(eng, id)).toEqual({ ok: false, text: POPOUT_FAILED })
  expect(popMem.failed).toBe(true)
  expect(await popOut(eng, id)).toEqual({ ok: false, text: POPOUT_FAILED })
  expect(calls.length).toBe(1)
  popMem.failed = false
})

test('a press while the call is on its way says nothing and calls nothing more', async () => {
  popMem.failed = false
  let release: (v: unknown) => void = () => undefined
  const calls: string[] = []
  const eng = {
    mcpCall: (_s: string, tool: string) => {
      calls.push(tool)
      return new Promise(resolve => {
        release = resolve
      })
    },
  } as unknown as HomeEngine
  const first = popOut(eng, id)
  expect(await popOut(eng, id)).toEqual({ ok: false, text: '' })
  release({ content: [] })
  expect((await first).ok).toBe(true)
  expect(calls.length).toBe(1)
})

test('the help entry, the command group and the Swedish lines are there', () => {
  expect(FEATURE_HELP.map(h => h.title)).toContain('Vaken on a second screen')
  expect(POPOUT_HELP[0]?.text).toMatch(/Open in new window/)
  expect(POPOUT_HELP[0]?.text).toMatch(/\/vaken-help run popout/)
  expect(POPOUT_HELP[0]?.text).toMatch(/right-click the session in the sidebar, then Open in → New window/)
  expect(HIDDEN).toContain('popout')
  for (const w of [...POPOUT_VIEW_STRINGS, ...POPOUT_HELP.flatMap(h => [h.title, h.text])]) expect(SV[w] ?? '').not.toBe('')
  for (const w of englishOf('popout')) expect(w === POPOUT_BUTTON || POPOUT_VIEW_STRINGS.includes(w) || POPOUT_HELP.some(h => h.title === w || h.text === w)).toBe(true)
  for (const w of POPOUT_VIEW_STRINGS) expect(VIEW_STRINGS).toContain(w)
  expect(SV[POPOUT_BUTTON]).toBe('Öppna i nytt fönster')
  setLang('en')
})

// ---- the pane and the command, through the engine

function engine(on: On, answer: 'ok' | 'error' | 'missing') {
  const clock = mock.clock(on, { now: NOW })
  mock.store(on, { 'cockpit:firstrun': 'done' })
  mock.env(on, { HOME: '/home/test' })
  const calls: Array<{ server: string; tool: string; args: unknown }> = []
  const toasts: string[] = []
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('mcp.call', (_$, e) => {
    if (e.server !== 'ccd_window') return { value: { content: [{ type: 'text', text: 'not for this test' }], isError: true } } as never
    calls.push({ server: e.server, tool: e.tool, args: e.args })
    if (answer === 'missing') throw new Error('no such server: ccd_window')
    return { value: answer === 'error' ? { content: [{ type: 'text', text: 'not on screen' }], isError: true } : { content: [{ type: 'text', text: 'ok' }] } } as never
  })
  on('ui.toast', (_$, e) => {
    toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  return { calls, toasts, clock }
}

test('the button shows on the desktop only, dim and plain, next to Settings', SLOW, async ($, on) => {
  engine(on, 'ok')
  const desktop = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(await desktop.find({ key: 'popout' })).toBeDefined()
  expect(await desktop.find({ type: 'Button', text: /^\s*Open in new window\s*$/ })).toBeDefined()
  expect(await desktop.find({ key: 'settings' })).toBeDefined()
  await desktop.unmount()
  for (const surface of ['terminal', 'mobile', 'vscode'] as const) {
    const ui = await $.ui.mount({ plugin: 'vaken', surface, component: 'Pane', requestId: 'cockpit-home', props: paneProps })
    expect(await ui.find({ key: 'popout' })).toBeUndefined()
    expect(await ui.find({ type: 'Button', text: /Open in new window/ })).toBeUndefined()
    expect(await ui.find({ key: 'settings' })).toBeDefined()
    await ui.unmount()
  }
})

test('a press asks the app once for this session in a window and says so; nothing is asked before the press', async ($, on) => {
  const { calls, toasts, clock } = engine(on, 'ok')
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  expect(calls).toEqual([])
  await ui.press({ key: 'popout' })
  await clock.settle()
  expect(calls).toEqual([{ server: 'ccd_window', tool: 'open_session_in', args: { session_id: 'self', target: 'window' } }])
  expect(toasts).toContain('Opened this session in a new window. Drag it to your other screen.')
  await ui.unmount()
})

test('/vaken-help run popout does the same and answers in words', async ($, on) => {
  const { calls } = engine(on, 'ok')
  const r = (await $.command.run(viaParent('vaken-popout', ''))) as { text: string }
  expect(r.text).toBe('Opened this session in a new window. Drag it to your other screen.')
  expect(calls.length).toBe(1)
  expect(calls[0]?.args).toEqual({ session_id: 'self', target: 'window' })
})

test('an error answer from the app toasts the way by hand', async ($, on) => {
  const { toasts, clock } = engine(on, 'error')
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await ui.press({ key: 'popout' })
  await clock.settle()
  expect(toasts).toContain('Could not open a new window from here. In the Mac or PC app, right-click the session in the sidebar, then Open in → New window. A phone or a terminal cannot do this.')
  await ui.unmount()
})

test('a server that is not reachable toasts the way by hand, and a second press does not call again; the command says the same', async ($, on) => {
  const { calls, toasts, clock } = engine(on, 'missing')
  const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps })
  await ui.press({ key: 'popout' })
  await clock.settle()
  expect(toasts.filter(t => /^Could not open a new window from here/.test(t)).length).toBe(1)
  expect(calls.length).toBe(1)
  await ui.press({ key: 'popout' })
  await clock.settle()
  expect(toasts.filter(t => /^Could not open a new window from here/.test(t)).length).toBe(2)
  expect(calls.length).toBe(1)
  const r = (await $.command.run(viaParent('vaken-popout', ''))) as { text: string }
  expect(r.text).toMatch(/^Could not open a new window from here\. In the Mac or PC app, right-click the session in the sidebar/)
  expect(calls.length).toBe(1)
  await ui.unmount()
})
