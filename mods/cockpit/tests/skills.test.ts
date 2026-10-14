// The Skills card's engine: the counts and the hooks that write them.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { SKILLS_COUNTS_KEY, SKILLS_FLUSH_MS, SKILLS_LISTING_KEY, SKILLS_NAMES_MAX, UNUSED_SHOWN, FIND_DESC_MAX, addSkillCounts, cleanName, commandEntries, findCommands, findDescription, findRight, findWords, holdsCounts, listingFrom, noteSkill, parseListing, skillsCostLine, skillsText, skillsWhat, startSkillCommand, topSkills, unusedSkills, windowStart } from '../hooks/core/skills'
import type { SkillCounts } from '../hooks/core/skills'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'
import { byEnglish, englishOf } from '../hooks/i18n/table'

const NOW = Date.parse('2026-10-10T12:00:00')

test('a name is kept short, without a slash or control characters', () => {
  expect(cleanName('/grilling')).toBe('grilling')
  expect(cleanName('  code-review\n')).toBe('code-review')
  expect(cleanName('x'.repeat(100))?.length).toBe(64)
  expect(cleanName('')).toBeUndefined()
  expect(cleanName(7)).toBeUndefined()
})

test('counts per day add up; days older than 7 drop out when written', () => {
  const old = { '2026-10-02': { grilling: 9 }, '2026-10-04': { grilling: 2, review: 1 }, '2026-10-09': { grilling: 1 } }
  const next = addSkillCounts(old, { '2026-10-10': { grilling: 2, plan: 1 } }, NOW)
  expect(Object.keys(next).sort()).toEqual(['2026-10-04', '2026-10-09', '2026-10-10'])
  expect(windowStart(NOW)).toBe('2026-10-04')
  expect(topSkills(next, NOW, 5)).toEqual([
    { name: 'grilling', count: 5 },
    { name: 'plan', count: 1 },
    { name: 'review', count: 1 },
  ])
  expect(topSkills(old, NOW, 5)).toEqual([
    { name: 'grilling', count: 3 },
    { name: 'review', count: 1 },
  ])
  expect(topSkills(old, NOW, 1)).toEqual([{ name: 'grilling', count: 3 }])
})

test('the stored value stays small: at most 200 different names, the least used go', () => {
  const day: Record<string, number> = {}
  for (let n = 0; n < 260; n += 1) day[`skill-${String(n).padStart(3, '0')}`] = n < 5 ? 50 : 1
  const out = addSkillCounts({}, { '2026-10-10': day }, NOW)
  const names = Object.keys(out['2026-10-10'] ?? {})
  expect(names.length).toBe(SKILLS_NAMES_MAX)
  expect(names).toContain('skill-000')
  expect(JSON.stringify(out).length).toBeLessThan(10_000)
  expect(addSkillCounts('nonsense', {}, NOW)).toEqual({})
  expect(addSkillCounts({ 'not-a-day': { a: 1 }, '2026-10-10': { a: -3, b: 'x', c: 2.9 } }, {}, NOW)).toEqual({ '2026-10-10': { c: 2 } })
})

test('waiting counts: a name counts once per use, the pending list is bounded', () => {
  const p: SkillCounts = {}
  expect(noteSkill(p, 'grilling', NOW)).toBe(true)
  expect(noteSkill(p, '/grilling', NOW)).toBe(true)
  expect(noteSkill(p, '', NOW)).toBe(false)
  expect(p['2026-10-10']).toEqual({ grilling: 2 })
  for (let n = 0; n < 400; n += 1) noteSkill(p, `s${n}`, NOW)
  expect(Object.keys(p['2026-10-10'] ?? {}).length).toBe(SKILLS_NAMES_MAX)
  expect(holdsCounts({ '2026-10-10': { grilling: 3 } }, { '2026-10-10': { grilling: 2 } })).toBe(true)
  expect(holdsCounts({ '2026-10-10': { grilling: 1 } }, { '2026-10-10': { grilling: 2 } })).toBe(false)
  expect(holdsCounts(undefined, { '2026-10-10': { grilling: 1 } })).toBe(false)
})

// What the engine's ContextSkills holds: built-in skills are listed too.
const skills = {
  totalSkills: 5,
  includedSkills: 5,
  tokens: 2100,
  skillFrontmatter: [
    { name: 'grilling', source: 'plugin', pluginName: 'p', tokens: 400 },
    { name: 'code-review', source: 'userSettings', tokens: 500 },
    { name: 'unused-one', source: 'plugin', tokens: 600 },
    { name: 'unused-two', source: 'syncedSkills', tokens: 400 },
    { name: 'init', source: 'built-in', tokens: 200 },
  ],
}
const counts = { '2026-10-09': { grilling: 4, 'code-review': 3 }, '2026-10-10': { grilling: 2 } }

test('the skill list: built-in skills are not offered as unused, the cost line says how many are listed and not used', () => {
  const l = listingFrom(skills, NOW)
  expect(l).toEqual({ at: NOW, total: 5, included: 5, tokens: 2100, names: ['grilling', 'code-review', 'unused-one', 'unused-two'] })
  expect(unusedSkills(l, counts, NOW)).toEqual(['unused-one', 'unused-two'])
  expect(skillsCostLine(l, counts, NOW)).toBe('5 skills listed, 2.1k tokens; 2 of 4 not used this week; counted for 2 days')
  expect(skillsCostLine(l, { '2026-10-10': { grilling: 1, 'code-review': 1, 'unused-one': 1, 'unused-two': 1 } }, NOW)).toBe('5 skills listed, 2.1k tokens; all used this week; counted for 1 day')
  expect(skillsCostLine(listingFrom({ ...skills, totalSkills: 34, includedSkills: 28 }, NOW), {}, NOW)).toBe('34 skills, 28 fit the list, 2.1k tokens; 4 of 4 not used this week')
  expect(skillsCostLine(undefined, counts, NOW)).toBeUndefined()
  expect(unusedSkills(undefined, counts, NOW)).toEqual([])
  // Something the engine did not send: no listing, never a guess.
  expect(listingFrom(undefined, NOW)).toBeUndefined()
  expect(listingFrom({ tokens: 3 }, NOW)).toBeUndefined()
  expect(parseListing(JSON.parse(JSON.stringify(l)))).toEqual(l)
  expect(parseListing('x')).toBeUndefined()
})

test('a press starts a skill by its command name; a name that is no command gives nothing', () => {
  expect(startSkillCommand('grilling')).toBe('grilling')
  expect(startSkillCommand('/code-review')).toBe('code-review')
  expect(startSkillCommand('plugin:skill')).toBe('plugin:skill')
  expect(startSkillCommand('two words')).toBeUndefined()
  expect(startSkillCommand('')).toBeUndefined()
})

test('the three looks: full rows by use, short line, text twin', () => {
  const listing = listingFrom(skills, NOW)
  const v = skillsWhat({ counts, listing, now: NOW })
  expect(v.short).toBe('Top: grilling 6, code review 3')
  expect(v.lines).toEqual(['grilling: 6 times', 'code review: 3 times', '5 skills listed, 2.1k tokens; 2 of 4 not used this week; counted for 2 days'])
  const g = v.groups ?? []
  expect(g.map(x => x.head)).toEqual(['Used this week', 'Skill list', 'Not used this week'])
  expect(g[0]?.rows.map(r => [r.title, r.right, r.command])).toEqual([
    ['grilling', '6 times', 'grilling'],
    ['code review', '3 times', 'code-review'],
  ])
  expect(g[2]?.rows.map(r => r.title)).toEqual(['unused one', 'unused two'])
  expect(skillsWhat({ counts: {}, now: NOW }).short).toBe('No skill used yet this week.')
  expect(skillsWhat({ counts: {}, listing, now: NOW }).short).toBe('5 skills listed, 2.1k tokens; 4 of 4 not used this week')
  expect(skillsWhat({ counts: {}, now: NOW }).groups).toEqual([])
  expect(skillsText({ counts, listing, now: NOW })).toEqual(['Skills used in the last 7 days:', '  grilling: 6 times', '  code-review: 3 times', '', '5 skills listed, 2.1k tokens; 2 of 4 not used this week; counted for 2 days', 'Not used this week:', '  unused-one, unused-two'])
  expect(skillsText({ counts: {}, now: NOW })[0]).toBe('No skill was used in the last 7 days.')
})

test('a long unused list shows the first few and says how many more', () => {
  const many = { totalSkills: 30, includedSkills: 30, tokens: 5000, skillFrontmatter: Array.from({ length: 30 }, (_, n) => ({ name: `s${String(n).padStart(2, '0')}`, source: 'plugin', tokens: 100 })) }
  const g = skillsWhat({ counts: {}, listing: listingFrom(many, NOW), now: NOW }).groups ?? []
  const rows = g.find(x => x.head === 'Not used this week')?.rows ?? []
  expect(rows.length).toBe(UNUSED_SHOWN + 1)
  expect(rows.at(-1)?.title).toBe(`and ${30 - UNUSED_SHOWN} more`)
})

test('every string the card passes to the translator has a Swedish line, and a line keeps its placeholders', () => {
  const asked = new Set<string>()
  const t = (s: string): string => {
    asked.add(s)
    return s
  }
  const many = { totalSkills: 34, includedSkills: 28, tokens: 2100, skillFrontmatter: Array.from({ length: 12 }, (_, n) => ({ name: `s${n}`, source: 'plugin', tokens: 1 })) }
  const huge = { totalSkills: 302, includedSkills: 302, tokens: 9900, skillFrontmatter: Array.from({ length: SKILLS_NAMES_MAX + 10 }, (_, n) => ({ name: `h${n}`, source: 'plugin', tokens: 1 })) }
  expect(skillsCostLine(listingFrom(huge, NOW), counts, NOW)).toBe(`302 skills listed, 9.9k tokens; ${SKILLS_NAMES_MAX} of the first ${SKILLS_NAMES_MAX} not used this week; counted for 2 days`)
  for (const f of [
    { counts, listing: listingFrom(skills, NOW), now: NOW },
    { counts: { '2026-10-10': { one: 1 } }, listing: listingFrom({ ...skills, totalSkills: 1, includedSkills: 1 }, NOW), now: NOW },
    { counts: {}, listing: listingFrom(many, NOW), now: NOW },
    { counts: {}, listing: listingFrom(huge, NOW), now: NOW },
    { counts: {}, now: NOW },
    { counts: { '2026-10-10': Object.fromEntries(skills.skillFrontmatter.map(s => [s.name, 1])) }, listing: listingFrom(skills, NOW), now: NOW },
  ]) skillsWhat(f, t)
  const missing = [...asked].filter(s => (byEnglish('sv', 'skills')[s] ?? '') === '')
  expect(missing).toEqual([])
  const spare = englishOf('skills').filter(s => !asked.has(s))
  expect(spare).toEqual([])
  for (const [en, sv] of Object.entries(byEnglish('sv', 'skills'))) for (const ph of en.match(/\{[a-z]\}/g) ?? []) expect(sv).toContain(ph)
})

function memStore(on: On): { mem: Map<string, unknown>; reads: string[]; writes: string[] } {
  const mem = new Map<string, unknown>()
  const reads: string[] = []
  const writes: string[] = []
  on('store.get', (_$, e) => {
    reads.push(e.key)
    return { value: mem.get(e.key) } as never
  })
  on('store.set', (_$, e) => {
    writes.push(e.key)
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return { mem, reads, writes }
}

// `usage` is what the engine says about the context (change it between calls).
function engine(on: On, usage: { breakdown?: unknown }): void {
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.usage', () => usageOf(usage.breakdown))
  on('skill.prompt', () => ({ text: 'the skill' }))
  on('tool.call', () => ({ result: { text: 'ok' } }) as never)
  on('turn.complete', (_$, e) => ({ text: e.answer }) as never)
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }) as never)
}
const usageOf = (breakdown: unknown) => ({ value: { startedAt: NOW - 1000, context: { window: 1_000_000, ...(breakdown === undefined ? {} : { breakdown }) }, rateLimits: [] } }) as never

test('a skill use is counted; the write waits up to a minute; the end of a turn and of the session write the rest', SLOW, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  const { mem, writes } = memStore(on)
  engine(on, { breakdown: { skills } })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  expect((mem.get(SKILLS_LISTING_KEY) as { total: number }).total).toBe(5)
  const before = writes.filter(k => k === SKILLS_COUNTS_KEY).length

  await $.skill.prompt({ skill: 'grilling', text: 'long prompt text that must never be kept' })
  expect(mem.get(SKILLS_COUNTS_KEY)).toEqual({ '2026-10-10': { grilling: 1 } })
  await clock.advance(5_000)
  await $.skill.prompt({ skill: 'grilling', text: 'x' })
  await $.skill.prompt({ skill: 'code-review', text: 'x' })
  expect(writes.filter(k => k === SKILLS_COUNTS_KEY).length - before).toBe(1)
  expect(mem.get(SKILLS_COUNTS_KEY)).toEqual({ '2026-10-10': { grilling: 1 } })
  await $.turn.complete({ answer: 'Done.', durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  expect(mem.get(SKILLS_COUNTS_KEY)).toEqual({ '2026-10-10': { grilling: 2, 'code-review': 1 } })
  await clock.advance(SKILLS_FLUSH_MS + 1)
  await $.skill.prompt({ skill: 'plan', text: 'x' })
  expect((mem.get(SKILLS_COUNTS_KEY) as Record<string, Record<string, number>>)['2026-10-10']?.plan).toBe(1)
  await $.skill.prompt({ skill: 'plan', text: 'x' })
  await $.session.end({ sessionId: 'test-session' } as never).catch(() => undefined)
  expect((mem.get(SKILLS_COUNTS_KEY) as Record<string, Record<string, number>>)['2026-10-10']?.plan).toBe(2)
  expect(JSON.stringify([...mem.values()])).not.toMatch(/long prompt text/)
})

test('a tool step that is not a skill touches neither skills key', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const { reads, writes } = memStore(on)
  engine(on, {})
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  reads.length = 0
  writes.length = 0
  for (let n = 0; n < 5; n += 1) await $.tool.call({ tool: 'Read', file_path: `/work/app/a${n}.ts` } as never)
  expect([...reads, ...writes].filter(k => k.startsWith('cockpit:skills:'))).toEqual([])
})

test('/vaken-help run skills prints the week and the cost; with no skill list from the engine it prints only the counts', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const { mem } = memStore(on)
  const usage: { breakdown?: unknown } = {}
  engine(on, usage)
  mem.set(SKILLS_COUNTS_KEY, counts)
  const out = (await $.command.run(viaParent('vaken-skills', ''))) as { text: string }
  expect(out.text).toMatch(/grilling: 6 times/)
  expect(out.text).toMatch(/could not be read, so the cost is not shown/)
  expect(mem.has(SKILLS_LISTING_KEY)).toBe(false)
  usage.breakdown = { skills }
  const again = (await $.command.run(viaParent('vaken-skills', ''))) as { text: string }
  expect(again.text).toMatch(/5 skills listed, 2\.1k tokens; 2 of 4 not used this week/)
  expect(again.text).toMatch(/unused-one, unused-two/)
})

test('a write drops the days older than 7 from the stored value', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  const { mem } = memStore(on)
  engine(on, {})
  mem.set(SKILLS_COUNTS_KEY, { '2026-10-02': { old: 5 }, '2026-10-09': { recent: 2 } })
  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true } as never)
  await $.skill.prompt({ skill: 'fresh', text: 'x' })
  const stored = mem.get(SKILLS_COUNTS_KEY) as Record<string, unknown>
  expect(Object.keys(stored).sort()).toEqual(['2026-10-09', '2026-10-10'])
})

const list = commandEntries([
  { name: 'grilling', description: 'Grill the user about a plan', source: 'plugin', plugin: 'a' },
  { name: 'code-review', description: 'Review the current diff for bugs', source: 'plugin' },
  { name: 'review-plan', description: 'Check a plan before building', source: 'plugin' },
  { name: 'compact', description: 'Shorten the session', source: 'builtin' },
  { name: 'plan', description: 'Plan mode: think before you grill the code', source: 'builtin' },
  { name: 'grilling', description: 'a second one with the same name', source: 'user' },
  { name: 'bad name', description: 'cannot be started', source: 'user' },
  { name: '', description: 'no name', source: 'user' },
  { description: 'not even a name' },
  'nonsense',
])
const used = { '2026-10-10': { 'code-review': 3, compact: 1 } }
const names = (q: string, c: unknown = used): string[] => findCommands(list, q, c, NOW).map(f => f.name)

test('the command list is cleaned: a name that can be started, once, one line of description', () => {
  expect(list.map(c => c.name)).toEqual(['grilling', 'code-review', 'review-plan', 'compact', 'plan'])
  expect(list[0]?.description).toBe('Grill the user about a plan')
  expect(commandEntries('nope')).toEqual([])
  expect(commandEntries([{ name: '/review', description: ' two\nlines\t here ' }])).toEqual([{ name: 'review', description: 'two lines here' }])
  expect(commandEntries(Array.from({ length: 3000 }, (_, n) => ({ name: `c${n}`, description: '' }))).length).toBe(1500)
})

test('every typed word must match the name or the description, in any case; a slash is ignored', () => {
  expect(findWords('  /Gril  Plan ')).toEqual(['gril', 'plan'])
  expect(findWords('/ //')).toEqual([])
  expect(names('GRILL')).toEqual(['grilling', 'plan'])
  expect(names('/grill plan')).toEqual(['grilling', 'plan'])
  expect(names('review bugs')).toEqual(['code-review'])
  expect(names('nothing like this')).toEqual([])
  expect(names('')).toEqual([])
  expect(names('   /  ')).toEqual([])
  expect(findCommands(undefined, 'grill', used, NOW)).toEqual([])
})

test('the order: most used this week, then name matches before description matches, then A to Z', () => {
  expect(names('review')).toEqual(['code-review', 'review-plan'])
  expect(names('plan', {})).toEqual(['plan', 'review-plan', 'grilling'])
  expect(names('plan', { '2026-10-10': { grilling: 2 } })).toEqual(['grilling', 'plan', 'review-plan'])
  expect(names('plan', { '2026-10-01': { grilling: 9 } })).toEqual(['plan', 'review-plan', 'grilling'])
  expect(findCommands(list, 'review', used, NOW).map(f => f.count)).toEqual([3, 0])
})

test('the words of a match: a cut description and the figure at the right', () => {
  expect(findDescription('short')).toBe('short')
  const cut = findDescription('x'.repeat(200))
  expect(cut.length).toBe(FIND_DESC_MAX)
  expect(cut.endsWith('…')).toBe(true)
  expect(findRight(0)).toBe('Start')
  expect(findRight(1)).toBe('1 time · Start')
  expect(findRight(6)).toBe('6 times · Start')
  expect(findRight(6, s => (s === 'Start' ? 'Starta' : s === '{n} times' ? '{n} gånger' : s))).toBe('6 gånger · Starta')
})

test('the search lines have a Swedish line', () => {
  for (const key of ['Find a skill or command', 'Find', 'No skill or command matches.', 'The commands could not be read.']) expect(byEnglish('sv', 'find')[key] ?? '').not.toBe('')
})
