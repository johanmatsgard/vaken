// Approve in the band: while Claude Code's own "Allow?" question waits, the band says in plain words what the step does and whether Undo
// has a copy; after a third yes to a safe kind it offers one press that copies the rule. Never for a risky kind, never an answer for the person.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { ALWAYS_KIND, ASK_TTL_MS, OFFER_BAND_MS, addOffer, allowMem, askLineOf, askMem, askShown, askWords, closeAsk, dropOffer, folderOf, noteAskId, noteBandOffer, openAsk, stepHash, stepSaid } from '../hooks/core/allowrules'
import type { AskView } from '../hooks/core/allowrules'
import { setLang } from '../hooks/core/lang'
import { BAND_MARK_PT, TEXT_CHAR_PT } from '../hooks/ui/tokens'
import { HomeBand, bandPlan } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import type { El } from '../hooks/ui/kit'
import { BASE_SEEDS, HOME, SETUP_BASE, engine, textsOf } from './statefixtures'
import type { Node, World } from './statefixtures'

const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }

const NOW = Date.parse('2026-10-17T12:00:00Z')
const ENV = { home: '/home/user', cwd: '/w/app', root: '/w/app' }
const NO_UNDO = { on: true, changed: [] as string[], copied: false }
const THREE = ['/w/app/build/a.js', '/w/app/build/b.js', '/w/app/build/c.js']
const reset = (): void => {
  askMem.line = undefined
  askMem.offer = undefined
  askMem.ids.clear()
  allowMem.mode = 'offer'
  allowMem.offers = []
}
const words = (v: AskView | undefined): string => (v === undefined ? '' : askWords(v).text)
const view = (ask?: AskView): View => ({ needs: [], working: [], waiting: [], idle: [], now: NOW, ...(ask === undefined ? {} : { ask }) })

test('a delete says how many files, in which folder, and that Undo has a copy, in English and Swedish', () => {
  reset()
  const line = askLineOf('Bash', { command: 'rm build/a.js build/b.js build/c.js' }, ENV, { on: true, changed: THREE, copied: true }, NOW)
  expect(askWords(line).text).toBe('Deletes 3 files in build/. Undo has a copy.')
  expect(line.risky).toBe(false)
  // rm is never a rule
  expect(line.rule).toBeUndefined()
  setLang('sv')
  try {
    expect(askWords(line).text).toBe('Tar bort 3 filer i build/. Ångra har en kopia.')
  } finally {
    setLang('en')
  }
  const none = askLineOf('Bash', { command: 'rm build/a.js' }, ENV, { on: false, changed: [THREE[0]], copied: false }, NOW)
  expect(askWords(none).text).toBe('Deletes 1 file in build/. Undo has no copy.')
})

test('a recursive delete of a folder says the folder and everything in it, and is risky, however few files Undo counted', () => {
  reset()
  const line = askLineOf('Bash', { command: 'rm -rf ../shared/build' }, ENV, { on: true, changed: ['/w/shared/build'], copied: false }, NOW)
  expect(askWords(line).text).toBe('Deletes the folder shared/build/ and everything in it. Undo has no copy.')
  expect(line.risky).toBe(true)
  expect(line.rule).toBeUndefined()
  // Inside the project, a trailing slash or star, and the long flag say the same
  for (const command of ['rm -r build/', 'rm -R build/*', 'rm --recursive -f build']) expect(askWords(askLineOf('Bash', { command }, ENV, NO_UNDO, NOW)).step).toBe('Deletes the folder build/ and everything in it.')
  expect(askLineOf('Bash', { command: 'rm -r build' }, ENV, NO_UNDO, NOW).risky).toBe(true)
  // A plain rm of files keeps its count
  expect(askWords(askLineOf('Bash', { command: 'rm build/a.js' }, ENV, { ...NO_UNDO, changed: [THREE[0]] }, NOW)).step).toBe('Deletes 1 file in build/.')
  setLang('sv')
  try {
    expect(askWords(line).step).toBe('Tar bort mappen shared/build/ och allt i den.')
  } finally {
    setLang('en')
  }
  // The band says it in amber with the risk mark
  const plan = bandPlan(view(line), 'explained', 120, [], false, false, true)
  expect(plan.mode === 'line' && plan.info).toBe(false)
  expect(plan.mode === 'line' && plan.text !== undefined && plan.text.startsWith('▲ Deletes the folder shared/build/')).toBe(true)
})

test('each kind of step says what it does in the guard\'s terms; a step that changes nothing says nothing of Undo', () => {
  const say = (tool: string, args: Record<string, unknown>, changed: string[] = []): string => askWords(askLineOf(tool, args, ENV, { ...NO_UNDO, changed }, NOW)).text
  expect(say('Bash', { command: 'cat README.md' })).toBe('Only reads. Nothing changes.')
  expect(say('Bash', { command: 'npm test' })).toBe('Runs the tests.')
  expect(say('Bash', { command: 'npm run build' })).toBe('Builds or checks the code.')
  expect(say('Bash', { command: 'git commit -m "x"' })).toBe('Runs git commit.')
  expect(say('Edit', { file_path: '/w/app/src/login/form.ts' }, ['/w/app/src/login/form.ts'])).toBe('Edits login/form.ts. Undo has no copy.')
  expect(say('WebFetch', { url: 'https://docs.example.com/page?a=1' })).toBe('Reads a web page from docs.example.com.')
  expect(say('mcp__notes__search')).toBe('Uses notes search.')
  expect(folderOf(['/w/app/a.txt', '/w/app/b.txt'], '/w/app')).toBe('app/')
  expect(folderOf(['/w/app/src/a/x.ts', '/w/app/src/b/y.ts'], '/w/app')).toBe('src/')
})

test('the guard\'s risky steps are amber and never get a rule; secrets never reach the line', () => {
  for (const c of ['git push --force origin main', 'git reset --hard HEAD~3', 'rm -rf src', 'npx prisma migrate deploy']) {
    const s = stepSaid('Bash', { command: c }, ENV, [])
    expect([c, s.risky]).toEqual([c, true])
    expect([c, askLineOf('Bash', { command: c }, ENV, NO_UNDO, NOW).rule]).toEqual([c, undefined])
  }
  expect(stepSaid('Edit', { file_path: '/w/app/.claude/settings.json' }, ENV, []).risky).toBe(true)
  expect(stepSaid('Edit', { file_path: '/w/other/a.ts' }, ENV, []).risky).toBe(true)
  const token = `ghp_${'a'.repeat(36)}`
  const line = askLineOf('Bash', { command: `curl -H "Authorization: token ${token}" https://api.example.com` }, ENV, NO_UNDO, NOW)
  expect(JSON.stringify(line)).not.toContain(token)
  expect(askWords(line).text).not.toContain(token)
})

test('a step that reaches outside says it in short fixed words that fit one line at 288 pt, in English and Swedish', () => {
  const step = (tool: string, args: Record<string, unknown>): string => askWords(askLineOf(tool, args, ENV, NO_UNDO, NOW)).step
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['Bash', { command: 'git push origin main' }, 'Pushes to a git remote.'],
    ['Bash', { command: 'docker push app:1' }, 'Pushes to a container registry.'],
    ['Bash', { command: 'kubectl apply -f x.yaml' }, 'Changes a Kubernetes cluster.'],
    ['Bash', { command: 'terraform apply' }, 'Changes your infrastructure.'],
    ['Bash', { command: 'stripe charges create --amount 5' }, 'Changes Stripe.'],
    ['Bash', { command: 'sendmail -s hello' }, 'Reaches outside with sendmail.'],
  ]
  for (const [tool, args, want] of cases) expect([args.command, step(tool, args)]).toEqual([args.command, want])
  const all: Array<[string, Record<string, unknown>]> = [...cases.map(([t, a]): [string, Record<string, unknown>] => [t, a]), ['Bash', { command: 'scp a.txt a-very-long-host-name-of-a-machine.example.test:/tmp' }], ['Bash', { command: 'npm publish' }]]
  for (const lang of ['en', 'sv'] as const) {
    setLang(lang)
    try {
      for (const [tool, args] of all) {
        const line = askLineOf(tool, args, ENV, NO_UNDO, NOW)
        expect([lang, args.command, line.risky, askWords(line).step.length * TEXT_CHAR_PT + BAND_MARK_PT <= 288]).toEqual([lang, args.command, true, true])
      }
    } finally {
      setLang('en')
    }
  }
  setLang('sv')
  try {
    expect(step('Bash', { command: 'git push origin main' })).toBe('Skickar till ett git-fjärrarkiv.')
    expect(step('Bash', { command: 'kubectl apply -f x.yaml' })).toBe('Ändrar ett Kubernetes-kluster.')
  } finally {
    setLang('en')
  }
})

test('a safe kind carries its rule form; the press shows only while that rule is offered and allow.rules is Offer', () => {
  reset()
  const line = askLineOf('Bash', { command: 'npm test' }, ENV, NO_UNDO, NOW)
  expect(line.rule).toBe('Bash(npm test:*)')
  openAsk(line)
  expect(askShown(NOW)?.rule).toBeUndefined()
  addOffer({ rule: 'Bash(npm test:*)', what: '`npm test`', n: 3 })
  expect(askShown(NOW)?.rule).toBe('Bash(npm test:*)')
  allowMem.mode = 'off'
  expect(askShown(NOW)).toBeUndefined()
  allowMem.mode = 'offer'
  dropOffer('Bash(npm test:*)')
  expect(askShown(NOW)?.rule).toBeUndefined()
  // An old question is never shown
  expect(askShown(NOW + ASK_TTL_MS)).toBeUndefined()
  reset()
})

test('right after the third yes the band offers the press for a short while, in the reader\'s words', () => {
  reset()
  const offer = { rule: 'Edit(/src/**)', what: 'edits in src/', n: 3 }
  addOffer(offer)
  noteBandOffer(offer, NOW)
  const shown = askShown(NOW + 1000)
  expect(words(shown)).toBe('You allowed edits in src/ 3 times.')
  expect(shown?.rule).toBe('Edit(/src/**)')
  setLang('sv')
  try {
    expect(words(shown)).toBe('Du tillät ändringar i src/ 3 gånger.')
  } finally {
    setLang('en')
  }
  expect(askShown(NOW + OFFER_BAND_MS)).toBeUndefined()
  reset()
})

test('the line belongs to its call: another call of the same tool does not clear it, its own end does', () => {
  reset()
  const args = { command: 'npm test' }
  noteAskId('call-1', 'Bash', stepHash('Bash', args))
  noteAskId('call-2', 'Bash', stepHash('Bash', { command: 'ls' }))
  openAsk(askLineOf('Bash', { ...args }, ENV, NO_UNDO, NOW))
  expect(askMem.line?.id).toBe('call-1')
  expect(closeAsk('call-2', 'Bash')).toBe(false)
  expect(askMem.line).not.toBeUndefined()
  expect(closeAsk('call-1', 'Bash')).toBe(true)
  expect(askMem.line).toBeUndefined()
  // The hash keeps key order out of it, and keeps no command text
  expect(stepHash('Bash', { a: 1, b: 2 })).toBe(stepHash('Bash', { b: 2, a: 1 }))
  expect(stepHash('Bash', args)).not.toContain('npm')
  reset()
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

test('the band: the question\'s line comes first, amber only when risky, and the one press copies the rule', () => {
  const safe: AskView = { said: { name: 'allow.ask_test' }, risky: false, rule: 'Bash(npm test:*)' }
  const plan = bandPlan(view(safe), 'explained', 60, [], false, false, true)
  expect(plan.mode).toBe('line')
  if (plan.mode !== 'line') return
  expect(plan.text).toBe('Runs the tests.')
  expect(plan.info).toBe(true)
  expect(plan.open?.label).toBe(ALWAYS_KIND)
  const copied: string[] = []
  const tree = HomeBand(el, view(safe), 'explained', () => undefined, undefined, undefined, 60, undefined, undefined, rule => copied.push(rule))
  const button = walk(tree).find(x => x.type === 'Button' && String(x.props.label).includes(ALWAYS_KIND))
  expect(button).not.toBeUndefined()
  ;(button?.props.onPress as () => void)()
  expect(copied).toEqual(['Bash(npm test:*)'])
  // Without the copy action no press is drawn
  expect(walk(HomeBand(el, view(safe), 'explained', () => undefined, undefined, undefined, 60)).some(x => x.type === 'Button' && String(x.props.label).includes(ALWAYS_KIND))).toBe(false)

  const risky: AskView = { said: { name: 'allow.ask_delete', vars: { n: 3, dir: 'build/' } }, undo: 'copy', risky: true }
  const r = bandPlan(view(risky), 'explained', 80, [], false, false, true)
  expect(r.mode === 'line' && r.text).toBe('▲ Deletes 3 files in build/. Undo has a copy.')
  expect(r.mode === 'line' && r.info).toBe(false)
  expect(r.mode === 'line' && r.open).toBeUndefined()
  // A narrow band keeps the step's own words whole
  const narrow = bandPlan(view(risky), 'explained', 30, [], false, false, true)
  expect(narrow.mode === 'line' && narrow.text).toBe('▲ Deletes 3 files in build/.')
  expect(JSON.stringify(HomeBand(el, view(risky), 'explained', () => undefined, undefined, undefined, 80))).toContain('Undo has a copy.')
})

// Through the engine: the question that will show gets its line; the hook never answers it, so the dialog stays the person's
test('the PermissionRequest hook opens the line and returns no decision of its own', { timeoutMs: 60_000 }, async ($, on) => {
  reset()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  engine(on, w)
  on('settings.read', () => ({ value: {} }) as never)
  on('classic.PermissionRequest', () => ({}) as never)
  const base = { session_id: 'test-session', transcript_path: '', cwd: '/work/app' }
  const said = async (): Promise<string> => {
    const band = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
    const text = textsOf((await band.drawn()) as Node).join(' ')
    await band.unmount()
    return text
  }
  // An agent's question is not this band's
  await $.classic.PermissionRequest({ ...base, hook_event_name: 'PermissionRequest', agent_id: 'a1', tool_name: 'Bash', tool_input: { command: 'npm test' } } as never)
  expect(await said()).not.toContain('Runs the tests.')
  const r = (await $.classic.PermissionRequest({ ...base, hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'rm build/a.js build/b.js build/c.js' } } as never)) as { decision?: unknown }
  expect(r?.decision).toBeUndefined()
  expect(await said()).toContain('Deletes 3 files in build/.')
  reset()
})

// A yes counts only when vaken saw the question for that very step: a step that ran with no question (auto-approved, or answered by a hook) is not a yes.
test('three steps that ran with no question are no yes; three that vaken saw asked are, and the rule is offered', { timeoutMs: 60_000 }, async ($, on) => {
  reset()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  engine(on, w)
  on('settings.read', () => ({ value: {} }) as never)
  // Since Claude Code 2.1.307 a test's tool call also meets the engine's own permission check, a second check of the same step: that one is the step
  // going ahead (the person's Allow), answered yes here. The first check of a step is the question this test asks.
  const checked = new Set<string>()
  on('tool.check', (_$, e) => {
    const id = (e as { tool_use_id?: string }).tool_use_id ?? ''
    const again = checked.has(id)
    checked.add(id)
    return { decision: again ? 'allow' : 'ask' } as never
  })
  on('classic.PermissionRequest', () => ({}) as never)
  const base = { session_id: 'test-session', transcript_path: '', cwd: '/work/app' }
  const run = async (id: string, asked: boolean): Promise<void> => {
    await $.tool.check({ tool: 'Bash', input: { command: 'npm test' }, tool_use_id: id } as never)
    if (asked) await $.classic.PermissionRequest({ ...base, hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'npm test' } } as never)
    await $.tool.call({ tool: 'Bash', command: 'npm test', tool_use_id: id } as never)
  }
  for (const id of ['q1', 'q2', 'q3']) await run(id, false)
  expect(w.mem.get('cockpit:allowrules')).toBeUndefined()
  for (const id of ['a1', 'a2', 'a3']) await run(id, true)
  const book = w.mem.get('cockpit:allowrules') as Record<string, { offered?: number }>
  expect(Object.keys(book)).toEqual(['Bash(npm test:*)'])
  expect(book['Bash(npm test:*)'].offered).toBe(NOW)
  reset()
})
