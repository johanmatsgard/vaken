// The computer reading on Windows, through the hook: the OS variable says Windows_NT.
import { expect, mock } from 'claude-code/testing'
import type { EngineInterface } from 'claude-code'
import { SLOW, test } from './slow'
import { viaParent } from './viaparent'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const JSON_OUT = '{"battery":[{"EstimatedChargeRemaining":84,"BatteryStatus":2,"EstimatedRunTime":71582788}],"memTotalKb":33251192,"memFreeKb":16036752,"swapUsedMb":97,"swapTotalMb":7730,"cpu":50,"cores":32,"claudeCount":1,"claudeKb":551764}'

test('Windows: /vaken-help run laptop runs one PowerShell program, shows the words, and reads at most once a minute', SLOW, async ($, on) => {
  const mem = new Map<string, unknown>([['cockpit:setting:laptop.mode', 'on']])
  mock.clock(on, { now: NOW })
  mock.session(on)
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
  on('env.get', (_$, e) => ({ value: (e as unknown as { name: string }).name === 'OS' ? 'Windows_NT' : undefined }) as never)
  on('session.id', () => ({ value: 'me' }))
  on('session.cwd', () => ({ value: '/w/a' }))
  on('session.root', () => ({ value: '/w/a' }))
  on('tool.call', { tool: /^(Edit|Write)$/ }, () => ({ result: 'ok', text: 'ok', ref: 1 }) as never)
  const calls: string[][] = []
  on('process.run', (_$, e) => {
    calls.push([...e.argv])
    return { value: { exitCode: 0, stdout: e.argv[0] === 'powershell.exe' ? JSON_OUT : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } } as never
  })
  on('ui.toast', () => ({ value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  const run = async (): Promise<string> => ((await ($ as EngineInterface).command.run(viaParent('vaken-laptop', '') as never)) as { text: string }).text
  const t = await run()
  expect(t).toMatch(/^Computer load: on\.\nMemory is fine: 1 Claude session uses 0\.5 GB\.\nSwap: 0\.1 GB used of 7\.5 GB\.\nBattery 84%, plugged in\./)
  const gauge = calls.filter(c => ['powershell.exe', 'sysctl', 'pmset', 'ps', 'vm_stat'].includes(c[0] ?? ''))
  expect(gauge.map(c => c[0])).toEqual(['powershell.exe'])
  expect(gauge[0]?.slice(1, 4)).toEqual(['-NoProfile', '-NonInteractive', '-Command'])
  await run()
  expect(calls.filter(c => c[0] === 'powershell.exe')).toHaveLength(1)
  expect(mem.get('cockpit:laptop:v2')).toMatchObject({ win: true, memMb: 32472, cores: 32 })
})
