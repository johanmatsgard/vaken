// Night shift and the promise ledger: the power rule, the plan room, the night cost limit, strict safety on and back, promises and the morning lead.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { NIGHT_KEY, NIGHT_OFF, NIGHT_WORDS, PROMISE_CHARS, PROMISE_MAX, addPromises, donePromise, findPromises, nightCap, nightFixPrompt, nightHeadLine, nightLead, nightMem, nightStep, parsePromises, WIN_POWER_ARGV, powerOf, promisePrompt, strictBackPlan, strictOnPlan, winPowerOf } from '../hooks/core/night'
import type { Night } from '../hooks/core/night'
import { DEFAULT_CHOICES, TASKS_FILE, parseRun } from '../hooks/core/orchestra'
import { HISTORY_KEY, REPORT_KEY, parseReports } from '../hooks/core/overnight'
import { AWAY_KEY } from '../hooks/core/guardworld'
import { settingStoreKey } from '../hooks/core/settings'
import { APP_USAGE_KEY } from '../hooks/core/appusage'
import { bindSpawn, loadRun, tasksCommand, tick, keepWatching } from '../hooks/features/orchestra'
import type { RunnerOps } from '../hooks/features/orchestra'
import { NIGHT_CLAIM_MAX_MS, forgetPower, nightClaimLive } from '../hooks/features/nightrun'
import { noteAnswer, notePrompt } from '../hooks/features/night'
import { nightRows, welcomeRows } from '../hooks/core/welcome'
import { backView, welcomeDue } from '../hooks/core/backcard'
import { awakeReason } from '../hooks/core/awakeplan'
import type { Io } from '../hooks/core/io'
import { bindSafeFs } from '../hooks/core/safewrite'
import { byEnglish } from '../hooks/i18n/table'
import { memSafeFs } from './safefs'

const NOW = new Date(2026, 9, 16, 1, 0).getTime()
const MIN = 60_000
const HOUR = 60 * MIN
const ROOT = '/work/shop'
const SID = 'night-session'
const FILE = `${ROOT}/${TASKS_FILE}`
const POLICY = settingStoreKey('away.policy')
const BATTERY = "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1)\t80%; discharging; 3:10 remaining present: true\n"
const MAINS = "Now drawing from 'AC Power'\n -InternalBattery-0 (id=1)\t80%; charging; 0:40 remaining present: true\n"
const DESKTOP = "Now drawing from 'AC Power'\n"

function world(files: Record<string, string> = { [FILE]: '- Fix the header\n- Write tests\n' }) {
  const mem = new Map<string, unknown>([[settingStoreKey('night.mode'), 'on']])
  const disk = new Map<string, string>(Object.entries(files))
  let clock = NOW
  let pmset = MAINS
  const calls: string[] = []
  let nextId = 0
  const io: Io = {
    now: async () => clock,
    home: async () => '',
    sessionId: async () => SID,
    get: async key => mem.get(key),
    set: async (key, value) => void mem.set(key, value),
    del: async key => void mem.delete(key),
    keys: async () => [...mem.keys()],
    read: async path => {
      const t = disk.get(path)
      if (t === undefined) throw new Error('no file')
      return t
    },
    write: async (path, text) => void disk.set(path, text),
    run: async argv => {
      calls.push(`run ${argv.join(' ')}`)
      return { exitCode: 0, stdout: argv[0] === 'pmset' ? pmset : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
    },
    ask: async () => '',
    complete: async () => ({ isAnswered: false, reason: 'aborted' }) as never,
    toast: () => undefined,
    invalidate: () => undefined,
  }
  // Claude, faked: `act` starts the helpers the last messages asked for, through the agent.spawn watch (bindSpawn).
  const asked: string[] = []
  const ops: RunnerOps = {
    send: async () => undefined,
    sh: async () => ({ code: 0, out: 'ok' }),
    root: async () => ROOT,
    statuses: async () => [],
    ask: async text => {
      calls.push(`ask ${text}`)
      asked.push(text)
    },
  }
  const act = async (): Promise<void> => {
    for (const text of asked.splice(0)) {
      for (const block of text.split(/\n(?=Agent \d+\n)/).slice(1)) {
        const description = /^- description: (.*)$/m.exec(block)?.[1] ?? ''
        const prompt = /\n---\n([\s\S]*?)\n---/.exec(block)?.[1] ?? ''
        nextId += 1
        calls.push(`spawn ${description}`)
        await bindSpawn(io, description, prompt, undefined, { agentId: `ag${nextId}` })
      }
    }
  }
  bindSafeFs(io, memSafeFs(() => disk.keys()))
  forgetPower()
  nightMem.lastPrompt = undefined
  nightMem.promises = []
  return { io, ops, mem, calls, act, setNow: (t: number) => void (clock = t), setPower: (text: string) => void (pmset = text) }
}

test('Windows power: plugged in or no battery goes, battery pauses, bad text is unknown', () => {
  expect(winPowerOf('[]')).toBe('mains')
  expect(winPowerOf('[{"BatteryStatus":2}]')).toBe('mains')
  expect(winPowerOf('[{"BatteryStatus":1}]')).toBe('battery')
  expect(winPowerOf('')).toBe('unknown')
  expect(WIN_POWER_ARGV()[0]).toMatch(/powershell/i)
})

test('the power rule: mains or a Mac with no battery goes, battery pauses, no answer never stops', () => {
  expect(powerOf(MAINS)).toBe('mains')
  expect(powerOf(DESKTOP)).toBe('mains')
  expect(powerOf(BATTERY)).toBe('battery')
  expect(powerOf('')).toBe('unknown')
  const night: Night = { at: NOW, usd: 10, strict: {} }
  expect(nightStep({ status: 'running', night }, { power: 'battery', usd: 0, full: false })).toBe('power-pause')
  expect(nightStep({ status: 'running', night }, { power: 'unknown', usd: 0, full: false })).toBe('none')
  expect(nightStep({ status: 'paused', night: { ...night, wait: 'power' } }, { power: 'battery', usd: 0, full: false })).toBe('none')
  expect(nightStep({ status: 'paused', night: { ...night, wait: 'power' } }, { power: 'mains', usd: 0, full: false })).toBe('power-go')
  expect(nightStep({ status: 'running' }, { power: 'battery', usd: 99, full: true })).toBe('none')
})

test('the plan room and the cost limit: a full window waits for the reset, past the night limit it pauses; 0 is the run limit', () => {
  const night: Night = { at: NOW, usd: 5, strict: {} }
  expect(nightStep({ status: 'running', night }, { power: 'mains', usd: 1, full: true })).toBe('plan-pause')
  expect(nightStep({ status: 'running', night }, { power: 'mains', usd: 5.01, full: true })).toBe('cost-pause')
  expect(nightStep({ status: 'running', night }, { power: 'mains', usd: 5, full: false })).toBe('none')
  expect(nightCap({ runUsd: 10, nightUsd: 0 })).toBe(10)
  expect(nightCap({ runUsd: 10, nightUsd: 3 })).toBe(3)
  expect(DEFAULT_CHOICES.nightUsd).toBe(0)
})

test('strict safety: only what was off is turned on, and only what is still as the run set it goes back', () => {
  const on = strictOnPlan(undefined, 'off', NOW)
  expect(on).toEqual({ strict: { away: NOW, policy: 'off' }, setAway: true, setPolicy: true })
  expect(strictOnPlan({ at: NOW - HOUR }, 'careful', NOW)).toEqual({ strict: {}, setAway: false, setPolicy: false })
  expect(strictOnPlan(undefined, undefined, NOW).strict.policy).toBeNull()
  expect(strictBackPlan(on.strict, { at: NOW }, 'careful')).toEqual({ delAway: true, policy: { to: 'off' } })
  // The person turned away mode on again or set the policy themselves: theirs stays.
  expect(strictBackPlan(on.strict, { at: NOW + MIN }, 'off')).toEqual({ delAway: false })
  expect(strictBackPlan({}, { at: NOW }, 'careful')).toEqual({ delAway: false })
})

test('a night run needs night.mode on, turns strict safety on, and puts it back when it ends; the report says the person was away', async () => {
  const w = world()
  w.mem.set(settingStoreKey('night.mode'), 'off')
  expect(await tasksCommand(w.io, w.ops, 'night')).toBe(NIGHT_OFF)
  w.mem.set(settingStoreKey('night.mode'), 'on')
  w.mem.set(POLICY, 'off')
  const said = await tasksCommand(w.io, w.ops, 'night')
  await w.act()
  expect(said).toMatch(/^Night run started: 2 tasks/)
  expect(w.mem.get(AWAY_KEY)).toEqual({ at: NOW })
  expect(w.mem.get(POLICY)).toBe('careful')
  expect(w.mem.get(NIGHT_KEY)).toEqual({ sid: SID, at: NOW })
  const run = await loadRun(w.io)
  expect(run?.status).toBe('running')
  expect(run?.night?.strict).toEqual({ away: NOW, policy: 'off' })
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(1)
  w.setNow(NOW + HOUR)
  await tick(w.io, w.ops, [{ id: 'ag1', status: 'completed' }])
  await w.act()
  expect(w.calls.filter(c => c.startsWith('spawn'))).toHaveLength(2)
  expect(w.mem.get(AWAY_KEY)).toEqual({ at: NOW })
  w.setNow(NOW + 2 * HOUR)
  await tick(w.io, w.ops, [{ id: 'ag2', status: 'failed' }])
  const after = await loadRun(w.io)
  expect(after?.status).toBe('done')
  expect(after?.night).toBeUndefined()
  expect(w.mem.has(AWAY_KEY)).toBe(false)
  expect(w.mem.get(POLICY)).toBe('off')
  expect(w.mem.has(NIGHT_KEY)).toBe(false)
  const report = parseReports(w.mem.get(HISTORY_KEY))[0]
  expect(report?.night).toEqual({ away: true })
  expect(w.mem.get(REPORT_KEY)).toBe(report?.id)
})

test('on battery the night run pauses and lets go of keep-awake; with power back it goes on', async () => {
  const w = world()
  await tasksCommand(w.io, w.ops, 'night')
  w.setPower(BATTERY)
  forgetPower()
  w.setNow(NOW + MIN)
  let run = await tick(w.io, w.ops)
  expect(run?.status).toBe('paused')
  expect(run?.night?.wait).toBe('power')
  expect(w.mem.has(NIGHT_KEY)).toBe(false)
  expect(keepWatching(run)).toBe(true)
  // Read at most once a minute.
  const reads = w.calls.filter(c => c.startsWith('run pmset')).length
  await tick(w.io, w.ops)
  expect(w.calls.filter(c => c.startsWith('run pmset')).length).toBe(reads)
  w.setPower(MAINS)
  w.setNow(NOW + 3 * MIN)
  run = await tick(w.io, w.ops)
  expect(run?.status).toBe('running')
  expect(run?.night?.wait).toBeUndefined()
  expect(w.mem.get(NIGHT_KEY)).toEqual({ sid: SID, at: NOW })
})

test('a full plan window pauses the night run until the reset; the night cost limit ends the night and keeps the report', async () => {
  const w = world()
  await tasksCommand(w.io, w.ops, 'load')
  await tasksCommand(w.io, w.ops, 'limit night 1')
  await tasksCommand(w.io, w.ops, 'night')
  w.mem.set(APP_USAGE_KEY, { at: NOW + MIN, windows: [{ label: '5-hour', percent: 100, resetsAt: NOW + 2 * HOUR }] })
  w.setNow(NOW + MIN)
  let run = await tick(w.io, w.ops)
  expect(run?.status).toBe('paused')
  expect(run?.resumeAt).toBeDefined()
  expect(run?.night).toBeDefined()
  expect(keepWatching(run)).toBe(true)

  const w2 = world()
  await tasksCommand(w2.io, w2.ops, 'load')
  await tasksCommand(w2.io, w2.ops, 'limit night 1')
  await tasksCommand(w2.io, w2.ops, 'night')
  const raw = w2.mem.get(`cockpit:orch:${SID}`) as { tasks: { usd?: number }[] }
  raw.tasks[0]!.usd = 1.5
  w2.mem.set(`cockpit:orch:${SID}`, raw)
  w2.setNow(NOW + MIN)
  run = await tick(w2.io, w2.ops)
  expect(run?.status).toBe('paused')
  expect(run?.costPause).toBe(1)
  expect(run?.night).toBeUndefined()
  expect(w2.mem.has(AWAY_KEY)).toBe(false)
  expect(parseReports(w2.mem.get(HISTORY_KEY))[0]?.night).toEqual({ away: true })
})

test('a run that is stored keeps its night and the night limit; a person who pauses ends the night', async () => {
  const w = world()
  await tasksCommand(w.io, w.ops, 'night')
  expect(parseRun(w.mem.get(`cockpit:orch:${SID}`))?.night?.at).toBe(NOW)
  expect(await tasksCommand(w.io, w.ops, 'limit night 0')).toMatch(/^A night run pauses at the run limit\./)
  await tasksCommand(w.io, w.ops, 'pause')
  expect((await loadRun(w.io))?.night).toBeUndefined()
  expect(w.mem.has(AWAY_KEY)).toBe(false)
})

test('keep-awake holds for a night run in every away choice', () => {
  const facts = { working: 0, waiting: { count: 0 }, background: 0, night: true }
  expect(awakeReason('off', facts, NOW)?.reason).toBe('night')
  expect(awakeReason('phone', facts, NOW)?.reason).toBe('night')
  expect(awakeReason('off', { ...facts, night: false }, NOW)).toBeUndefined()
})

test('promises: found in an answer, a few words each, secrets masked, at most 10 and 80 characters', () => {
  expect(findPromises("Done with the header. I'll update the README later. Next I will run the tests.")).toEqual(['update the README', 'run the tests'])
  expect(findPromises('After this I will clean up the old helpers.\nTODO later: rename the store keys')).toEqual(['clean up the old helpers', 'rename the store keys'])
  expect(findPromises('```\nI will do it later\n```\nAll done.')).toEqual([])
  const secret = ['ghp', '_', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'].join('')
  const found = findPromises(`Next I will rotate the token ${secret} for you.`)
  expect(found).toHaveLength(1)
  expect(found[0]).not.toContain(secret)
  const long = findPromises(`Next I will ${'refactor '.repeat(5)}${'x'.repeat(120)} module.`)[0] ?? ''
  expect(long.length).toBeLessThanOrEqual(PROMISE_CHARS)
  let list: string[] = []
  for (let n = 1; n <= 14; n++) list = addPromises(list, [`task ${n}`])
  expect(list).toHaveLength(PROMISE_MAX)
  expect(list[0]).toBe('task 5')
  expect(addPromises(['Run the tests'], ['run the tests'])).toEqual(['Run the tests'])
  expect(parsePromises(['a', 3, 'b'])).toEqual(['a', 'b'])
  expect(promisePrompt('run the tests')).toBe('Please do what you said you would: run the tests')
})

test('promises clear: done alone takes the oldest, done 2 the second, done with words the one that holds them', () => {
  const list = ['run the tests', 'update the README', 'clean up']
  expect(donePromise(list, 'done')).toEqual(['update the README', 'clean up'])
  expect(donePromise(list, 'Done 2')).toEqual(['run the tests', 'clean up'])
  expect(donePromise(list, 'done: readme')).toEqual(['run the tests', 'clean up'])
  expect(donePromise(list, 'done 9')).toBeUndefined()
  expect(donePromise(list, 'all good, thanks')).toBeUndefined()
  expect(donePromise([], 'done')).toBeUndefined()
})

test('the ledger in a session: an answer adds, the store gets it only when it changed, done clears; recap off keeps nothing', async () => {
  const w = world()
  await noteAnswer(w.io, "I'll write the docs later.")
  expect(nightMem.promises).toEqual(['write the docs'])
  expect(w.mem.get(`cockpit:promises:${SID}`)).toEqual(['write the docs'])
  await notePrompt(w.io, 'thanks')
  expect(nightMem.lastPrompt).toBe(NOW)
  expect(nightMem.promises).toHaveLength(1)
  await notePrompt(w.io, 'done')
  expect(nightMem.promises).toEqual([])
  expect(w.mem.has(`cockpit:promises:${SID}`)).toBe(false)
  w.mem.set(settingStoreKey('recap.mode'), 'off')
  await noteAnswer(w.io, "I'll write the docs later.")
  expect(nightMem.promises).toEqual([])
})

test('the morning lead: a night run that ended while away leads Where was I, with Show me and Fix it, until the person writes', () => {
  const report = { id: 'r1', name: 'Nightly', endedAt: NOW, status: 'done' as const, done: 3, failed: 1, other: 0, usd: 2.5, night: { away: true }, tasks: [{ n: 1, text: 'Fix the header', state: 'done' as const, check: 'none' as const }, { n: 2, text: 'Write tests', state: 'failed' as const, check: 'none' as const }] }
  const lead = nightLead(report, NOW + HOUR, undefined, 12 * HOUR)
  expect(lead).toBeDefined()
  expect(nightLead(report, NOW + HOUR, NOW + MIN, 12 * HOUR)).toBeUndefined()
  expect(nightLead({ ...report, night: { away: false } }, NOW + HOUR, undefined, 12 * HOUR)).toBeUndefined()
  expect(nightLead({ ...report, night: undefined }, NOW + HOUR, undefined, 12 * HOUR)).toBeUndefined()
  expect(nightLead(report, NOW + 13 * HOUR, undefined, 12 * HOUR)).toBeUndefined()
  expect(nightHeadLine(lead!)).toBe('Night run: 3 done, 1 failed · about\u00a0$2.50')
  expect(nightFixPrompt(lead!)).toBe('Please fix what failed in my night task run. The tasks that failed: 2. Write tests.')
  const rows = welcomeRows({ end: 'stopped', edits: 0, night: lead!, promises: ['run the tests'] }, s => s)
  expect(rows.map(r => r.key)).toEqual(['w-night', 'w-night-fix', 'w-stopped', 'w-promise-0'])
  expect(rows[0]).toMatchObject({ right: 'Show me', press: { do: 'run' } })
  expect(rows[1]).toMatchObject({ title: 'Fix the failed night tasks', right: 'Fix it', press: { do: 'nightFix' } })
  expect(rows[3]).toMatchObject({ title: 'Claude said it would: run the tests', right: 'Continue', press: { do: 'promise', n: 0 } })
  expect(nightRows({ edits: 0, night: { ...lead!, failedTasks: [] } }, s => s).map(r => r.key)).toEqual(['w-night'])
  // No break in this session: the night still leads, the rest waits for a break.
  const facts = { now: NOW + HOUR, open: [], more: 0, welcome: { end: 'stopped' as const, edits: 0, night: lead! } }
  expect(welcomeDue(facts)).toBe(true)
  expect(backView(facts, s => s).groups[0]?.rows.map(r => r.key)).toEqual(['w-night', 'w-night-fix'])
  expect(welcomeDue({ ...facts, welcome: { edits: 0 } })).toBe(false)
})

test('every night word has a Swedish line', () => {
  const SV = byEnglish('sv')
  for (const w of NIGHT_WORDS) expect(SV[w] === undefined ? w : 'ok').toBe('ok')
})

test('a long message that starts with done is a request, not a tick', () => {
  expect(donePromise(['run the tests'], 'Done with that, now fix the login page')).toBeUndefined()
  expect(donePromise(['run the tests'], 'done 1')).toEqual([])
})

test('the keep-awake claim holds only while its session is live and for at most about 12 hours', () => {
  const claim = { sid: SID, at: NOW }
  const live = [{ sessionId: SID, updatedAt: NOW + HOUR }]
  expect(nightClaimLive(claim, live, NOW + HOUR)).toBe(true)
  expect(nightClaimLive(undefined, live, NOW + HOUR)).toBe(false)
  // Its session's record stopped beating (the session ended or crashed), or is gone.
  expect(nightClaimLive(claim, live, NOW + 2 * HOUR)).toBe(false)
  expect(nightClaimLive(claim, [{ sessionId: 'other', updatedAt: NOW + HOUR }], NOW + HOUR)).toBe(false)
  // Older than the limit, even with a live session; or from the future.
  const late = NOW + NIGHT_CLAIM_MAX_MS + MIN
  expect(nightClaimLive(claim, [{ sessionId: SID, updatedAt: late }], late)).toBe(false)
  expect(nightClaimLive({ sid: SID, at: NOW + HOUR }, live, NOW)).toBe(false)
})
