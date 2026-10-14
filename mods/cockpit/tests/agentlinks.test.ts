// The Agents card's rows and the band's buttons.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import { BASE_SEEDS, HOME, STATES, engine, getNow, kids, nameOf, propsAt, setNow, walk } from './statefixtures'
import type { Node, Pane, World } from './statefixtures'
import { setSetupExists } from '../hooks/features/setupfiles'
import { COL_PT } from '../hooks/ui/tokens'

const stateNamed = (name: string) => {
  const s = STATES.find(x => x.name === name)
  if (s === undefined) throw new Error(`no state ${name}`)
  return s
}

test('Agents card at Glance: the task lines stand the body\'s half row apart, and Task runs and the Computer pointer are chevron rows at full strength', async ($, on) => {
  const w: World = { mem: new Map<string, unknown>(), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: getNow() })
  mock.env(on, { HOME })
  engine(on, w)
  setSetupExists(async p => w.files.has(p))
  setNow(clock.now())
  BASE_SEEDS(w.mem)
  stateNamed('run paused for the plan limit').seed(w.mem, w)
  w.mem.set('cockpit:setting:detail', 'glance')
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(600) })) as unknown as Pane
  await clock.settle()
  await ui.redraw(propsAt(600))
  await ui.press({ key: 'press-glance-agents-0' })
  await ui.redraw()
  const root = await ui.drawn()
  const all = walk(root)
  const list = all.find(n => kids(n).some(k => nameOf(k) === 'ol-task:1'))
  expect(list).toBeDefined()
  expect(list?.props?.rowGap).toBe(1)
  const lines = kids(list as Node).filter(k => /^ol-task:/.test(nameOf(k)))
  expect(lines.length).toBe(3)
  for (const l of lines.slice(0, -1)) expect(Number(l.props?.minHeight) - Number(l.props?.paddingBottom ?? 0) / 2).toBe(1)
  for (const [key, words] of [['runner-open', 'Task runs'], ['pointer-computer-open', 'Is there room? (Computer)']]) {
    const row = all.find(n => nameOf(n) === `linkrow-${key}`)
    expect(row, key).toBeDefined()
    expect(row?.props?.justifyContent).toBe('space-between')
    const button = walk(row as Node).find(n => n.type === 'Button' && nameOf(n) === key)
    expect(button?.props?.label).toBe(words)
    expect(button?.props?.dimColor).toBeUndefined()
    const chevron = walk(row as Node).find(n => n.type === 'Svg')
    expect(chevron?.props?.alt).toBe(`Open ${words}`)
  }
  await ui.unmount()
})

test('the band: its buttons are the host\'s plain Button with no fill at rest, padded, at full strength', async ($, on) => {
  const w: World = { mem: new Map<string, unknown>(), files: new Map(), listening: {}, procs: [] }
  const clock = mock.clock(on, { now: getNow() })
  mock.env(on, { HOME })
  engine(on, w)
  setSetupExists(async p => w.files.has(p))
  setNow(clock.now())
  BASE_SEEDS(w.mem)
  stateNamed('posted band lines (one risk and what vaken did)').seed(w.mem, w)
  const bandProps = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 760 / COL_PT, scroll: { bodyRows: 5, offset: 0, total: 5 }, view: {} }
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'AbovePrompt', props: bandProps })) as unknown as Pane
  await clock.settle()
  await ui.redraw(bandProps)
  const all = walk(await ui.drawn())
  const buttons = all.filter(n => n.type === 'Button' && /^band-/.test(nameOf(n)))
  expect(buttons.length).toBeGreaterThan(0)
  for (const b of buttons) {
    expect(b.props?.plain).toBe(true)
    expect(b.props?.variant).toBeUndefined()
    expect(b.props?.dimColor).toBeUndefined()
    expect(String(b.props?.label)).toMatch(/^ +\S.*\S +$/)
    const box = all.find(n => nameOf(n) === `fcw-${nameOf(b)}`)
    expect(box, nameOf(b)).toBeDefined()
    expect(box?.props?.backgroundColor).toBeUndefined()
  }
  await ui.unmount()
})
