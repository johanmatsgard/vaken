// Learn from you: a repeated correction becomes one offer to save a project rule, and a role that fails often on a cheaper model gets an offer of a stronger one.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface } from 'claude-code'

import type { Io } from '../hooks/core/io'
import {
  MODEL_QUIET_MS, OUTCOMES_KEY, TEACH_QUIET_MS, TEACH_WINDOW_MS, TEACH_WORDS, addRun, askedModel, codeOf, countRule, hasRule, modelOffer, modelVars, parseOutcomes, parseTeach, ruleFrom, rulesListText, savedRules, teachKey, teachMem, withRule, withoutRule,
} from '../hooks/core/teach'
import type { Outcomes } from '../hooks/core/teach'
import { TAUGHT_HEAD, stripTaught, taughtOf, withTaught } from '../hooks/core/taught'
import { BEGIN, END, blockText, desired, nextText, stateOf } from '../hooks/core/setupcard'
import { newRun } from '../hooks/core/orchestra'
import type { Run, Task } from '../hooks/core/orchestra'
import { PRESETS } from '../hooks/core/presets'
import { quietRowToWrite } from '../hooks/core/nextupgrade'
import { isTextOnly } from '../hooks/core/settingsmap'
import { findSetting, settingPath, settingStoreKey } from '../hooks/core/settings'
import { hashOf } from '../hooks/core/proof'
import { answerOffer, noteOutcomes, noteRule, projectFile, removeRule, saveRule } from '../hooks/features/teach'
import { newsCount, newsFactsOf, teachGroups } from '../hooks/features/home/needs'
import { TEACH_NO, TEACH_YES } from '../hooks/features/home/rowact'
import { byEnglish } from '../hooks/i18n/table'
import { memSafeFs } from './safefs'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { BY_PERSON_ONLY } from '../hooks/core/origin'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const DAY = 86_400_000
const HOME = '/home/user'
const ROOT = '/w/app'
const SV = byEnglish('sv')

type World = { io: Io; mem: Map<string, unknown>; files: Map<string, string>; toasts: string[]; gets: string[]; wrote: string[]; at: { now: number } }
function world(seed: Record<string, unknown> = {}, files: Record<string, string> = {}): World {
  const mem = new Map<string, unknown>(Object.entries(seed))
  const disk = new Map<string, string>(Object.entries(files))
  const w: World = { io: undefined as unknown as Io, mem, files: disk, toasts: [], gets: [], wrote: [], at: { now: NOW } }
  w.io = {
    now: async () => w.at.now,
    home: async () => HOME,
    sessionId: async () => 's1',
    get: async (key: string) => {
      w.gets.push(key)
      return mem.get(key)
    },
    set: async (key: string, value: unknown) => void mem.set(key, value),
    del: async (key: string) => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async (path: string) => {
      const t = disk.get(path)
      if (t === undefined) throw new Error('ENOENT: no such file')
      return t
    },
    write: async (path: string, text: string) => {
      w.wrote.push(path)
      disk.set(path, text)
    },
    run: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    ask: async () => undefined,
    complete: async () => ({ text: '' }),
    toast: (text: string) => void w.toasts.push(text),
    invalidate: () => undefined,
  } as unknown as Io
  return w
}
const fsOf = (w: World) => memSafeFs(() => [...w.files.keys(), `${ROOT}/.keep`, `${HOME}/.keep`])

// Built at run time so no secret-looking text sits in the source.
const fakeKey = (): string => ['sk', 'ant', ['a1B2c3D4', 'e5F6g7H8', 'i9J0kLmN'].join('')].join('-')

test('a correction is found and coded; "Don\'t add comments" and "never add any comments" share one code', () => {
  expect(ruleFrom('use pnpm, not npm')).toEqual({ code: 'use pnpm not npm', line: 'Use pnpm, not npm.', said: 'use pnpm, not npm' })
  expect(ruleFrom('Please use pnpm instead of npm.')?.code).toBe('use pnpm not npm')
  expect(ruleFrom('answer in Swedish')?.line).toBe('Answer in Swedish.')
  expect(ruleFrom('Svara på svenska')?.code).toBe('answer in svenska')
  expect(ruleFrom("Don't add comments.")?.code).toBe(ruleFrom('please never add any comments')?.code)
  expect(ruleFrom("Don't add comments.")?.line).toBe("Don't add comments.")
  expect(ruleFrom('Always run the tests first.')?.said).toBe('always run the tests first')
  // A task, a question, code or a long paste is never a rule.
  for (const t of ['fix the login bug', 'should we always run the tests?', 'never run `rm -rf`', '/vaken-memory rules', `never ${'word '.repeat(40)}`]) expect(ruleFrom(t)).toBeUndefined()
  expect(codeOf("Don't add the comments")).toBe('never add comments')
})

test('a rule that holds a secret is never kept or saved', () => {
  expect(ruleFrom(`Never print ${fakeKey()}`)).toBeUndefined()
  expect(withRule(null, {}, `Use ${fakeKey()}, not npm.`)).toEqual({ why: 'secret' })
})

test('the third time in 14 days offers once; then quiet for 30 days; spread-out times never offer', () => {
  let s = parseTeach(undefined)
  const step = (at: number): boolean => {
    const r = countRule(s, 'use pnpm not npm', at)
    s = r.state
    return r.offer
  }
  expect([step(NOW), step(NOW + DAY), step(NOW + 2 * DAY)]).toEqual([false, false, true])
  expect([step(NOW + 3 * DAY), step(NOW + 4 * DAY), step(NOW + 5 * DAY)]).toEqual([false, false, false])
  const later = NOW + 2 * DAY + TEACH_QUIET_MS + DAY
  expect([step(later), step(later + 1), step(later + 2)]).toEqual([false, false, true])
  // Only a hash of the code is stored, never the words.
  expect(JSON.stringify(s)).not.toContain('pnpm')
  let t = parseTeach(undefined)
  const offers = [0, 1, 2, 3].map(k => {
    const r = countRule(t, 'never add comments', NOW + k * (TEACH_WINDOW_MS / 2 + DAY))
    t = r.state
    return r.offer
  })
  expect(offers).toEqual([false, false, false, false])
})

test('the saved line goes into the block, which is made as the Agent setup card makes it, and the card keeps it', () => {
  const values = {}
  const made = withRule(null, values, 'Use pnpm, not npm.')
  expect('text' in made && made.text).toBe(`${withTaught(blockText(values), ['Use pnpm, not npm.'])}\n`)
  const text = 'text' in made ? made.text : ''
  expect(text.startsWith(BEGIN)).toBe(true)
  expect(text.trimEnd().endsWith(END)).toBe(true)
  expect(savedRules(text)).toEqual(['Use pnpm, not npm.'])
  // A file of the person's own gets the block at its end; their text is kept.
  const own = withRule('# My project\n\nKeep it small.\n', values, 'Answer in Swedish.')
  expect('text' in own && own.text.startsWith('# My project\n\nKeep it small.\n\n<!-- cockpit:begin -->')).toBe(true)
  // A second rule joins the first; the same rule again is not added twice.
  const two = withRule(text, values, "Don't add comments.")
  const twoText = 'text' in two ? two.text : ''
  expect(savedRules(twoText)).toEqual(['Use pnpm, not npm.', "Don't add comments."])
  expect(withRule(twoText, values, 'use pnpm, not npm.')).toEqual({ why: 'same' })
  expect(hasRule(twoText, "Don't add comments.")).toBe(true)
  // The Agent setup card: the block with saved rules still matches, and a rewrite keeps them.
  const block = desired(values, HOME, ROOT, 'project').find(d => d.kind === 'block')!
  expect(stateOf(block, twoText)).toBe('matches')
  const changed = { 'plan.first': 'ask' }
  const rewritten = nextText(desired(changed, HOME, ROOT, 'project').find(d => d.kind === 'block')!, twoText)
  expect(savedRules(rewritten)).toEqual(['Use pnpm, not npm.', "Don't add comments."])
  expect(rewritten).toContain('- For a big task, write a short plan and wait for a yes.')
  // Removing one keeps the other.
  const less = withoutRule(twoText, 1)
  expect('text' in less && savedRules(less.text)).toEqual(["Don't add comments."])
  expect(withoutRule(twoText, 5)).toEqual({ why: 'none' })
  expect(taughtOf(stripTaught(withTaught(blockText(values), ['A.'])))).toEqual([])
  expect(TAUGHT_HEAD).toBe('Rules you saved in vaken:')
})

test('only the project CLAUDE.md is written: never the one in the home folder, never settings', async () => {
  expect(projectFile(ROOT, HOME)).toBe(`${ROOT}/CLAUDE.md`)
  expect(projectFile(HOME, HOME)).toBeUndefined()
  expect(projectFile(`${HOME}/`, HOME)).toBeUndefined()
  expect(projectFile('', HOME)).toBeUndefined()
  const w = world({}, { [`${HOME}/.claude/CLAUDE.md`]: '# mine\n' })
  expect(await saveRule(w.io, fsOf(w), HOME, 'Use pnpm, not npm.')).toEqual({ ok: false, why: 'place' })
  expect(w.wrote).toEqual([])
  const r = await saveRule(w.io, fsOf(w), ROOT, 'Use pnpm, not npm.')
  expect(r).toEqual({ ok: true, path: `${ROOT}/CLAUDE.md` })
  expect(w.wrote).toEqual([`${ROOT}/CLAUDE.md`])
  expect(w.files.get(`${HOME}/.claude/CLAUDE.md`)).toBe('# mine\n')
  expect(savedRules(w.files.get(`${ROOT}/CLAUDE.md`) ?? '')).toEqual(['Use pnpm, not npm.'])
  // A link at the file is never followed.
  const linked = world()
  const fs = memSafeFs(() => ['/elsewhere/CLAUDE.md', `${ROOT}/.keep`], new Map([[`${ROOT}/CLAUDE.md`, '/elsewhere/CLAUDE.md']]))
  expect(await saveRule(linked.io, fs, ROOT, 'Use pnpm, not npm.')).toEqual({ ok: false, why: 'link' })
  expect(await saveRule(linked.io, undefined, ROOT, 'Use pnpm, not npm.')).toEqual({ ok: false, why: 'link' })
  expect(await removeRule(w.io, fsOf(w), ROOT, 1)).toEqual({ ok: true, path: `${ROOT}/CLAUDE.md` })
  expect(savedRules(w.files.get(`${ROOT}/CLAUDE.md`) ?? '')).toEqual([])
})

test('the prompt hook: no store read for a plain prompt, one toast on the third time, nothing when Off', async () => {
  teachMem.offer = undefined
  const w = world()
  await noteRule(w.io, ROOT, 'please fix the login page', { kind: 'person' })
  expect(w.gets).toEqual([])
  for (let k = 0; k < 3; k += 1) {
    w.at.now = NOW + k * DAY
    await noteRule(w.io, ROOT, 'use pnpm, not npm', { kind: 'person' })
  }
  expect(w.toasts).toEqual(['You told Claude 3 times: use pnpm, not npm. Save it as a rule for this project? Needs you has the button.'])
  expect(teachMem.offer?.rule.line).toBe('Use pnpm, not npm.')
  expect(teachMem.offer?.root).toBe(ROOT)
  expect(w.mem.has(teachKey(hashOf(ROOT)))).toBe(true)
  expect(rulesListText([], teachMem.offer)).toContain('Waiting for your yes: Use pnpm, not npm.')
  w.at.now = NOW + 4 * DAY
  await noteRule(w.io, ROOT, 'use pnpm, not npm', { kind: 'person' })
  expect(w.toasts.length).toBe(1)
  teachMem.offer = undefined
  const off = world({ [settingStoreKey('teach.mode')]: 'off' })
  for (let k = 0; k < 3; k += 1) await noteRule(off.io, ROOT, 'use pnpm, not npm', { kind: 'person' })
  expect(off.toasts).toEqual([])
  expect(teachMem.offer).toBeUndefined()
  expect([...off.mem.keys()].some(k => k.startsWith('cockpit:teach:'))).toBe(false)
})

const task = (n: number, role: Task['role'], ran: string, state: Task['state'], extra: Partial<Task> = {}): Task => ({ ...newRun(['x'], NOW).tasks[0]!, n, role, ran, state, ...extra })
const runOf = (id: string, tasks: Task[]): Run => ({ ...newRun(['x'], NOW), id, status: 'done', tasks })

test('outcomes are counted per role and model; a stop by the person and the same run twice do not count', () => {
  const run = runOf('r1', [task(1, 'builder', 'claude-haiku-4-5', 'done'), task(2, 'builder', 'claude-haiku-4-5', 'failed'), task(3, 'builder', 'claude-haiku-4-5', 'done', { check: 'failed' }), task(4, 'builder', 'claude-haiku-4-5', 'failed', { why: 'stopped' }), task(5, 'reviewer', 'claude-haiku-4-5', 'stopped')])
  const o = addRun(parseOutcomes(undefined), run)
  expect(o.counts['builder:haiku']).toEqual({ last: 'pff', pass: 1, fail: 2 })
  expect(o.counts['reviewer:haiku']).toBeUndefined()
  expect(addRun(o, run)).toBe(o)
})

test('the model offer: 3 fails in the last 5 on a cheaper model, once per 7 days per role, never past Opus', () => {
  let o: Outcomes = addRun(parseOutcomes(undefined), runOf('r1', ['done', 'failed', 'done', 'failed', 'failed'].map((s, k) => task(k + 1, 'builder', 'claude-haiku-4-5', s as Task['state']))))
  const m = modelOffer(o, { builder: 'haiku' }, NOW)
  expect(m).toEqual({ role: 'builder', from: 'haiku', to: 'sonnet', passed: 2, of: 5 })
  expect(modelVars(m!)).toEqual({ role: 'Builder', from: 'Haiku', to: 'Sonnet', passed: 2, of: 5, roles: 'builders' })
  // The role already moved on: no offer for the old model.
  expect(modelOffer(o, { builder: 'sonnet' }, NOW)).toBeUndefined()
  o = askedModel(o, 'builder', NOW)
  expect(modelOffer(o, { builder: 'haiku' }, NOW + MODEL_QUIET_MS - 1)).toBeUndefined()
  expect(modelOffer(o, { builder: 'haiku' }, NOW + MODEL_QUIET_MS + 1)?.to).toBe('sonnet')
  // Two fails in five is no offer; Opus has no step up.
  const fine = addRun(parseOutcomes(undefined), runOf('r2', ['done', 'failed', 'done', 'failed', 'done'].map((s, k) => task(k + 1, 'builder', 'claude-haiku-4-5', s as Task['state']))))
  expect(modelOffer(fine, { builder: 'haiku' }, NOW)).toBeUndefined()
  const opus = addRun(parseOutcomes(undefined), runOf('r3', [1, 2, 3].map(k => task(k, 'fixer', 'claude-opus-5', 'failed'))))
  expect(modelOffer(opus, {}, NOW)).toBeUndefined()
})

test('a run that ends stores the counts and leaves the offer in memory', async () => {
  teachMem.model = undefined
  const w = world()
  const run = runOf('r9', [1, 2, 3].map(k => task(k, 'reviewer', 'claude-haiku-4-5', 'failed')))
  await noteOutcomes(w.io, run, {})
  expect(teachMem.model).toEqual({ role: 'reviewer', from: 'haiku', to: 'sonnet', passed: 0, of: 3 })
  expect(parseOutcomes(w.mem.get(OUTCOMES_KEY)).asked.reviewer).toBe(NOW)
  teachMem.model = undefined
  await noteOutcomes(w.io, runOf('r10', [1, 2, 3].map(k => task(k, 'reviewer', 'claude-haiku-4-5', 'failed'))), {})
  expect(teachMem.model).toBeUndefined()
})

test('the setting: Off or Offer, Offer in Recommended and Everything useful, Off in Only alerts, kept off the pane', () => {
  const s = findSetting('teach.mode')!
  expect(s.label).toBe('Learn from you')
  expect(s.default).toBe('offer')
  expect(s.options.map(o => o.value)).toEqual(['off', 'offer'])
  const val = (name: string): string | undefined => PRESETS.find(p => p.name === name)?.values['teach.mode']
  expect([val('quiet'), val('balanced'), val('full')]).toEqual(['off', 'offer', 'offer'])
  expect(isTextOnly(s)).toBe(true)
  expect(settingPath(s)).toBe('/vaken-settings all')
  const quiet = { ...(PRESETS.find(p => p.name === 'quiet')?.values ?? {}) }
  expect(quietRowToWrite('teach.mode', { ...quiet, 'teach.mode': 'offer' }, new Set())).toBe('off')
})

test('every text has Swedish', () => {
  for (const w of TEACH_WORDS) expect(SV[w] === undefined ? w : 'ok').toBe('ok')
})

test('Needs you shows the exact line with two whole-row presses; it is not counted; Save writes it, Not now lets it go', async () => {
  teachMem.offer = { rule: ruleFrom('use pnpm, not npm')!, root: ROOT }
  const f = newsFactsOf({ hidden: [], halted: false }, NOW)
  expect(newsCount(f)).toBe(0)
  const [g] = teachGroups(f, s => s)
  expect(g?.head).toBe('Learned from you')
  const row = g!.rows[0] as { title: string; what: { means: string }; inside: { label: string; action: unknown; more: { label: string; action: unknown }[] } }
  expect(row.title).toBe('You told Claude 3 times: use pnpm, not npm')
  expect(row.what.means).toBe('Save it as a rule for this project? This line goes into CLAUDE.md in this project: Use pnpm, not npm.')
  expect([row.inside.label, row.inside.action, row.inside.more[0]?.label, row.inside.more[0]?.action]).toEqual(['Save as a rule', TEACH_YES, 'Not now', TEACH_NO])
  const w = world()
  await answerOffer(w.io, fsOf(w), false)
  expect(teachMem.offer).toBeUndefined()
  expect(w.wrote).toEqual([])
  teachMem.offer = { rule: ruleFrom('use pnpm, not npm')!, root: ROOT }
  await answerOffer(w.io, fsOf(w), true)
  expect(w.wrote).toEqual([`${ROOT}/CLAUDE.md`])
  expect(w.toasts).toEqual(['Saved in CLAUDE.md: Use pnpm, not npm.'])
  expect(teachGroups(newsFactsOf({ hidden: [], halted: false }, NOW), s => s)).toEqual([])
})

test('/vaken-memory rules save and remove write a project file, so only the person typing them may', SLOW, async ($: EngineInterface, on) => {
  mock.clock(on, { now: NOW })
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('session.root', () => ({ value: ROOT }))
  on('fs.read', () => {
    throw new Error('no such file')
  })
  const say = async (args: string, kind: string): Promise<string> => ((await $.command.run({ ...viaParent('vaken-memory', args), origin: { kind } } as never)) as { text: string }).text
  const offer = { rule: ruleFrom('use pnpm, not npm')!, root: ROOT }
  teachMem.offer = offer
  for (const kind of ['peer', 'channel', 'plugin', 'sdk']) {
    expect(await say('rules save', kind)).toBe(BY_PERSON_ONLY)
    expect(await say('rules remove 1', kind)).toBe(BY_PERSON_ONLY)
  }
  expect(teachMem.offer).toBe(offer)
  expect(await say('rules remove 1', 'composer')).not.toBe(BY_PERSON_ONLY)
  teachMem.offer = undefined
})

