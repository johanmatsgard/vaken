// Next step buttons and quick actions: the picker, the own actions' limits, /vaken quick, the band row and the phone menu.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { BUILT_IN, NEXT_SETTINGS, NEXT_STRINGS, NEXT_TTL_MS, OWN_KEY, OWN_MAX, addOwn, builtIn, endsWithQuestion, findAction, noFacts, noteTool, parseOwn, parseQuick, pickNext, removeOwn, toolKind } from '../hooks/core/actions'
import type { NextFacts, OwnAction } from '../hooks/core/actions'
import { MENU, MENU_MAX_LINES, SUBMIT_AFTER_MS, TESTS_PROMPT, menuLines, menuPick, menuText } from '../hooks/core/phonenote'
import { FOLDED, HIDDEN, HINTS } from '../hooks/core/menu'
import { PRESETS, modeNow } from '../hooks/core/presets'
import { nextModeToWrite } from '../hooks/core/nextupgrade'
import { nextFit } from '../hooks/features/home/band'
import { forgetHello, forgetPhones } from '../hooks/features/phone'
import { byEnglish } from '../hooks/i18n/table'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const ROOT = '/w/me'
const SV = byEnglish('sv')
const ids = (f: NextFacts): string[] => pickNext(f)
const prompt = (id: string): string => (BUILT_IN.find(a => a.id === id) as { prompt: string }).prompt

test('the picker: edits with no test since ask for tests; a passed check with edits asks for commit; a failure asks for a fix; other work gets continue, a plain answer nothing', () => {
  expect(ids(noFacts())).toEqual([])
  let f = noteTool(noFacts(), 'edit', true)
  expect(ids(f)).toEqual(['tests', 'diff'])
  f = noteTool(f, 'test', true)
  expect(ids(f)).toEqual(['commit', 'diff'])
  f = noteTool(f, 'edit', true)
  expect(ids(f)).toEqual(['tests', 'diff'])
  f = noteTool(f, 'test', false)
  expect(ids(f)).toEqual(['fix', 'continue'])
  f = noteTool(f, 'edit', true)
  f = noteTool(f, 'other', false)
  expect(ids(f)).toEqual(['fix', 'tests', 'diff'])
  expect(pickNext(f).length).toBeLessThanOrEqual(3)
  f = noteTool(f, 'commit', true)
  expect(ids(f)).toEqual([])
  // A passed build counts as a check, but edits not tested still ask for tests first.
  expect(ids(noteTool(noteTool(noFacts(), 'edit', true), 'check', true))).toEqual(['tests', 'diff'])
})

test('a tool call is sorted by what it does', () => {
  expect(toolKind('Edit', undefined)).toBe('edit')
  expect(toolKind('Write', undefined)).toBe('edit')
  expect(toolKind('Bash', 'npm test')).toBe('test')
  expect(toolKind('Bash', 'npx tsc --noEmit')).toBe('check')
  expect(toolKind('Bash', 'git add -A && git commit -m "x"')).toBe('commit')
  expect(toolKind('Bash', 'ls')).toBe('other')
  expect(toolKind('Read', undefined)).toBe('other')
})

test('an answer that ends with a question gets no buttons', () => {
  expect(endsWithQuestion('Done. Should I commit it?')).toBe(true)
  expect(endsWithQuestion('Which one do you want?**\n\n')).toBe(true)
  expect(endsWithQuestion('Is it fine? I made the change.')).toBe(false)
  expect(endsWithQuestion('All tests pass.')).toBe(false)
})

test('own actions: at most 12, a name of at most 24, a request of at most 400, names unique, never a secret', () => {
  const ok = addOwn([], 'deploy notes', 'Write short release notes.')
  expect(ok.ok).toBe(true)
  const list = ok.ok ? ok.list : []
  expect(addOwn(list, 'Deploy Notes', 'x')).toEqual({ ok: false, why: 'taken' })
  expect(addOwn(list, 'tests', 'x')).toEqual({ ok: false, why: 'taken' })
  expect(addOwn(list, 'Commit', 'x')).toEqual({ ok: false, why: 'taken' })
  expect(addOwn(list, 'a'.repeat(25), 'x')).toEqual({ ok: false, why: 'name_long' })
  expect(addOwn(list, 'long', 'x'.repeat(401))).toEqual({ ok: false, why: 'prompt_long' })
  expect(addOwn(list, '', 'x')).toEqual({ ok: false, why: 'form' })
  expect(addOwn(list, 'name', '  ')).toEqual({ ok: false, why: 'form' })
  expect(addOwn(list, 'add more', 'x')).toEqual({ ok: false, why: 'name' })
  expect(addOwn(list, 'bad/name', 'x')).toEqual({ ok: false, why: 'name' })
  expect(addOwn(list, 'push', `Use the token ghp_${'a'.repeat(36)} to push.`)).toEqual({ ok: false, why: 'secret' })
  const full: OwnAction[] = Array.from({ length: OWN_MAX }, (_, n) => ({ name: `a${n}`, prompt: 'p' }))
  expect(addOwn(full, 'one more', 'p')).toEqual({ ok: false, why: 'full' })
  expect(parseOwn([...full, { name: 'x', prompt: 'p' }, { name: 5 }])).toHaveLength(OWN_MAX)
  expect(removeOwn(list, 'DEPLOY notes')).toEqual([])
  expect(removeOwn(list, 'nothing')).toBeUndefined()
  expect(findAction('deploy notes', list)?.prompt).toBe('Write short release notes.')
  expect(findAction('Run tests', list)?.prompt).toBe(prompt('tests'))
  expect(findAction('fix', [])?.prompt).toBe(prompt('fix'))
  expect(findAction('nope', list)).toBeUndefined()
})

test('the quick words: list, add with =, remove, and a name to run', () => {
  expect(parseQuick('')).toEqual({ kind: 'list' })
  expect(parseQuick('list')).toEqual({ kind: 'list' })
  expect(parseQuick('add docs = Update the docs.')).toEqual({ kind: 'add', name: 'docs ', prompt: ' Update the docs.' })
  expect(parseQuick('add docs')).toEqual({ kind: 'add', name: '', prompt: '' })
  expect(parseQuick('remove docs')).toEqual({ kind: 'remove', name: 'docs' })
  expect(parseQuick('tests')).toEqual({ kind: 'run', word: 'tests' })
  expect(parseQuick('address book')).toEqual({ kind: 'run', word: 'address book' })
})

test('the command word is quick, folded under /vaken, and never the hidden do of Run commands', () => {
  expect(FOLDED.vaken).toContain('quick')
  expect(FOLDED.vaken).not.toContain('do')
  expect(HIDDEN).toContain('do')
  expect(HINTS.vaken).toContain('quick [name]')
})

test('the setting: Off, Buttons or Buttons and hint, default Buttons; the three modes set it; an old store on Only alerts keeps its mode', () => {
  const s = NEXT_SETTINGS[0]
  expect(s?.key).toBe('next.mode')
  expect(s?.default).toBe('buttons')
  expect(s?.options.map(o => o.value)).toEqual(['off', 'buttons', 'hint'])
  expect((s?.note ?? '').split(/\s+/).length).toBeLessThanOrEqual(16)
  const val = (name: string): string | undefined => PRESETS.find(p => p.name === name)?.values['next.mode']
  expect([val('quiet'), val('balanced'), val('full')]).toEqual(['off', 'buttons', 'hint'])
  const quiet = { ...(PRESETS.find(p => p.name === 'quiet')?.values ?? {}) }
  expect(nextModeToWrite({ ...quiet, 'next.mode': 'buttons' }, new Set())).toBe('off')
  expect(modeNow({ ...quiet, 'next.mode': 'off' })).toBe('quiet')
  expect(nextModeToWrite({ ...quiet, 'next.mode': 'buttons' }, new Set(['next.mode']))).toBeUndefined()
  const full = { ...(PRESETS.find(p => p.name === 'full')?.values ?? {}) }
  expect(nextModeToWrite(full, new Set())).toBeUndefined()
  expect(modeNow(full)).toBe('full')
  const balanced = { ...(PRESETS.find(p => p.name === 'balanced')?.values ?? {}) }
  expect(nextModeToWrite(balanced, new Set())).toBeUndefined()
})

test('every new text has Swedish', () => {
  for (const w of NEXT_STRINGS) expect(SV[w] ?? '').not.toBe('')
})

test('the phone menu: picked next steps first, then own actions, Status last, never more than 7 lines', () => {
  expect(menuLines([])).toEqual([...MENU])
  const picks = [builtIn('tests'), builtIn('diff')]
  const own = [{ id: 'own:docs', label: 'docs', prompt: 'Update the docs.' }]
  const lines = menuLines([...picks, ...own])
  expect(lines.map(l => l.label)).toEqual(['Run tests', 'What changed', 'docs', 'Picture of my app', 'Continue', 'Status'])
  expect(menuText(s => s, lines).split('\n').length).toBeLessThanOrEqual(MENU_MAX_LINES)
  expect(menuPick('1', lines)).toEqual({ kind: 'prompt', text: prompt('tests') })
  expect(menuPick('3', lines)).toEqual({ kind: 'prompt', text: 'Update the docs.' })
  expect(menuPick('6', lines)).toEqual({ kind: 'status' })
  expect(menuPick('7', lines)).toBeUndefined()
  const many = Array.from({ length: 9 }, (_, n) => ({ id: `own:a${n}`, label: `a${n}`, prompt: 'p' }))
  const capped = menuLines(many)
  expect(menuText(s => s, capped).split('\n')).toHaveLength(MENU_MAX_LINES)
  expect(capped[capped.length - 1]?.label).toBe('Status')
  expect(menuText(s => SV[s] ?? s, lines)).toContain('Kör testerna')
})

test('the next steps fit the band: as many as the room holds whole, and none when even one would be cut', () => {
  const labels = ['Run tests', 'What changed', 'Continue']
  expect(nextFit(labels, 1000, 'Next:')).toBe(3)
  expect(nextFit(labels, 150, 'Next:')).toBe(1)
  expect(nextFit(labels, 60, 'Next:')).toBe(0)
  expect(nextFit(labels, Infinity, 'Next:')).toBe(3)
})

function world(on: On) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
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
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  const failTests = { on: false }
  on('tool.call', (_$, e) => ((e as { command?: string }).command === 'npm test' && failTests.on ? ({ result: {}, text: 'Exit code 1', isError: true } as never) : ({ result: {}, text: 'ok' } as never)))
  const reached: string[] = []
  on('prompt.submit', (_$, e) => {
    reached.push(e.text)
    return { text: e.text, context: e.context } as never
  })
  return { clock, mem, reached, toasts, failTests }
}

const start = async ($: EngineInterface): Promise<void> => {
  forgetHello()
  forgetPhones()
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
}
const turn = async ($: EngineInterface, answer: string, steps: Array<{ tool: string; command?: string; file_path?: string }> = []): Promise<void> => {
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  for (const s of steps) await $.tool.call(s as never)
  await $.turn.complete({ answer, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
}
const quick = async ($: EngineInterface, args: string, kind = 'composer'): Promise<string> => ((await $.command.run({ command: 'vaken', args: `quick ${args}`.trim(), origin: { kind } } as never)) as { text: string }).text
// The plugin runs as its own copy, so its picks are read the way a person reads them.
const picksOf = async ($: EngineInterface): Promise<string[]> => {
  const line = /Next steps now: (.*)/.exec(await quick($, ''))?.[1]
  return line === undefined ? [] : line.split(', ').map(x => /\((\w+)\)$/.exec(x)?.[1] ?? x)
}
const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }

test('after an edit the band shows Next: Run tests and What changed; a press sends the fixed request a moment later and clears the row', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 'I changed the file.', [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }])
  expect(await picksOf($)).toEqual(['tests', 'diff'])
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  const label = async (key: string): Promise<string | undefined> => ((await band.find({ key })) as { props?: { label?: string } } | undefined)?.props?.label?.trim()
  expect(await label('band-next-tests')).toBe('Run tests')
  expect(await label('band-next-diff')).toBe('What changed')
  await band.press({ key: 'band-next-tests' })
  expect(w.reached).toEqual([])
  await w.clock.advance(SUBMIT_AFTER_MS)
  expect(w.reached).toEqual([prompt('tests')])
  expect(await picksOf($)).toEqual([])
  await band.unmount()
})

test('no buttons after a question, while paused for an answer, after ten minutes, with the setting Off, or after the person sends a message', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 'Done. Should I also update the docs?', [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }])
  expect(await picksOf($)).toEqual([])
  await turn($, 'Done.')
  expect(await picksOf($)).toEqual(['tests', 'diff'])
  await $.prompt.submit({ text: 'thanks', origin: { kind: 'composer' } } as never)
  expect(await picksOf($)).toEqual([])
  await turn($, 'Done.')
  await w.clock.advance(NEXT_TTL_MS)
  const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  expect(await band.find({ key: 'band-next-tests' })).toBeUndefined()
  await band.unmount()
  // The setting is read where the band draws, so a change counts from the next draw.
  await $.command.run({ command: 'vaken-settings', args: 'next.mode off', origin: { kind: 'composer' } } as never)
  const off = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })
  await off.unmount()
  await turn($, 'Done.', [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }])
  expect(await picksOf($)).toEqual([])
})

test('a failed test asks for a fix; tests that pass after edits ask for a commit', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  w.failTests.on = true
  await turn($, 'The tests fail.', [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }, { tool: 'Bash', command: 'npm test' }])
  expect(await picksOf($)).toEqual(['fix', 'continue'])
  w.failTests.on = false
  await turn($, 'Fixed, tests pass.', [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }, { tool: 'Bash', command: 'npm test' }])
  expect(await picksOf($)).toEqual(['commit', 'diff'])
})

test('/vaken quick lists, adds, runs and removes; it waits while Claude works; only the person may add', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  expect(await quick($, '')).toContain('Built in: tests (Run tests)')
  expect(await quick($, 'add docs = Update the docs in short lines.')).toBe('Added docs. Type /vaken quick docs to send it.')
  expect(w.mem.get(OWN_KEY)).toEqual([{ name: 'docs', prompt: 'Update the docs in short lines.' }])
  expect(await quick($, 'add other', 'plugin')).toBe('This step needs you to type it in this session.')
  expect(await quick($, '')).toContain('Yours: docs')
  expect(await quick($, 'docs')).toBe('Asked Claude: docs.')
  await w.clock.advance(SUBMIT_AFTER_MS)
  expect(w.reached).toEqual(['Update the docs in short lines.'])
  await $.turn.start({ text: 'x', turnId: 't9' } as never)
  expect(await quick($, 'commit')).toBe('Claude is working. Try again when it ends.')
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't9', reason: 'answer' } as never)
  expect(await quick($, 'nothing here')).toBe('No quick action named nothing here. Type /vaken quick for the list.')
  expect(await quick($, 'remove docs')).toBe('Removed docs.')
  expect(w.mem.get(OWN_KEY)).toEqual([])
})

test('on the phone the menu leads with the picked next steps and the own actions, and a digit sends that request', SLOW, async ($, on) => {
  const w = world(on)
  await start($)
  w.mem.set(OWN_KEY, [{ name: 'docs', prompt: 'Update the docs.' }])
  await turn($, 'Changed it.', [{ tool: 'Edit', file_path: `${ROOT}/a.ts` }])
  const menu = (await $.prompt.submit({ text: '/vaken', origin: { kind: 'bridge' } } as never)) as { drop?: string }
  const lines = (menu.drop ?? '').split('\n')
  expect(lines.slice(1, 4)).toEqual(['1. Run tests', '2. What changed', '3. docs'])
  expect(lines.length).toBeLessThanOrEqual(MENU_MAX_LINES)
  const sent = (await $.prompt.submit({ text: '1', origin: { kind: 'bridge' } } as never)) as { text?: string }
  expect(sent.text).toBe(prompt('tests'))
  expect(sent.text).not.toBe(TESTS_PROMPT)
  // As text from the phone, a quick word becomes its request.
  const asText = (await $.prompt.submit({ text: '/vaken quick docs', origin: { kind: 'bridge' } } as never)) as { text?: string }
  expect(asText.text).toBe('Update the docs.')
  expect(w.reached).toEqual([prompt('tests'), 'Update the docs.'])
})
