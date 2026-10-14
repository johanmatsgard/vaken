// The band's press Clients carry the pane's protections: the same quiet press module, and left out after the host says one failed (the host draws its error label in a failed Client's place).
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { registerHome } from '../hooks/features/home'
import { HomeBand } from '../hooks/features/home/band'
import type { View } from '../hooks/features/home/logic'
import { FirstClick } from '../hooks/ui/kit'
import type { El } from '../hooks/ui/kit'
import { FAULT_REST_MS, faulted, noteFault } from '../hooks/ui/firstclick'

type N = { type: string; props: Record<string, unknown> }
const mk = (type: string) => (p: Record<string, unknown>): N => ({ type, props: p ?? {} })
const el = { Box: mk('Box'), Text: mk('Text'), Button: mk('Button'), Svg: mk('Svg'), Client: mk('Client') } as unknown as El
function walk(n: unknown, out: N[] = []): N[] {
  if (Array.isArray(n)) for (const c of n) walk(c, out)
  else if (n !== null && typeof n === 'object' && 'type' in n) {
    out.push(n as N)
    walk((n as N).props.children, out)
  }
  return out
}
const NOW = Date.now()
// One session needs you and one more line waits: both band presses are drawn
const view = { needs: [], held: 1, band: [{ id: 'x', level: 'warn', text: 'Budget at 80%', at: NOW, ttlMs: 600_000 }], now: NOW } as unknown as View
const draw = (): N[] => walk(HomeBand(el, view, 'glance', () => undefined, undefined, () => undefined, 100))
const clientsOf = (t: N[]): N[] => t.filter(n => n.type === 'Client')

test('every band Client is the press module the pane uses, and a fault leaves it out while its words stay a Button', () => {
  const before = clientsOf(draw())
  expect(before.length, 'the band draws its presses as Clients').toBe(2)
  const paneClient = walk(FirstClick(el, 'pane-part', () => undefined, 'button', 1)).find(n => n.type === 'Client')
  expect(paneClient).toBeDefined()
  for (const c of before) {
    expect(c.props.module, 'the same press module as the pane: it sends nothing on a resize').toBe(paneClient?.props.module)
    noteFault(String(c.props.key), Date.now())
  }
  const after = draw()
  expect(clientsOf(after), 'a failed band Client is left out, so the host has no error label to draw').toHaveLength(0)
  const labels = after.filter(n => n.type === 'Button').map(n => String(n.props.label))
  expect(labels.some(l => l.includes('needs you')), 'the Needs you words still press').toBe(true)
  expect(labels.some(l => l.includes('See all 2')), 'See all still presses').toBe(true)
})

test('a faulted press comes back once the rest has passed', () => {
  noteFault('fc-rest-test', 1000)
  expect(faulted('fc-rest-test', 1000 + FAULT_REST_MS - 1)).toBe(true)
  expect(faulted('fc-rest-test', 1000 + FAULT_REST_MS)).toBe(false)
  expect(faulted('fc-never', 1000)).toBe(false)
})

test('the home hooks hear a press Client fault and leave that Client out', async () => {
  type Hook = (s: unknown, e: unknown, next: (e: unknown) => unknown) => unknown
  const seen: { event: string; m: unknown; fn: Hook }[] = []
  const chain = { catch: () => chain }
  const on = (event: string, m: unknown, fn?: Hook) => {
    seen.push({ event, m, fn: (fn ?? m) as Hook })
    return chain
  }
  registerHome(on as never)
  const hook = seen.find(s => s.event === 'ui.fault')
  expect(hook, 'a ui.fault hook').toBeDefined()
  const re = (hook?.m as { element?: RegExp }).element
  expect(re?.test('fc-band-needs')).toBe(true)
  await hook?.fn({}, { element: 'fc-band-details' }, e => e)
  expect(faulted('fc-band-details', Date.now())).toBe(true)
})
