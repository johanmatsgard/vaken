// Is Claude down? the public status page read with one plain GET, a calm band line for an incident on Claude Code or the API, amber only for a major outage.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { SLOW, test } from './slow'

import { STATUS_BAND_ID, STATUS_EVERY_MS, STATUS_PAGE, STATUS_SOON_MS, STATUS_STRINGS, STATUS_URL, forgetStatus, incidentOf, parseStatus, statusDue, statusMem } from '../hooks/core/claudestatus'
import { bandKey, parseItems } from '../hooks/core/band'
import { bandWhatIs } from '../hooks/core/whatis'
import { WhatIsBody } from '../hooks/ui/kit'
import type { El } from '../hooks/ui/kit'
import { byEnglish } from '../hooks/i18n/table'
import { tIn } from '../hooks/i18n/t'

const NOW = Date.parse('2026-10-17T12:00:00Z')
const MIN = 60_000
const ROOT = '/w/me'
const SV = byEnglish('sv')

const comp = (name: string, status = 'operational') => ({ name, status })
const inc = (name: string, over: Record<string, unknown> = {}) => ({ name, status: 'investigating', impact: 'minor', started_at: new Date(NOW - 20 * MIN).toISOString(), components: [comp('Claude Code', 'degraded_performance')], ...over })
const page = (incidents: unknown[], components: unknown[] = [comp('Claude API (api.anthropic.com)'), comp('Claude Code'), comp('claude.ai')]) => ({ components, incidents, status: { indicator: 'minor' } })

test('only an open incident on Claude Code or the API counts; major or a major outage of ours is the loud kind', () => {
  expect(incidentOf(page([]))).toBeUndefined()
  expect(incidentOf(page([inc('Done', { status: 'resolved' })]))).toBeUndefined()
  expect(incidentOf(page([inc('Only the website', { components: [comp('claude.ai', 'partial_outage')] })]))).toBeUndefined()
  expect(incidentOf(page([inc('Elevated errors on Claude Code')]))).toEqual({ title: 'Elevated errors on Claude Code', startedAt: NOW - 20 * MIN, major: false })
  expect(incidentOf(page([inc('API slow', { components: [comp('Claude API (api.anthropic.com)')] })]))?.title).toBe('API slow')
  expect(incidentOf(page([inc('Big one', { impact: 'major' })]))?.major).toBe(true)
  expect(incidentOf(page([inc('Calm words')], [comp('Claude Code', 'major_outage')]))?.major).toBe(true)
  // The major one leads; a long title is cut
  expect(incidentOf(page([inc('Small'), inc('Large', { impact: 'critical' })]))?.title).toBe('Large')
  expect((incidentOf(page([inc('x'.repeat(300))]))?.title ?? '').length).toBeLessThanOrEqual(120)
  expect(parseStatus('not json')).toBeUndefined()
  expect(incidentOf(null)).toBeUndefined()
})

test('a check is due only while the session is in use: every 5 minutes, a minute after a service error', () => {
  forgetStatus()
  expect(statusDue(NOW)).toBe(false)
  statusMem.turnAt = NOW
  expect(statusDue(NOW)).toBe(true)
  statusMem.checkedAt = NOW
  expect(statusDue(NOW + 2 * MIN)).toBe(false)
  expect(statusDue(NOW + 2 * MIN, true)).toBe(true)
  expect(statusDue(NOW + STATUS_SOON_MS - 1, true)).toBe(false)
  expect(statusDue(NOW + STATUS_EVERY_MS)).toBe(true)
  // Not in use for 30 minutes: no check
  expect(statusDue(NOW + 31 * MIN)).toBe(false)
  forgetStatus()
})

test('the opened line names the title and its age, links the status page, and every word is in Swedish too', () => {
  statusMem.incident = { title: 'Elevated errors on Claude Code', startedAt: NOW - 20 * MIN, major: false }
  const w = bandWhatIs({ id: STATUS_BAND_ID, text: 'Claude has trouble: Elevated errors on Claude Code', at: NOW - MIN }, NOW)
  // The line itself says the title: the opened line does not say it again
  expect(JSON.stringify(w)).not.toContain('Elevated errors')
  expect(w.why).toContain('20 min')
  expect(w.link).toEqual({ label: 'Status page', href: STATUS_PAGE })
  expect(w.setting).toBe('modhealth.mode')
  forgetStatus()
  for (const s of STATUS_STRINGS) expect(SV[s] ?? '', s).not.toBe('')
  expect(tIn('sv', 'band.claude_has_trouble_title', { title: 'X' })).toBe('Claude har problem: X')
})

type N = { type: string; props: Record<string, unknown> }
const mk = (type: string) => (p: Record<string, unknown>): N => ({ type, props: p ?? {} })
function walk(n: unknown, out: N[] = []): N[] {
  if (Array.isArray(n)) for (const c of n) walk(c, out)
  else if (n !== null && typeof n === 'object' && 'type' in n) {
    out.push(n as N)
    walk((n as N).props.children, out)
  }
  return out
}

test('the link is the host Link; a surface without one draws no link row', () => {
  const el = { Box: mk('Box'), Text: mk('Text'), Button: mk('Button'), Svg: mk('Svg'), host: { Client: mk('Client'), Link: mk('Link') }, drag: true } as unknown as El
  const link = walk(WhatIsBody(el, 'w', ['a'], undefined, [], [], { label: 'Status page', href: STATUS_PAGE })).filter(n => n.type === 'Link')
  expect(link.length).toBe(1)
  expect(link[0]?.props.href).toBe(STATUS_PAGE)
  const none = { ...el, host: { Client: mk('Client') } } as unknown as El
  expect(walk(WhatIsBody(none, 'w', ['a'], undefined, [], [], { label: 'Status page', href: STATUS_PAGE })).some(n => n.type === 'Link')).toBe(false)
})

function world(on: On, body: () => string | undefined, health = 'on') {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test', LANG: 'en_US.UTF-8' })
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:firstrun': 'done', 'cockpit:setting:modhealth.mode': health }))
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
  on('command.register', () => ({ value: { command: 'x' } }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  const asked: { url: string; init?: unknown }[] = []
  on('http.fetch', (_$, e) => {
    asked.push({ url: e.url, ...(e.init === undefined ? {} : { init: e.init }) })
    const text = body()
    // A host that refuses the address (an organization's web policy) answers no page
    return { value: text === undefined ? { status: 403, ok: false, headers: {}, text: '' } : { status: 200, ok: true, headers: {}, text } } as never
  })
  const band = () => parseItems(mem.get(bandKey('me'))).find(x => x.id === STATUS_BAND_ID)
  return { clock, asked, band }
}

const settle = async (clock: { advance: (ms: number) => Promise<void> }) => {
  for (let n = 0; n < 5; n += 1) await clock.advance(1)
}

test('a turn asks the page once with a plain GET; the line comes, turns amber for a major outage and goes when resolved', SLOW, async ($, on) => {
  let now = JSON.stringify(page([inc('Elevated errors on Claude Code')]))
  const w = world(on, () => now)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  expect(w.asked.length).toBe(0)
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  await settle(w.clock)
  expect(w.asked).toEqual([{ url: STATUS_URL }])
  expect(w.band()).toMatchObject({ level: 'info', text: 'Claude has trouble: Elevated errors on Claude Code' })
  // A second turn soon after does not ask again
  await $.turn.start({ text: 'go', turnId: 't2' } as never)
  await settle(w.clock)
  expect(w.asked.length).toBe(1)
  now = JSON.stringify(page([inc('Elevated errors on Claude Code', { impact: 'major' })]))
  await w.clock.advance(STATUS_EVERY_MS)
  await settle(w.clock)
  expect(w.asked.length).toBe(2)
  expect(w.band()).toMatchObject({ level: 'warn', text: 'Claude is down: Elevated errors on Claude Code' })
  now = JSON.stringify(page([inc('Elevated errors on Claude Code', { status: 'resolved' })]))
  await w.clock.advance(STATUS_EVERY_MS)
  await settle(w.clock)
  expect(w.band()).toBeUndefined()
  forgetStatus()
})

test('a refused fetch shows nothing', SLOW, async ($, on) => {
  const w = world(on, () => undefined)
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  await settle(w.clock)
  expect(w.asked.length).toBe(1)
  expect(w.band()).toBeUndefined()
  forgetStatus()
})

test('with Vaken health Off the page is never asked', SLOW, async ($, on) => {
  const w = world(on, () => JSON.stringify(page([inc('Down')])), 'off')
  await $.session.start({ cwd: ROOT, surface: 'desktop', isInteractive: true } as never)
  await $.turn.start({ text: 'go', turnId: 't1' } as never)
  await settle(w.clock)
  await w.clock.advance(STATUS_EVERY_MS)
  await settle(w.clock)
  expect(w.asked.length).toBe(0)
  expect(w.band()).toBeUndefined()
  forgetStatus()
})
