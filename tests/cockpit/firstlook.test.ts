// First look: the pane mounted with made-up state at one column, written as plain text.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'

import { BUNDLE_TTL_MS } from '../hooks/core/io'
import { lookText } from './looktext'
import { BASE_SEEDS, MIN, NOW, ROOT, engine, held, propsAt, rec, setNow } from './statefixtures'
import type { Mem, Pane, World } from './statefixtures'
import { viaParent } from './viaparent'

const EMIT = false
const WIDTH_PT = 400 // one column, so the reading order is the list order

const standard = (mem: Mem): void => {
  BASE_SEEDS(mem)
  mem.set('cockpit:setting:look.view', 'standard')
  mem.delete('cockpit:setting:detail')
  for (const k of [...mem.keys()]) if (k.startsWith('cockpit:setting:cards.')) mem.delete(k)
}
const busyDay = (mem: Mem): void => {
  standard(mem)
  mem.set('cockpit:session:test-session', rec('test-session', { cwd: ROOT, branch: 'feat-x', state: 'working', title: 'Fix the login page', contextPercent: 60, costUsd: 1.8, fiveHourPercent: 45, fiveHourResetsAt: '2026-10-11T15:00:00Z', sevenDayPercent: 30, sevenDayResetsAt: '2026-10-15T09:00:00Z' }))
  mem.set('cockpit:session:s1', rec('s1', { cwd: '/work/site', title: 'Web fixes', state: 'working', stateSince: NOW - 8 * MIN }))
  const agent = (id: string, what: string, type: string, ago: number) => ({ id, session: 'test-session', type, what, background: false, startedAt: NOW - ago, state: 'running', model: 'claude-opus-5' })
  mem.set('cockpit:agentboard', [agent('g1', 'Search the code for the login form', 'Explore', 4 * MIN), agent('g2', 'Write tests for the date format', 'general-purpose', 2 * MIN)])
}
const needsYou = (mem: Mem): void => {
  busyDay(mem)
  mem.set('cockpit:session:s1', rec('s1', { cwd: '/work/site', title: 'Web fixes', state: 'waiting', stateSince: NOW - 12 * MIN, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 12 * MIN } }))
  mem.set('cockpit:ledger:compact', [held('test-session', 'Held a risky command', 4 * MIN, 'This would delete files in a folder outside the work folder, including the whole archive of last year')])
  mem.set('cockpit:guard:held:test-session', { at: NOW - 4 * MIN, step: 'call-1', keys: ['destructive'], words: 'rm -rf ../archive' })
}

// The guide opens from Help > What each card does (the footer has no guide link).
const guideFromHelp = true
const openGuide = async (ui: Pane, help: () => Promise<unknown>) => {
  await help()
  await ui.redraw()
  await ui.press({ key: 'press-help-guide-0' })
}
const leaveGuide = async (ui: Pane) => {
  await ui.press({ key: 'guide-done' })
  if (guideFromHelp) {
    await ui.redraw()
    await ui.press({ key: 'help-done' })
  }
}

// `has`: lines the screen must hold, checked in the normal gate too.
type Open = { file: string; key: string | RegExp; has?: RegExp[] }
const CARD_FILES: Record<string, string> = { here: 'this-session', context: 'context-health', agents: 'agents', limit: 'plan-limits', others: 'other-sessions' }
const glanceOpens = (prefix: string, has: Record<string, RegExp[]> = {}): Open[] => Object.entries(CARD_FILES).map(([id, file]) => ({ file: `${prefix}-${file}-open`, key: `press-glance-${id}-0`, ...(has[id] === undefined ? {} : { has: has[id] }) }))
type Screen = { has?: RegExp[]; opens?: Open[]; name: string; seed: (mem: Mem) => void; prep?: (ui: Pane, help: () => Promise<unknown>) => Promise<void>; leave?: (ui: Pane) => Promise<void> }
const SCREENS: Screen[] = [
  // The first screen: only Start here (and Needs you when something waits) until setup is done
  { name: '1-first-open-start-here', seed: mem => mem.clear(), has: [/^== Start here ==$/m, /risky step\.\nStep 1 of 5\nHow much should vaken tell you\?/] },
  {
    name: '3-standard-needs-you',
    seed: needsYou,
    has: [/^12 min ago$/m, /4 min ago/],
    opens: [{ file: '3c-needs-you-question-open', key: /^press-n-s1-/ }, { file: '3c-needs-you-stopped-step-open', key: /^press-ol-needs:hold-/ }, ...glanceOpens('3b', { here: [/^State {2}Needs you/m, /^A stopped step waits for you in Needs you\.$/m] })],
  },
  { name: '2-standard-busy-day', seed: busyDay, opens: glanceOpens('2b') },
  { name: '4-settings', seed: busyDay, has: [/^\d+ of \d+ on, \d+ off\. \d+ only suggest/m, /^What vaken keeps stays on this computer\./m], opens: [{ file: '4b-settings-notices-open', key: 'press-ol-section:Notices-0' }, { file: '4c-settings-plan-and-cost-open', key: 'press-ol-section:Plan and cost-0' }], prep: ui => ui.press({ key: 'settings' }), leave: ui => ui.press({ key: 'settings-done' }) },
  { name: '5-card-guide', seed: busyDay, prep: openGuide, leave: leaveGuide },
  { name: '6-help', seed: busyDay, prep: async (_ui, help) => void (await help()), leave: ui => ui.press({ key: 'help-done' }) },
  { name: '7-all-view', seed: mem => { busyDay(mem); mem.set('cockpit:setting:look.view', 'all') } },
]

test('first look: every main screen reads as plain text', { timeoutMs: 60_000 }, async ($, on) => {
  const w: World = { mem: new Map(), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, w)
  const mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(WIDTH_PT) }) as unknown as Promise<Pane>
  const help = () => $.command.run(viaParent('vaken-help', ''))
  for (const s of SCREENS) {
    await clock.advance(BUNDLE_TTL_MS + 1)
    setNow(NOW + BUNDLE_TTL_MS + 1) // the made-up sessions are as fresh as the clock, or the pane would call them old
    w.mem.clear()
    s.seed(w.mem)
    let ui = await mount()
    if (s.prep !== undefined) {
      await s.prep(ui, help)
      await ui.unmount()
      ui = await mount()
    }
    const tree = await ui.drawn()
    const text = lookText(tree)
    expect(text.trim().length).toBeGreaterThan(40)
    expect(text).toContain('== ')
    for (const re of s.has ?? []) expect(re.test(text), `${s.name}: ${String(re)}`).toBe(true)
    if (EMIT) console.log(`@@SCREEN ${s.name}\n${text}@@END`)
    for (const o of s.opens ?? []) {
      const re = o.key
      const key = typeof re === 'string' ? re : [...JSON.stringify(await ui.drawn()).matchAll(/"key":"([^"]+)"/g)].map(m => m[1] ?? '').find(k => re.test(k))
      if (key === undefined) throw new Error(`first look: no row ${String(o.key)} in ${s.name}: ${[...JSON.stringify(await ui.drawn()).matchAll(/"key":"(press[^"]+)"/g)].map(m => m[1]).join(" ")}`)
      await ui.press({ key })
      await ui.redraw()
      const opened = lookText(await ui.drawn())
      expect(opened).not.toBe(text)
      for (const want of o.has ?? []) expect(want.test(opened), `${o.file}: ${String(want)}`).toBe(true)
      if (EMIT) console.log(`@@SCREEN ${o.file}\n${opened}@@END`)
      await ui.press({ key })
      await ui.redraw()
    }
    await ui.unmount()
    if (s.leave !== undefined) {
      const out = await mount()
      await s.leave(out)
      await out.unmount()
    }
  }
})
