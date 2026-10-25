// Lean session: the cut rules for long shell output, the start facts block, the setting and the modes that set it.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import {
  ERROR_LINES_MAX, FAILED_KEEP_UNDER, HEAD_LINES, LEAN_SETTINGS, LEAN_STRINGS, START_BLOCK, START_GIT_ARGV, START_GIT_TIMEOUT_MS, START_PR_MAX_AGE_MS, TAIL_LINES,
  cutResponse, cutText, cutsToday, leanMem, leanModeOf, mayCut, noteCut, parseStatus, readsText, startPrOf, startText,
  CHARS_PER_TOKEN, LEAN_FLUSH_MS, TOKENS_PER_LINE,
  BIG_CHARS, BIG_HEAD, BIG_LINES, BIG_TAIL, cutBig, forgetPath, forgetSession, hashOf, noteStep, readMem, rereadOf, unchangedNote,
  LEAN_OPT_REPEATS, LEAN_REPEAT_LINE, REPEAT_KEYS_MAX, REPEAT_KINDS_RE, cutsAll, noteRepeat, repeatMem, repeatNote, repeatOf,
} from '../hooks/core/lean'
import { PRESETS, modeNow } from '../hooks/core/presets'
import { OLD_COST_DEFAULTS } from '../hooks/core/costupgrade'
import { quietRowToWrite } from '../hooks/core/nextupgrade'
import { COUNTS_KEY, countOf } from '../hooks/core/counts'
import { LEAN_WHAT } from '../hooks/core/ledger'
import { PR_SHARED_KEY } from '../hooks/core/crewpr'
import { findSetting, settingPath } from '../hooks/core/settings'
import { byEnglish } from '../hooks/i18n/table'
import { tIn } from '../hooks/i18n/t'
import { test } from './slow'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const ROOT = '/w/app'
const SV = byEnglish('sv')
const lines = (n: number, at: (k: number) => string = k => `line ${k}`): string => Array.from({ length: n }, (_, k) => at(k)).join('\n')
const cutOf = (text: string): string[] => (cutText(text)?.text ?? '').split('\n')

test('a short output is kept; a long one keeps the first 15 lines, the error lines and the last 40, with one line for Claude', () => {
  expect(cutText(lines(120))).toBeUndefined()
  const text = lines(300, k => (k === 100 ? 'TypeError: x is undefined' : k === 150 ? 'FAIL src/a.test.ts' : k === 160 ? 'not ok 3 adds' : k === 170 ? '✖ 1 problem' : `line ${k}`))
  const out = cutOf(text)
  expect(out.slice(0, HEAD_LINES)).toEqual(text.split('\n').slice(0, HEAD_LINES))
  expect(out[HEAD_LINES]).toBe('vaken cut 241 lines of this output. If you need them, run the command again with a filter (grep, tail or head).')
  expect(out.slice(HEAD_LINES + 1, HEAD_LINES + 5)).toEqual(['TypeError: x is undefined', 'FAIL src/a.test.ts', 'not ok 3 adds', '✖ 1 problem'])
  expect(out.slice(-TAIL_LINES)).toEqual(text.split('\n').slice(-TAIL_LINES))
  expect(out.length).toBe(HEAD_LINES + 1 + 4 + TAIL_LINES)
  // Few lines but many characters: nothing in the middle to cut, so it stays.
  expect(cutText(lines(30, () => 'x'.repeat(1000)))).toBeUndefined()
})

test('at most 60 error lines are kept, and a huge one is shortened', () => {
  const out = cutOf(lines(500, k => (k > 20 && k < 400 ? `error ${k}${k === 21 ? 'y'.repeat(5000) : ''}` : `ok ${k}`)))
  const kept = out.slice(HEAD_LINES + 1, -TAIL_LINES)
  expect(kept.length).toBe(ERROR_LINES_MAX)
  expect(kept[0]?.length).toBeLessThan(500)
})

test('both shapes of the result are cut: a string, and an object with stdout and stderr', () => {
  const long = lines(400)
  const s = cutResponse(long)
  expect(typeof s?.response).toBe('string')
  expect(s?.cut).toBe(400 - HEAD_LINES - TAIL_LINES)
  const o = cutResponse({ stdout: long, stderr: lines(200), interrupted: false, isImage: false })
  const r = o?.response as { stdout: string; stderr: string; isImage: boolean }
  expect(r.stdout.split('\n').length).toBe(HEAD_LINES + 1 + TAIL_LINES)
  expect(r.stderr.split('\n').length).toBe(HEAD_LINES + 1 + TAIL_LINES)
  expect(r.isImage).toBe(false)
  expect(cutResponse({ stdout: 'ok', stderr: '' })).toBeUndefined()
  expect(cutResponse({ isImage: true })).toBeUndefined()
  expect(cutResponse(undefined)).toBeUndefined()
})

test('a failed command under 400 lines is never cut; a longer one is', () => {
  expect(cutResponse({ stdout: lines(300), stderr: lines(50), exitCode: 1 })).toBeUndefined()
  expect(cutResponse({ stdout: lines(300), stderr: '', interrupted: true })).toBeUndefined()
  expect(cutResponse(`Exit code 2\n${lines(300)}`)).toBeUndefined()
  expect(cutResponse({ stdout: lines(FAILED_KEEP_UNDER), stderr: '', exitCode: 1 })).toBeDefined()
  expect(cutResponse({ stdout: lines(300), stderr: '', exitCode: 0 })).toBeDefined()
})

test('kinds: Logs only cuts install, test, build and lint; reads and diffs are never cut; agents only under All long output', () => {
  const may = (command: string, mode: 'off' | 'logs' | 'all' = 'logs', byAgent = false): boolean => mayCut({ mode, command, byAgent })
  for (const c of ['npm test', 'npm install', 'pnpm add left-pad', 'npx tsc -p .', 'npm run build', 'npx eslint .', 'cd app && pytest -q']) expect(may(c), c).toBe(true)
  for (const c of ['git log', 'ls -R', 'node script.js', 'docker ps']) expect(may(c), c).toBe(false)
  for (const c of ['cat src/test.ts', 'sed -n 1,400p build.log', 'head -500 test.log', 'git diff', 'git show HEAD', 'npm test 2>&1 | tail -200', 'grep -rn error .', 'cd app && cat package.json', 'git log -p']) {
    expect(readsText(c), c).toBe(true)
    expect(may(c, 'all'), c).toBe(false)
  }
  expect(may('ls -R', 'all')).toBe(true)
  expect(may('npm test', 'logs', true)).toBe(false)
  expect(may('npm test', 'all', true)).toBe(true)
  expect(may('npm test', 'off')).toBe(false)
})

test('the counts are in memory and start again on a new day', () => {
  Object.assign(leanMem, { day: '', cuts: 0, lines: 0 })
  noteCut(100, NOW)
  noteCut(50, NOW + 1000)
  expect(cutsToday(NOW)).toEqual({ cuts: 2, lines: 150, repeats: 0, chars: 0 })
  expect(cutsToday(NOW + 2 * 86_400_000)).toEqual({ cuts: 0, lines: 0, repeats: 0, chars: 0 })
  noteCut(7, NOW + 2 * 86_400_000)
  expect(cutsToday(NOW + 2 * 86_400_000)).toEqual({ cuts: 1, lines: 7, repeats: 0, chars: 0 })
  expect(tIn('en', 'lean.cut_line', { n: 3, m: 900 })).toBe('Cut 3 long outputs today (about 900 lines Claude did not read).')
  expect(tIn('en', 'lean.cut_line', { n: 1, m: 90 })).toBe('Cut 1 long output today (about 90 lines Claude did not read).')
  expect(tIn('sv', 'lean.cut_line', { n: 3, m: 900 })).not.toBe('')
})

test('the setting: Off, Logs only, All long output, default Logs only; Only alerts sets Off, the other two modes Logs only', () => {
  const s = LEAN_SETTINGS[0]
  expect(s?.key).toBe('lean.mode')
  expect(s?.label).toBe('Lean session')
  expect(s?.default).toBe('logs')
  expect(s?.options.map(o => o.label)).toEqual(['Off', 'Logs only', 'All long output', 'All, skip repeats'])
  expect((s?.note ?? '').split(/\s+/).length).toBeLessThanOrEqual(16)
  expect(leanModeOf(undefined)).toBe('logs')
  expect(leanModeOf('all')).toBe('all')
  expect(leanModeOf('off')).toBe('off')
  const val = (name: string): string | undefined => PRESETS.find(p => p.name === name)?.values['lean.mode']
  expect([val('quiet'), val('balanced'), val('full'), val('everything')]).toEqual(['off', 'logs', 'logs', 'logs'])
  expect(OLD_COST_DEFAULTS['lean.mode']).toBe('off')
  for (const w of LEAN_STRINGS) expect(SV[w] ?? '', w).not.toBe('')
})

test('an Only alerts store from before the row keeps reading Only alerts; other stores and saved choices are left alone', () => {
  const quiet = { ...(PRESETS.find(p => p.name === 'quiet')?.values ?? {}) }
  // A store that never saved either new row
  const old = { ...quiet, 'next.mode': 'buttons', 'lean.mode': 'logs' }
  expect(quietRowToWrite('lean.mode', old, new Set())).toBe('off')
  expect(quietRowToWrite('next.mode', old, new Set())).toBe('off')
  // A store that already took the next step row
  expect(quietRowToWrite('lean.mode', { ...quiet, 'lean.mode': 'logs' }, new Set(['next.mode']))).toBe('off')
  expect(modeNow({ ...quiet, 'lean.mode': 'off' })).toBe('quiet')
  expect(quietRowToWrite('lean.mode', { ...quiet, 'lean.mode': 'all' }, new Set(['next.mode', 'lean.mode']))).toBeUndefined()
  const balanced = { ...(PRESETS.find(p => p.name === 'balanced')?.values ?? {}) }
  expect(quietRowToWrite('lean.mode', balanced, new Set())).toBeUndefined()
  expect(modeNow(balanced)).toBe('balanced')
})

test('rows moved off the pane say where they are now', () => {
  for (const k of ['cost.why', 'phone.hello']) {
    const s = findSetting(k)
    expect(s?.hidden, k).toBe(true)
    expect(settingPath(s as never)).toBe('/vaken-settings all')
  }
})

test('the start facts: branch, changed files, and an open pull request only from stored facts that are recent', () => {
  expect(parseStatus('## main...origin/main [ahead 1]\n M a.ts\n?? b.ts\n')).toEqual({ branch: 'main', changed: 2 })
  expect(parseStatus('## No commits yet on work\n')).toEqual({ branch: 'work', changed: 0 })
  expect(parseStatus('## HEAD (no branch)\n M a.ts\n')).toEqual({ changed: 1 })
  const view = (checks: { state: string }[]) => ({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: '', checks: checks.map((c, n) => ({ name: `c${n}`, ...c })) })
  const shared = (at: number, checks: { state: string }[], repo = `${ROOT}/.git`, branch = 'feat') => ({ [`${repo}\n${branch}`]: { at, branch, view: view(checks) } })
  expect(startPrOf(shared(NOW - 60_000, [{ state: 'failed' }, { state: 'passed' }]), ROOT, 'feat', NOW)).toEqual({ number: 12, failing: true, pending: false })
  expect(startPrOf(shared(NOW - 60_000, [{ state: 'passed' }]), `${ROOT}/src`, 'feat', NOW)).toEqual({ number: 12, failing: false, pending: false })
  expect(startPrOf(shared(NOW - START_PR_MAX_AGE_MS - 1, [{ state: 'failed' }]), ROOT, 'feat', NOW)).toBeUndefined()
  expect(startPrOf(shared(NOW - 60_000, [{ state: 'failed' }], '/w/other/.git'), ROOT, 'feat', NOW)).toBeUndefined()
  expect(startPrOf(shared(NOW - 60_000, [{ state: 'failed' }]), ROOT, 'main', NOW)).toBeUndefined()
  expect(startPrOf(undefined, ROOT, 'feat', NOW)).toBeUndefined()
  const text = startText({ branch: 'feat', changed: 3 }, { number: 12, failing: true, pending: false })
  expect(text.split('\n').length).toBeLessThanOrEqual(6)
  expect(text).toContain('Branch: feat')
  expect(text).toContain('Changed files not committed: 3')
  expect(text).toContain('#12')
  expect(text).toContain('fail')
})

function world(on: On, seed: Record<string, unknown> = {}) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:firstrun': 'done', 'cockpit:awake:asked': 1, 'cockpit:phone:asked': 1, ...seed }))
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
  const git = { status: '## feat...origin/feat\n M a.ts\n', code: 0, calls: [] as { argv: string[]; timeoutMs?: number }[] }
  on('process.run', (_$, e) => {
    const r = e as { argv: string[]; init?: { timeoutMs?: number } }
    if (r.argv.join(' ') === START_GIT_ARGV.join(' ')) {
      git.calls.push({ argv: r.argv, timeoutMs: r.init?.timeoutMs })
      return { value: { exitCode: git.code, stdout: git.code === 0 ? git.status : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
    }
    return { value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.render', () => ({ type: 'Text', props: {}, children: [''] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('classic.PostToolUse', () => ({}) as never)
  on('prompt.context', (_$, e) => ({ blocks: e.blocks }))
  return { mem, git, clock }
}

const post = async ($: EngineInterface, command: string, response: unknown, over: Record<string, unknown> = {}): Promise<unknown> =>
  ((await $.classic.PostToolUse({ session_id: 'me', transcript_path: '', cwd: ROOT, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command }, tool_response: response, tool_use_id: 'u1', ...over } as never)) as { updatedToolOutput?: unknown }).updatedToolOutput
const start = ($: EngineInterface) => $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)

test('the hook cuts a long test log, leaves a file read and other tools alone, and does nothing when Off', async ($, on) => {
  const w = world(on)
  await start($)
  const cut = (await post($, 'npm test', { stdout: lines(500), stderr: '' })) as { stdout: string } | undefined
  expect(cut?.stdout.split('\n').length).toBe(HEAD_LINES + 1 + TAIL_LINES)
  expect(await post($, 'cat big.log', lines(500))).toBeUndefined()
  expect(await post($, 'npm test', lines(500), { tool_name: 'Read' })).toBeUndefined()
  expect(await post($, 'npm test', lines(500), { agent_id: 'a1' })).toBeUndefined()
  // Nothing of the output is kept in the store.
  expect([...w.mem.values()].some(v => JSON.stringify(v ?? '').includes('line 200'))).toBe(false)
  w.mem.set('cockpit:setting:lean.mode', 'off')
  await start($)
  expect(await post($, 'npm test', lines(500))).toBeUndefined()
})

test('the start block: one git call with a short limit, a stored pull request, nothing without a repository or when Off', async ($, on) => {
  const w = world(on, { [PR_SHARED_KEY]: { [`${ROOT}/.git\nfeat`]: { at: NOW - 60_000, branch: 'feat', view: { number: 7, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: '', checks: [{ name: 'ci', state: 'failed' }] } } } })
  await start($)
  const r = await $.prompt.context({ blocks: [{ name: 'currentDate', text: 'today' }] } as never)
  const block = r.blocks.find(b => b.name === START_BLOCK)
  expect(r.blocks[0]?.name).toBe('currentDate')
  expect(block?.text).toContain('Branch: feat')
  expect(block?.text).toContain('Changed files not committed: 1')
  expect(block?.text).toContain('#7')
  expect(w.git.calls.length).toBe(1)
  expect(w.git.calls[0]?.timeoutMs).toBe(START_GIT_TIMEOUT_MS)
  w.git.code = 128
  expect((await $.prompt.context({ blocks: [] } as never)).blocks).toEqual([])
  w.git.code = 0
  w.mem.set('cockpit:setting:lean.mode', 'off')
  expect((await $.prompt.context({ blocks: [] } as never)).blocks).toEqual([])
})

// Big reads and no double reads.
const readOf = (content: string, filePath = '/w/app/a.ts') => ({ type: 'text', file: { filePath, content, numLines: content.split('\n').length, startLine: 1, totalLines: content.split('\n').length } })
const contentOf = (r: unknown): string => ((r as { file?: { content?: string } } | undefined)?.file?.content ?? '')

test('big reads: a huge read keeps its first lines and a note; search, file list, page and MCP answers keep head and tail; small ones and the never-cut list stay', () => {
  const big = lines(3000)
  // A file read is cut only above the character limit: 3000 short lines are under it, 3000 long ones over it.
  const bigRead = lines(3000, k => `${'x'.repeat(40)} ${k}`)
  expect(bigRead.length).toBeGreaterThan(BIG_CHARS)
  expect(big.length).toBeLessThan(BIG_CHARS)
  expect(cutBig('Read', { file_path: '/w/app/short.ts' }, readOf(big))).toBeUndefined()
  expect(cutBig('Read', { file_path: '/w/app/mid.ts' }, readOf(lines(2000, k => `const value${k} = ${k}`)))).toBeUndefined()
  const r = cutBig('Read', { file_path: '/w/app/big.ts' }, readOf(bigRead))
  const out = contentOf(r?.response).split('\n')
  expect(out.length).toBe(BIG_HEAD + 1)
  expect(out[BIG_HEAD]).toBe('vaken cut 2900 of the 3000 lines of this file read. Read again with offset and limit for the part you need.')
  expect(r?.cut).toBe(2900)
  expect(cutBig('Read', { file_path: '/w/app/a.ts' }, readOf(lines(BIG_LINES)))).toBeUndefined()
  // The never-cut list: an exact part asked for, and the files Claude must see whole.
  expect(cutBig('Read', { file_path: '/w/app/big.ts', offset: 1, limit: 3000 }, readOf(bigRead))).toBeUndefined()
  expect(cutBig('Read', { file_path: '/w/app/CLAUDE.md' }, readOf(bigRead))).toBeUndefined()
  expect(cutBig('Grep', { pattern: 'x', head_limit: 5000 }, { mode: 'content', content: big })).toBeUndefined()
  expect(cutBig('WebFetch', { url: 'https://example.com', prompt: 'p', offset: 10 }, { result: big })).toBeUndefined()
  expect(cutBig('mcp__vaken__vaken_status', {}, big)).toBeUndefined()
  // Head, one note, tail.
  const g = cutBig('Grep', { pattern: 'x' }, { mode: 'content', numFiles: 3, content: big })?.response as { content: string; numFiles: number }
  const gl = g.content.split('\n')
  expect(gl.length).toBe(BIG_HEAD + 1 + BIG_TAIL)
  expect(gl[BIG_HEAD]).toContain('narrower pattern')
  expect(gl.slice(-BIG_TAIL)).toEqual(big.split('\n').slice(-BIG_TAIL))
  expect(g.numFiles).toBe(3)
  const names = Array.from({ length: 2000 }, (_, k) => `/w/app/f${k}.ts`)
  const gb = cutBig('Glob', { pattern: '**/*' }, { filenames: names, numFiles: 2000, truncated: false })?.response as { filenames: string[] }
  expect(gb.filenames.length).toBe(BIG_HEAD + 1 + BIG_TAIL)
  expect(gb.filenames[BIG_HEAD]).toContain('1870 of the 2000 names')
  const wf = cutBig('WebFetch', { url: 'https://example.com', prompt: 'p' }, { result: 'y'.repeat(BIG_CHARS + 50_000), code: 200 })?.response as { result: string }
  expect(wf.result.length).toBeLessThan(BIG_CHARS / 2)
  expect(wf.result).toContain('characters of this page')
  const m = cutBig('mcp__srv__query', {}, [{ type: 'text', text: big }, { type: 'image', data: 'x' }])?.response as { type: string; text?: string }[]
  expect(m[0]?.text?.split('\n').length).toBe(BIG_HEAD + 1 + BIG_TAIL)
  expect(m[1]).toEqual({ type: 'image', data: 'x' })
  expect(cutBig('mcp__srv__query', {}, { content: [{ type: 'text', text: 'short' }] })).toBeUndefined()
  expect(cutBig('Bash', {}, big)).toBeUndefined()
})

test('no double reads: the same range of an unchanged file gets one note, the next read gets the text, a change or an edit gives the text', () => {
  forgetSession('s1')
  const read = (content: string, input: Record<string, unknown> = { file_path: '/w/app/a.ts' }, agent?: string) => {
    noteStep('s1', agent)
    return rereadOf('s1', agent, input, readOf(content))
  }
  expect(read('one\ntwo')).toBeUndefined()
  const again = read('one\ntwo')
  expect(contentOf(again?.response)).toBe(unchangedNote())
  // It points at the reader's own earlier read, never at vaken's step counter.
  expect(unchangedNote()).toContain('your earlier read')
  expect(unchangedNote()).not.toMatch(/step/i)
  expect(again?.lines).toBe(2)
  // No trap: asked right after the note, the text comes.
  expect(read('one\ntwo')).toBeUndefined()
  expect(contentOf(read('one\ntwo')?.response)).toBe(unchangedNote())
  // A changed file, another range, an agent's own context: the text.
  expect(read('one\nthree')).toBeUndefined()
  expect(read('one\nthree', { file_path: '/w/app/a.ts', offset: 1, limit: 1 })).toBeUndefined()
  expect(read('one\nthree', { file_path: '/w/app/a.ts' }, 'agent-1')).toBeUndefined()
  forgetPath('s1', '/w/app/a.ts')
  expect(read('one\nthree')).toBeUndefined()
  // Only path, range, a hash and a step are kept.
  expect(JSON.stringify([...readMem.values()].map(c => [...c.reads.entries()]))).not.toContain('three')
  expect(hashOf('a')).not.toBe(hashOf('b'))
})

const postAs = async ($: EngineInterface, tool: string, input: Record<string, unknown>, response: unknown, over: Record<string, unknown> = {}): Promise<{ updatedToolOutput?: unknown; updatedMCPToolOutput?: unknown }> =>
  (await $.classic.PostToolUse({ session_id: 'me', transcript_path: '', cwd: ROOT, hook_event_name: 'PostToolUse', tool_name: tool, tool_input: input, tool_response: response, tool_use_id: 'u1', ...over } as never)) as never

test('the hook: rereads under Logs only, big reads only under All long output, an edit and a compaction forget, Off does nothing, no text in the store', async ($, on) => {
  const w = world(on)
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [] }], tokensBefore: 300_000, tokensAfter: 20_000 }) as never)
  forgetSession('me')
  await start($)
  const file = { file_path: '/w/app/a.ts' }
  const big = lines(3000)
  const bigRead = lines(3000, k => `${'x'.repeat(40)} ${k}`)
  expect((await postAs($, 'Read', file, readOf(big))).updatedToolOutput).toBeUndefined()
  expect(contentOf((await postAs($, 'Read', file, readOf(big))).updatedToolOutput)).toContain('unchanged since your earlier read')
  expect((await postAs($, 'Read', file, readOf(big))).updatedToolOutput).toBeUndefined()
  // An edit forgets the path.
  await postAs($, 'Edit', { file_path: '/w/app/a.ts', old_string: 'a', new_string: 'b' }, {})
  expect((await postAs($, 'Read', file, readOf(big))).updatedToolOutput).toBeUndefined()
  // A compaction forgets every read.
  await $.session.compact({ trigger: 'manual', instructions: 'mine', messages: [] } as never)
  expect((await postAs($, 'Read', file, readOf(big))).updatedToolOutput).toBeUndefined()
  expect((await postAs($, 'Grep', { pattern: 'x' }, { mode: 'content', content: big })).updatedToolOutput).toBeUndefined()
  expect((await postAs($, 'mcp__srv__query', {}, big)).updatedMCPToolOutput).toBeUndefined()
  // All long output: the big reads are cut, an MCP answer through its own field.
  w.mem.set('cockpit:setting:lean.mode', 'all')
  await start($)
  expect(contentOf((await postAs($, 'Read', { file_path: '/w/app/b.ts' }, readOf(bigRead))).updatedToolOutput).split('\n').length).toBe(BIG_HEAD + 1)
  const g = (await postAs($, 'Grep', { pattern: 'x' }, { mode: 'content', content: big })).updatedToolOutput as { content: string }
  expect(g.content.split('\n').length).toBe(BIG_HEAD + 1 + BIG_TAIL)
  const m = await postAs($, 'mcp__srv__query', {}, big)
  expect((m.updatedMCPToolOutput as string).split('\n').length).toBe(BIG_HEAD + 1 + BIG_TAIL)
  expect(m.updatedToolOutput).toBeUndefined()
  expect([...w.mem.values()].some(v => JSON.stringify(v ?? '').includes('line 200'))).toBe(false)
  // Off: nothing.
  w.mem.set('cockpit:setting:lean.mode', 'off')
  await start($)
  expect((await postAs($, 'Read', { file_path: '/w/app/b.ts' }, readOf(big))).updatedToolOutput).toBeUndefined()
  expect((await postAs($, 'Read', { file_path: '/w/app/b.ts' }, readOf(big))).updatedToolOutput).toBeUndefined()
})

// Quiet repeat reminders (the All, skip repeats choice of lean.mode).
const TODO = `The todo list is: ${'1. fix the header (in progress)\n'.repeat(12)}`
const attach = ($: EngineInterface, type: string, text: string, over: Record<string, unknown> = {}) =>
  $.prompt.attachment({ type, text, origin: { kind: 'engine' }, ...over } as never)

test('repeats: the choice is in the setting, only for Lean, and counts as All long output', () => {
  const s = LEAN_SETTINGS[0]
  expect(s?.options.map(o => o.value)).toEqual(['off', 'logs', 'all', 'repeats'])
  expect(s?.default).toBe('logs')
  expect(leanModeOf('repeats')).toBe('repeats')
  expect(cutsAll('repeats') && cutsAll('all') && !cutsAll('logs') && !cutsAll('off')).toBe(true)
  expect(mayCut({ mode: 'repeats', command: 'ls', byAgent: true })).toBe(true)
  expect(SV[LEAN_OPT_REPEATS]).not.toBe('')
  expect(tIn('sv', LEAN_REPEAT_LINE, { n: 2, m: 900 })).toContain('900')
  expect(s?.note.split(/\s+/).length).toBeLessThanOrEqual(16)
})

test('repeats: the first reminder and a changed one pass; the same text again becomes one short note; a compaction starts over', () => {
  repeatMem.clear()
  expect(repeatOf('s1', undefined, 'todo_reminder', TODO)).toBeUndefined()
  const again = repeatOf('s1', undefined, 'todo_reminder', TODO)
  expect(again?.text).toBe(repeatNote('todo_reminder'))
  expect(again?.text.length).toBeLessThan(TODO.length)
  expect(again?.saved).toBe(TODO.length - (again?.text.length ?? 0))
  expect(repeatOf('s1', undefined, 'todo_reminder', `${TODO}2. more`)).toBeUndefined()
  expect(repeatOf('s1', undefined, 'todo_reminder', `${TODO}2. more`)?.text).toBe(repeatNote('todo_reminder'))
  // Each session, agent and kind has its own last text; a kind that is not listed is never touched.
  expect(repeatOf('s2', undefined, 'todo_reminder', TODO)).toBeUndefined()
  expect(repeatOf('s1', 'a1', 'todo_reminder', TODO)).toBeUndefined()
  expect(repeatOf('s1', undefined, 'queued_command', TODO)).toBeUndefined()
  expect(repeatOf('s1', undefined, 'queued_command', TODO)).toBeUndefined()
  // A text no longer than the note is kept.
  expect(repeatOf('s1', undefined, 'auto_mode', 'Auto mode is on.')).toBeUndefined()
  expect(repeatOf('s1', undefined, 'auto_mode', 'Auto mode is on.')).toBeUndefined()
  forgetSession('s1')
  expect(repeatOf('s1', undefined, 'todo_reminder', `${TODO}2. more`)).toBeUndefined()
  // Only a hash and a count are kept, and the memory is bounded.
  for (const v of repeatMem.values()) expect(Object.keys(v).sort()).toEqual(['count', 'hash'])
  expect(JSON.stringify([...repeatMem.entries()])).not.toContain('fix the header')
  for (let k = 0; k < REPEAT_KEYS_MAX + 20; k += 1) repeatOf(`x${k}`, undefined, 'todo_reminder', TODO)
  expect(repeatMem.size).toBeLessThanOrEqual(REPEAT_KEYS_MAX)
  expect(REPEAT_KINDS_RE.test('todo_reminder') && REPEAT_KINDS_RE.test('auto_mode') && !REPEAT_KINDS_RE.test('queued_command') && !REPEAT_KINDS_RE.test('file')).toBe(true)
})

test('repeats: the daily tally counts the reminders left out and the characters saved, and starts again on a new day', () => {
  Object.assign(leanMem, { day: '', cuts: 0, lines: 0, repeats: 0, chars: 0 })
  noteRepeat(500, NOW)
  noteRepeat(250, NOW)
  noteCut(10, NOW)
  expect(cutsToday(NOW)).toEqual({ cuts: 1, lines: 10, repeats: 2, chars: 750 })
  expect(cutsToday(NOW + 86_400_000)).toEqual({ cuts: 0, lines: 0, repeats: 0, chars: 0 })
  noteRepeat(5, NOW + 86_400_000)
  expect(cutsToday(NOW + 86_400_000)).toEqual({ cuts: 0, lines: 0, repeats: 1, chars: 5 })
})

test('repeats: the hook drops a repeated todo reminder only when the choice is on, never the first, never a changed one, never another kind', async ($, on) => {
  const w = world(on, { 'cockpit:setting:lean.mode': 'repeats' })
  on('prompt.attachment', (_$, e) => ({ text: e.text }))
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [] }], tokensBefore: 300_000, tokensAfter: 20_000 }) as never)
  await start($)
  expect((await attach($, 'todo_reminder', TODO)).text).toBe(TODO)
  expect((await attach($, 'todo_reminder', TODO)).text).toBe(repeatNote('todo_reminder'))
  expect((await attach($, 'todo_reminder', `${TODO}x`)).text).toBe(`${TODO}x`)
  expect((await attach($, 'todo_reminder', `${TODO}x`, { agentId: 'a1' })).text).toBe(`${TODO}x`)
  expect((await attach($, 'queued_command', TODO)).text).toBe(TODO)
  expect((await attach($, 'queued_command', TODO)).text).toBe(TODO)
  // The same answer after a compaction is the first of its kind again.
  await $.session.compact({ trigger: 'manual', instructions: 'mine', messages: [] } as never)
  expect((await attach($, 'todo_reminder', `${TODO}x`)).text).toBe(`${TODO}x`)
  // Not from a settings hook or a plugin.
  expect((await attach($, 'todo_reminder', `${TODO}x`, { origin: { kind: 'plugin', event: 'prompt.submit' } })).text).toBe(`${TODO}x`)
  // No prompt or reminder text reaches the store.
  expect([...w.mem.values()].some(v => JSON.stringify(v ?? '').includes('fix the header'))).toBe(false)
  // Logs only, All long output and Off leave every reminder alone.
  for (const mode of ['logs', 'all', 'off']) {
    w.mem.set('cockpit:setting:lean.mode', mode)
    await start($)
    expect((await attach($, 'todo_reminder', TODO)).text).toBe(TODO)
    expect((await attach($, 'todo_reminder', TODO)).text).toBe(TODO)
  }
})

const LEDGER = 'cockpit:ledger:compact'
test('the Autopilot log: lean cuts are one row a day, written in one batch after a wait, never per cut, and hold no output text', async ($, on) => {
  const w = world(on)
  await start($)
  for (let k = 0; k < 3; k += 1) await post($, 'npm test', { stdout: lines(500), stderr: '' })
  // Memory first: nothing is in the log yet
  expect(w.mem.get(LEDGER)).toBeUndefined()
  await w.clock.advance(LEAN_FLUSH_MS)
  const rows = (w.mem.get(LEDGER) as { what: string; cuts: number; saved: number; did: boolean; detail?: string }[]).filter(r => r.what === LEAN_WHAT)
  expect(rows).toHaveLength(1)
  expect(rows[0]?.what).toBe(LEAN_WHAT)
  expect(rows[0]?.did).toBe(true)
  expect(rows[0]?.cuts).toBe(3)
  expect(rows[0]?.saved).toBe(3 * (500 - HEAD_LINES - TAIL_LINES) * TOKENS_PER_LINE)
  // A later cut the same day updates the same row
  await post($, 'npm test', { stdout: lines(500), stderr: '' })
  await w.clock.advance(LEAN_FLUSH_MS)
  const again = (w.mem.get(LEDGER) as { what: string; cuts: number }[]).filter(r => r.what === LEAN_WHAT)
  expect(again).toHaveLength(1)
  expect(again[0]?.cuts).toBe(4)
  expect(JSON.stringify([...w.mem.values()]).includes('line 200')).toBe(false)
  // The counts store holds the day's sums too
  expect(countOf(w.mem.get(COUNTS_KEY), NOW, LEAN_WHAT)).toBe(4)
})

test('the Autopilot log: a left-out reminder counts toward the same row, about 4 characters to a token', async ($, on) => {
  const w = world(on, { 'cockpit:setting:lean.mode': 'repeats' })
  on('prompt.attachment', (_$, e) => ({ text: e.text }))
  await start($)
  await attach($, 'todo_reminder', TODO)
  await attach($, 'todo_reminder', TODO)
  await w.clock.advance(LEAN_FLUSH_MS)
  const rows = (w.mem.get(LEDGER) as { what: string; cuts: number; saved: number }[]).filter(r => r.what === LEAN_WHAT)
  expect(rows).toHaveLength(1)
  expect(rows[0]?.cuts).toBe(1)
  expect(rows[0]?.saved).toBe(Math.round((TODO.length - repeatNote('todo_reminder').length) / CHARS_PER_TOKEN))
})
