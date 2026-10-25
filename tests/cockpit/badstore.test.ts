// A broken or old store value never blanks the pane: each reader drops what it cannot read, and the rest of the cards still draw.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { collector } from '../hooks/features/home/load'
import { PR_SHARED_KEY } from '../hooks/core/crewpr'
import { BASE_SEEDS, HOME, MIN, NOW, ROOT, SETUP_BASE, engine, kids, nameOf, propsAt } from './statefixtures'
import type { Mem, Node, Pane, World } from './statefixtures'
import { drawOrLine } from '../hooks/features/home/pane'
import { DRAW_FAILED } from '../hooks/features/home/prefs'

const all = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of kids(n)) all(c, out)
  return out
}
const BAD: { name: string; seed: (m: Mem) => void; cards: string[] }[] = [
  { name: 'record with no session id', seed: m => m.set('cockpit:session:old1', { cwd: 5, state: 'gone' }), cards: ['here'] },
  { name: 'ledger with null lines', seed: m => m.set('cockpit:ledger:compact', [null, 'x', { at: 'yesterday' }]), cards: ['here'] },
  { name: 'shared PR answer with no checks', seed: m => { m.set('cockpit:setting:crew.pr', 'on'); m.set(PR_SHARED_KEY, { [`${ROOT}/.git\nfeat-x`]: { at: NOW - MIN, branch: 'feat-x', view: { state: 'OPEN', number: 7 } } }) }, cards: ['here', 'prs'] },
]

for (const s of BAD) {
  test(`bad store value: ${s.name}`, { timeoutMs: 120_000 }, async ($, on) => {
    mock.clock(on, { now: NOW })
    mock.env(on, { HOME })
    const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
    BASE_SEEDS(w.mem)
    s.seed(w.mem)
    engine(on, w)
    collector.local = { id: 'test-session', cwd: ROOT, branch: 'feat-x', isEnded: false, isWatched: true }
    forgetProjectSet()
    forgetContext()
    forgetStartCheck()
    try {
      const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(420) })) as Pane
      await ui.redraw()
      const cards = all(await ui.drawn()).filter(n => n.props?.borderStyle === 'round').map(nameOf)
      for (const id of s.cards) expect(cards).toContain(id)
      await ui.unmount()
    } finally {
      collector.local = undefined
    }
  })
}

test('a card that throws draws its plain line, and the pane draws the rest', () => {
  const card = drawOrLine((): string => {
    throw new Error('a broken store value')
  }, () => DRAW_FAILED)
  expect(card).toBe('Vaken could not draw this. Type /vaken-help.')
  expect(drawOrLine(() => 'the card', () => DRAW_FAILED)).toBe('the card')
})
