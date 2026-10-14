// The Computer card: how much room the machine has for more helper agents, from the gauge reading and the agent cap. The per-helper sizes are guesses.
import { LAPTOP_EVERY_MS, LAPTOP_IDLE_EVERY_MS, batteryLow, isCurrent } from './crewlaptop'
import type { Laptop } from './crewlaptop'
import type { HelpEntry } from './registry'
import { fmt } from './fmt'
import { langNow } from './lang'
import { sysWord } from './syswords'
import { percentOf } from './words'
import { fillIn, same } from './fillin'
import type { Tr } from './fillin'

// Swedish uses a decimal comma; a small size is said in MB, never "0.0 GB".
const gb = (mb: number): string => fmt.gb(mb, langNow())

export const MB_PER_HELPER = 1536
export const CORES_PER_HELPER = 2
// Global laptop rule: run two when the room cannot be read.
export const HELPERS_WITHOUT_MEMORY = 2
// One idle period (the gauge reads every 3 minutes with no helper) plus two missed readings.
export const ROOM_FRESH_MS = LAPTOP_IDLE_EVERY_MS + 2 * LAPTOP_EVERY_MS

export const COMPUTER_HELP: HelpEntry[] = [
  {
    title: 'What the Computer card does',
    text: 'It says how many more agents this computer can run now. It takes the smallest of: free memory (about 1.5 GB per agent), idle processor (about 2 cores per agent) and the limit you set, if you set one. It says Full when memory is tight, heat slows the processor, or the battery is low. The task runner waits while it is full.',
  },
]

export type Limiter = 'limit' | 'memory' | 'processor' | 'pressure' | 'heat' | 'battery'
export type AgentLoad = { running: number; max: number; capOn: boolean }
export type Room = {
  n: number
  by: Limiter
  parts: { memory?: number; processor?: number; limit?: number }
  freeMb?: number
  idleCores?: number
  memoryUnknown?: boolean
}

export function roomOf(l: Laptop | undefined, a: AgentLoad, now: number): Room | undefined {
  if (l === undefined || now - l.at > ROOM_FRESH_MS) return undefined
  const freeMb = l.freeShare !== undefined && l.memMb !== undefined ? l.freeShare * l.memMb : undefined
  const idleCores = l.cores === undefined ? undefined : l.cpuBusy !== undefined ? Math.max(0, (l.cores * (100 - l.cpuBusy)) / 100) : l.load !== undefined ? Math.max(0, l.cores - l.load) : undefined
  const parts = {
    memory: freeMb === undefined ? undefined : Math.floor(freeMb / MB_PER_HELPER),
    processor: idleCores === undefined ? undefined : Math.floor(idleCores / CORES_PER_HELPER),
    limit: a.capOn && Number.isFinite(a.max) ? Math.max(0, a.max - a.running) : undefined, // Auto (max Infinity): the limit gives no count, the computer decides
  }
  const base = { parts, freeMb, idleCores }
  if (l.pressure === 'warn' || l.pressure === 'critical') return { ...base, n: 0, by: 'pressure' }
  if (l.thermal?.state === 'slowed') return { ...base, n: 0, by: 'heat' }
  if (batteryLow(l)) return { ...base, n: 0, by: 'battery' }
  const counts = (['memory', 'processor', 'limit'] as const).flatMap(k => (parts[k] === undefined ? [] : [{ k, n: parts[k] as number }]))
  if (counts.length === 0) return undefined
  const least = counts.reduce((a2, b) => (b.n < a2.n ? b : a2))
  // Memory unknown: never more than two, so a runner does not start helpers by the processor alone.
  if (parts.memory === undefined) return { ...base, n: Math.min(least.n, HELPERS_WITHOUT_MEMORY), by: least.k, memoryUnknown: true }
  return { ...base, n: least.n, by: least.k }
}

export const roomCap = (r: Room | undefined): number => (r === undefined ? Infinity : r.n)

const FULL_WHY: Record<Limiter, string> = {
  memory: 'memory is tight',
  pressure: 'the Mac reports memory pressure',
  processor: 'the processor is busy',
  limit: 'the agent cap is reached',
  heat: 'the processor is hot',
  battery: 'the battery is low',
}

export const roomLine = (r: Room, t: (s: string) => string = s => s): string =>
  r.n > 0 ? (r.memoryUnknown === true ? t(r.n === 1 ? 'Room for about 1 more agent, memory not read' : 'Room for about {n} more agents, memory not read').replace('{n}', String(r.n)) : r.n === 1 ? t('Room for about 1 more agent') : t('Room for about {n} more agents').replace('{n}', String(r.n))) : t('Full: {why}').replace('{why}', t(sysWord(FULL_WHY[r.by])))
export const roomNote = (r: Room, t: (s: string) => string = s => s): string => (r.n > 0 ? t('room for {n} more').replace('{n}', String(r.n)) : t('full'))
export const offLine = (mode: string, t: (s: string) => string = s => s): string => t(mode === 'on' ? 'Reading the computer…' : 'The computer reading is off')

export function roomReasons(r: Room, l: Laptop, a: AgentLoad, t: Tr = same): string[] {
  const out: string[] = []
  if (r.by === 'pressure') out.push(fillIn(t(sysWord('macOS itself reports memory pressure ({p}), even if the share used looks fine, so no new agent should start.')), { p: String(l.pressure) }))
  if (r.by === 'heat') out.push(fillIn(t('The processor is slowed to {n}% by heat, so no new agent should start.'), { n: l.thermal?.speedLimit ?? '?' }))
  if (r.by === 'battery') out.push(fillIn(t('The battery is at {n}% and not plugged in, so no new agent should start.'), { n: l.battery?.percent ?? '?' }))
  if (r.freeMb !== undefined && l.memMb !== undefined) out.push(fillIn(t('Memory: {free} free of {all}. At about 1.5 GB per agent: room for {n}.'), { free: gb(r.freeMb), all: gb(l.memMb), n: r.parts.memory ?? '?' }))
  else out.push(t(r.memoryUnknown === true ? 'Memory: the free share could not be read, so the room is counted from the rest and holds at 2 at most.' : 'Memory: the free share could not be read.'))
  if (r.idleCores !== undefined && l.cores !== undefined) out.push(fillIn(t('Processor: {idle} of {all} cores idle. At about 2 per agent: room for {n}.'), { idle: fmt.decimal(r.idleCores, langNow()), all: l.cores, n: r.parts.processor ?? '?' }))
  else out.push(t('Processor: the load could not be read.'))
  out.push(a.capOn && !Number.isFinite(a.max) ? t('Agent cap: Auto, so the computer decides.') : a.capOn ? fillIn(t('Agent cap: {running} of {max} running: room for {n}.'), { running: a.running, max: a.max, n: r.parts.limit ?? '?' }) : t('Agent cap: off, so it does not count.'))
  out.push(t('The smallest of these counts. The sizes per agent are guesses.'))
  return out
}

export const memoryUsedPct = (l: Laptop): number | undefined => (l.freeShare === undefined ? undefined : percentOf(Math.min(1, Math.max(0, 1 - l.freeShare))))
// A Mac reading with only the load average is not a busy share, so it is shown against the cores and never called "busy".
export const processorIsLoad = (l: Laptop): boolean => l.cpuBusy === undefined && l.win !== true
export const processorPct = (l: Laptop): number | undefined =>
  l.cpuBusy !== undefined ? percentOf(Math.min(1, l.cpuBusy / 100)) : l.load === undefined || l.cores === undefined ? undefined : percentOf(Math.min(1, l.load / l.cores))
const loadOf = (l: Laptop): string => fmt.decimal(l.load ?? 0, langNow())

export function sharesLine(l: Laptop, t: Tr = same): string {
  const m = memoryUsedPct(l)
  const p = processorPct(l)
  const cpu = p === undefined ? t('processor not read') : processorIsLoad(l) ? fillIn(t('load {x} of {c}'), { x: loadOf(l), c: l.cores ?? '?' }) : fillIn(t('processor {n}%'), { n: p })
  return [m === undefined ? t('Memory not read') : fillIn(t('Memory {n}%'), { n: m }), cpu].join(' · ')
}
export const memoryHead = (l: Laptop, t: Tr = same): string => {
  const m = memoryUsedPct(l)
  return m === undefined ? t('Memory not read') : `${fillIn(t('Memory {n}% used'), { n: m })}${l.memMb === undefined || l.freeShare === undefined ? '' : ` · ${fillIn(t('{n} free'), { n: gb(l.freeShare * l.memMb) })}`}`
}
export const processorHead = (l: Laptop, t: Tr = same): string => {
  const p = processorPct(l)
  if (p === undefined) return t('Processor not read')
  return processorIsLoad(l) ? fillIn(t('Load {x} of {c} cores'), { x: loadOf(l), c: l.cores ?? '?' }) : fillIn(t('Processor {n}% busy · {c} cores'), { n: p, c: l.cores ?? '?' })
}

export function processorFact(l: Laptop, t: Tr = same): { label: string; value: string; note: string[] } {
  const p = processorPct(l)
  if (p === undefined) return { label: t('Processor'), value: t('not read'), note: [] }
  if (processorIsLoad(l)) return { label: t('Load'), value: fillIn(t('{x} of {c} cores'), { x: loadOf(l), c: l.cores ?? '?' }), note: [] }
  return { label: t('Processor'), value: `${p}% ${t('busy')}`, note: l.cores === undefined ? [] : [`${l.cores} ${t('cores')}`] }
}

export function olderCockpitNote(l: Laptop, t: Tr = same): string | undefined {
  if (isCurrent(l)) return undefined
  const p = l.procs
  const missing = l.freeShare === undefined || p === undefined || p.count < 1 || p.rssMb < 1
  return missing ? t('Another session runs an older version of vaken, so some figures are not read. Restart it to read them all.') : undefined
}

export function claudeLine(l: Laptop, running?: number, t: Tr = same): string {
  const p = l.procs
  // A count with no memory behind it is a failed reading.
  const procs = p === undefined || p.count < 1 || p.rssMb < 1 ? t('sessions not counted') : fillIn(t(p.count === 1 ? '1 session uses {gb}' : '{n} sessions use {gb}'), { n: p.count, gb: gb(p.rssMb) })
  return running === undefined ? fillIn(t('Claude: {procs}'), { procs }) : fillIn(t('Claude: {procs} · {running}'), { procs, running: fillIn(t(running === 1 ? '1 agent running' : '{n} agents running'), { n: running }) })
}

const ROOM_BY: Record<Limiter, string> = { memory: 'memory', processor: 'the processor', limit: 'the agent cap', pressure: 'memory pressure', heat: 'heat', battery: 'the battery' }
export const roomBy = (r: Room, t: (s: string) => string = s => s): string => t(ROOM_BY[r.by])

export function powerLine(l: Laptop, t: Tr = same): string | undefined {
  const b = l.battery
  const batt = b === undefined ? undefined : !b.hasBattery ? t('On power, no battery') : fillIn(t(b.onAc ? 'Battery {n}%, plugged in' : 'Battery {n}%, not plugged in'), { n: b.percent ?? '?' })
  const heat = l.thermal === undefined ? undefined : l.thermal.state === 'slowed' ? fillIn(t('slowed by heat to {n}%'), { n: l.thermal.speedLimit as number }) : t('heat is fine')
  const parts = [batt, heat].filter((x): x is string => x !== undefined)
  if (parts.length === 0) return undefined
  const line = parts.join(' · ')
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}`
}

export function computerText(mode: string, r: Room | undefined, l: Laptop | undefined): string {
  if (r === undefined || l === undefined) return mode === 'on' ? 'Computer: nothing read yet.' : 'Computer: the computer reading is off. Turn it on: Settings > Agents.'
  const line = roomLine(r)
  return `Computer: ${line.charAt(0).toLowerCase()}${line.slice(1)} (${sharesLine(l).toLowerCase().replace(' · ', ', ')}).`
}
