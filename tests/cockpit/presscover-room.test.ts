// A pressable row's cover label of blanks stops short of the row's right end, so text that runs wider than BLANK_PT (another window, another screen) is never cut with a "…" under the chevron.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { BASE_SEEDS, HOME, NOW, SETUP_BASE, engine, propsAt, rec, walk } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'
import { BLANK_PT, BORDER_X_PT, columnPt, PRESS_END_PT, PRESS_FILL, PRESS_INSET, PRESS_WASH_OUT } from '../hooks/ui/tokens'

test('every row cover leaves the end press its room at 288 and 300 pt', { timeoutMs: 60_000 }, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', 'glance')
  w.mem.set('cockpit:session:s1', rec('s1', { cwd: '/work/site', title: 'Site build', state: 'working' }))
  engine(on, w)
  const ui = (await ($ as unknown as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(288) })) as Pane
  for (const wPt of [288, 300]) {
    await ui.redraw(propsAt(wPt))
    const covers = walk(await ui.drawn()).filter((n: Node) => n.type === 'Button' && /^press-(?!end-)/.test(String(n.key ?? n.props?.key ?? '')) && /^ +$/.test(String(n.props?.label ?? '')))
    expect(covers.length).toBeGreaterThan(0)
    // The widest row: a card's inner width, its wash on both sides
    const most = ((wPt - 2 * BORDER_X_PT + 2 * PRESS_WASH_OUT * columnPt()) * PRESS_FILL - PRESS_END_PT - PRESS_INSET) / BLANK_PT
    for (const c of covers) expect(String(c.props?.label).length).toBeLessThanOrEqual(Math.floor(most))
  }
  await ui.unmount()
})
