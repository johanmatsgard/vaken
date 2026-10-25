// The loop breaker's rule and its hook as the engine runs them.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { LOOP_FAILS, THRASH_EDITS, THRASH_QUIET_MS, THRASH_WINDOW_MS, afterCall, afterEdit, beforeCall, errKey, fileWord, newThrash, nudgeText, stepKey, stopReason, thrashClear, thrashEdit, thrashFailure } from '../hooks/core/loopbreaker'
import type { Seen } from '../hooks/core/loopbreaker'
import { didLine, didToday, shortSummary } from '../hooks/core/ledger'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const MIN = 60_000
const NOW = Date.parse('2026-10-10T12:00:00Z')

test('a step is the same when its arguments are the same, whatever the key order; another agent is another step', () => {
  expect(stepKey(undefined, 'Bash', { command: 'ls', timeout: 5 })).toBe(stepKey(undefined, 'Bash', { timeout: 5, command: 'ls' }))
  expect(stepKey(undefined, 'Bash', { command: 'ls' })).not.toBe(stepKey(undefined, 'Bash', { command: 'ls -l' }))
  expect(stepKey(undefined, 'Bash', { command: 'ls' })).not.toBe(stepKey('agent-1', 'Bash', { command: 'ls' }))
  expect(stepKey(undefined, 'Bash', { command: 'ls', description: 'try 1' })).toBe(stepKey(undefined, 'Bash', { command: 'ls', description: 'try 2' }))
  expect(stepKey(undefined, 'Read', { path: 'a' })).not.toBe(stepKey(undefined, 'Bash', { path: 'a' }))
})

test('an error is the same when only numbers and spacing differ', () => {
  expect(errKey('line 12: no such file')).toBe(errKey('line 98:   no such file'))
  expect(errKey('no such file')).not.toBe(errKey('permission denied'))
})

test('three failures in a row with the same error trip it once; a success or another error starts again', () => {
  const seen: Seen = new Map()
  const e = errKey('boom')
  expect(afterCall(seen, 'k', true, e)).toEqual({ tripped: false, nudge: false, fails: 1 })
  expect(afterCall(seen, 'k', true, e)).toEqual({ tripped: false, nudge: false, fails: 2 })
  expect(afterCall(seen, 'k', true, e)).toEqual({ tripped: true, nudge: true, fails: LOOP_FAILS })
  expect(afterCall(seen, 'k', true, e)).toEqual({ tripped: false, nudge: true, fails: 4 })
  expect(afterCall(seen, 'k', false, '')).toEqual({ tripped: false, nudge: false, fails: 0 })
  expect(seen.size).toBe(0)
  afterCall(seen, 'k', true, e)
  afterCall(seen, 'k', true, e)
  expect(afterCall(seen, 'k', true, errKey('another'))).toEqual({ tripped: false, nudge: false, fails: 1 })
})

test('only Stop mode refuses, and only after the third failure', () => {
  const seen: Seen = new Map()
  for (let n = 0; n < LOOP_FAILS; n += 1) afterCall(seen, 'k', true, 'x')
  expect(beforeCall(seen, 'k', 'Bash', 'warn')).toEqual({ block: false })
  expect(beforeCall(seen, 'k', 'Bash', 'off')).toEqual({ block: false })
  expect(beforeCall(seen, 'other', 'Bash', 'stop')).toEqual({ block: false })
  expect(beforeCall(seen, 'k', 'Bash', 'stop')).toEqual({ block: true, reason: stopReason('Bash', LOOP_FAILS) })
  const two: Seen = new Map()
  afterCall(two, 'k', true, 'x')
  afterCall(two, 'k', true, 'x')
  expect(beforeCall(two, 'k', 'Bash', 'stop')).toEqual({ block: false })
})

test('the tracker stays small', () => {
  const seen: Seen = new Map()
  for (let n = 0; n < 100; n += 1) afterCall(seen, `step-${n}`, true, 'x')
  expect(seen.size).toBe(40)
  expect(seen.has('step-99')).toBe(true)
  expect(seen.has('step-0')).toBe(false)
})

function circle(t = newThrash(), file = 'a.ts', start = NOW, gap = MIN): { t: ReturnType<typeof newThrash>; last: ReturnType<typeof thrashEdit> } {
  let last: ReturnType<typeof thrashEdit>
  for (let n = 0; n < THRASH_EDITS; n += 1) {
    if (n > 0) thrashFailure(t)
    last = thrashEdit(t, file, start + n * gap)
  }
  return { t, last }
}

test('thrash: five edits of one file in ten minutes with failures between them trip once', () => {
  const { t, last } = circle()
  expect(last).toEqual({ edits: 5, minutes: 4 })
  thrashFailure(t)
  expect(thrashEdit(t, 'a.ts', NOW + 5 * MIN)).toBeUndefined()
  const again = circle(t, 'a.ts', NOW + THRASH_QUIET_MS + 10 * MIN)
  expect(again.last).toEqual({ edits: 5, minutes: 4 })
})

test('thrash: no failures between the edits, too few edits, too slow, or another file: nothing', () => {
  const t = newThrash()
  for (let n = 0; n < 8; n += 1) expect(thrashEdit(t, 'a.ts', NOW + n * MIN)).toBeUndefined()
  expect(circle(newThrash(), 'b.ts', NOW, 3 * MIN).last).toBeUndefined()
  const four = newThrash()
  let r: ReturnType<typeof thrashEdit>
  for (let n = 0; n < 4; n += 1) {
    thrashFailure(four)
    r = thrashEdit(four, 'a.ts', NOW + n * MIN)
  }
  expect(r).toBeUndefined()
  const mixed = newThrash()
  for (let n = 0; n < 5; n += 1) {
    thrashFailure(mixed)
    expect(thrashEdit(mixed, `f${n}.ts`, NOW + n * MIN)).toBeUndefined()
  }
  expect(THRASH_WINDOW_MS).toBe(10 * MIN)
})

test('thrash: failures in only some of the gaps are not enough; most of them are', () => {
  const few = newThrash()
  const times = [0, 1, 2, 3, 4]
  const failBefore = [false, true, false, false, true]
  let r: ReturnType<typeof thrashEdit>
  times.forEach((m, n) => {
    if (failBefore[n]) thrashFailure(few)
    r = thrashEdit(few, 'a.ts', NOW + m * MIN)
  })
  expect(r).toBeUndefined()
  const most = newThrash()
  const failMost = [false, true, true, false, true]
  times.forEach((m, n) => {
    if (failMost[n]) thrashFailure(most)
    r = thrashEdit(most, 'a.ts', NOW + m * MIN)
  })
  expect(r).toEqual({ edits: 5, minutes: 4 })
})

test('thrash: a message from the person clears the edits; the tracker stays small', () => {
  const t = newThrash()
  for (let n = 0; n < 4; n += 1) {
    thrashFailure(t)
    thrashEdit(t, 'a.ts', NOW + n * MIN)
  }
  thrashClear(t)
  thrashFailure(t)
  expect(thrashEdit(t, 'a.ts', NOW + 4 * MIN)).toBeUndefined()
  const many = newThrash()
  for (let n = 0; n < 100; n += 1) thrashEdit(many, `f${n}.ts`, NOW)
  expect(many.files.size).toBe(20)
  expect(fileWord('/a/b/notes.ts')).toBe('notes.ts')
  const long = fileWord('/a/b/a-very-long-component-file-name-for-the-settings-page.test.tsx')
  expect(long.length).toBeLessThanOrEqual(40)
  expect(long.endsWith('.test.tsx')).toBe(true)
})

test('the words and the ledger count', () => {
  expect(nudgeText('Bash', 3)).toMatch(/fail 3 times in a row/)
  expect(didLine({ what: 'Caught a repeating step', n: 1 })).toBe('Caught a repeating step once.')
  const list = [{ at: NOW, what: 'Caught a repeating step', did: true }, { at: NOW - 30 * 60 * MIN, what: 'Caught a repeating step', did: true }, { at: NOW, what: 'Blocked the same step again', did: true }]
  expect(didToday(list, NOW)).toEqual([{ what: 'Caught a repeating step', n: 1 }, { what: 'Blocked the same step again', n: 1 }])
  expect(shortSummary({ count: 1, freed: 305_000 }, [{ what: 'Kept the cache warm', n: 2 }, { what: 'Caught a repeating step', n: 1 }])).toBe('Compacted the session once, about 305k tokens freed, kept the session cheap 2 times, and 1 more')
})

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

test('/vaken-help run loops says the mode and that nothing is failing', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const shown = (await $.command.run(viaParent('vaken-loops', ''))) as { text: string }
  expect(shown.text).toMatch(/Loop breaker: warn/)
  expect(shown.text).toMatch(/3 times in a row/)
  expect(shown.text).toMatch(/No failing step now/)
})

test('Warn: the third failure carries a nudge for Claude and one ledger line; the fourth try still runs', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'npm error missing script', code: 1 }, text: 'npm error missing script', isError: true }) as never)
  const out: Array<unknown> = []
  for (let n = 0; n < 4; n += 1) out.push(await $.tool.call({ tool: 'Bash', command: 'npm run warn-case' }))
  expect(JSON.stringify(out[0])).not.toMatch(/Vaken saw/)
  expect(JSON.stringify(out[1])).not.toMatch(/Vaken saw/)
  expect(JSON.stringify(out[2])).toMatch(/Vaken saw this Bash step fail 3 times/)
  expect(JSON.stringify(out[3])).not.toMatch(/blocked/)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string }>
  expect(ledger.map(l => l.what)).toEqual(['Caught a repeating step'])
})

test('Stop: the fourth try is refused with a reason, once in the ledger', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'npm error missing script', code: 1 }, text: 'npm error missing script', isError: true }) as never)
  mem.set('cockpit:setting:loop.breaker', 'stop')
  const out: Array<unknown> = []
  for (let n = 0; n < 4; n += 1) out.push(await $.tool.call({ tool: 'Bash', command: 'npm run stop-case' }))
  expect(JSON.stringify(out[3])).toMatch(/Vaken stopped this Bash step/)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string }>
  expect(ledger.map(l => l.what)).toEqual(['Blocked the same step again', 'Caught a repeating step'])
})

test('an edit that worked between tries starts the count again; a step already stopped stays stopped', () => {
  const seen: Seen = new Map()
  afterCall(seen, 'a', true, 'e')
  afterCall(seen, 'a', true, 'e')
  for (let n = 0; n < LOOP_FAILS; n += 1) afterCall(seen, 'b', true, 'e')
  afterEdit(seen)
  expect(seen.has('a')).toBe(false)
  expect(afterCall(seen, 'a', true, 'e').fails).toBe(1)
  expect(beforeCall(seen, 'b', 'Bash', 'stop').block).toBe(true)
})

test('Warn: the same failing step with a code edit between the tries is no loop', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'test failed', code: 1 }, text: 'test failed', isError: true }) as never)
  on('tool.call', { tool: 'Edit' }, () => ({ result: { ok: true }, text: 'edited' }) as never)
  const out: string[] = []
  for (let n = 0; n < 4; n += 1) {
    out.push(JSON.stringify(await $.tool.call({ tool: 'Bash', command: 'npm test' })))
    await $.tool.call({ tool: 'Edit', file_path: `/w/app/src/f${n}.ts`, old_string: 'a', new_string: 'b' } as never)
  }
  expect(out.filter(x => /Vaken saw/.test(x))).toEqual([])
  expect(((mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>).some(l => l.what === 'Caught a repeating step')).toBe(false)
})

async function editEngine($: Parameters<Parameters<typeof test>[1]>[0], on: On, mode: string | undefined): Promise<Map<string, unknown>> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('tool.call', { tool: 'Edit' }, () => ({ result: { ok: true }, text: 'edited' }) as never)
  let n = 0
  on('tool.call', { tool: 'Read' }, () => {
    n += 1
    return { result: { error: `error ${n}` }, text: `different error ${'x'.repeat(n)}`, isError: true } as never
  })
  if (mode !== undefined) mem.set('cockpit:setting:loop.breaker', mode)
  return mem
}

async function rounds($: Parameters<Parameters<typeof test>[1]>[0], file: string): Promise<string[]> {
  const out: string[] = []
  for (let n = 0; n < 5; n += 1) {
    out.push(JSON.stringify(await $.tool.call({ tool: 'Edit', file_path: `/w/app/src/${file}`, old_string: `a${n}`, new_string: `b${n}` } as never)))
    out.push(JSON.stringify(await $.tool.call({ tool: 'Read', file_path: `/w/app/src/other-${n}.ts` } as never)))
  }
  return out
}

test('Warn: five edits of one file with different failures between them give one note and one ledger line', async ($, on) => {
  const mem = await editEngine($, on, undefined)
  const out = await rounds($, 'parser.ts')
  expect(out.filter(x => /going round in circles/.test(x)).length).toBe(1)
  expect(out[8]).toMatch(/parser\.ts edited 5 times in 1 minute\b/)
  const ledger = mem.get('cockpit:ledger:compact') as Array<{ what: string; detail: string }>
  expect(ledger.filter(l => l.what === 'Going round in circles').length).toBe(1)
  expect(ledger.find(l => l.what === 'Going round in circles')?.detail).toMatch(/^Going round in circles on parser\.ts/)
  // the failures differ every time, so the exact-step rule stayed quiet
  expect(ledger.some(l => l.what === 'Caught a repeating step')).toBe(false)
})

test('Stop: thrash is only a note, an edit is never refused for it; Off: nothing', async ($, on) => {
  const mem = await editEngine($, on, 'stop')
  const out = await rounds($, 'stopper.ts')
  expect(out.some(x => /blocked/.test(x))).toBe(false)
  expect(out.filter(x => /going round in circles/.test(x)).length).toBe(1)
  expect((mem.get('cockpit:ledger:compact') as Array<{ what: string }>).map(l => l.what)).toEqual(['Going round in circles'])
})

test('Off: no note and no ledger line', async ($, on) => {
  const mem = await editEngine($, on, 'off')
  const out = await rounds($, 'quiet.ts')
  expect(out.some(x => /going round in circles/.test(x))).toBe(false)
  expect(mem.get('cockpit:ledger:compact')).toBeUndefined()
})

test('when the loop breaker trips, the note and the toast point to /vaken-undo last if copies were kept since the last message', async ($, on) => {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  on('session.id', () => ({ value: 'test-session' }))
  const toasts: string[] = []
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as unknown as { text?: unknown }).text))
    return { value: undefined } as never
  })
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '', stderr: 'npm error undo-case', code: 1 }, text: 'npm error undo-case', isError: true }) as never)
  mem.set('cockpit:undo:index:test-session', { next: 2, snaps: [{ id: 1, path: '/home/user/app/a.ts', at: NOW, tool: 'Edit', kind: 'saved', hash: 'h', bytes: 1, lines: 1 }] })
  const out: Array<unknown> = []
  for (let n = 0; n < 3; n += 1) out.push(await $.tool.call({ tool: 'Bash', command: 'npm run undo-case' }))
  expect(JSON.stringify(out[1])).not.toMatch(/vaken-undo last/)
  expect(JSON.stringify(out[2])).toMatch(/Vaken saw this Bash step fail 3 times/)
  expect(JSON.stringify(out[2])).toMatch(/\/vaken-undo last/)
  expect(toasts.join(' ')).toMatch(/failed 3 times.*\/vaken-undo last/)
})

test('Stop mode and a thrash note also point to /vaken-undo last, and stay silent with no copies', async ($, on) => {
  const mem = await editEngine($, on, 'stop')
  const none = await rounds($, 'noundo.ts')
  expect(none.filter(x => /going round in circles/.test(x)).length).toBe(1)
  expect(none.some(x => /vaken-undo last/.test(x))).toBe(false)
  mem.set('cockpit:undo:index:test-session', { next: 2, snaps: [{ id: 1, path: '/home/user/app/a.ts', at: NOW, tool: 'Edit', kind: 'saved', hash: 'h', bytes: 1, lines: 1 }] })
  const some = await rounds($, 'withundo.ts')
  expect(some.filter(x => /going round in circles/.test(x) && /\/vaken-undo last/.test(x)).length).toBe(1)
})
