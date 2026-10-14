// The room for more helpers is said in one place: the Computer card.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { LAPTOP_KEY } from '../hooks/core/crewlaptop'
import { CARD_IDS } from '../hooks/features/home/logic'

const NOW = Date.parse('2026-10-10T10:00:00Z')
const MIN = 60_000
const ALL_SHOWN: Record<string, string> = Object.fromEntries([['cockpit:setting:look.view', 'custom'], ...Object.entries(Object.fromEntries(CARD_IDS.map(id => [`cockpit:setting:cards.${id}`, 'show'])))])
const calm = { at: NOW, pressure: 'normal', freeShare: 0.5, memMb: 24 * 1024, load: 4, cores: 18, battery: { hasBattery: true, onAc: true, percent: 80 }, thermal: { state: 'ok' }, procs: { count: 3, rssMb: 4198 } }
const rec = (sid: string, over: Record<string, unknown> = {}) => ({ sessionId: sid, cwd: '/work/app', model: 'm', state: 'idle', startedAt: NOW - 20 * MIN, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3 * MIN, ...over })
const props = (cols: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: cols, placement: 'inline' as const, scroll: { bodyRows: 80, offset: 0, total: 80 }, view: {} })

function harness(on: On, seed: Record<string, unknown>) {
  const mem = new Map<string, unknown>(Object.entries({ 'cockpit:setting:look.view': 'custom', ...seed }))
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('session.cwd', () => ({ value: '/work/app' }) as never)
  on('session.root', () => ({ value: '/work/app' }) as never)
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
}

const world = (detail: string, laptop: unknown) => ({
  ...ALL_SHOWN,
  'cockpit:setting:detail': detail,
  'cockpit:setting:laptop.mode': 'on',
  'cockpit:firstrun': 'done',
  'cockpit:session:test-session': rec('test-session'),
  ...(laptop === undefined ? {} : { [LAPTOP_KEY]: laptop }),
})

const SAYS_ROOM = /^(room for (about )?\d|full: |no room( for another agent)?$)/i

type Look = { name: string; detail: string; computer?: string; open?: boolean }
const LOOKS: Look[] = [
  { name: 'Short', detail: 'simple' },
  { name: 'Full', detail: 'explained' },
  { name: 'Glance, shut', detail: 'glance' },
  { name: 'Glance, Computer and Agents open, Short', detail: 'glance', computer: 'simple', open: true },
  { name: 'Glance, Computer and Agents open, Full', detail: 'glance', computer: 'explained', open: true },
]
const READINGS: [string, unknown][] = [['room', calm], ['full', { ...calm, pressure: 'warn' }]]

for (const cols of [40, 160]) {
  for (const [reading, laptop] of READINGS) {
    for (const look of LOOKS) {
      test(`the room is said once, by the Computer card: ${reading}, ${look.name}, ${cols} columns`, { timeoutMs: 15_000 }, async ($, on) => {
        mock.clock(on, { now: NOW })
        mock.env(on, { HOME: '/home/test' })
        harness(on, { ...world(look.detail, laptop), ...(look.computer === undefined ? {} : { 'cockpit:setting:detail.computer': look.computer }) })
        const ui = await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: props(cols) })
        if (look.open === true) {
          if ((await ui.find({ key: 'ol-computer:room' })) === undefined) await ui.press({ key: 'press-glance-computer-0' })
          if ((await ui.find({ key: 'pointer-computer-open' })) === undefined) await ui.press({ key: 'press-glance-agents-0' })
          await ui.redraw()
          expect(await ui.find({ key: 'ol-computer:room' }), 'the Computer card is open').toBeDefined()
          expect(await ui.find({ key: 'pointer-computer-open' }), 'the Agents card is open and points to the Computer card').toBeDefined()
        }
        const all = ((await ui.findAll({ type: 'Text' })) as { text?: string }[]).map(t => t.text ?? '')
        const said = all.filter(t => SAYS_ROOM.test(t))
        expect(said.length).toBe(1)
        await ui.unmount()
      })
    }
  }
}
