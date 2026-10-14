// Pure tests of the home rules: what counts as "needs you", the one count rule, coarse ages and the text twin.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import type { SessionRecord } from '../hooks/core/record'
import { ACTIVE_FOR_MS, activeFirst, agentActive, sessionActive, PERMISSION_WAIT_MS, ageWord, bandWord, buildView, chipWord, classify, hereLines, hereWord, homeText, foldWords, limitBlocks, limitLines, limitWord, paceShort, moveCard, nameOf, parseMarks, pinnedFirst, setMark, withoutHidden, allOthers, asksYou, needsBandWord, needsCount, parseDetail, parseOrder, CARD_IDS, titleOf, othersCount, othersWord, folderTag } from '../hooks/features/home/logic'

const NOW = Date.parse('2026-10-09T12:00:00Z')
const MIN = 60_000

const rec = (id: string, over: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: id,
  cwd: `/work/${id}`,
  model: 'claude-opus-5',
  state: 'working',
  startedAt: NOW - 20 * MIN,
  updatedAt: NOW - 2000,
  lastEventAt: NOW - 2000,
  stateSince: NOW - 3 * MIN,
  ...over,
})

test('a finished answer is waiting, never needs you', () => {
  expect(classify(rec('a', { state: 'waiting' }), NOW, undefined)).toBe('waiting')
})

test('a question put to you needs you at once', () => {
  expect(classify(rec('a', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 1000 } }), NOW, undefined)).toBe('needs')
})

test('a permission needs you only after it has waited a while', () => {
  const ask = (ms: number) => rec('a', { ask: { kind: 'permission', tool: 'Bash', since: NOW - ms } })
  expect(classify(ask(PERMISSION_WAIT_MS - 1000), NOW, undefined)).toBe('working')
  expect(classify(ask(PERMISSION_WAIT_MS + 1000), NOW, undefined)).toBe('needs')
})

test('working needs an event in the last two minutes, a heartbeat alone does not count', () => {
  expect(classify(rec('a', { lastEventAt: NOW - 3 * MIN, updatedAt: NOW - 1000 }), NOW, undefined)).toBe('idle')
  expect(classify(rec('a', { lastEventAt: NOW - MIN }), NOW, undefined)).toBe('working')
})

test('a dead process and an old record leave the view', () => {
  expect(classify(rec('a', { pid: 4242 }), NOW, new Set([1, 2]))).toBe('gone')
  expect(classify(rec('a', { pid: 4242 }), NOW, new Set([4242]))).toBe('working')
  expect(classify(rec('a', { pid: 4242 }), NOW, undefined)).toBe('working')
  expect(classify(rec('a', { updatedAt: NOW - 11 * MIN }), NOW, undefined)).toBe('gone')
})

test('the session you sit in is never counted among the ones that need you', () => {
  const asking = { kind: 'question' as const, tool: 'AskUserQuestion', since: NOW - 4 * MIN }
  const view = buildView([rec('here', { ask: asking }), rec('s1', { ask: asking }), rec('s2', { state: 'waiting' })], NOW, 'here', undefined)
  expect(view.needs.map(r => r.rec.sessionId)).toEqual(['s1'])
  expect(view.here?.kind).toBe('needs')
  expect(view.waiting.map(r => r.rec.sessionId)).toEqual(['s2'])
  expect(needsBandWord(view)).toBe('◆ 1 needs you')
})

test('needs you is oldest first, and the band says nothing when nothing waits', () => {
  const q = (ms: number) => ({ kind: 'question' as const, tool: 'AskUserQuestion', since: NOW - ms })
  const view = buildView([rec('new', { ask: q(MIN) }), rec('old', { ask: q(9 * MIN) })], NOW, 'x', undefined)
  expect(view.needs.map(r => r.rec.sessionId)).toEqual(['old', 'new'])
  expect(needsBandWord(buildView([rec('s1')], NOW, 'x', undefined))).toBe('')
})

test('ages are coarse, so a still pane does not look different every second', () => {
  expect(ageWord(5000)).toBe('under 1 min')
  expect(ageWord(59_000)).toBe('under 1 min')
  expect(ageWord(4 * MIN + 30_000)).toBe('4 min')
  expect(ageWord(125 * MIN)).toBe('2 h')
})

test('the plan limit comes from the freshest session that reported one', () => {
  const view = buildView([rec('a', { fiveHourPercent: 40, updatedAt: NOW - 50_000 }), rec('b', { fiveHourPercent: 62, updatedAt: NOW - 1000 })], NOW, 'x', undefined)
  expect(view.limit?.percent).toBe(62)
})

test('the text twin has every fact the pane has, each mark with its word', () => {
  const ask = { kind: 'permission' as const, tool: 'Bash', since: NOW - 3 * MIN }
  const text = homeText(buildView([rec('here', { contextPercent: 38, costUsd: 1.2 }), rec('s1', { ask }), rec('s2', { state: 'waiting' }), rec('s3', { state: 'idle', stateSince: NOW - 90 * MIN, lastEventAt: NOW - 90 * MIN })], NOW, 'here', undefined))
  expect(text).toContain('Needs you: 1')
  expect(text).toContain('◆ Needs you: s1 (waits to run Bash, may need OK, waited 3 min)')
  expect(text).toContain('This session: Working, context 38% full, $1.20 so far.')
  expect(text).toContain('○ Your turn: s2')
  expect(text).toContain('· Idle: s3')
  expect(text.split('\n').every(l => / · \/vaken-explain [a-z]+$/.test(l))).toBe(true)
})

test('the session you sit in says why it needs you', () => {
  const ask = { kind: 'permission' as const, tool: 'Write', since: NOW - 20_000 }
  expect(homeText(buildView([rec('here', { ask })], NOW, 'here', undefined))).toContain('This session: Needs you: waits to run Write, may need OK.')
})

test('simple wording shows the figures with the least words, explained says what each figure is', () => {
  const view = buildView([rec('here', { contextPercent: 7, costUsd: 0.15, state: 'waiting', fiveHourPercent: 1, fiveHourResetsAt: '2026-10-09T18:00:00Z' })], NOW, 'here', undefined)
  expect(hereWord(view.here, 'explained')).toBe('Your turn, context 7% full, $0.15 so far')
  expect(hereWord(view.here, 'simple')).toBe('Your turn, 7%, $0.15')
  expect(limitWord({ percent: 1 }, 'explained')).toBe('1% used')
  expect(limitWord({ percent: 1 }, 'simple')).toBe('1%')
  expect(bandWord(view, 'simple')).toMatch(/^5-hour limit 1%, resets /)
  expect(bandWord(view, 'explained')).toMatch(/^5-hour limit 1% used, resets /)
})

test('anything but simple means explained, and the chip says what kind of wait it is', () => {
  expect(parseDetail('simple')).toBe('simple')
  expect(parseDetail(undefined)).toBe('explained')
  expect(parseDetail('x')).toBe('explained')
  expect(chipWord(rec('a', { ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW } }))).toBe('Question')
  expect(chipWord(rec('a', { ask: { kind: 'permission', tool: 'Bash', since: NOW } }))).toBe('OK needed')
})

test('explained puts each fact on its own row, compact puts them on one row with the bar and its percentage', () => {
  const view = buildView([rec('here', { contextPercent: 7, costUsd: 0.15, state: 'waiting', fiveHourPercent: 3, fiveHourResetsAt: '2026-10-09T18:00:00Z' })], NOW, 'here', undefined)
  expect(hereLines(view.here, 'explained')).toEqual({ head: 'Your turn', context: 'Context is 7% full', cost: '$0.15' })
  expect(hereLines(view.here, 'simple')).toEqual({ head: 'Your turn, $0.15', context: '7%' })
  const explained = limitLines(limitBlocks(view), 'explained')
  expect(explained.note).toBe('')
  expect(explained.groups[0][0]).toBe('5-hour limit: 3% used')
  expect(explained.groups[0][1]).toMatch(/^It resets at \d\d:\d\d$/)
  expect(explained.source).toBe('Where it comes from: Claude Code')
  const compact = limitLines(limitBlocks(view), 'simple')
  expect(compact.groups).toEqual([])
  expect(compact.note).toMatch(/^5-hour limit · resets \d\d:\d\d$/)
})

test('a session title is the key words of the first message (core/titles.ts), and a slash command or filler alone gives none', () => {
  expect(titleOf('Fix the login bug on the checkout page, please')).toBe('Fix login bug')
  expect(titleOf('  Add\n a *dark* mode  ')).toBe('Add dark mode')
  expect(titleOf('<system-reminder>\nSome context here\n</system-reminder>\nFix the login bug on the page')).toBe('Fix login bug')
  expect(titleOf('<system-reminder>only context</system-reminder>')).toBeUndefined()
  expect(titleOf('/vaken')).toBeUndefined()
  expect(titleOf('   ')).toBeUndefined()
  expect(titleOf('Okay, great. How about')).toBeUndefined()
  expect(titleOf('Supercalifragilisticexpialidocious-and-then-some-more-letters')?.length).toBeLessThanOrEqual(500)
})

test('a row is named by its title read again (an old stored title shows its key words), else by its folder', () => {
  expect(nameOf({ cwd: '/work/vaken-a1b2', sessionId: 's1', title: 'Fix the login bug' })).toBe('Fix login bug')
  expect(nameOf({ cwd: '/work/vaken-a1b2', sessionId: 's1', title: 'Do these Next, in' })).toBe('vaken-a1b2')
  expect(nameOf({ cwd: '/work/vaken-a1b2', sessionId: 's1' })).toBe('vaken-a1b2')
})

test('a long name is kept whole, and no name falls back to a raw id: branch, then folder', () => {
  const long = 'Rebuild the whole onboarding flow so a new person reaches the first result in one minute'
  expect(nameOf({ cwd: '/work/x', sessionId: 'abcdef123456', title: long })).toBe(long)
  expect(nameOf({ cwd: '/work/vaken-a1b2', sessionId: 'abcdef123456', branch: 'fix/login-bug' })).toBe('fix/login-bug')
  expect(nameOf({ cwd: '/work/vaken-a1b2', sessionId: 'abcdef123456', title: 'Do these Next, in', branch: 'main' })).toBe('main')
  expect(nameOf({ cwd: '/', sessionId: 'abcdef123456' })).not.toContain('abcdef')
})

test('L3: other sessions are your turn first (the longest waiting first), then working, then quiet; the count says what you can act on', () => {
  const view = buildView([
    rec('w1', { state: 'working', lastEventAt: NOW - 1000 }),
    rec('t1', { state: 'waiting', stateSince: NOW - 2 * MIN }),
    rec('t2', { state: 'waiting', stateSince: NOW - 20 * MIN }),
    rec('q1', { state: 'idle' }),
    rec('w2', { state: 'working', lastEventAt: NOW - 1000 }),
  ], NOW, 'x', undefined)
  expect(allOthers(view).map(r => r.rec.sessionId)).toEqual(['t2', 't1', 'w1', 'w2', 'q1'])
  expect(othersCount(view)).toBe('2 your turn · 2 working')
  expect(othersWord(view)).toBe('2 your turn · 2 working · 1 idle')
  expect(othersCount(buildView([rec('q1', { state: 'idle' }), rec('q2', { state: 'idle' })], NOW, 'x', undefined))).toBe('2 idle')
  expect(othersCount(buildView([], NOW, 'x', undefined))).toBe('0')
  expect(othersWord(buildView([], NOW, 'x', undefined))).toBe('No other session is active now.')
  // The text twin lists them in the same order.
  const text = homeText(view)
  expect(text.indexOf('Your turn: t2')).toBeLessThan(text.indexOf('Your turn: t1'))
  expect(text.indexOf('Your turn: t1')).toBeLessThan(text.indexOf('Working: w1'))
  expect(text).toContain('Other sessions: 2 your turn · 2 working · 1 idle')
})

test('a plan figure names its source, and says how old it is once it is stale', () => {
  const fresh = buildView([rec('a', { fiveHourPercent: 40, fiveHourResetsAt: '2026-10-09T15:00:00Z', updatedAt: NOW - MIN })], NOW, 'zzz', undefined)
  expect(limitLines(limitBlocks(fresh), 'explained').source).toBe('Where it comes from: Claude Code')
  expect(limitLines(limitBlocks(fresh), 'simple').note).toMatch(/^5-hour limit · resets \d\d:\d\d$/)
  const old = buildView([rec('a', { fiveHourPercent: 40, fiveHourResetsAt: '2026-10-09T15:00:00Z', updatedAt: NOW - 6 * MIN, stateSince: NOW - 6 * MIN })], NOW, 'zzz', undefined)
  expect(limitLines(limitBlocks(old), 'explained').source).toBe('Last reported 6 min ago')
  expect(limitLines(limitBlocks(old), 'simple').note).toMatch(/· 6 min ago$/)
})

test('a saved card order is kept, a new card goes at the end, and a card moves by whole places and never past the ends', () => {
  // The default order follows the zones; a saved order keeps its places and the cards it does not name follow in the default order.
  const all = [...CARD_IDS]
  const after = (kept: string[]): string[] => [...kept, ...all.filter(id => !kept.includes(id))]
  expect(parseOrder(undefined)).toEqual(all)
  expect(parseOrder('')).toEqual(all)
  expect(parseOrder('nothing,known')).toEqual(all)
  expect(parseOrder(all.join(','))).toEqual(all)
  expect(parseOrder(['others', ...all.filter(id => id !== 'others')].join(','))).toEqual(['others', ...all.filter(id => id !== 'others')])
  // An order kept before newer cards existed keeps its places; the new cards are added at the end.
  expect(parseOrder('agents,others,limit,here,autopilot,proof,guard')).toEqual(after(['agents', 'others', 'limit', 'here', 'autopilot', 'proof', 'guard']))
  expect(parseOrder('agents,others,limit,here,autopilot,proof,guard,computer')).toEqual(after(['agents', 'others', 'limit', 'here', 'autopilot', 'proof', 'guard', 'computer']))
  expect(parseOrder('others,others,here,gone')).toEqual(after(['others', 'here']))
  expect(moveCard(['limit', 'here', 'others', 'autopilot'], 'limit', 1)).toEqual(['here', 'limit', 'others', 'autopilot'])
  expect(moveCard(['limit', 'here', 'others', 'autopilot'], 'limit', 9)).toEqual(['here', 'others', 'autopilot', 'limit'])
  expect(moveCard(['limit', 'here', 'others', 'autopilot'], 'others', -1)).toEqual(['limit', 'others', 'here', 'autopilot'])
  expect(moveCard(['limit', 'here', 'others', 'autopilot'], 'limit', -3)).toEqual(['limit', 'here', 'others', 'autopilot'])
})

test('marks: pinned sessions go first, hidden ones leave the list and are counted, and a session that needs you stays', () => {
  const asking = { kind: 'question' as const, tool: 'AskUserQuestion', since: NOW - 4 * MIN }
  const view = buildView([rec('a', { state: 'working', lastEventAt: NOW - 1000 }), rec('b', { state: 'idle' }), rec('c', { state: 'idle' }), rec('d', { ask: asking })], NOW, 'x', undefined)
  const marks = parseMarks(JSON.stringify({ c: 'pin', b: 'hide', d: 'hide', z: 'nope' }))
  expect(marks).toEqual({ c: 'pin', b: 'hide', d: 'hide' })
  const { view: shown, hiddenCount } = withoutHidden(view, marks)
  expect(shown.needs.map(r => r.rec.sessionId)).toEqual(['d'])
  expect(hiddenCount).toBe(1)
  expect(pinnedFirst(allOthers(shown), marks).map(r => r.rec.sessionId)).toEqual(['c', 'a'])
  expect(parseMarks('not json')).toEqual({})
  expect(parseMarks('[1]')).toEqual({})
})

test('marks: one session changes, showing it again clears its mark, and the marks of gone sessions are dropped', () => {
  const marks = { a: 'pin', gone: 'hide' } as const
  expect(setMark(marks, 'b', 'hide', ['a', 'b'])).toEqual({ a: 'pin', b: 'hide' })
  expect(setMark({ a: 'pin', b: 'hide' }, 'a', 'show', ['a', 'b'])).toEqual({ b: 'hide' })
})

test('Short shows the plan note, the state with its cost and the context figure; an old stored Minimal reads as Short', () => {
  const view = buildView([rec('here', { contextPercent: 38, costUsd: 1.2, fiveHourPercent: 62, fiveHourResetsAt: '2026-10-09T18:00:00Z' })], NOW, 'here', undefined)
  expect(parseDetail('simple')).toBe('simple')
  expect(parseDetail('minimal')).toBe('simple')
  expect(parseDetail('loud')).toBe('explained')
  expect(limitLines(limitBlocks(view), 'simple').note).toMatch(/^5-hour limit · resets \d\d:\d\d/)
  expect(hereLines(view.here, 'simple').head).toBe('Working, $1.20')
  expect(hereLines(view.here, 'simple').context).toBe('38%')
  expect(bandWord(view, 'simple')).toMatch(/^5-hour limit 62%, resets/)
})

test('the plan card knows the session window, the week and a spend limit, each from its freshest session', () => {
  const view = buildView(
    [
      rec('a', { fiveHourPercent: 40, sevenDayPercent: 10, sevenDayResetsAt: '2026-10-12T12:00:00Z', updatedAt: NOW - 50_000 }),
      rec('b', { fiveHourPercent: 62, spendPercent: 5, updatedAt: NOW - 1000 }),
    ],
    NOW,
    'x',
    undefined,
  )
  expect(view.limit?.percent).toBe(62)
  expect(view.week?.percent).toBe(10)
  expect(view.spend?.percent).toBe(5)
  const blocks = limitBlocks(view)
  expect(blocks.map(b => b.short)).toEqual(['5-hour limit', 'Week', 'Spend'])
  expect(blocks[1].reset).toMatch(/^resets (Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d\d:\d\d$/)
  const explained = limitLines(blocks, 'explained')
  expect(explained.groups.map(g => g[0])).toEqual(['5-hour limit: 62% used', 'Weekly limit: 10% used'])
  expect(explained.folded?.map(b => b.short)).toEqual(['Spend'])
  expect(limitLines(blocks, 'simple')).toEqual({ note: '', groups: [], source: '' })
  expect(homeText(view)).toContain('Weekly limit: 10% used')
  expect(bandWord(view, 'simple')).toMatch(/ · week 10% · spend 5%$/)
})

test('with no limit reported the card says so', () => {
  expect(limitBlocks(buildView([rec('a')], NOW, 'x', undefined))).toEqual([])
  expect(homeText(buildView([rec('a')], NOW, 'x', undefined))).toContain('Plan limits: not reported yet.')
})

test('a limit keeps its reset time when the freshest session did not store one', () => {
  const view = buildView([rec('new', { sevenDayPercent: 20, updatedAt: NOW - 1000 }), rec('old', { sevenDayPercent: 18, sevenDayResetsAt: '2026-10-12T12:00:00Z', updatedAt: NOW - 90_000 })], NOW, 'x', undefined)
  expect(view.week).toMatchObject({ percent: 20, resetsAt: '2026-10-12T12:00:00Z' })
})

test('with the app usage card the plan card lists every window, with its pace and where it came from', () => {
  const usage = {
    at: NOW - 30_000,
    plan: 'Max',
    windows: [
      { label: '5-hour limit', percent: 60, resetsAt: new Date(NOW + 2.5 * 3_600_000).toISOString() },
      { label: 'Weekly · all models', percent: 25, resetsAt: new Date(NOW + 5 * 24 * 3_600_000).toISOString() },
      { label: 'Weekly · Fable', percent: 4, resetsAt: new Date(NOW + 5 * 24 * 3_600_000).toISOString() },
    ],
    extra: { enabled: false },
  }
  const view = buildView([rec('a', { fiveHourPercent: 1 })], NOW, 'x', undefined, usage, {})
  const blocks = limitBlocks(view)
  expect(blocks.map(b => b.short)).toEqual(['5-hour limit', 'Week', 'Fable'])
  expect(blocks.map(b => b.label)).toEqual(['5-hour limit', 'Weekly limit · all models', 'Weekly limit · Fable'])
  const explained = limitLines(blocks, 'explained', view)
  expect(explained.groups[0]).toContain('5-hour limit: 60% used')
  expect(explained.groups[0].some(l => /^Estimate: it runs out /.test(l))).toBe(true)
  expect(explained.groups[1][0]).toBe('Weekly limit · all models: 25% used')
  expect(explained.folded?.map(b => b.short)).toEqual(['Fable'])
  expect(foldWords(explained.folded ?? [])).toMatch(/^Under half used: Fable 4% used/)
  expect(explained.groups[2]).toEqual(['Plan', 'Subscription: Max', 'Extra usage: Off'])
  expect(explained.source).toBe('')
  expect(limitLines(blocks, 'simple', view).note).toBe('Max')
  expect(paceShort(blocks[0], NOW)).toMatch(/^out /)
  expect(homeText(view)).toContain('Weekly limit · Fable: 4% used')
})

test('an old reading from the app is not trusted; the card falls back to what the session reports', () => {
  const usage = { at: NOW - 11 * 60_000, windows: [{ label: '5-hour limit', percent: 60 }] }
  const view = buildView([rec('a', { fiveHourPercent: 33 })], NOW, 'x', undefined, usage, {})
  expect(limitBlocks(view).map(b => b.percent)).toEqual([33])
})

test('the recent pace is named and an estimate is always called one', () => {
  const usage = { at: NOW, windows: [{ label: '5-hour limit', percent: 40, resetsAt: new Date(NOW + 3 * 3_600_000).toISOString() }] }
  const hist = { '5-hour limit': [[NOW - 60 * 60_000, 20]] as [number, number][] }
  const lines = limitLines(limitBlocks(buildView([], NOW, 'x', undefined, usage, hist)), 'explained', buildView([], NOW, 'x', undefined, usage, hist)).groups[0]
  expect(lines.some(l => /^Estimate: /.test(l))).toBe(true)
  expect(lines.some(l => /^Recent pace: 20% an hour/.test(l))).toBe(true)
})

test('one rule for "asks you": a question at once, a permission after the wait, nothing else', () => {
  const ask = (kind: 'question' | 'permission', ms: number) => rec('a', { ask: { kind, tool: 'Bash', since: NOW - ms } })
  expect(asksYou(ask('question', 1000), NOW)).toBe(true)
  expect(asksYou(ask('permission', 1000), NOW)).toBe(false)
  expect(asksYou(ask('permission', PERMISSION_WAIT_MS + 1000), NOW)).toBe(true)
  expect(asksYou(rec('a'), NOW)).toBe(false)
})

test('the band, the pane count and the text twin give the same number', () => {
  const q = { kind: 'question' as const, tool: 'AskUserQuestion', since: NOW - 4 * MIN }
  const view = buildView([rec('here', { ask: q }), rec('s1', { ask: q }), rec('s2', { ask: q })], NOW, 'here', undefined)
  expect(needsCount(view)).toBe(2)
  expect(needsBandWord(view)).toBe('◆ 2 needs you')
  expect(homeText(view)).toContain('Needs you: 2')
})

test('a folder tag keeps the whole name when short, and loses leading words, never half a word', () => {
  expect(folderTag('/work/my-website-app')).toBe('my-website-app')
  expect(folderTag('/work/ai-marketing-team')).toBe('marketing-team')
  expect(folderTag('/work/app')).toBe('app')
  expect(folderTag('/work/averyveryverylongfoldername')).toHaveLength(14)
  expect(folderTag('')).toBe('')
})

test('two sessions with the same title and the same folder still read differently', () => {
  const app = { at: NOW, sessions: [{ id: 'local_s1', title: 'Vaken', cwd: '/work/same', isRunning: true }, { id: 'local_s2', title: 'Vaken', cwd: '/work/same', isRunning: true }] }
  const view = buildView([rec('s1', { cwd: '/work/same' }), rec('s2', { cwd: '/work/same' })], NOW, 'none', undefined, undefined, undefined, app)
  const names = view.working.map(r => r.name)
  expect(new Set(names).size).toBe(2)
})

test('active first: active rows show, older ones hide behind one row, and Show fewer folds them again', () => {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ n, on: n <= 2 }))
  expect(activeFirst(rows, r => r.on, false, 5)).toEqual({ shown: rows.slice(0, 2), hidden: 7, label: 'Show 7 more' })
  const busy = rows.map(r => ({ ...r, on: r.n <= 7 }))
  expect(activeFirst(busy, r => r.on, false, 5)).toMatchObject({ hidden: 4, label: 'Show 4 more' })
  expect(activeFirst(rows, r => r.on, true, 5)).toMatchObject({ hidden: 0, label: 'Show fewer' })
  expect(activeFirst(rows.slice(0, 2), r => r.on, false, 5)).toEqual({ shown: rows.slice(0, 2), hidden: 0 })
  expect(activeFirst(rows.slice(0, 2), r => r.on, true, 5).label).toBeUndefined()
  expect(activeFirst(rows, r => r.on, false, 5, true)).toEqual({ shown: rows, hidden: 0 })
  expect(activeFirst(rows, r => r.on, true, 5, true)).toEqual({ shown: rows, hidden: 0 })
  const now = 1_000_000_000
  expect(agentActive({ state: 'running', startedAt: 0 }, now)).toBe(true)
  expect(agentActive({ state: 'done', startedAt: 0, endedAt: now - ACTIVE_FOR_MS + 1 }, now)).toBe(true)
  expect(agentActive({ state: 'done', startedAt: 0, endedAt: now - ACTIVE_FOR_MS }, now)).toBe(false)
  expect(sessionActive({ kind: 'idle', sinceMs: ACTIVE_FOR_MS }, false)).toBe(false)
  expect(sessionActive({ kind: 'idle', sinceMs: ACTIVE_FOR_MS }, true)).toBe(true)
  expect(sessionActive({ kind: 'waiting', sinceMs: 9 * ACTIVE_FOR_MS }, false)).toBe(true)
})
