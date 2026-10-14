// The Guard follows the person's own setup, the command list keeps the program and the kind only.
import { expect, mock } from 'claude-code/testing'
import { posix } from './fspath'
import type { EngineInterface, On } from 'claude-code'

import { DEFAULT_HOLD_WHY, hostView, viewFrom } from '../hooks/core/guardhost'
import { GUARD_SETTINGS, statusText } from '../hooks/core/guard'
import { NPM_REGISTRY, npmViewArgv } from '../hooks/core/guardjudge'
import { GUARDWORLD_SETTINGS } from '../hooks/core/guardworld'
import { commandsText, parseEntries, safeLabelOf } from '../hooks/core/guardcmds'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-10T12:00:00Z')

test('viewFrom: allowed unasked and auto mode are "unasked"; a normal ask and a refusal are "asks"; anything else is unknown', () => {
  expect(viewFrom('allow', undefined)).toBe('unasked')
  expect(viewFrom('ask', 'auto')).toBe('unasked')
  expect(viewFrom('ask', 'default')).toBe('asks')
  expect(viewFrom('ask', 'acceptEdits')).toBe('asks')
  expect(viewFrom('ask', undefined)).toBe('asks')
  expect(viewFrom('deny', 'auto')).toBe('asks')
  expect(viewFrom('maybe', 'default')).toBe('unknown')
  expect(viewFrom(undefined, undefined)).toBe('unknown')
  expect(viewFrom('ask', 5)).toBe('unknown')
})

test('hostView reads the check and, for an ask, the default mode; a failure or odd shape is unknown', async () => {
  const mode = (m: unknown) => async () => ({ permissions: { defaultMode: m } })
  expect(await hostView(async () => ({ decision: 'allow' }), mode('default'))).toBe('unasked')
  expect(await hostView(async () => ({ decision: 'ask' }), mode('auto'))).toBe('unasked')
  expect(await hostView(async () => ({ decision: 'ask' }), mode('default'))).toBe('asks')
  expect(await hostView(async () => ({ decision: 'ask' }), async () => ({}))).toBe('asks')
  expect(await hostView(async () => ({ decision: 'ask' }), async () => undefined)).toBe('unknown')
  expect(await hostView(async () => ({ decision: 'ask' }), async () => { throw new Error('x') })).toBe('unknown')
  expect(await hostView(async () => { throw new Error('x') }, mode('auto'))).toBe('unknown')
  expect(await hostView(async () => undefined, mode('auto'))).toBe('unknown')
})

test('the Guard words say how the default is read, and the rows still default to Warn', () => {
  expect(statusText({ modes: { destructive: 'warn', scope: 'warn', packages: 'warn', tests: 'warn' }, halted: false, allowPending: false, scope: [], last: [] })).toMatch(/stop by default when Claude Code would not ask first.*If vaken cannot tell, they warn/)
  for (const s of [...GUARD_SETTINGS, ...GUARDWORLD_SETTINGS].filter(x => x.options.some(o => o.value === 'hold'))) {
    expect(s.default).toBe('warn')
    expect(s.note.split(/\s+/).length).toBeLessThanOrEqual(16)
  }
})

type Answer = { decision?: string; throws?: boolean }
const host: { check: Answer; defaultMode: string | undefined; asked: number; runs: Array<{ argv: string[]; cwd?: string }>; exit: number } = { check: { decision: 'ask' }, defaultMode: 'default', asked: 0, runs: [], exit: 1 }

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

const OK = () => ({ result: { stdout: '', stderr: '', code: 0 }, text: 'done' }) as never

async function setup(_$: EngineInterface, on: On, answer: Answer, defaultMode?: string): Promise<Map<string, unknown>> {
  host.check = answer
  host.defaultMode = defaultMode
  host.asked = 0
  host.runs = []
  host.exit = 1
  mock.clock(on, { now: NOW })
  const mem = memStore(on)
  mock.session(on)
  mock.env(on, { HOME: '/home/user' })
  on('session.id', () => ({ value: 'session-a' }))
  on('session.cwd', () => ({ value: '/home/user/app' }))
  on('session.root', () => ({ value: '/home/user/app' }))
  on('fs.read', (_$, e) => {
    throw new Error(`no such file ${posix(e.path)}`)
  })
  on('process.run', (_$, e) => {
    host.runs.push({ argv: [...e.argv], cwd: (e.init as { cwd?: string } | undefined)?.cwd })
    return { value: { exitCode: host.exit, stdout: host.exit === 0 ? '{"time.created":"2015-01-01T00:00:00.000Z","dist.unpacked-size":2048,"license":"MIT"}' : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('tool.call', { tool: /^(?:Bash|Write|Edit|Read|Grep)$/ }, OK)
  on('tool.check', () => {
    host.asked += 1
    if (host.check.throws === true) throw new Error('cannot ask')
    return { decision: host.check.decision } as never
  })
  on('settings.read', () => ({ value: host.defaultMode === undefined ? {} : { permissions: { defaultMode: host.defaultMode } } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  return mem
}

const denied = (r: unknown): boolean => /"deny":/.test(JSON.stringify(r)) || /"isError":true/.test(JSON.stringify(r))
const whats = (mem: Map<string, unknown>): string[] => ((mem.get('cockpit:ledger:compact') ?? []) as Array<{ what: string }>).map(l => l.what)
const PUSH = { tool: 'Bash', command: 'git push --force origin main' } as const
const SECRET_READ = { tool: 'Read', file_path: '/home/user/app/.env' } as const

test('a host that asks (default mode): the worst kinds only warn, no double asking', SLOW, async ($, on) => {
  const mem = await setup($, on, { decision: 'ask' }, 'default')
  const a = await $.tool.call(PUSH)
  expect(denied(a)).toBe(false)
  expect(JSON.stringify(a)).toMatch(/saw a risk/)
  expect(whats(mem)).toEqual(['Warned about a risky command'])
  expect(denied(await $.tool.call(SECRET_READ))).toBe(false)
})

const stops = async ($: EngineInterface, on: On, answer: Answer, mode: string): Promise<void> => {
  const mem = await setup($, on, answer, mode)
  const a = await $.tool.call(PUSH)
  expect(denied(a)).toBe(true)
  expect(JSON.stringify(a)).toContain(DEFAULT_HOLD_WHY)
  expect(JSON.stringify(a)).toMatch(/\/vaken-guard allow once/)
  expect(whats(mem)).toEqual(['Held a risky command'])
  const s = await $.tool.call(SECRET_READ)
  expect(denied(s)).toBe(true)
  expect(JSON.stringify(s)).toContain(DEFAULT_HOLD_WHY)
  expect(whats(mem)).toContain('Held a step that touches a secret')
}

test('a host that would not ask (bypass permissions, or an allow rule): destroy and secrets stop with a plain reason', SLOW, ($, on) => stops($, on, { decision: 'allow' }, 'bypassPermissions'))

test('auto mode (a classifier decides, not the person): destroy and secrets stop with a plain reason', SLOW, ($, on) => stops($, on, { decision: 'ask' }, 'auto'))

test('the same unasked host: the milder kinds (an edit outside your folders, a weakened test) only warn', SLOW, async ($, on) => {
  const mem = await setup($, on, { decision: 'allow' }, 'bypassPermissions')
  const w = await $.tool.call({ tool: 'Write', file_path: '/home/user/elsewhere/a.ts', content: 'x' })
  expect(denied(w)).toBe(false)
  mem.set('cockpit:guard:scope:session-a', ['/home/user/app/src'])
  const w2 = await $.tool.call({ tool: 'Write', file_path: '/home/user/elsewhere/b.ts', content: 'x' })
  expect(denied(w2)).toBe(false)
  expect(whats(mem)).toEqual(['Warned about an edit outside the fence'])
})

test('allow once lets the default stop through', SLOW, async ($, on) => {
  await setup($, on, { decision: 'allow' }, 'bypassPermissions')
  expect(denied(await $.tool.call(PUSH))).toBe(true)
  await $.command.run({ ...viaParent('vaken-guard', 'allow once'), origin: { kind: 'composer' } } as never)
  expect(denied(await $.tool.call(PUSH))).toBe(false)
  expect(denied(await $.tool.call(PUSH))).toBe(true)
})

test('a setting the person chose wins: Warn stays Warn in an unasked host, Hold stops in an asking host', SLOW, async ($, on) => {
  const mem = await setup($, on, { decision: 'allow' }, 'bypassPermissions')
  mem.set('cockpit:setting:guard.destructive', 'warn')
  mem.set('cockpit:setting:guard.secrets', 'warn')
  expect(denied(await $.tool.call(PUSH))).toBe(false)
  expect(denied(await $.tool.call(SECRET_READ))).toBe(false)
  host.check = { decision: 'ask' }
  host.defaultMode = 'default'
  mem.set('cockpit:setting:guard.destructive', 'hold')
  mem.set('cockpit:setting:guard.secrets', 'hold')
  const a = await $.tool.call({ tool: 'Bash', command: 'git push --force origin main' })
  expect(denied(a)).toBe(true)
  expect(JSON.stringify(a)).not.toContain(DEFAULT_HOLD_WHY)
  expect(denied(await $.tool.call(SECRET_READ))).toBe(true)
  mem.set('cockpit:setting:guard.destructive', 'off')
  expect(denied(await $.tool.call(PUSH))).toBe(false)
})

test('when the permission answer cannot be read, the worst kinds only warn (never a guess toward stopping)', SLOW, async ($, on) => {
  const mem = await setup($, on, { throws: true }, 'auto')
  const a = await $.tool.call(PUSH)
  expect(denied(a)).toBe(false)
  expect(JSON.stringify(a)).toMatch(/saw a risk/)
  expect(denied(await $.tool.call(SECRET_READ))).toBe(false)
  expect(whats(mem)).toContain('Warned about a risky command')
})

test('the check is asked only when a worst-kind finding is there', SLOW, async ($, on) => {
  await setup($, on, { decision: 'allow' }, 'bypassPermissions')
  await $.tool.call({ tool: 'Bash', command: 'git status' })
  await $.tool.call({ tool: 'Read', file_path: '/home/user/app/a.ts' })
  expect(host.asked).toBe(0)
})

test('a command label is the program and one fixed word, never an argument, a path or a value', () => {
  expect(safeLabelOf('git push origin feature')).toBe('git · push')
  expect(safeLabelOf('rm -rf /tmp/secret-project')).toBe('rm · destroy')
  expect(safeLabelOf('npm test -- --token abc')).toBe('npm · test')
  expect(safeLabelOf('npm run build')).toBe('npm · run')
  expect(safeLabelOf('curl -H "Authorization: Bearer sk-1234567890abcdef" https://x.example/a?k=v')).toBe('curl · network')
  expect(safeLabelOf('API_KEY=hunter2 ./deploy.sh --prod')).not.toMatch(/hunter2|API_KEY/)
  expect(safeLabelOf('git commit -m "the quarterly plan for Acme"')).toBe('git · commit')
  expect(safeLabelOf('git -C /Users/me/private push')).not.toMatch(/private|Users/)
  expect(safeLabelOf('echo hi && rm -rf x')).toBe('rm · destroy')
  expect(safeLabelOf('/Users/me/bin/mytool --password=zzz')).toMatch(/^mytool · /)
  expect(safeLabelOf('')).toBe('command · other')
})

test('old stored entries with long labels are migrated on read: no argument text survives', () => {
  const old = [
    { at: 1, kind: 'git', label: 'git push --force origin secret-branch', status: 'ok', exit: 0 },
    { at: 2, kind: 'delete', label: 'rm -rf /Users/me/clients/acme', status: 'ok', exit: 0 },
    { at: 3, kind: 'run', label: 'TOKEN=*** ./run.sh', status: 'ok', exit: 0 },
    { at: 4, kind: 'toString', label: 'zz', status: 'ok' },
    { at: 5, kind: 'git', label: 'git · push', status: 'ok' },
  ]
  const got = parseEntries(old)
  expect(got.map(e => e.label)).toEqual(['git · git', 'rm · destroy', 'command · run', 'zz · other', 'git · push'])
  expect(JSON.stringify(got)).not.toMatch(/secret-branch|clients|acme|force|TOKEN/)
  expect(commandsText(got, true)).not.toMatch(/secret-branch|clients|acme/)
})

test('the stored list holds no argument text', SLOW, async ($, on) => {
  const mem = await setup($, on, { decision: 'ask' }, 'default')
  on('tool.call', { tool: 'Bash' }, OK)
  await $.tool.call({ tool: 'Bash', command: 'git commit -m "board meeting notes for Acme" --author=jane@example.com' })
  await $.tool.call({ tool: 'Bash', command: 'cat /Users/me/clients/acme/plan.txt' })
  await $.tool.call({ tool: 'Bash', command: 'curl -H "x-api-key: abcDEF123ghiJKL456mnoPQR789" https://api.example.com/v1?q=hello' })
  const stored = JSON.stringify(mem.get('cockpit:guard:commands:session-a'))
  expect(stored).toMatch(/git · commit/)
  expect(stored).not.toMatch(/board|Acme|acme|jane|example\.com|clients|plan\.txt|abcDEF|hello|--author/)
})

test('npm view is asked with the public registry fixed on the command line', () => {
  expect(NPM_REGISTRY).toBe('https://registry.npmjs.org/')
  const argv = npmViewArgv('npm', 'left-pad')
  expect(argv.slice(0, 3)).toEqual(['npm', 'view', 'left-pad'])
  expect(argv).toContain('--registry=https://registry.npmjs.org/')
  expect(argv).toContain('--json')
})

test('npm view runs from the home folder, not the project, with the fixed registry', SLOW, async ($, on) => {
  const mem = await setup($, on, { decision: 'ask' }, 'default')
  host.exit = 0
  await $.tool.call({ tool: 'Bash', command: 'npm install left-pad' })
  const view = host.runs.find(r => r.argv.includes('view'))
  expect(view).toBeDefined()
  expect(view!.argv).toContain('--registry=https://registry.npmjs.org/')
  expect(view!.cwd).toBe('/home/user')
  expect(view!.cwd).not.toContain('/home/user/app')
  expect(mem.size).toBeGreaterThan(0)
})
