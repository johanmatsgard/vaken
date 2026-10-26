// Denied-step explainer: when Claude Code itself stops a step, the band says in one plain line why, with the guard's own words for the step.
// The line has no press and carries no allow rule: vaken never allows or retries a stopped step.
// Nothing about the step is stored: the line lives in memory as words, a tool name and a hash.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { DENIED_BAND_MS, allowMem, askMem, askShown, askWords, rulesMem, stepHash } from '../hooks/core/allowrules'
import type { AskView } from '../hooks/core/allowrules'
import { deniedLineOf, deniedWhy } from '../hooks/core/denied'
import { setLang } from '../hooks/core/lang'
import { columnPt } from '../hooks/ui/tokens'
import { HomeBand, bandPlan } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import type { El } from '../hooks/ui/kit'
import { BASE_SEEDS, HOME, SETUP_BASE, engine, textsOf } from './statefixtures'
import type { Node, World } from './statefixtures'

const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }
const NOW = Date.parse('2026-10-18T12:00:00Z')
const ENV = { home: '/home/user', cwd: '/w/app', root: '/w/app' }
const reset = (): void => {
  askMem.denied = undefined
  allowMem.mode = 'offer'
  rulesMem.allow = []
  rulesMem.deny = []
}
const view = (ask?: AskView): View => ({ needs: [], working: [], waiting: [], idle: [], now: NOW, ...(ask === undefined ? {} : { ask }) })
const at = (pt: number): number => pt / columnPt()

test('who stopped the step: a deny rule, auto mode, don\'t ask mode, or just Claude Code; a hook\'s stop is left to the hook\'s own line', () => {
  const none: string[] = []
  expect(deniedWhy('default', 'Denied by a deny rule in settings', 'Bash', none)).toBe('rule')
  expect(deniedWhy('auto', 'The auto mode classifier blocked this action', 'Bash', none)).toBe('auto')
  expect(deniedWhy('auto', 'Not allowed', 'Bash', none)).toBe('auto')
  expect(deniedWhy('dontAsk', 'Not pre-approved', 'Bash', none)).toBe('dontask')
  expect(deniedWhy('default', 'Not allowed', 'Bash', none)).toBe('other')
  expect(deniedWhy('default', 'Blocked by the PreToolUse hook', 'Bash', none)).toBeUndefined()
  // A deny rule that names the tool is the cause unless auto mode may be (then the plain word is the honest one)
  expect(deniedWhy('default', 'Not allowed', 'Bash', ['Bash(rm:*)'])).toBe('rule')
  expect(deniedWhy('auto', 'Not allowed', 'Bash', ['Bash(rm:*)'])).toBe('other')
  expect(deniedWhy('dontAsk', 'Not allowed', 'Edit', ['Bash'])).toBe('dontask')
})

test('a stopped safe step says who stopped it and what the step does, and carries no allow rule', () => {
  reset()
  const line = deniedLineOf('Bash', { command: 'npm test' }, ENV, 'auto', 'classifier', NOW)
  expect(line?.why).toBe('auto')
  expect(line).not.toHaveProperty('rule')
  allowMem.mode = 'offer'
  askMem.denied = line
  const shown = askShown(NOW + 1000)
  expect(shown).not.toHaveProperty('rule')
  expect(shown).not.toHaveProperty('risky')
  expect(Object.keys(shown as AskView).sort()).toEqual(['said', 'then'])
  expect(askWords(shown as AskView)).toEqual({ step: 'Auto mode stopped this step.', text: 'Auto mode stopped this step. Runs the tests.' })
  setLang('sv')
  try {
    expect(askWords(shown as AskView)).toEqual({ step: 'Autoläget stoppade steget.', text: 'Autoläget stoppade steget. Kör testerna.' })
  } finally {
    setLang('en')
  }
  // The line stays for a few minutes; an old line is never shown
  expect(askShown(NOW + 1000)).not.toBeUndefined()
  expect(askShown(NOW + DENIED_BAND_MS)).toBeUndefined()
  allowMem.mode = 'off'
  expect(askShown(NOW + 1000)).toBeUndefined()
  reset()
})

test('a stopped step of any kind carries no allow rule; secrets never reach the line', () => {
  reset()
  for (const [command, mode, reason] of [['git push --force origin main', 'auto', 'classifier'], ['rm -rf src', 'auto', 'classifier'], ['npm test', 'default', 'Denied by a deny rule'], ['npm test', 'auto', 'classifier']] as const) expect(deniedLineOf('Bash', { command }, ENV, mode, reason, NOW), command).not.toHaveProperty('rule')
  reset()
  const token = `ghp_${'a'.repeat(36)}`
  const line = deniedLineOf('Bash', { command: `curl -H "Authorization: token ${token}" https://api.example.com` }, ENV, 'auto', 'classifier', NOW)
  expect(JSON.stringify(line)).not.toContain(token)
  // Only the kind of tool and a hash of the step are kept: no command word
  const kept = deniedLineOf('Bash', { command: 'npm run special-script' }, ENV, 'auto', 'secret reason text', NOW)
  expect(kept?.hash).toBe(stepHash('Bash', { command: 'npm run special-script' }))
  expect(JSON.stringify(kept)).not.toContain('secret reason text')
  expect(kept?.hash).not.toContain('special')
  expect(deniedLineOf('Bash', { command: 'npm test' }, ENV, 'auto', 'blocked by hook', NOW)).toBeUndefined()
})

type N = { type: string; props: Record<string, unknown> }
const mk = (type: string) => (p: Record<string, unknown>): N => ({ type, props: p ?? {} })
const el = { Box: mk('Box'), Text: mk('Text'), Button: mk('Button'), Svg: mk('Svg'), host: { Client: mk('Client') }, drag: true } as unknown as El
function walk(n: unknown, out: N[] = []): N[] {
  if (Array.isArray(n)) for (const c of n) walk(c, out)
  else if (n !== null && typeof n === 'object' && 'type' in n) {
    out.push(n as N)
    walk((n as N).props.children, out)
  }
  return out
}

test('the band: calm and dim, whole at 288 pt, never a press or a rule', () => {
  reset()
  askMem.denied = deniedLineOf('Bash', { command: 'npm test' }, ENV, 'auto', 'classifier', NOW)
  const ask = askShown(NOW + 1000) as AskView
  // 288 pt: the why alone, never cut; the press does not fit beside it, so none is drawn
  const narrow = bandPlan(view(ask), 'explained', at(288), [], false, false, true)
  expect(narrow.mode === 'line' && narrow.text).toBe('Auto mode stopped this step.')
  expect(narrow.mode === 'line' && narrow.info).toBe(true)
  expect(narrow.mode === 'line' && narrow.open).toBeUndefined()
  // 420 pt: still no press
  const mid = bandPlan(view(ask), 'explained', at(420), [], false, false, true)
  expect(mid.mode === 'line' && mid.open).toBeUndefined()
  // Wide: the whole sentence, no press
  const wide = bandPlan(view(ask), 'explained', 120, [], false, false, true)
  expect(wide.mode === 'line' && wide.text).toBe('Auto mode stopped this step. Runs the tests.')
  expect(wide.mode === 'line' && wide.open).toBeUndefined()
  expect(walk(HomeBand(el, view(ask), 'explained', () => undefined, undefined, undefined, 120)).some(x => x.type === 'Button')).toBe(false)
  // A step a deny rule stopped has no press either
  askMem.denied = deniedLineOf('Bash', { command: 'npm test' }, ENV, 'default', 'Denied by a deny rule', NOW)
  const rule = askShown(NOW + 1000) as AskView
  expect(askWords(rule).text).toBe('A deny rule stopped this step. Runs the tests.')
  expect(walk(HomeBand(el, view(rule), 'explained', () => undefined, undefined, undefined, 120)).some(x => x.type === 'Button')).toBe(false)
  reset()
})

// Through the engine: a denied step gets its line; the hook returns no retry of its own and the store keeps nothing of the step
test('the PermissionDenied hook opens the line, never retries, and keeps nothing in the store', { timeoutMs: 60_000 }, async ($, on) => {
  reset()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  engine(on, w)
  on('settings.read', () => ({ value: {} }) as never)
  on('classic.PermissionDenied', () => ({}) as never)
  const base = { session_id: 'test-session', transcript_path: '', cwd: '/work/app', hook_event_name: 'PermissionDenied', tool_use_id: 'call-1' }
  const said = async (): Promise<string> => {
    const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
    const text = textsOf((await band.drawn()) as Node).join(' ')
    await band.unmount()
    return text
  }
  // A helper's stop is not this band's, and a stop by a settings hook has its own line
  await $.classic.PermissionDenied({ ...base, agent_id: 'a1', tool_name: 'Bash', tool_input: { command: 'npm test' }, reason: 'classifier', permission_mode: 'auto' } as never)
  await $.classic.PermissionDenied({ ...base, tool_name: 'Bash', tool_input: { command: 'npm test' }, reason: 'Blocked by a hook', permission_mode: 'auto' } as never)
  expect(await said()).not.toContain('stopped this step')
  const r = (await $.classic.PermissionDenied({ ...base, tool_name: 'Bash', tool_input: { command: 'npm test' }, reason: 'The classifier blocked it', permission_mode: 'auto' } as never)) as { retry?: unknown }
  expect(r?.retry).toBeUndefined()
  expect(await said()).toContain('Auto mode stopped this step. Runs the tests.')
  // The setting Off: no line at all
  w.mem.set('cockpit:setting:allow.rules', 'off')
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  expect(await said()).not.toContain('stopped this step')
  // The band's own drawing may keep its usual notes; nothing of the step or its reason is stored
  const stored = JSON.stringify([...w.mem.entries()])
  expect(stored).not.toContain('npm test')
  expect(stored).not.toContain('classifier')
  expect(stored).not.toContain(stepHash('Bash', { command: 'npm test' }))
  reset()
})
