// Continuity: the checked brief, the packet, the story, resume, find, the timeline and the standup.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { CONTINUITY_SETTINGS, PACKET_PATH, briefClaims, firstSteps, looksPrivate, parseBranch, parseGitStatus, relativeTo, renderBrief, renderPacket, storyLines } from '../hooks/core/continuity'
import type { BriefFacts } from '../hooks/core/continuity'
import { SNIPPET_MAX, jsonArrayIn, lastWork, matchWords, parseCount, parseHits, resumeText, snippetLine, standupLines, timelineText } from '../hooks/core/continuity2'
import { emptyState, recordEdit, recordReceipts } from '../hooks/core/proof'
import type { ProofState } from '../hooks/core/proof'
import { emptyState2 } from '../hooks/core/proof2'
import { parseSessions } from '../hooks/core/appsessions'
import { posix } from './fspath'
import { viaParent } from './viaparent'
import { memSafeFs, mockSafeFs } from './safefs'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T14:00:00')

function proofState(): ProofState {
  let s = emptyState()
  s = recordEdit(s, '/w/p/a.ts')
  s = recordEdit(s, '/w/p/b.ts')
  s = recordReceipts(s, [{ kind: 'types', ok: true, exit: 0 }, { kind: 'tests', ok: false, exit: 1 }], NOW - 5 * MIN)
  return { ...s, turns: 2, done: ['tests', 'types'], goal: { text: 'Fix the login bug.', setAt: NOW - 60 * MIN, how: 'typed' } }
}

const facts = (over: Partial<BriefFacts> = {}): BriefFacts => ({
  now: NOW,
  cwd: '/w/p',
  proof: proofState(),
  edited: ['a.ts', 'b.ts'],
  gitBranch: 'fix-login',
  gitFiles: [{ code: 'changed', path: 'a.ts' }, { code: 'new', path: 'c.ts' }],
  ...over,
})

const lineOf = (lines: string[], start: string): string => lines.find(l => l.startsWith(start)) ?? ''

test('git output is read into files and a branch; a private-looking name is flagged', () => {
  expect(parseGitStatus(' M src/a.ts\n?? new file.ts\nR  old.ts -> new.ts\n D gone.ts\nA  added.ts\n')).toEqual([
    { code: 'changed', path: 'src/a.ts' },
    { code: 'new', path: 'new file.ts' },
    { code: 'renamed', path: 'new.ts' },
    { code: 'deleted', path: 'gone.ts' },
    { code: 'added', path: 'added.ts' },
  ])
  expect(parseGitStatus('')).toEqual([])
  expect(parseBranch('fix-login\n')).toBe('fix-login')
  expect(parseBranch('HEAD\n')).toBe('detached HEAD (no branch)')
  expect(parseBranch('')).toBeUndefined()
  expect(looksPrivate('.env.local')).toBe(true)
  expect(looksPrivate('config/secrets.json')).toBe(true)
  expect(looksPrivate('src/a.ts')).toBe(false)
  expect(relativeTo('/w/p', '/w/p/src/a.ts')).toBe('src/a.ts')
  expect(relativeTo('/w/p', '/other/x.ts')).toBe('/other/x.ts')
})

test('every claim says verified or unverified: git and receipts verify, the goal and Claude\'s own list do not', () => {
  const claims = briefClaims(facts({ proof: { ...proofState(), todo: { done: 2, total: 5 } } }))
  const by = (topic: string) => claims.find(c => c.topic === topic)!
  expect(by('Goal')).toMatchObject({ ok: false, text: 'Fix the login bug' })
  expect(by('Branch')).toMatchObject({ ok: true, src: 'git', text: 'fix-login' })
  expect(by('Files changed')).toMatchObject({ ok: true, src: 'git' })
  expect(by('Files changed').lines).toEqual(['a.ts (changed)', 'c.ts (new)', "Edited here but not in git's list (committed or changed back): b.ts"])
  expect(by('Checks')).toMatchObject({ ok: true, src: 'receipts' })
  expect(by('Checks').lines).toContain('tests: failed (exit 1), 13:55')
  expect(by('Checks').lines).toContain('types: passed after the last edit, 13:55')
  expect(by('Checks').lines).toContain('not run: build, lint')
  expect(by('Definition of done')).toMatchObject({ ok: true, text: 'Not met yet.' })
  expect(by("Claude's task list")).toMatchObject({ ok: false, text: '2 of 5 done.' })
})

test('the file claim is checked against git: files edited here that git does not show, and a git that did not answer', () => {
  const gone = briefClaims(facts({ edited: ['a.ts', 'b.ts'], gitFiles: [{ code: 'changed', path: 'a.ts' }] })).find(c => c.topic === 'Files changed')!
  expect(gone.lines).toContain("Edited here but not in git's list (committed or changed back): b.ts")
  const clean = briefClaims(facts({ gitFiles: [] })).find(c => c.topic === 'Files changed')!
  expect(clean.text).toMatch(/no change that is not committed.*committed or changed back/)
  const blind = briefClaims({ ...facts(), gitFiles: undefined, gitBranch: undefined, recordBranch: 'old-name' })
  expect(blind.find(c => c.topic === 'Files changed')).toMatchObject({ ok: false, src: 'git not read' })
  expect(blind.find(c => c.topic === 'Branch')).toMatchObject({ ok: false, text: 'old-name' })
  const moved = briefClaims(facts({ recordBranch: 'older' })).find(c => c.topic === 'Branch')!
  expect(moved.lines[0]).toMatch(/older earlier. Git says fix-login now/)
})

test('a private-looking file is counted, not named', () => {
  const c = briefClaims(facts({ gitFiles: [{ code: 'new', path: '.env' }, { code: 'changed', path: 'a.ts' }], edited: ['a.ts'] })).find(x => x.topic === 'Files changed')!
  expect(c.lines.join('\n')).not.toMatch(/\.env/)
  expect(c.lines).toContain('1 file not named: the name looks private')
})

test('claims without proof are listed as unverified; an open question and a PR are verified facts', () => {
  const s = { ...proofState(), last: { at: NOW, seconds: 5, edits: 2, files: 2, ran: [], claims: ['tests' as const], unproven: [{ kind: 'tests' as const, why: 'failed' as const }], notChecked: [], doneSet: [], } }
  const claims = briefClaims(facts({ proof: s, askingSince: NOW - 10 * MIN, pr: { number: 12, state: 'OPEN', isDraft: false, url: 'https://example.com/pr/12', at: NOW - MIN } }))
  const unproven = claims.find(c => c.topic === 'Claims in the last answer')!
  expect(unproven).toMatchObject({ ok: false })
  expect(unproven.lines[0]).toBe('Said tests pass: the last run failed.')
  expect(claims.find(c => c.topic === 'Open questions')!.text).toMatch(/13:50.*still open/)
  expect(claims.find(c => c.topic === 'Pull request')).toMatchObject({ ok: true, text: '#12, open', lines: ['https://example.com/pr/12'] })
})

test('the first steps come from the facts', () => {
  const steps = firstSteps(facts({ askingSince: NOW }))
  expect(steps[0]).toMatch(/git status/)
  expect(steps).toContain('Answer the open question first.')
  expect(steps.join(' ')).toMatch(/have not passed since the last edit: tests\./)
  expect(firstSteps({ ...facts(), gitFiles: undefined })[0]).toMatch(/Git did not answer/)
})

test('the brief is plain text with a mark on every line, and no command or output text', () => {
  const text = renderBrief(facts()).join('\n')
  expect(text).toMatch(/^Handoff note for the next session/)
  expect(text).toMatch(/Goal \[unverified: your words, not checked\]: Fix the login bug/)
  expect(text).toMatch(/Branch \[verified: git\]: fix-login/)
  expect(text).toMatch(/First steps:\n {2}1\. Run git status/)
  for (const l of text.split('\n').filter(x => /^[A-Z][^:]* \[/.test(x))) expect(l).toMatch(/\[(verified|unverified): /)
})

test('a secret typed into the goal is hidden', () => {
  const s = { ...proofState(), goal: { text: 'Deploy with token=abcdef123456 now.', setAt: NOW, how: 'typed' as const } }
  const text = renderBrief(facts({ proof: s })).join('\n')
  expect(text).not.toMatch(/abcdef123456/)
})

test('the packet starts with a plain line saying what it is, and holds the same marks', () => {
  const text = renderPacket(facts(), 'p')
  expect(text.split('\n')[0]).toMatch(/^This file was written by vaken.*no other conversation text and no secrets\.$/)
  expect(text).toMatch(/Project folder: p/)
  expect(text).toMatch(/Work counted: 2 edits in 2 files, 2 finished answers, 2 check runs\./)
  expect(text).toMatch(/- \*\*Branch\*\* \(verified: git\): fix-login/)
  expect(text).toMatch(/The last session ran these kinds of check: tests, the type check/)
  expect(PACKET_PATH).toBe('.claude/cockpit-packet.md')
})

test('the story is five plain sentences built from counts', () => {
  const lines = storyLines({ proof: proofState(), anomalies: 1, unproven: 2 })
  expect(lines.length).toBe(5)
  expect(lines[0]).toBe('The goal: Fix the login bug.')
  expect(lines[1]).toBe('Claude changed 2 files in 2 edits over 2 finished answers, and ran 2 checks (tests, the type check).')
  expect(lines[2]).toBe('What went wrong: tests failed once, 1 warning about odd behaviour, 2 claims with no proof.')
  expect(lines[3]).toBe('Where it stands: tests failed; the type check passed.')
  expect(lines[4]).toBe('Next: make tests pass, as the definition of done asks.')
  const fresh = storyLines({ proof: emptyState(), anomalies: 0, unproven: 0 })
  expect(fresh).toEqual(['The goal was not set for this session.', 'So far Claude has not changed a file or run a check.', 'Vaken saw nothing fail.', 'It stands at the start: no work is counted yet.', 'Next: nothing waits that vaken can see.'])
})

const sessions = parseSessions(
  JSON.stringify([
    { sessionId: 'local_a', title: 'Fix login bug', cwd: '/w/alpha', branch: 'fix-login', isRunning: false, lastActivityAt: '2026-10-10T10:00:00', link: 'claude://claude.ai/epitaxy/local_a' },
    { sessionId: 'local_b', title: 'Write docs', cwd: '/w/beta-login', isRunning: true, lastActivityAt: '2026-10-10T13:50:00' },
    { sessionId: 'local_c', title: 'Other', cwd: '/w/gamma', isRunning: false, lastActivityAt: '2026-10-09T09:00:00' },
  ]),
  NOW,
)!.sessions

test('resume matches every word in the title, folder or branch, newest first, and says how to open it', () => {
  expect(matchWords(sessions, 'login').map(s => s.id)).toEqual(['local_b', 'local_a'])
  expect(matchWords(sessions, 'login bug').map(s => s.id)).toEqual(['local_a'])
  expect(matchWords(sessions, 'nothing')).toEqual([])
  const text = resumeText('login', matchWords(sessions, 'login'), NOW, "the app's session list")
  expect(text).toMatch(/2 sessions match "login"/)
  expect(text).toMatch(/Last activity: 10 min ago.*it is running now/)
  expect(text).toMatch(/Open: claude:\/\/claude\.ai\/epitaxy\/local_a/)
  expect(text).toMatch(/Open: no link is available/)
  expect(text).toMatch(/A mod cannot switch sessions/)
  expect(resumeText('zzz', [], NOW, 'x')).toMatch(/No session found for "zzz"/)
})

test('search answers are read with the sentence before the list; one line per match is cut to 120 characters and hides secrets', () => {
  const answer = 'Snippets are verbatim excerpts.\n\n[\n  {"sessionId":"local_a","title":"Fix login bug","cwd":"/w/alpha","isArchived":false,"lastActivityAt":"2026-10-10T10:00:00","snippet":"the login bug token=abcdef123456 appears"}\n]'
  expect(jsonArrayIn(answer)?.length).toBe(1)
  const hits = parseHits(answer)!
  expect(hits[0]).toMatchObject({ id: 'local_a', title: 'Fix login bug', archived: false })
  expect(parseHits('No matching sessions found.')).toEqual([])
  expect(parseHits('something else')).toBeUndefined()
  const line = snippetLine(hits[0].snippet)
  expect(line).not.toMatch(/abcdef123456/)
  const long = snippetLine('word '.repeat(60))
  expect(long.length).toBeLessThanOrEqual(SNIPPET_MAX)
  expect(long.endsWith('…')).toBe(true)
})

test('the timeline puts the kept events in order, leaves out read-only commands, and takes a count', () => {
  const p = proofState()
  const f = {
    proof: p,
    proof2: { ...emptyState2(), changes: [{ turn: 0, at: NOW - 30 * MIN, files: 2, lines: 14, code: 2, tests: false, risk: [], receipt: 'missing' as const, names: ['a.ts', 'b.ts'] }] },
    cmds: [
      { at: NOW - 20 * MIN, kind: 'read' as const, label: 'ls', status: 'ok' as const },
      { at: NOW - 10 * MIN, kind: 'test' as const, label: 'npm test', status: 'failed' as const, exit: 1 },
    ],
    ledger: [{ at: NOW - 4 * MIN, what: 'Wrote a session packet', detail: 'p, 30 lines', did: true }],
  }
  const text = timelineText(f, 30, NOW)
  const rows = text.split('\n')
  expect(rows[0]).toMatch(/6 events/)
  const order = ['Goal set by you', 'Edited 2 files (14 lines) in one answer: a.ts, b.ts', 'Command (test), failed (exit 1): npm test', 'Check: the type check passed', 'Check: tests failed (exit 1)', 'Vaken: Wrote a session packet']
  let at = -1
  for (const part of order) {
    const found = rows.findIndex(r => r.includes(part))
    expect(found).toBeGreaterThan(at)
    at = found
  }
  expect(text).toMatch(/1 read-only command left out/)
  expect(timelineText(f, 2, NOW)).toMatch(/the last 2 shown/)
  expect(parseCount('')).toBe(30)
  expect(parseCount('5')).toBe(5)
  expect(parseCount('9999')).toBe(200)
  expect(parseCount('abc')).toBeUndefined()
  expect(parseCount('0')).toBeUndefined()
  expect(timelineText({ proof: emptyState(), proof2: emptyState2(), cmds: [], ledger: [] }, 5, NOW)).toMatch(/Nothing to show yet/)
})

test('the standup is five lines at most: the day, up to three sessions, then what waits and what it cost', () => {
  const s = (name: string, files: number, extra: Partial<{ debt: number; asking: boolean; goal: string }> = {}) => ({ name, files, edits: files, debt: 0, asking: false, ...extra })
  const three = standupLines({ now: NOW, sessions: [s('One', 3, { goal: 'Fix the login bug.' }), s('Two', 1), s('Three', 2, { debt: 1 })], cockpitActions: 4, costUsd: 4.2, costSessions: 3 })
  expect(three.length).toBe(5)
  expect(three[0]).toBe('Sat 10 Oct: 3 sessions had work, 6 files changed, vaken acted 4 times.')
  expect(three[1]).toBe('- One: Fix the login bug (3 files changed)')
  expect(three[3]).toBe('- Two: no goal set (1 file changed)')
  expect(three[4]).toBe('Waiting: finished work to look at in Three. Cost: about $4.20 in 3 sessions, as vaken counted it.')
  const many = standupLines({ now: NOW, sessions: [s('A', 5), s('B', 4), s('C', 3), s('D', 2), s('E', 1, { asking: true })], cockpitActions: 0, costSessions: 0 })
  expect(many.length).toBe(5)
  expect(many[3]).toBe('- and 3 more: C, D, E')
  expect(many[4]).toBe('Waiting: 1 open question (E). Cost: not counted today.')
})

test('a session had work today when a receipt, the goal or a turn carries a time from today', () => {
  expect(lastWork(emptyState(), undefined)).toBe(0)
  expect(lastWork(proofState(), undefined)).toBe(NOW - 5 * MIN)
})

test('the settings row: key, group and default', () => {
  const row = CONTINUITY_SETTINGS[0]
  expect(row).toMatchObject({ key: 'brief.mode', group: 'Notes for the next session', default: 'on' })
})

// ---- The commands, as the engine runs them ----

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
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
  return mem
}

type Calls = { mcp: Array<{ tool: string; args: Record<string, unknown> }>; writes: Array<{ path: string; text: string }> }

// The engine below the plugin: a clock, a store, ids, git, the app's session tools and the file system.
function engine(on: On, tools: Record<string, string> = {}, links: Map<string, string | undefined> = new Map()): { mem: Map<string, unknown>; calls: Calls } {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  const calls: Calls = { mcp: [], writes: [] }
  mockSafeFs(on, memSafeFs(() => calls.writes.map(w => posix(w.path)), links))
  on('session.id', () => ({ value: 'test-session' }))
  on('session.cwd', () => ({ value: '/w/p' }) as never)
  on('process.run', (_$, e) => {
    const argv = e.argv.join(' ')
    const stdout = argv.includes('rev-parse') ? 'fix-login\n' : ' M a.ts\n?? c.ts\n'
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('mcp.call', (_$, e) => {
    calls.mcp.push({ tool: e.tool, args: e.args })
    const text = tools[e.tool]
    return { value: text === undefined ? { content: [{ type: 'text', text: 'tool failed' }], isError: true } : { content: [{ type: 'text', text }] } } as never
  })
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('fs.write', (_$, e) => {
    calls.writes.push({ path: e.path, text: e.text })
    return { value: undefined } as never
  })
  on('ui.toast', () => ({ value: undefined }) as never)
  return { mem, calls }
}

const seedSession = (mem: Map<string, unknown>) => {
  mem.set('cockpit:proof:test-session', proofState())
  mem.set('cockpit:proof2:test-session', { ...emptyState2(), files: { '/w/p/a.ts': { n: 1, lines: 3, turns: [0], test: false, code: true, risk: [], turnN: 0 }, '/w/p/b.ts': { n: 1, lines: 3, turns: [0], test: false, code: true, risk: [], turnN: 0 } } })
}

test('/vaken-help run brief checks the claims against git and the receipts', async ($, on) => {
  const { mem } = engine(on)
  seedSession(mem)
  const r = (await $.command.run(viaParent('vaken-brief', ''))) as { text: string }
  expect(r.text).toMatch(/Branch \[verified: git\]: fix-login/)
  expect(r.text).toMatch(/Git shows 2 files changed and not committed. Proof counted 2 files edited/)
  expect(r.text).toMatch(/Edited here but not in git's list \(committed or changed back\): b\.ts/)
  expect(r.text).toMatch(/Goal \[unverified/)
})

test('Handoff notes off: every command says so in one line', async ($, on) => {
  const { mem } = engine(on)
  mem.set('cockpit:setting:brief.mode', 'off')
  for (const command of ['vaken-brief', 'vaken-story', 'vaken-timeline', 'vaken-find']) {
    const r = (await $.command.run(viaParent(command, 'login'))) as { text: string }
    expect(r.text).toBe('Handoff notes are off. Turn them on: Settings > Prompts and memory.')
  }
})

test('/vaken-help run story and /vaken-resume timeline read the state of this session', async ($, on) => {
  const { mem } = engine(on)
  seedSession(mem)
  mem.set('cockpit:guard:commands:test-session', [{ at: NOW - 3 * MIN, kind: 'test', label: 'npm test', status: 'failed', exit: 1 }])
  mem.set('cockpit:ledger:compact', [{ at: NOW - MIN, session: 'test-session', what: 'Spotted odd behaviour', did: true }, { at: NOW - MIN, session: 'other', what: 'Spotted odd behaviour', did: true }])
  const story = (await $.command.run(viaParent('vaken-story', ''))) as { text: string }
  expect(story.text.split('\n').length).toBe(5)
  expect(story.text).toMatch(/1 warning about odd behaviour/)
  const timeline = (await $.command.run(viaParent('vaken-timeline', '3'))) as { text: string }
  expect(timeline.text).toMatch(/the last 3 shown/)
  expect(timeline.text).toMatch(/Command \(test\), failed \(exit 1\): npm · test/)
  expect((await $.command.run(viaParent('vaken-timeline', 'abc'))) as { text: string }).toEqual({ text: 'Type a number: /vaken-resume timeline 20 shows the last 20 events.' })
})

const listAnswer = JSON.stringify([
  { sessionId: 'local_a', title: 'Fix login bug', cwd: '/w/alpha', branch: 'fix-login', isRunning: false, lastActivityAt: '2026-10-10T10:00:00', link: 'claude://claude.ai/epitaxy/local_a' },
  { sessionId: 'local_c', title: 'Other', cwd: '/w/gamma', isRunning: false, lastActivityAt: '2026-10-09T09:00:00' },
])

test('/vaken-resume finds a session by words and prints its link; nothing is stored', async ($, on) => {
  const { mem, calls } = engine(on, { list_sessions: listAnswer })
  const r = (await $.command.run(viaParent('vaken-resume', 'login'))) as { text: string }
  expect(r.text).toMatch(/1 session matches "login"/)
  expect(r.text).toMatch(/Open: claude:\/\/claude\.ai\/epitaxy\/local_a/)
  expect(calls.mcp.map(c => c.tool)).toEqual(['list_sessions'])
  expect([...mem.keys()].some(k => k.includes('sessions'))).toBe(false)
})

test('/vaken-resume says so when the app\'s list cannot be read', async ($, on) => {
  engine(on, {})
  const r = (await $.command.run(viaParent('vaken-resume', 'login'))) as { text: string }
  expect(r.text).toMatch(/session list did not answer/)
})

test('/vaken-resume find prints matches with a short line and the link, keeps nothing, and says when the tool is not available', async ($, on) => {
  const search = `Snippets are quoted data.\n\n${JSON.stringify([{ sessionId: 'local_a', title: 'Fix login bug', cwd: '/w/alpha', isArchived: false, lastActivityAt: '2026-10-10T10:00:00', snippet: 'the login   bug\nwas in the form' }])}`
  const { mem, calls } = engine(on, { search_session_transcripts: search, list_sessions: listAnswer })
  const r = (await $.command.run(viaParent('vaken-find', 'login'))) as { text: string }
  expect(r.text).toMatch(/1 session mentions "login"/)
  expect(r.text).toMatch(/\n {3}the login bug was in the form\n/)
  expect(r.text).toMatch(/Open: claude:\/\/claude\.ai\/epitaxy\/local_a/)
  expect(calls.mcp[0]).toEqual({ tool: 'search_session_transcripts', args: { query: 'login', limit: 8 } })
  expect(JSON.stringify([...mem.entries()])).not.toMatch(/was in the form/)
  const short = (await $.command.run(viaParent('vaken-find', 'a'))) as { text: string }
  expect(short.text).toMatch(/at least 2 characters/)
})

test('/vaken-resume find with no search tool says so', async ($, on) => {
  engine(on, {})
  const r = (await $.command.run(viaParent('vaken-find', 'login'))) as { text: string }
  expect(r.text).toMatch(/search tool did not answer, so there is nothing to show/)
})

test('/vaken-today standup lists the sessions that had work today with the cost vaken counted', async ($, on) => {
  const { mem } = engine(on, { list_sessions: listAnswer })
  seedSession(mem)
  mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/w/p', model: 'm', state: 'idle', startedAt: NOW - 120 * MIN, updatedAt: NOW, lastEventAt: NOW - 5 * MIN, stateSince: NOW })
  mem.set('cockpit:cost:day:2026-10-10:test-session', { base: 0, usd: 3.5 })
  const r = (await $.command.run(viaParent('vaken-standup', ''))) as { text: string }
  expect(r.text).toMatch(/Sat 10 Oct: 1 session had work, 2 files changed/)
  expect(r.text).toMatch(/- p: Fix the login bug \(2 files changed\)/)
  expect(r.text).toMatch(/Cost: about \$3\.50 in 1 session/)
})

test('/vaken-help run packet without an answer to the question writes nothing', async ($, on) => {
  const { mem, calls } = engine(on)
  seedSession(mem)
  const r = (await $.command.run(viaParent('vaken-packet', ''))) as { text: string }
  expect(r.text).toMatch(/^Nothing was written/)
  expect(calls.writes).toEqual([])
})

function answerWith(on: On, choice: string, asked: string[]): void {
  on('tool.call', { tool: 'AskUserQuestion' }, (_$, e) => {
    const q = (e as unknown as { questions: Array<{ question: string }> }).questions[0].question
    asked.push(q)
    return { result: { questions: [], answers: { [q]: choice } }, text: choice } as never
  })
}

test('/vaken-help run packet asks for the path, then writes one file with the first line saying what it is, and one ledger line', async ($, on) => {
  const { mem, calls } = engine(on)
  seedSession(mem)
  const asked: string[] = []
  answerWith(on, 'Write it', asked)
  const r = (await $.command.run(viaParent('vaken-packet', ''))) as { text: string }
  expect(asked).toEqual(['Write the session packet to /w/p/.claude/cockpit-packet.md?'])
  expect(calls.writes.length).toBe(1)
  expect(posix(calls.writes[0].path)).toBe('/w/p/.claude/cockpit-packet.md')
  expect(calls.writes[0].text.split('\n')[0]).toMatch(/^This file was written by vaken/)
  expect(calls.writes[0].text).toMatch(/Branch\*\* \(verified: git\): fix-login/)
  expect(r.text).toMatch(/^Wrote \/w\/p\/\.claude\/cockpit-packet\.md/)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; did: boolean }>
  expect(ledger.map(l => l.what)).toEqual(['Wrote a session packet'])
  expect(ledger[0].did).toBe(true)
})

test('/vaken-help run packet never follows a link: a link at the packet that leads outside the project is refused, nothing is asked and nothing is written', async ($, on) => {
  const { calls } = engine(on, {}, new Map([['/w/p/.claude/cockpit-packet.md', '/etc/outside.md']]))
  const asked: string[] = []
  answerWith(on, 'Write it', asked)
  const r = (await $.command.run(viaParent('vaken-packet', ''))) as { text: string }
  expect(r.text).toBe('Nothing was written: /w/p/.claude/cockpit-packet.md or a folder above it is a link, or it leads somewhere it should not.')
  expect(asked).toEqual([])
  expect(calls.writes).toEqual([])
})

test('/vaken-help run packet never follows a link at the .claude folder either', async ($, on) => {
  const { calls } = engine(on, {}, new Map([['/w/p/.claude', '/tmp/elsewhere']]))
  answerWith(on, 'Write it', [])
  const r = (await $.command.run(viaParent('vaken-packet', ''))) as { text: string }
  expect(r.text).toMatch(/^Nothing was written: .* is a link/)
  expect(calls.writes).toEqual([])
})

test('/vaken-help run packet writes nothing when the person says no', async ($, on) => {
  const { calls } = engine(on)
  answerWith(on, 'Do not write', [])
  const r = (await $.command.run(viaParent('vaken-packet', ''))) as { text: string }
  expect(r.text).toBe('Nothing was written.')
  expect(calls.writes).toEqual([])
})
