import { langNow, tr } from '../i18n/t'
import { fmt } from './fmt'
// Computer load: memory pressure, swap, battery, heat and Claude session memory. Pure parsers that give back nothing for text they cannot read; only counts and total memory are kept.

import { lines } from './platform'
import { resolveProgram } from './procs'
import { sysWord } from './syswords'
import type { WordSystem } from './syswords'

export const LAPTOP_EVERY_MS = 60_000
export const LAPTOP_IDLE_EVERY_MS = 3 * 60_000
export const LAPTOP_BAND_TTL_MS = 2 * LAPTOP_IDLE_EVERY_MS
export const LAPTOP_TIMEOUT_MS = 4_000
// One PowerShell call asks WMI four times (1.5 to 2.2 s on a 32-core PC).
export const LAPTOP_WIN_TIMEOUT_MS = 10_000
const LOW_BATTERY = 20
const TIGHT_FREE_SHARE = 0.1
// A session on an older cockpit keeps writing the old reading to the old key, which would make the card say "Processor not read".
export const LAPTOP_KEY = 'cockpit:laptop:v2'
// Raise this whenever the reading's shape changes; a lower or missing stamp is not trusted by a newer session.
export const LAPTOP_SCHEMA = 3
export const LAPTOP_OLD_KEY = 'cockpit:laptop:sample'

export const LAPTOP_ARGV = {
  pressure: ['sysctl', '-n', 'kern.memorystatus_vm_pressure_level'],
  vmstat: ['vm_stat'],
  swap: ['sysctl', 'vm.swapusage'],
  batt: ['pmset', '-g', 'batt'],
  therm: ['pmset', '-g', 'therm'],
  ps: ['ps', '-axo', 'pid,rss,command'],
  memsize: ['sysctl', '-n', 'hw.memsize'],
  load: ['sysctl', '-n', 'vm.loadavg'],
  cores: ['sysctl', '-n', 'hw.logicalcpu'],
  // The load average lags a minute and counts waiting threads, so it is not a busy share.
  cpu: ['top', '-l', '1', '-n', '0'],
} as const

// One sysctl call keeps the gauge light; a name this Mac lacks goes to stderr with code 1, and the printed lines are still used.
export const SYSCTL_NAMES = { pressure: 'kern.memorystatus_vm_pressure_level', swap: 'vm.swapusage', load: 'vm.loadavg', memsize: 'hw.memsize', cores: 'hw.logicalcpu' } as const
export const sysctlArgv = (keys: readonly (keyof typeof SYSCTL_NAMES)[]): string[] => ['sysctl', ...keys.map(k => SYSCTL_NAMES[k])]
export function splitSysctl(text: string): Partial<Record<keyof typeof SYSCTL_NAMES, string>> {
  const out: Partial<Record<keyof typeof SYSCTL_NAMES, string>> = {}
  for (const line of lines(text)) {
    const m = /^([\w.]+):\s*(.*)$/.exec(line.trim())
    const key = (Object.keys(SYSCTL_NAMES) as (keyof typeof SYSCTL_NAMES)[]).find(k => SYSCTL_NAMES[k] === m?.[1])
    if (m !== null && key !== undefined) out[key] = key === 'swap' ? line.trim() : (m[2] ?? '')
  }
  return out
}

// Windows: one fixed PowerShell program prints one JSON object. No load average or pressure level exists, so free memory and processor percent stand in. Heat needs an administrator and is not read.
const WIN_SCRIPT = [
  "$ErrorActionPreference='SilentlyContinue'",
  '$b=@(Get-CimInstance Win32_Battery|Select-Object EstimatedChargeRemaining,BatteryStatus,EstimatedRunTime)',
  '$o=Get-CimInstance Win32_OperatingSystem -Property TotalVisibleMemorySize,FreePhysicalMemory',
  '$f=@(Get-CimInstance Win32_PageFileUsage)',
  '$c=@(Get-CimInstance Win32_Processor -Property LoadPercentage,NumberOfLogicalProcessors)',
  "$p=@(Get-Process -Name claude|Where-Object{$_.Path -and $_.Path -notmatch 'WindowsApps|AnthropicClaude'})",
  '[pscustomobject]@{battery=$b;memTotalKb=$o.TotalVisibleMemorySize;memFreeKb=$o.FreePhysicalMemory;swapUsedMb=($f|Measure-Object CurrentUsage -Sum).Sum;swapTotalMb=($f|Measure-Object AllocatedBaseSize -Sum).Sum;cpu=($c|Measure-Object LoadPercentage -Average).Average;cores=($c|Measure-Object NumberOfLogicalProcessors -Sum).Sum;claudeCount=$p.Count;claudeKb=[long](($p|Measure-Object WorkingSet64 -Sum).Sum/1KB)}|ConvertTo-Json -Compress -Depth 3',
].join(';')
export const winGaugeArgv = (): string[] => [resolveProgram('powershell', 'win32'), '-NoProfile', '-NonInteractive', '-Command', WIN_SCRIPT]

type Pressure = 'normal' | 'warn' | 'critical'

export function parsePressure(text: string): Pressure | undefined {
  const n = Number(text.trim().split(/\s+/).pop())
  return n === 1 ? 'normal' : n === 2 ? 'warn' : n === 4 ? 'critical' : undefined
}

const UNIT = { K: 1 / 1024, M: 1, G: 1024, T: 1024 * 1024 } as const

type Swap = { totalMb: number; usedMb: number }
export function parseSwap(text: string): Swap | undefined {
  const read = (name: string): number | undefined => {
    const m = new RegExp(`${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)\\s*([KMGT])`, 'i').exec(text)
    return m === null ? undefined : Number(m[1]) * (UNIT[(m[2] ?? 'M').toUpperCase() as keyof typeof UNIT] ?? 1)
  }
  const totalMb = read('total')
  const usedMb = read('used')
  return totalMb === undefined || usedMb === undefined ? undefined : { totalMb, usedMb }
}

type Battery = { hasBattery: boolean; onAc: boolean; percent?: number; remaining?: string }
export function parseBattery(text: string): Battery | undefined {
  if (!/Now drawing from/i.test(text)) return undefined
  const onAc = /Now drawing from\s*'AC Power'/i.test(text)
  const m = /(\d{1,3})%;\s*[^;]+?(?:;\s*(\d+:\d+) remaining|;|\s*$)/im.exec(text)
  if (m === null) return { hasBattery: false, onAc }
  return { hasBattery: true, onAc, percent: Number(m[1]), remaining: m[2] !== undefined && m[2] !== '0:00' ? m[2] : undefined }
}

type Thermal = { state: 'ok' | 'slowed'; speedLimit?: number }
export function parseThermal(text: string): Thermal | undefined {
  const limit = /CPU_Speed_Limit\s*=\s*(\d+)/i.exec(text)
  const speedLimit = limit === null ? undefined : Number(limit[1])
  if (speedLimit !== undefined && speedLimit < 100) return { state: 'slowed', speedLimit }
  if (speedLimit !== undefined || /No thermal warning level has been recorded/i.test(text)) return { state: 'ok', speedLimit }
  return undefined
}

// Matches Activity Monitor: used = app memory (anonymous minus purgeable) + wired + compressed. An older macOS without the anonymous line falls back to the older sum.
export function parseFreeShare(text: string): number | undefined {
  if (!/page size of \d+ bytes/i.test(text)) return undefined
  const pages = (name: string): number | undefined => {
    const m = new RegExp(`^${name}:\\s*(\\d+)\\.?\\s*$`, 'im').exec(text)
    return m === null ? undefined : Number(m[1])
  }
  const free = pages('Pages free')
  const active = pages('Pages active')
  if (free === undefined || active === undefined) return undefined
  const inactive = pages('Pages inactive') ?? 0
  const speculative = pages('Pages speculative') ?? 0
  const wired = pages('Pages wired down') ?? 0
  const compressed = pages('Pages occupied by compressor') ?? 0
  const purgeable = pages('Pages purgeable') ?? 0
  const total = free + active + inactive + speculative + wired + compressed
  if (total <= 0) return undefined
  const anonymous = pages('Anonymous pages')
  if (anonymous !== undefined) return Math.min(1, Math.max(0, 1 - (Math.max(0, anonymous - purgeable) + wired + compressed) / total))
  return Math.min(1, (free + inactive + speculative + purgeable) / total)
}

export function parseCpuBusy(text: string): number | undefined {
  const m = /CPU usage:\s*(\d+(?:[.,]\d+)?)%\s*user,\s*(\d+(?:[.,]\d+)?)%\s*sys/i.exec(text)
  if (m === null) return undefined
  const n = Number((m[1] ?? '').replace(',', '.')) + Number((m[2] ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined
}

type Procs = { count: number; rssMb: number }
// The desktop app's own program is named `Claude` in an app bundle and is left out, as is `claude mcp ...`.
export function claudeProcs(text: string): Procs {
  let count = 0
  let rssKb = 0
  for (const line of lines(text)) {
    const m = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line)
    if (m === null) continue
    const cmd = m[3] ?? ''
    // The app wraps every Claude Code program in `disclaimer`, which doubled the count.
    if (/^(?:\S*\/)?disclaimer(?:\s|$)/.test(cmd)) continue
    // Since Claude Code 2.1.295 the program lives in an app bundle, so that exact lowercase path stays in.
    if (cmd.includes('.app/Contents/') && !/\.app\/Contents\/MacOS\/claude(?:\s|$)/.test(cmd)) continue
    const hit = /^(?:\S.*?\/)?claude(?:\s+(.*))?$/.exec(cmd)
    if (hit === null || /^(?:mcp|--chrome-native-host)(\s|$)/.test(hit[1] ?? '')) continue
    count += 1
    rssKb += Number(m[2])
  }
  return { count, rssMb: Math.round(rssKb / 1024) }
}

export function parseMemMb(text: string): number | undefined {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return undefined
  const mb = Number(t) / 1024 / 1024
  return mb > 0 ? Math.round(mb) : undefined
}
export function parseLoad(text: string): number | undefined {
  const m = /^\{?\s*(\d+(?:\.\d+)?)\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s*\}?$/.exec(text.trim())
  return m === null ? undefined : Number(m[1])
}
export function parseCores(text: string): number | undefined {
  const t = text.trim()
  return /^\d+$/.test(t) && Number(t) > 0 ? Number(t) : undefined
}

// 71582788 means an unknown run time.
const AC_STATUS = new Set([2, 3, 6, 7, 8, 9, 11])
const RUNTIME_UNKNOWN = 71_582_788
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function winBattery(raw: unknown): Battery {
  const list = (Array.isArray(raw) ? raw : raw === null || raw === undefined ? [] : [raw]).filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
  const cells = list.map(b => ({ pct: num(b.EstimatedChargeRemaining), status: num(b.BatteryStatus), run: num(b.EstimatedRunTime) }))
  if (cells.length === 0) return { hasBattery: false, onAc: true }
  const pcts = cells.flatMap(c => (c.pct === undefined ? [] : [c.pct]))
  const onAc = cells.some(c => c.status !== undefined && AC_STATUS.has(c.status))
  const runs = cells.flatMap(c => (c.run === undefined || c.run <= 0 || c.run >= RUNTIME_UNKNOWN ? [] : [c.run]))
  const left = runs.length === 0 ? undefined : Math.min(...runs)
  return {
    hasBattery: true,
    onAc,
    percent: pcts.length === 0 ? undefined : Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
    remaining: left === undefined || onAc ? undefined : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
  }
}

export type Laptop = { at: number; schema?: number; cpuBusy?: number; pressure?: Pressure; freeShare?: number; swap?: Swap; battery?: Battery; thermal?: Thermal; procs?: Procs; memMb?: number; load?: number; cores?: number; win?: boolean }

export function parseWinLaptop(at: number, text: string): Laptop {
  const l: Laptop = { at, win: true }
  let o: Record<string, unknown>
  try {
    const v: unknown = JSON.parse(text.slice(Math.max(0, text.indexOf('{')), text.lastIndexOf('}') + 1))
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return l
    o = v as Record<string, unknown>
  } catch {
    return l
  }
  const totalKb = num(o.memTotalKb)
  const freeKb = num(o.memFreeKb)
  if (totalKb !== undefined && totalKb > 0) {
    l.memMb = Math.round(totalKb / 1024)
    if (freeKb !== undefined && freeKb >= 0) l.freeShare = Math.min(1, freeKb / totalKb)
  }
  const swapTotal = num(o.swapTotalMb)
  const swapUsed = num(o.swapUsedMb)
  if (swapTotal !== undefined && swapTotal > 0 && swapUsed !== undefined) l.swap = { totalMb: swapTotal, usedMb: swapUsed }
  const cores = num(o.cores)
  if (cores !== undefined && cores > 0) l.cores = cores
  const cpu = num(o.cpu)
  if (cpu !== undefined && l.cores !== undefined) l.load = Math.round(Math.max(0, Math.min(100, cpu)) * l.cores) / 100
  const count = num(o.claudeCount)
  if (count !== undefined) l.procs = { count, rssMb: Math.round((num(o.claudeKb) ?? 0) / 1024) }
  if ('battery' in o) l.battery = winBattery(o.battery)
  return l
}

export function parseLaptop(at: number, out: Partial<Record<keyof typeof LAPTOP_ARGV, string | undefined>>): Laptop {
  const read = <T>(text: string | undefined, parse: (t: string) => T | undefined): T | undefined => (text === undefined ? undefined : parse(text))
  return {
    at,
    pressure: read(out.pressure, parsePressure),
    freeShare: read(out.vmstat, parseFreeShare),
    swap: read(out.swap, parseSwap),
    battery: read(out.batt, parseBattery),
    thermal: read(out.therm, parseThermal),
    procs: read(out.ps, claudeProcs),
    memMb: read(out.memsize, parseMemMb),
    load: read(out.load, parseLoad),
    cores: read(out.cores, parseCores),
    cpuBusy: read(out.cpu, parseCpuBusy),
  }
}

// Flicker guard: a reading without memory figures (vm_stat timed out, or an older cockpit overwrote it) must not blank the card, so the last good figures are kept while still trusted.
export const MEMORY_KEEP_MS = LAPTOP_IDLE_EVERY_MS + 2 * LAPTOP_EVERY_MS
export function keepMemory(next: Laptop, good: Laptop | undefined): Laptop {
  if (next.freeShare !== undefined || good === undefined || good.freeShare === undefined) return next
  const age = next.at - good.at
  if (age < 0 || age > MEMORY_KEEP_MS) return next
  return { ...next, freeShare: good.freeShare, ...(next.pressure === undefined && good.pressure !== undefined ? { pressure: good.pressure } : {}), ...(next.memMb === undefined && good.memMb !== undefined ? { memMb: good.memMb } : {}) }
}

export const isCurrent = (l: Laptop): boolean => (l.schema ?? 0) >= LAPTOP_SCHEMA

export const isReadable = (l: Laptop): boolean => l.pressure !== undefined || l.freeShare !== undefined || l.swap !== undefined || l.battery !== undefined || l.thermal !== undefined || l.load !== undefined

// A single warn on a busy Mac stayed for hours and blamed only the Claude sessions, so warn must repeat.
export function memoryTight(l: Laptop, previous?: Laptop): boolean {
  const low = l.freeShare !== undefined && l.freeShare < TIGHT_FREE_SHARE
  if (l.pressure === undefined) return low
  if (l.pressure === 'critical') return true
  if (l.pressure === 'warn') return low || (previous !== undefined && l.at - previous.at <= 2 * LAPTOP_EVERY_MS && previous.pressure !== undefined && previous.pressure !== 'normal')
  return false
}

export const batteryLow = (l: Laptop): boolean => l.battery?.hasBattery === true && !l.battery.onAc && (l.battery.percent ?? 100) < LOW_BATTERY

export const gb = (mb: number): string => `${fmt.decimal(mb / 1024, langNow())} GB`

function procsWords(p: Procs | undefined, t: (s: string) => string = tr): string {
  if (p === undefined) return t('the Claude sessions could not be counted')
  if (p.count === 0) return t('no Claude session was found')
  return t(p.count === 1 ? '{n} Claude session uses {mem}' : '{n} Claude sessions use {mem}').replace('{n}', String(p.count)).replace('{mem}', gb(p.rssMb))
}

export function tightWords(l: Laptop, t: (s: string) => string = tr): string {
  const p = l.procs
  const lead = t('This Mac is short of memory.')
  if (p === undefined) return `${lead} ${t('The Claude sessions could not be counted.')}`
  if (p.count === 0) return `${lead} ${t('No Claude session was found.')}`
  return `${lead} ${t(p.count === 1 ? 'Your {n} Claude session uses {mem} of it.' : 'Your {n} Claude sessions use {mem} of it.').replace('{n}', String(p.count)).replace('{mem}', gb(p.rssMb))}`
}
export const batteryBand = (l: Laptop): string => tr('Battery {p}%, not plugged in').replace('{p}', String(l.battery?.percent ?? '?'))

export function laptopWords(l: Laptop, previous?: Laptop): string[] {
  const out: string[] = []
  const sys: WordSystem = l.win === true ? 'win32' : 'posix'
  const readable = l.pressure !== undefined || l.freeShare !== undefined
  if (memoryTight(l, previous)) out.push(tightWords(l, s => s), l.pressure === undefined ? sysWord('(An estimate from vm_stat: the system level could not be read.)', sys) : 'Close a session or wait for one to finish. Nothing is closed for you.')
  else if (readable) out.push(`Memory is fine: ${procsWords(l.procs, s => s)}.`)
  else out.push('Memory could not be read.', l.procs === undefined ? 'The Claude sessions could not be counted.' : `${procsWords(l.procs, s => s).replace(/^./, c => c.toUpperCase())}.`)
  if (l.swap !== undefined) out.push(`Swap: ${gb(l.swap.usedMb)} used of ${gb(l.swap.totalMb)}.`)
  const b = l.battery
  if (b !== undefined) {
    if (!b.hasBattery) out.push('No battery: this machine runs on power.')
    else if (b.onAc) out.push(`Battery ${b.percent ?? '?'}%, plugged in.`)
    else out.push(`Battery ${b.percent ?? '?'}%, not plugged in${b.remaining === undefined ? '' : `, about ${b.remaining} left`}.${batteryLow(l) ? ' It is low: plug in.' : ''}`)
  }
  if (l.thermal !== undefined) out.push(l.thermal.state === 'slowed' ? `The processor is slowed to ${l.thermal.speedLimit}% by heat.` : 'Heat is fine.')
  return out
}

export function laptopText(mode: string, l: Laptop | undefined, now: number, sys: WordSystem = l?.win === true ? 'win32' : 'posix', previous?: Laptop): string {
  if (mode !== 'on') return 'Computer load: off. It runs short programs to read memory, battery and heat, so it waits until you turn it on: Settings > Agents.'
  if (l === undefined) return 'Computer load: on. Nothing read yet; the first reading comes within a minute.'
  if (!isReadable(l)) return sysWord('Computer load: on, but none of the programs gave an answer. It works on a Mac only.', sys)
  const age = Math.max(0, Math.floor((now - l.at) / 1000))
  return ['Computer load: on.', ...laptopWords(l, previous), '', `Read ${age < 60 ? `${age} seconds` : `${Math.floor(age / 60)} min`} ago. It reads every 3 minutes, and every minute while agents run.`].join('\n')
}
