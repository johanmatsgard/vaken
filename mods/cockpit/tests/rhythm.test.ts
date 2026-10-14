// One body rhythm everywhere: Home with every card open and Settings with every section open, drawn at 300.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { SECTION_TABLE } from '../hooks/core/settingsmap'
import { forgetProjectSet } from '../hooks/core/io'
import { forgetContext } from '../hooks/features/home/context'
import { forgetStartCheck } from '../hooks/features/home/starttask'
import { checkShown } from '../hooks/features/orchestra'
import { BOARD_KEY } from '../hooks/core/agentboard'
import { BASE_SEEDS, HOME, MIN, NOW, ROOT, SETUP_BASE, engine, kids, nameOf, propsAt, rec, run, task } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'
import { footerProblems, looked, rhythmProblems } from './rhythm'
import type { RNode } from './rhythm'

const WIDTHS_PT = [300, 400, 700]

function world(withRun: boolean, detail: string, view = 'custom'): World {
  const w: World = { mem: new Map(), files: new Map(Object.entries(SETUP_BASE)), listening: {}, procs: [] }
  BASE_SEEDS(w.mem)
  w.mem.set('cockpit:setting:detail', detail)
  w.mem.set('cockpit:setting:look.view', view)
  const m = w.mem
  m.set('cockpit:session:asks-1', rec('asks-1', { cwd: '/work/lead', title: "Today's task planning", state: 'waiting', stateSince: NOW - MIN, lastEventAt: NOW - MIN, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - MIN } }))
  m.set('cockpit:session:idle-1', rec('idle-1', { cwd: '/work/lead', title: 'Mac lead session', state: 'idle', stateSince: NOW - 5 * MIN, lastEventAt: NOW - 5 * MIN }))
  m.set('cockpit:session:idle-2', rec('idle-2', { cwd: '/work/site', title: 'Web fixes', state: 'idle', stateSince: NOW - 8 * MIN, lastEventAt: NOW - 8 * MIN }))
  m.set('cockpit:session:work-1', rec('work-1', { cwd: '/work/docs', title: 'Write the user guide', state: 'working' }))
  if (withRun) m.set('cockpit:orch:test-session', run('running', Array.from({ length: 20 }, (_, i) => task(i + 1, `Task number ${i + 1}`, i < 14 ? 'done' : i < 17 ? 'running' : 'waiting', i < 14 ? { check: 'passed', usd: 0.2 } : {}))))
  else m.set(BOARD_KEY, Array.from({ length: 40 }, (_, i) => ({ id: `h${i}`, session: 'test-ses', type: i % 2 === 0 ? 'Explore' : 'general-purpose', what: `Look up part ${i + 1}`, background: false, startedAt: NOW - (i < 2 ? 2 : 120 + i) * MIN, ...(i < 2 ? {} : { endedAt: NOW - (110 + i) * MIN }), state: i < 2 ? 'running' : 'done' })))
  w.files.set(`${HOME}/.claude/CLAUDE.md`, 'Plain short answers.\n')
  w.files.set(`${HOME}/.claude/projects/-work-app/memory/MEMORY.md`, '- [Short answers](short.md) — plain words\n- [Tests first](tests.md) — run the touched tests\n')
  return w
}

type On = Parameters<typeof engine>[0]
function setUp(on: On, withRun = false, detail = 'glance', view = 'custom'): void {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME })
  engine(on, world(withRun, detail, view))
}
async function mount($: unknown, wPt: number): Promise<Pane> {
  forgetProjectSet()
  forgetContext()
  forgetStartCheck()
  delete checkShown.sig
  return (await ($ as { ui: { mount: (a: unknown) => Promise<unknown> } }).ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(wPt) })) as Pane
}

const find = (n: Node, pred: (x: Node) => boolean): Node | undefined => (pred(n) ? n : kids(n).map(c => find(c, pred)).find(x => x !== undefined))

const opened = new Set<string>()
async function openAll(ui: Pane): Promise<void> {
  const walk = (n: Node, out: Node[] = []): Node[] => {
    if (n.props?.borderStyle === 'round') out.push(n)
    for (const c of kids(n)) walk(c, out)
    return out
  }
  for (let pass = 0; pass < 3; pass++) {
    const shut = walk(await ui.drawn()).map(nameOf).filter(id => id !== '')
    let pressed = false
    for (const id of shut) {
      const card = find(await ui.drawn(), n => nameOf(n) === id && n.props?.borderStyle === 'round')
      if (card === undefined) continue
      if (find(card, n => nameOf(n) === `${id}-body`) !== undefined) {
        opened.add(id)
        continue
      }
      if (find(card, n => nameOf(n) === `press-glance-${id}-0`) === undefined) continue
      await ui.press({ key: `press-glance-${id}-0` })
      await ui.redraw()
      pressed = true
    }
    if (!pressed) return
  }
}

async function homeProblems($: unknown, at: string): Promise<string[]> {
  const problems: string[] = []
  for (const wPt of WIDTHS_PT) {
    const ui = await mount($, wPt)
    await openAll(ui)
    await ui.redraw(propsAt(wPt))
    const root = (await ui.drawn()) as RNode
    problems.push(...rhythmProblems(root, `${at} at ${wPt} pt`), ...footerProblems(root, `${at} at ${wPt} pt`))
    await ui.unmount()
  }
  return [...new Set(problems)]
}

for (const detail of ['glance', 'explained']) {
  test(`Home at the ${detail} look with every card open (helpers): every body half a row under its header, its rows half a row apart, on the text edge`, { timeoutMs: 300_000 }, async ($, on) => {
    setUp(on, false, detail)
    const problems = await homeProblems($, `Home (${detail})`)
    expect(looked.bodies).toBeGreaterThan(20)
    expect(looked.pickLines).toBeGreaterThan(0)
    expect(looked.rules).toBeGreaterThan(0)
    // The cards the rhythm was measured on are drawn open: Needs you, This session, Other sessions, Agents, Plan limits.
    for (const id of ['needs', 'here', 'others', 'agents', 'limit', 'context']) expect(opened.has(id), id).toBe(true)
    expect(problems).toEqual([])
  })

  test(`Home at the ${detail} look with every card open (a task run): the same rhythm`, { timeoutMs: 300_000 }, async ($, on) => {
    setUp(on, true, detail)
    expect(await homeProblems($, `Home with a run (${detail})`)).toEqual([])
  })
}

test('Home in the Standard view, every card open: the same rhythm, and a wrapped footer half a row between its lines', { timeoutMs: 300_000 }, async ($, on) => {
  setUp(on, false, 'glance', 'standard')
  expect(await homeProblems($, 'Home (Standard)')).toEqual([])
})

test('Settings with every section open: the same rhythm', { timeoutMs: 300_000 }, async ($, on) => {
  setUp(on)
  const problems: string[] = []
  const ui = await mount($, 700)
  await ui.press({ key: 'settings' })
  await ui.redraw()
  for (const k of [...SECTION_TABLE.map(s => `press-ol-section:${s.name}-0`), 'press-ol-section:Advanced-0']) {
    await ui.press({ key: k })
    await ui.redraw()
  }
  for (const wPt of WIDTHS_PT) {
    await ui.redraw(propsAt(wPt))
    problems.push(...rhythmProblems((await ui.drawn()) as RNode, `Settings at ${wPt} pt`))
  }
  await ui.unmount()
  expect([...new Set(problems)]).toEqual([])
})

