// The typed ship steps: /cockpit-ship check, fix yes, merge yes yes.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { stoppedWhat } from '../hooks/core/ship'
import { LEDGER_KEY } from '../hooks/features/compaction'
import { VIEW_STRINGS } from '../hooks/core/lang'
import { parsePrView } from '../hooks/core/crewpr'
import { SHIP_ERR_CHARS, decideMerge, mergeArgv, mergeReasons, mergeScript, parseShipStep } from '../hooks/core/shipsteps'
import { reasonOf, shipStepText } from '../hooks/features/shipsteps'
import { flags } from '../hooks/features/home/state'
import type { Io } from '../hooks/core/io'
import { byEnglish, englishOf } from '../hooks/i18n/table'
const SV = byEnglish('sv')

const NOW = Date.parse('2026-10-11T12:00:00Z')
const en = (s: string): string => s
const sv = (s: string): string => SV[s] ?? s
const ENV = { home: '/home/test', cwd: '/work/app', root: '/work/app' }

type Check = { name: string; status: string; conclusion?: string }
const ok = (name: string): Check => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS' })
const bad = (name: string): Check => ({ name, status: 'COMPLETED', conclusion: 'FAILURE' })
const wait = (name: string): Check => ({ name, status: 'IN_PROGRESS' })
const SHA = '0123456789abcdef0123456789abcdef01234567'
const pr = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'https://example.test/pr/12', mergeStateStatus: 'CLEAN', headRefOid: SHA, statusCheckRollup: [ok('build'), ok('test')], ...over })

function fake(view: string | 'none' | 'fail', mergeExit = 0, checksOut = '', mergeErr = 'GraphQL: not mergeable') {
  const mem = new Map<string, unknown>()
  const ran: string[][] = []
  const res = (exitCode: number, stdout: string, stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false })
  const io: Io = {
    now: async () => NOW,
    home: async () => '/home/test',
    sessionId: async () => 'me',
    get: async k => mem.get(k),
    set: async (k, v) => void mem.set(k, v),
    del: async k => void mem.delete(k),
    keys: async () => [...mem.keys()],
    read: async () => '',
    write: async () => undefined,
    run: (async (argv: string[]) => {
      ran.push(argv)
      if (argv[1] === 'pr' && argv[2] === 'view') return view === 'none' ? res(1, '', 'no pull requests found for branch') : view === 'fail' ? res(1, '', 'boom') : res(0, view)
      if (argv[1] === 'pr' && argv[2] === 'merge') return mergeExit === 0 ? res(0, 'merged') : res(1, '', mergeErr)
      if (argv[1] === 'pr' && argv[2] === 'checks') return res(1, checksOut)
      return res(0, '')
    }) as Io['run'],
    ask: async () => '',
    complete: (async () => ({})) as unknown as Io['complete'],
    toast: () => undefined,
    invalidate: () => undefined,
  }
  const told: string[] = []
  const deps = { tell: (n: string) => (told.push(n), true), shipLine: async () => 'Ship it: not yet.', byPerson: true }
  const merges = (): string[][] => ran.filter(a => a[1] === 'pr' && a[2] === 'merge')
  const ledger = (): { what: string; did?: boolean; how?: string }[] => (mem.get(LEDGER_KEY) as { what: string; did?: boolean; how?: string }[] | undefined) ?? []
  return { io, ran, told, deps, merges, ledger, mem }
}

const view = (json: string) => parsePrView(JSON.parse(json))!

test('forgiving input: short words, no spaces, Swedish yes; a yes alone is not understood', () => {
  expect(parseShipStep('')).toEqual({ kind: 'verdict' })
  expect(parseShipStep('ship')).toEqual({ kind: 'verdict' })
  expect(parseShipStep('check')).toEqual({ kind: 'step', step: 'check', level: 0 })
  expect(parseShipStep('Check ')).toEqual({ kind: 'step', step: 'check', level: 0 })
  expect(parseShipStep('fix')).toEqual({ kind: 'step', step: 'fix', level: 0 })
  expect(parseShipStep('fix yes')).toEqual({ kind: 'step', step: 'fix', level: 1 })
  expect(parseShipStep('merge')).toEqual({ kind: 'step', step: 'merge', level: 0 })
  expect(parseShipStep('merge yes')).toEqual({ kind: 'step', step: 'merge', level: 1 })
  expect(parseShipStep('merge yes yes')).toEqual({ kind: 'step', step: 'merge', level: 2 })
  expect(parseShipStep('merge ja ja')).toEqual({ kind: 'step', step: 'merge', level: 2 })
  expect(parseShipStep('mergeyesyes')).toEqual({ kind: 'step', step: 'merge', level: 2 })
  expect(parseShipStep('merge 12 yes yes')).toEqual({ kind: 'step', step: 'merge', level: 2, n: 12 })
  expect(parseShipStep('yes yes')).toEqual({ kind: 'bad' })
  expect(parseShipStep('yes')).toEqual({ kind: 'bad' })
  expect(parseShipStep('merge fix')).toEqual({ kind: 'bad' })
  expect(parseShipStep('merge now')).toEqual({ kind: 'bad' })
  expect(parseShipStep('merge 1 2')).toEqual({ kind: 'bad' })
})

test('verdicts: green and clean may merge; every blocker refuses, whatever the yes', () => {
  const green = view(pr())
  expect(mergeReasons(green, en)).toEqual([])
  expect(decideMerge(green, 0).kind).toBe('show')
  expect(decideMerge(green, 1).kind).toBe('one')
  expect(decideMerge(green, 2).kind).toBe('run')
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ['a failing check', { statusCheckRollup: [ok('a'), bad('b')] }, /1 checks failed/],
    ['a check that has not finished', { statusCheckRollup: [ok('a'), wait('b')] }, /1 checks have not finished/],
    ['no checks at all', { statusCheckRollup: [] }, /No checks have run/],
    ['a draft', { isDraft: true }, /draft/],
    ['a conflict', { mergeable: 'CONFLICTING' }, /conflict/],
    ['behind the base', { mergeStateStatus: 'BEHIND' }, /behind/],
    ['a review that is required', { reviewDecision: 'REVIEW_REQUIRED' }, /review blocks/],
    ['changes requested', { reviewDecision: 'CHANGES_REQUESTED' }, /review blocks/],
    ['GitHub says blocked', { mergeStateStatus: 'BLOCKED' }, /something blocks/],
    ['mergeable not known yet', { mergeable: 'UNKNOWN' }, /not said yet/],
    ['already merged', { state: 'MERGED' }, /already merged/],
    ['closed', { state: 'CLOSED' }, /closed/],
  ]
  for (const [label, over, re] of cases) {
    const v = view(pr(over))
    for (const level of [0, 1, 2] as const) {
      const d = decideMerge(v, level)
      expect(d.kind, `${label} at level ${level}`).toBe('refused')
      expect(d.kind === 'refused' ? d.reasons.join(' ') : '', label).toMatch(re)
    }
  }
  expect(mergeScript(12, SHA)).toBe(`gh pr merge 12 --squash --match-head-commit ${SHA}`)
  expect(mergeArgv(12, SHA)).toEqual(['gh', 'pr', 'merge', '12', '--squash', '--match-head-commit', SHA])
})

test('the commit that was checked is the one merged: a missing or malformed commit id refuses, whatever the yes', async () => {
  for (const head of [undefined, '', 'abc1234', `${SHA}0`, SHA.toUpperCase(), `${SHA.slice(0, 39)}g`, ` ${SHA.slice(1)}`]) {
    const v = view(pr({ headRefOid: head }))
    for (const level of [0, 1, 2] as const) {
      const d = decideMerge(v, level)
      expect(d.kind, `${String(head)} at level ${level}`).toBe('refused')
      expect(d.kind === 'refused' ? d.reasons : [], String(head)).toEqual(['GitHub did not name the commit to merge.'])
    }
    const f = fake(pr({ headRefOid: head }))
    expect(await shipStepText(f.io, ENV, 'merge yes yes', f.deps)).toMatch(/^Not merged\. It is not ready:\n  - GitHub did not name the commit to merge\.$/)
    expect(f.merges()).toEqual([])
  }
})

test('check shows the checks, whether it could merge and what to type next; it runs nothing but gh pr view, and leaves a ledger line', async () => {
  const f = fake(pr({ statusCheckRollup: [ok('build'), bad('test')] }))
  const text = (await shipStepText(f.io, ENV, 'check', f.deps)) as string
  expect(text).toContain('Ship it: not yet.')
  expect(text).toContain('PR 12 is open.')
  expect(text).toContain('Merge: not yet.')
  expect(text).toContain('1 checks failed.')
  expect(text).toContain('/vaken-ship fix yes')
  expect(text).toContain('Last commit: 0123456.')
  expect(f.ran.map(a => a.slice(0, 3).join(' '))).toEqual(['gh pr view'])
  expect(f.ledger()).toHaveLength(1)
  expect(f.ledger()[0]).toMatchObject({ what: 'Checked the pull request from a typed command', how: 'typed', did: false })
  const g = fake(pr())
  expect(await shipStepText(g.io, ENV, 'check', g.deps)).toContain('/vaken-ship merge yes yes')
  const w = fake(pr({ statusCheckRollup: [ok('a'), wait('b')] }))
  expect(await shipStepText(w.io, ENV, 'check', w.deps)).toContain('check again in a few minutes')
})

test('no pull request, gh failing and a bad word each answer in words and change nothing', async () => {
  const none = fake('none')
  expect(await shipStepText(none.io, ENV, 'check', none.deps)).toMatch(/no pull request/)
  const fail = fake('fail')
  expect(await shipStepText(fail.io, ENV, 'merge yes yes', fail.deps)).toMatch(/Could not ask GitHub/)
  const bad2 = fake(pr())
  expect(await shipStepText(bad2.io, ENV, 'yes yes', bad2.deps)).toMatch(/Type \/vaken-ship check/)
  expect(bad2.ran).toEqual([])
  expect(none.merges()).toEqual([])
  expect(fail.merges()).toEqual([])
  expect(await shipStepText(bad2.io, ENV, '', bad2.deps)).toBeUndefined()
})

test('fix without a yes only names the failing checks and tells Claude nothing', async () => {
  const f = fake(pr({ statusCheckRollup: [ok('build'), bad('test')] }))
  const text = (await shipStepText(f.io, ENV, 'fix', f.deps)) as string
  expect(text).toContain('Failing: test.')
  expect(text).toContain('Nothing is sent before that.')
  expect(f.told).toEqual([])
  expect(f.ledger()).toEqual([])
  const g = fake(pr())
  expect(await shipStepText(g.io, ENV, 'fix', g.deps)).toBe('No check has failed. Nothing to fix.')
})

test('fix yes puts a fix request for the failing check in the prompt box and leaves a ledger line; with no failing check nothing is sent', async () => {
  const f = fake(pr(), 0, 'test\tfail\t1m\thttps://example.test/actions/runs/77\t\nbuild\tpass\t1m\thttps://example.test/actions/runs/78\t')
  const text = (await shipStepText(f.io, ENV, 'fix yes', f.deps)) as string
  expect(text).toContain('Made a fix request for the failing check.')
  expect(text).toContain('The request is in the prompt box. Press Enter to send it.')
  expect(f.told).toHaveLength(1)
  expect(f.told[0]).toMatch(/test/)
  expect(f.ledger()[0]).toMatchObject({ what: 'Made a fix request for a failing check', did: true, how: 'typed' })
  const g = fake(pr(), 0, 'build\tpass\t1m\thttps://example.test/actions/runs/78\t')
  expect(await shipStepText(g.io, ENV, 'fix yes', g.deps)).toMatch(/no check failed/i)
  expect(g.told).toEqual([])
})

test('Halt is on: fix yes and merge yes yes do nothing and say so; check and looking still work', async () => {
  const f = fake(pr(), 0, 'test\tfail\t1m\thttps://example.test/actions/runs/77\t')
  f.mem.set('cockpit:halt:me', { at: 1 })
  expect(await shipStepText(f.io, ENV, 'fix yes', f.deps)).toBe('Pause is on. Nothing ran. Resume with /vaken-pause off first.')
  expect(await shipStepText(f.io, ENV, 'merge yes yes', f.deps)).toBe('Pause is on. Nothing ran. Resume with /vaken-pause off first.')
  expect(f.told).toEqual([])
  expect(f.merges()).toEqual([])
  expect(await shipStepText(f.io, ENV, 'fix', f.deps)).not.toMatch(/Halt is on/)
  expect(await shipStepText(f.io, ENV, 'check', f.deps)).not.toMatch(/Halt is on/)
})

test('no run without the typed yes: merge and merge yes run nothing; only the second yes merges', async () => {
  const f = fake(pr())
  expect(await shipStepText(f.io, ENV, 'merge', f.deps)).toBe('Pull request 12 (commit 0123456) is green and nothing blocks it. Nothing ran. To merge it, type /vaken-ship merge yes yes.')
  expect(await shipStepText(f.io, ENV, 'merge yes', f.deps)).toBe('One more yes needed. Nothing ran. Type /vaken-ship merge yes yes to merge pull request 12 at commit 0123456.')
  expect(f.merges()).toEqual([])
  expect(f.ledger().some(e => e.did === true)).toBe(false)
  const done = (await shipStepText(f.io, ENV, 'merge yes yes', f.deps)) as string
  expect(done).toBe('Merged pull request 12.')
  expect(f.merges()).toEqual([['gh', 'pr', 'merge', '12', '--squash', '--match-head-commit', SHA]])
})

test('a merge the person did not type here runs nothing; showing what would merge stays open', async () => {
  const f = fake(pr())
  const away = { ...f.deps, byPerson: false }
  expect(await shipStepText(f.io, ENV, 'merge yes yes', away)).toBe('This step needs you to type it in this session.')
  expect(await shipStepText(f.io, ENV, 'merge', away)).toMatch(/is green and nothing blocks it\. Nothing ran\./)
  expect(await shipStepText(f.io, ENV, 'check', away)).toContain('/vaken-ship merge yes yes')
  expect(f.merges()).toEqual([])
  expect(f.ledger().some(e => e.did === true)).toBe(false)
})

test('a commit pushed after the check: GitHub refuses, and it is told as not merged with the reason, masked and cut', async () => {
  const token = `ghp_${'a'.repeat(36)}`
  const err = `GraphQL: Head branch was modified. ${token} Review and try the merge again. (mergePullRequest) ${'x'.repeat(200)}\nsecond line`
  const f = fake(pr(), 1, '', err)
  const text = (await shipStepText(f.io, ENV, 'merge yes yes', f.deps)) as string
  expect(text.startsWith('GitHub did not merge pull request 12: GraphQL: Head branch was modified.')).toBe(true)
  expect(text).not.toContain(token)
  expect(text).toContain('[hidden]')
  expect(text).not.toContain('second line')
  expect(text.length).toBeLessThanOrEqual('GitHub did not merge pull request 12: '.length + SHIP_ERR_CHARS + 20)
  expect(f.merges()).toEqual([['gh', 'pr', 'merge', '12', '--squash', '--match-head-commit', SHA]])
  expect(f.ledger()[0]).toMatchObject({ what: 'Did not merge a pull request', did: false })
  expect(f.ledger().some(e => e.did === true)).toBe(false)
})

test('a token that straddles the cut is fully masked: masked first, then cut', async () => {
  const token = `ghp_${'b'.repeat(40)}`
  const lead = `${'y'.repeat(SHIP_ERR_CHARS - 21)} `
  const why = reasonOf(`${lead}${token} after`)
  expect(why.length).toBeLessThanOrEqual(SHIP_ERR_CHARS)
  expect(why).not.toContain('ghp_')
  expect(why).not.toContain('bbbb')
  expect(why.startsWith(lead)).toBe(true)
  const f = fake(pr(), 1, '', `${lead}${token} after`)
  const text = (await shipStepText(f.io, ENV, 'merge yes yes', f.deps)) as string
  expect(text).not.toContain('ghp_')
})

test('a merge is a ledger line: the typed words, did true', async () => {
  const f = fake(pr())
  await shipStepText(f.io, ENV, 'merge yes yes', f.deps)
  const line = f.ledger().find(e => e.what === 'Merged a pull request from a typed command')
  expect(line).toMatchObject({ did: true, how: 'typed' })
})

test('not green refuses the merge, even with two yes, runs nothing and says why', async () => {
  for (const over of [{ statusCheckRollup: [ok('a'), bad('b')] }, { statusCheckRollup: [ok('a'), wait('b')] }, { reviewDecision: 'REVIEW_REQUIRED' }, { isDraft: true }]) {
    const f = fake(pr(over))
    const text = (await shipStepText(f.io, ENV, 'merge yes yes', f.deps)) as string
    expect(text).toMatch(/^Not merged\. It is not ready:\n  - /)
    expect(f.merges()).toEqual([])
    expect(f.ledger()[0]).toMatchObject({ what: 'Did not merge a pull request', did: false })
  }
})

test('the judge comes first: a number that is not the branch pull request does not run; GitHub saying no is told plainly', async () => {
  const f = fake(pr())
  expect(await shipStepText(f.io, ENV, 'merge 99 yes yes', f.deps)).toContain('is 12, not the number you typed')
  expect(f.merges()).toEqual([])
  const g = fake(pr(), 1)
  const text = (await shipStepText(g.io, ENV, 'merge yes yes', g.deps)) as string
  expect(text).toBe('GitHub did not merge pull request 12: GraphQL: not mergeable')
  expect(g.ledger()[0]).toMatchObject({ what: 'Did not merge a pull request', did: false })
})

test('the ledger words of a refused merge are not read as a stopped step by the Ship verdict', () => {
  expect(stoppedWhat('Did not merge a pull request')).toBe(false)
  expect(stoppedWhat('Merged a pull request from a typed command')).toBe(false)
})

test('every fixed line of the ship steps has a Swedish twin, is in the language list, and the Swedish keeps its slots', async () => {
  for (const k of englishOf('shipstep')) {
    expect(VIEW_STRINGS, k).toContain(k)
    expect(SV[k], k).toBe(byEnglish('sv', 'shipstep')[k])
    for (const slot of k.match(/\{[a-z]+\}/g) ?? []) expect(byEnglish('sv', 'shipstep')[k], k).toContain(slot)
  }
  flags.macLang = 'sv'
  const f = fake(pr({ statusCheckRollup: [ok('a'), bad('b')] }))
  const text = (await shipStepText(f.io, ENV, 'merge yes yes', f.deps)) as string
  flags.macLang = 'en'
  expect(text).toBe('Inte ihopslagen. Den är inte redo:\n  - 1 kontroller misslyckades.')
  expect(sv('Merge: ready.')).toBe('Ihopslagning: redo.')
})
