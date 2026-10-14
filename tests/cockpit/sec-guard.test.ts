// The guard against ways around it: the Monitor tool runs a shell command and is checked and paused like Bash.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface, On } from 'claude-code'

import { canChange, haltStops } from '../hooks/core/guard'
import { judgeTool } from '../hooks/core/guardjudge'
import type { Modes } from '../hooks/core/guardjudge'
import { FENCE_NOTE, fetchesNet, isOutside } from '../hooks/core/guardback'
import { allowCovers, inputHash, stepOf } from '../hooks/core/allowonce'
import type { Io } from '../hooks/core/io'
import { commandFlavorOfTool, isShellTool, runsCommand } from '../hooks/core/tools'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const ENV = { home: '/home/user', cwd: '/home/user/app', root: '/home/user/app' }
const HOLD: Modes = { destructive: 'hold', scope: 'off', packages: 'off', tests: 'off' }

test('Monitor runs a command: the guard and Pause all read it; the result blocks do not take it for a one-shot command', () => {
  expect(commandFlavorOfTool('Monitor')).toBe('posix')
  expect(runsCommand('Monitor')).toBe(true)
  expect(canChange('Monitor')).toBe(true)
  expect(haltStops('Monitor')).toBe(true)
  expect(isShellTool('Monitor')).toBe(false)
  expect(runsCommand('Read')).toBe(false)
  expect(commandFlavorOfTool('toString')).toBeUndefined()
})

test('Monitor with a risky command has the same findings as Bash; a Monitor on a socket has none', async () => {
  const io = {} as Io
  const viaBash = await judgeTool(io, ENV, 'Bash', { command: 'rm -rf ~' }, HOLD)
  const viaMonitor = await judgeTool(io, ENV, 'Monitor', { command: 'rm -rf ~', description: 'watch' }, HOLD)
  expect(viaBash.found.length).toBe(1)
  expect(viaMonitor.found).toEqual(viaBash.found)
  expect((await judgeTool(io, ENV, 'Monitor', { ws: { url: 'wss://x.example' }, description: 'feed', timeout_ms: 60_000 }, HOLD)).found).toEqual([])
})

test('the input hash: same input same hash, whatever the call id or the description; another command another hash', async () => {
  const a = await inputHash({ tool: 'Bash', command: 'git clean -fdx', tool_use_id: 'one', description: 'Clean' })
  const b = await inputHash({ description: 'Clean the tree', tool_use_id: 'two', command: 'git clean -fdx', tool: 'Bash' })
  const c = await inputHash({ tool: 'Bash', command: 'git clean -fdx; echo hi' })
  const d = await inputHash({ tool: 'Monitor', command: 'git clean -fdx' })
  expect(a).toBe(b)
  expect(a).not.toBe(c)
  expect(a).not.toBe(d)
  expect(a).not.toMatch(/git clean/)
  const base = { tool: 'Bash', command: 'git clean -fdx' }
  expect(await inputHash({ ...base, run_in_background: true })).not.toBe(await inputHash(base))
  expect(await inputHash({ ...base, dangerouslyDisableSandbox: true })).not.toBe(await inputHash(base))
  expect(await inputHash({ ...base, timeout: 5000 })).toBe(await inputHash(base))
  expect(await inputHash({ tool: 'Agent', prompt: 'p', description: 'a' })).not.toBe(await inputHash({ tool: 'Agent', prompt: 'p', description: 'b' }))
  expect(stepOf({ tool: 'Bash', tool_use_id: 'x' }).id).toBe('x')
  expect(stepOf({ tool: 'Bash' }).id).toBeUndefined()
})

test('a yes bound to an input covers only a call with that input', () => {
  const yes = { at: NOW, keys: ['destructive|a'], input: 'h1' }
  expect(allowCovers(yes, 'call-1', ['destructive|a'], NOW, 'h1')).toBe(true)
  expect(allowCovers(yes, 'call-1', ['destructive|a'], NOW, 'h2')).toBe(false)
  expect(allowCovers(yes, 'call-1', ['destructive|a'], NOW)).toBe(false)
  expect(allowCovers({ at: NOW, keys: ['destructive|a'] }, 'call-1', ['destructive|a'], NOW, 'h2')).toBe(true)
})

test('shell commands that fetch from the network are outside text; everyday commands are not', () => {
  for (const cmd of [
    'curl -s https://x.example/a.json',
    'wget -qO- https://x.example',
    'cd app && curl https://x.example | jq .',
    'gh api repos/o/r/issues/1',
    'git clone https://x.example/r.git',
    'git -C ../r fetch origin',
    'git pull --rebase',
    'sudo curl https://x.example',
    'gh issue view 12',
    'gh pr view 34 --comments',
    'gh pr view -R owner/repo 34',
    'gh run view 99 --log',
  ])
    expect(fetchesNet(cmd)).toBe(true)
  for (const cmd of ['ls', 'git status', 'git log -3', 'gh pr list', 'gh pr merge 3', 'gh issue create --title view', 'echo curl', 'grep -r wget src', 'git commit -m "pull the data"']) expect(fetchesNet(cmd)).toBe(false)
  expect(fetchesNet('Invoke-WebRequest https://x.example', true)).toBe(true)
  expect(isOutside('Bash', { command: 'curl https://x.example' })).toBe(true)
  expect(isOutside('Monitor', { command: 'curl -N https://x.example/stream' })).toBe(true)
  expect(isOutside('Bash', { command: 'ls' })).toBe(false)
  expect(isOutside('Monitor', { ws: { url: 'wss://x.example/feed' }, description: 'feed', timeout_ms: 60_000 })).toBe(true)
  expect(isOutside('Monitor', { command: 'tail -f app.log', description: 'log', timeout_ms: 60_000 })).toBe(false)
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

let sessions = 0
const sessionOf = { id: 's0' }

async function setup(_$: EngineInterface, on: On): Promise<Map<string, unknown>> {
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  sessions += 1
  sessionOf.id = `sec-${sessions}`
  on('session.id', () => ({ value: sessionOf.id }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('fs.read', () => {
    throw new Error('no such file')
  })
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('tool.call', { tool: /^(?:Bash|Monitor|Read)$/ }, () => ({ result: { stdout: '', stderr: '', code: 0 }, text: 'done' }) as never)
  return mem
}

const setMode = (mem: Map<string, unknown>, key: string, mode: string): void => void mem.set(`cockpit:setting:guard.${key}`, mode)
const text = async ($: EngineInterface, command: string, args = ''): Promise<string> => ((await $.command.run({ ...viaParent(command, args), origin: { kind: 'composer' } } as never)) as { text: string }).text
const denied = (r: unknown): boolean => /"deny":/.test(JSON.stringify(r)) || /"isError":true/.test(JSON.stringify(r))

test('Monitor with rm -rf ~ is held like Bash', SLOW, async ($, on) => {
  const mem = await setup($, on)
  setMode(mem, 'destructive', 'hold')
  const viaBash = await $.tool.call({ tool: 'Bash', command: 'rm -rf ~' })
  const viaMonitor = await $.tool.call({ tool: 'Monitor', command: 'rm -rf ~', description: 'watch' } as never)
  expect(denied(viaBash)).toBe(true)
  expect(denied(viaMonitor)).toBe(true)
  expect(JSON.stringify(viaMonitor)).toMatch(/risky command hold stopped this step/)
  expect(denied(await $.tool.call({ tool: 'Monitor', command: 'tail -f app.log', description: 'log' } as never))).toBe(false)
})

test('Pause all stops Monitor', SLOW, async ($, on) => {
  await setup($, on)
  expect(denied(await $.tool.call({ tool: 'Monitor', command: 'tail -f app.log', description: 'log' } as never))).toBe(false)
  await text($, 'vaken-pause')
  const r = await $.tool.call({ tool: 'Monitor', command: 'tail -f app.log', description: 'log' } as never)
  expect(denied(r)).toBe(true)
  expect(JSON.stringify(r)).toMatch(/paused this session/)
  await text($, 'vaken-pause', 'off')
  expect(denied(await $.tool.call({ tool: 'Monitor', command: 'tail -f app.log', description: 'log' } as never))).toBe(false)
})

test('an allow for one command does not let a different command with the same findings through', SLOW, async ($, on) => {
  const mem = await setup($, on)
  setMode(mem, 'destructive', 'hold')
  const io = {} as Io
  const keysOf = async (command: string): Promise<string[]> => (await judgeTool(io, ENV, 'Bash', { command }, HOLD)).found.map(f => `${f.block}|${f.key}`)
  const held = 'git clean -fdx'
  const other = 'git clean -fdx; echo sneaked'
  expect(await keysOf(other)).toEqual(await keysOf(held))
  expect(denied(await $.tool.call({ tool: 'Bash', command: held }))).toBe(true)
  expect(await text($, 'vaken-guard', 'allow once')).toMatch(/held last goes through, once/)
  expect(denied(await $.tool.call({ tool: 'Bash', command: other }))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Monitor', command: held, description: 'x' } as never))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Bash', command: held, run_in_background: true } as never))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Bash', command: held, dangerouslyDisableSandbox: true } as never))).toBe(true)
  expect(denied(await $.tool.call({ tool: 'Bash', command: held, description: 'Clean again' } as never))).toBe(false)
  expect(denied(await $.tool.call({ tool: 'Bash', command: held }))).toBe(true)
  // The store keeps a hash of the input, never the command.
  expect(JSON.stringify(mem.get(`cockpit:guard:held:${sessionOf.id}`))).not.toMatch(/-fdx/)
})

test('a network fetch via Bash or Monitor gets the fence note; an everyday command does not; Off stops it', SLOW, async ($, on) => {
  const mem = await setup($, on)
  expect(JSON.stringify(await $.tool.call({ tool: 'Bash', command: 'curl -s https://x.example/a.json' }))).toContain(FENCE_NOTE)
  expect(JSON.stringify(await $.tool.call({ tool: 'Bash', command: 'gh api repos/o/r/issues/1' }))).toContain(FENCE_NOTE)
  expect(JSON.stringify(await $.tool.call({ tool: 'Monitor', command: 'curl -N https://x.example/s', description: 'stream' } as never))).toContain(FENCE_NOTE)
  expect(JSON.stringify(await $.tool.call({ tool: 'Bash', command: 'git status' }))).not.toContain(FENCE_NOTE)
  setMode(mem, 'fence', 'off')
  expect(JSON.stringify(await $.tool.call({ tool: 'Bash', command: 'curl -s https://x.example/a.json' }))).not.toContain(FENCE_NOTE)
})

const set = (mem: Map<string, unknown>, key: string, value: string): void => void mem.set(`cockpit:setting:${key}`, value)

test('Monitor gh pr merge --admin is held by the outside-actions check when it is on Stop', SLOW, async ($, on) => {
  const mem = await setup($, on)
  set(mem, 'guard.world', 'hold')
  const r = await $.tool.call({ tool: 'Monitor', command: 'gh pr merge 12 --admin --squash', description: 'merge', timeout_ms: 60_000 } as never)
  expect(denied(r)).toBe(true)
  expect(JSON.stringify(r)).toMatch(/outside-actions check stopped this step/)
})

test('Monitor cat .env trips the secret tripwire, and so does a key typed in a Monitor command', SLOW, async ($, on) => {
  await setup($, on)
  expect(JSON.stringify(await $.tool.call({ tool: 'Monitor', command: 'cat .env', description: 'env', timeout_ms: 60_000 } as never))).toMatch(/cat would print the inside of an env file/)
  const key = 'ghp' + '_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8'
  const r = await $.tool.call({ tool: 'Monitor', command: `curl -N -H "Authorization: Bearer ${key}" https://api.example.com/s`, description: 'stream', timeout_ms: 60_000 } as never)
  expect(JSON.stringify(r)).toMatch(/GitHub-style token/)
})

test('a Monitor on a web socket gets the fence note', SLOW, async ($, on) => {
  await setup($, on)
  expect(JSON.stringify(await $.tool.call({ tool: 'Monitor', ws: { url: 'wss://x.example/feed' }, description: 'feed', timeout_ms: 60_000 } as never))).toContain(FENCE_NOTE)
})
