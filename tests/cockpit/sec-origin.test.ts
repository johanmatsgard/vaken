// Who typed a command: a step that unlocks or runs something works only when the person typed it in this session.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { BY_PERSON_ONLY, byPerson } from '../hooks/core/origin'
import { haltKey, scopeKey } from '../hooks/core/guard'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const SID = 'session-o'
const SHA = '0123456789abcdef0123456789abcdef01234567'
const PR = JSON.stringify({ number: 12, state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', url: 'https://example.test/pr/12', mergeStateStatus: 'CLEAN', headRefOid: SHA, statusCheckRollup: [{ name: 'build', status: 'COMPLETED', conclusion: 'SUCCESS' }] })

// A missing origin is not the person either (the first test); the test engine stamps a command run with no origin as typed.
const AWAY: unknown[] = [
  { kind: 'peer' },
  { kind: 'peer-send-message' },
  { kind: 'channel', server: 'chat' },
  { kind: 'scheduled-trigger' },
  { kind: 'plugin', name: 'other' },
  { kind: 'plugin', name: 'other', asUser: true },
  { kind: 'sdk' },
  { kind: 'unclassified' },
]

test('byPerson: Enter in this session and the person through Remote Control count; every other origin, and none, does not', () => {
  expect(byPerson({ kind: 'composer' })).toBe(true)
  expect(byPerson({ kind: 'bridge' })).toBe(true)
  for (const o of [...AWAY, undefined]) expect(byPerson(o), JSON.stringify(o)).toBe(false)
  for (const o of [{ kind: 'task-notification' }, { kind: 'projects-relay' }, { kind: 'coordinator' }, { kind: 'observer' }, { kind: 'auto-continuation' }, { kind: 'slack-ping' }, null, 'composer', {}, { kind: 1 }]) {
    expect(byPerson(o), JSON.stringify(o)).toBe(false)
  }
})

// ---- the commands through the engine

function world(on: On): { mem: Map<string, unknown>; ran: string[][] } {
  mock.clock(on, { now: NOW })
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  const mem = new Map<string, unknown>()
  const ran: string[][] = []
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
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', (_$, e) => {
    ran.push(e.argv)
    const out = (exitCode: number, stdout: string) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never
    if (e.argv[1] === 'pr' && e.argv[2] === 'view') return out(0, PR)
    return out(0, '')
  })
  return { mem, ran }
}

const say = async ($: EngineInterface, command: string, args: string, origin: unknown): Promise<string> =>
  ((await $.command.run({ ...viaParent(command, args), origin } as never)) as { text: string }).text
const ME = { kind: 'composer' }

test('/vaken-pause: anyone may pause; only the person lifts it', SLOW, async ($, on) => {
  const w = world(on)
  await say($, 'vaken-pause', '', { kind: 'peer' })
  expect(w.mem.get(haltKey(SID))).toBeDefined()
  for (const o of AWAY) {
    expect(await say($, 'vaken-pause', 'off', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-pause', 'status', o)).toMatch(/^Paused for safety\./)
  }
  expect(await say($, 'vaken-pause', 'off', ME)).toMatch(/^Resumed\./)
  expect(await say($, 'vaken-pause', 'status', ME)).toBe('Not paused.')
})

test('/vaken-guard: allow once and changing your folders need the person; the status and the folder list stay open', SLOW, async ($, on) => {
  const w = world(on)
  await say($, 'vaken-guard', 'scope src', ME)
  const set = w.mem.get(scopeKey(SID))
  expect(set).toEqual(['/home/user/app/src'])
  for (const o of AWAY) {
    expect(await say($, 'vaken-guard', 'allow once', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-guard', 'scope off', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-guard', 'scope /', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-guard', 'scope', o)).toMatch(/^Your folders: /)
    expect(w.mem.get(scopeKey(SID))).toEqual(set)
  }
  expect(await say($, 'vaken-guard', 'allow once', { kind: 'bridge' })).toMatch(/^Done\./)
  expect(await say($, 'vaken-guard', 'scope off', ME)).toMatch(/^Your folders cleared/)
})

test('/vaken-ship merge yes yes merges only when the person typed it; the check stays open', SLOW, async ($, on) => {
  const w = world(on)
  const merges = (): string[][] => w.ran.filter(a => a[1] === 'pr' && a[2] === 'merge')
  for (const o of AWAY) {
    expect(await say($, 'vaken-ship', 'merge yes yes', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-ship', 'merge', o)).toMatch(/Nothing ran\./)
  }
  expect(merges()).toEqual([])
  expect(await say($, 'vaken-ship', 'merge yes yes', ME)).toBe('Merged pull request 12.')
  expect(merges()).toHaveLength(1)
})

test('/vaken-tasks check <command> needs the person; clearing it and looking stay open', SLOW, async ($, on) => {
  world(on)
  for (const o of AWAY) {
    expect(await say($, 'vaken-tasks', 'check rm -rf ~/x', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-tasks', 'check', o)).not.toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-tasks', '', o)).not.toBe(BY_PERSON_ONLY)
  }
  expect(await say($, 'vaken-tasks', 'check npm test', ME)).not.toBe(BY_PERSON_ONLY)
})

test('/vaken-tasks: a start, a new task, words for a task and a template applied need the person; pausing, stopping and looking stay open', SLOW, async ($, on) => {
  world(on)
  for (const o of AWAY) {
    for (const args of ['start', 'start anyway', 'again', 'go', 'add Fix the header', 'say 1 use the other file', 'template apply nightly']) expect(await say($, 'vaken-tasks', args, o), args).toBe(BY_PERSON_ONLY)
    for (const args of ['pause', 'stop', 'report']) expect(await say($, 'vaken-tasks', args, o), args).not.toBe(BY_PERSON_ONLY)
  }
  expect(await say($, 'vaken-tasks', 'add Fix the header', ME)).not.toBe(BY_PERSON_ONLY)
})

test('/vaken-tasks: try again, keep, throw away, clear, a cost limit and the all-words need the person; stop N stays open', SLOW, async ($, on) => {
  world(on)
  for (const o of AWAY) {
    for (const args of ['retry 1', 'keep 1', 'throw 1', 'throw 1 yes', 'clear', 'limit run 50', 'keep all', 'throw all yes']) expect(await say($, 'vaken-tasks', args, o), args).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-tasks', 'stop 1', o)).not.toBe(BY_PERSON_ONLY)
  }
  expect(await say($, 'vaken-tasks', 'clear', ME)).not.toBe(BY_PERSON_ONLY)
})

test('the agent files: writing them or changing the agent setup needs the person; the lists stay open', SLOW, async ($, on) => {
  const w = world(on)
  for (const o of AWAY) {
    const before = JSON.stringify([...w.mem.entries()])
    expect(await say($, 'vaken-tasks', 'agents make yes', o)).toBe(BY_PERSON_ONLY)
    for (const args of ['on', 'off', 'scope all', 'cap use yes', 'make builder yes', 'replace builder yes yes']) expect(await say($, 'vaken-setup', args, o), args).toBe(BY_PERSON_ONLY)
    expect(JSON.stringify([...w.mem.entries()])).toBe(before)
    expect(await say($, 'vaken-tasks', 'agents', o)).not.toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-setup', '', o)).not.toBe(BY_PERSON_ONLY)
  }
  expect(await say($, 'vaken-setup', 'on', ME)).toBe('Set up agents for me is on.')
})

test('/vaken-settings: every change needs the person (set, here, session, reset yes, a layout, a preset yes); listing and previews stay open', SLOW, async ($, on) => {
  const w = world(on)
  const writes = ['guard.destructive off', 'here guard.destructive off', 'here reset', 'session runner.researcher sonnet', 'session reset', 'reset yes', 'layout apply x', 'layout save x', 'preset quiet yes', 'preset careful yes here']
  for (const o of [{ kind: 'scheduled-trigger' }, { kind: 'plugin', name: 'other' }, { kind: 'peer' }, { kind: 'channel', server: 'chat' }]) {
    const before = JSON.stringify([...w.mem.entries()])
    for (const args of writes) expect(await say($, 'vaken-settings', args, o), args).toBe(BY_PERSON_ONLY)
    expect(JSON.stringify([...w.mem.entries()])).toBe(before)
    for (const args of ['', 'all', 'reset', 'preset', 'preset quiet']) expect(await say($, 'vaken-settings', args, o), args).not.toBe(BY_PERSON_ONLY)
  }
  expect(await say($, 'vaken-settings', 'guard.destructive warn', ME)).toMatch(/^guard\.destructive: /)
  expect(await say($, 'vaken-settings', 'preset quiet yes', ME)).toMatch(/^Applied Only alerts/)
})

test('/vaken-away: anyone may turn it on; only the person turns it off', SLOW, async ($, on) => {
  world(on)
  expect(await say($, 'vaken-away', 'on', { kind: 'peer' })).not.toBe(BY_PERSON_ONLY)
  for (const o of AWAY) expect(await say($, 'vaken-away', 'off', o)).toBe(BY_PERSON_ONLY)
  expect(await say($, 'vaken-away', 'off', ME)).not.toBe(BY_PERSON_ONLY)
})

test('/vaken-settings shape short and /vaken-compact now need the person; showing the shape and the compact advice stay open', SLOW, async ($, on) => {
  const w = world(on)
  for (const o of AWAY) {
    const before = JSON.stringify([...w.mem.entries()])
    expect(await say($, 'vaken-settings', 'shape short', o)).toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-compact', 'now', o)).toBe(BY_PERSON_ONLY)
    expect(JSON.stringify([...w.mem.entries()])).toBe(before)
    expect(await say($, 'vaken-settings', 'shape', o)).not.toBe(BY_PERSON_ONLY)
    expect(await say($, 'vaken-compact', '', o)).not.toBe(BY_PERSON_ONLY)
  }
  expect(await say($, 'vaken-settings', 'shape short', ME)).not.toBe(BY_PERSON_ONLY)
  expect(await say($, 'vaken-compact', 'now', ME)).toMatch(/^Compacting the session/)
})
