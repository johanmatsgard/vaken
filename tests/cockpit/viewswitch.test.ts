// The footer's view switch (Standard, All, Custom): one press swaps the view, the first Custom is a copy of the view shown, and Arrange never wipes a Custom set.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'
import { ARRANGING_OWN_CUSTOM, ARRANGING_TO_CUSTOM } from '../hooks/core/cardwords'
import { CARD_IDS } from '../hooks/features/home/logic'
import { STANDARD_IDS } from '../hooks/features/home/viewset'
import { columnPt, cardGapX } from '../hooks/ui/tokens'
import { test } from './slow'

const NOW = new Date(2026, 9, 17, 9, 0).getTime()
type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { drawn: () => Promise<unknown>; find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
type Mem = Map<string, unknown>

const kids = (n: Node): Node[] => (n.children ?? []).filter((c): c is Node => typeof c === 'object' && c !== null)
const keyOf = (n: Node): string => String(n.key ?? n.props?.key ?? '')
const walk = (n: Node): Node[] => [n, ...kids(n).flatMap(walk)]
const paneProps = (bodyColumns: number) => ({ title: 'Vaken', isFocused: false, bodyColumns, placement: 'inline' as const, scroll: { bodyRows: 60, offset: 0, total: 60 }, view: {} })
const SET = (k: string): string => `cockpit:setting:${k}`
const ORDER = (b: number): string => `cockpit:pref:gorder:${b}`

function engine(on: On, seed: Record<string, unknown> = {}): { mem: Mem; toasts: string[] } {
  const mem: Mem = new Map<string, unknown>([['cockpit:firstrun', 'done'], ...Object.entries(seed)])
  const toasts: string[] = []
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as { text?: unknown }).text ?? ''))
    return { value: undefined } as never
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return { mem, toasts }
}
const mountAt = ($: unknown, widthPt: number) => (): Promise<Pane> =>
  ($ as { ui: { mount: (o: unknown) => Promise<Pane> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps(Math.round(widthPt / columnPt())) })
// A press, then a fresh mount: the press's store writes have landed
async function pressOn(mount: () => Promise<Pane>, key: string): Promise<void> {
  const pane = await mount()
  expect(await pane.find({ key }), `${key} is drawn`).toBeDefined()
  await pane.press({ key })
  await pane.unmount()
}
const framedWidth = (n: Node): number => walk(n).filter(k => k.type === 'Box' && keyOf(k).startsWith('fcw-')).reduce((sum, k) => sum + Number(k.props?.width ?? 0), 0)

for (const widthPt of [288, 420, 900]) {
  for (const view of ['standard', 'all', 'custom'] as const) {
    test(`${view} at ${widthPt} pt: the switch is drawn whole, the shown view chosen, and fits the pane`, async ($, on) => {
      engine(on, view === 'standard' ? {} : { [SET('look.view')]: view })
      const pane = await mountAt($, widthPt)()
      const tree = (await pane.drawn()) as Node
      const nodes = walk(tree)
      for (const v of ['standard', 'all', 'custom']) expect(nodes.some(n => keyOf(n) === `view-switch-${v}`), `${v} is drawn`).toBe(true)
      // The chosen option is not dim, the others are: they look pressable
      const btn = (v: string): Node | undefined => nodes.find(n => n.type === 'Button' && keyOf(n) === `view-switch-${v}`)
      expect(btn(view)?.props?.dimColor, 'the shown view is chosen').toBeUndefined()
      for (const v of ['standard', 'all', 'custom'].filter(x => x !== view)) expect(btn(v)?.props?.dimColor, `${v} is not chosen`).toBe(true)
      const cols = Math.round(widthPt / columnPt())
      const sw = nodes.find(n => keyOf(n) === 'view-switch')
      expect(sw, 'one switch').toBeDefined()
      expect(framedWidth(sw as Node), 'the switch fits the pane').toBeLessThanOrEqual(cols)
      // Beside the footer's presses only when the whole line fits
      const footer = nodes.find(n => keyOf(n) === 'footer')
      const beside = footer !== undefined && walk(footer).some(n => keyOf(n) === 'view-switch')
      if (beside) {
        const lines = walk(footer as Node).filter(n => n.type === 'Box' && keyOf(n).startsWith('footer-line-'))
        if (lines.length === 0) {
          const presses = walk(footer as Node).filter(n => n.type === 'Box' && keyOf(n).startsWith('fcw-'))
          expect(framedWidth(footer as Node) + (presses.length - 1) * (cardGapX() / columnPt()), 'the footer line fits').toBeLessThanOrEqual(cols)
        }
      } else expect(nodes.some(n => keyOf(n) === 'view-switch-row'), 'on its own line above the footer').toBe(true)
      if (widthPt === 900) expect(beside, 'a wide pane keeps it beside the footer presses').toBe(true)
      await pane.unmount()
    })
  }
}

test('one press swaps the view, and says nothing', async ($, on) => {
  const { mem, toasts } = engine(on)
  const mount = mountAt($, 420)
  await pressOn(mount, 'view-switch-all')
  expect(mem.get(SET('look.view'))).toBe('all')
  await pressOn(mount, 'view-switch-standard')
  expect(mem.get(SET('look.view'))).toBe('standard')
  expect(toasts).toEqual([])
})

test('the first Custom is a copy of the view shown; a later Custom keeps the set', async ($, on) => {
  const { mem, toasts } = engine(on)
  const mount = mountAt($, 420)
  await pressOn(mount, 'view-switch-custom')
  expect(mem.get(SET('look.view'))).toBe('custom')
  expect(CARD_IDS.filter(id => mem.get(SET(`cards.${id}`)) === 'show')).toEqual(CARD_IDS.filter(id => STANDARD_IDS.includes(id)))
  expect(String(mem.get(ORDER(1))).split(',').slice(0, STANDARD_IDS.length)).toEqual([...STANDARD_IDS])
  // The person changes the set, goes to All, and comes back: the set is theirs, not seeded again
  mem.set(SET('cards.ship'), 'show')
  mem.set(ORDER(1), 'ship,here,context')
  await pressOn(mount, 'view-switch-all')
  expect(mem.get(SET('look.view'))).toBe('all')
  await pressOn(mount, 'view-switch-custom')
  expect(mem.get(SET('look.view'))).toBe('custom')
  expect(mem.get(SET('cards.ship'))).toBe('show')
  expect(mem.get(ORDER(1))).toBe('ship,here,context')
  expect(toasts).toEqual([])
})

test('Arrange from Standard keeps an existing Custom set: no seed, its own toast', async ($, on) => {
  const { mem, toasts } = engine(on, { [SET('look.view')]: 'standard', [SET('cards.ship')]: 'show', [SET('cards.safety')]: 'hide', [ORDER(1)]: 'ship,here,context', [ORDER(3)]: 'context,ship' })
  await pressOn(mountAt($, 420), 'arrange')
  expect(mem.get(SET('look.view'))).toBe('custom')
  expect(mem.get(SET('cards.ship'))).toBe('show')
  expect(mem.get(SET('cards.safety'))).toBe('hide')
  expect(mem.has(SET('cards.prs')), 'no other card choice written').toBe(false)
  expect(mem.get(ORDER(1))).toBe('ship,here,context')
  expect(mem.get(ORDER(3))).toBe('context,ship')
  expect(mem.has(SET('view.problems')), 'Problems first untouched').toBe(false)
  expect(toasts).toContain(ARRANGING_OWN_CUSTOM)
  expect(toasts).not.toContain(ARRANGING_TO_CUSTOM)
})

test('Arrange from All with no Custom set seeds once', async ($, on) => {
  const { mem, toasts } = engine(on, { [SET('look.view')]: 'all' })
  await pressOn(mountAt($, 420), 'arrange')
  expect(mem.get(SET('look.view'))).toBe('custom')
  expect(mem.get(SET('cards.ship'))).toBe('show')
  expect(mem.get(SET('view.problems'))).toBe('off')
  expect(toasts).toContain(ARRANGING_TO_CUSTOM)
})
