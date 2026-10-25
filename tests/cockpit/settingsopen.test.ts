// A press on a Settings section row opens the section.
import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { columnPt, ROW_PT } from '../hooks/ui/tokens'
import { clientKey as fcKey } from '../hooks/ui/firstclick'

const NOW = Date.parse('2026-10-11T12:00:00Z')
function engine(on: On, mem: Map<string, unknown>) {
  on('store.get', (_$, e) => ({ value: mem.has(e.key) ? JSON.parse(JSON.stringify(mem.get(e.key))) : undefined }) as never)
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
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
}
const propsAt = (wPt: number) => ({ title: 'Vaken', isFocused: false, bodyColumns: wPt / columnPt(), placement: 'dock' as const, scroll: { bodyRows: Math.round(1400 / ROW_PT), offset: 0, total: 200 }, view: {} })
type Node = { type?: string; key?: string; props?: Record<string, unknown>; children?: unknown[] }
type Pane = { pointer: (q: unknown) => Promise<void>; drawn: () => Promise<Node>; redraw: (p?: unknown) => Promise<void>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void>; find: (q: unknown) => Promise<unknown> }
const walk = (n: Node, out: Node[] = []): Node[] => {
  out.push(n)
  for (const c of (n.children ?? []).filter((c): c is Node => c !== null && typeof c === 'object')) walk(c, out)
  return out
}
const nameOf = (x: Node): string | undefined => (x.key ?? (x.props?.key as string | undefined))

for (const w of [400, 1130, 2400]) {
  test(`Settings at ${w} pt: pressing a section row opens it and the drawn tree shows its setting rows`, { timeoutMs: 60_000 }, async ($, on) => {
    const mem = new Map<string, unknown>()
    mock.clock(on, { now: NOW })
    mock.env(on, { HOME: '/home/test' })
    engine(on, mem)
    mem.set('cockpit:firstrun', 'done')
    mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000 })
    const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(w) })) as unknown as Pane
    await ui.press({ key: 'settings' })
    await ui.redraw()
    const before = walk(await ui.drawn()).map(nameOf).filter((k): k is string => k !== undefined)
    const rowKeys = before.filter(k => k.includes('section:') || k.includes('section_3a_'))
    expect(rowKeys.length, `no section row keys among ${before.length} keys: ${before.join(',')}`).toBeGreaterThan(0)
    const pressKey = rowKeys.find(k => k.startsWith('press-') && k.includes('Notices'))
    expect(pressKey).toBeDefined()
    expect(rowKeys).toContain(fcKey('ol-section:Notices'))
    await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: fcKey('ol-section:Notices') })
    await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: fcKey('ol-section:Notices') })
    await ui.redraw()
    const after = walk(await ui.drawn()).map(nameOf).filter((k): k is string => k !== undefined)
    expect(after.length, `keys before ${before.length}, after ${after.length}; after: ${after.join(',')}`).toBeGreaterThan(before.length)
    await ui.unmount()
  })
}

for (const [cols, detail] of [['3', 'project'], ['1', 'glance'], ['2', 'glance'], ['3', 'glance'], ['3', 'simple'], ['3', 'explained'], ['6', 'glance']]) {
  test(`every section opened in turn, Columns ${cols}, detail ${detail}, 1130 pt`, { timeoutMs: 60_000 }, async ($, on) => {
    const mem = new Map<string, unknown>()
    mock.clock(on, { now: NOW })
    mock.env(on, { HOME: '/home/test' })
    engine(on, mem)
    mem.set('cockpit:firstrun', 'done')
    mem.set('cockpit:setting:look.columns', cols)
    if (detail === 'project') {
      mem.set('cockpit:projectof:test-session', '/work/app')
      mem.set('cockpit:projset:/work/app', { 'guard.destructive': 'hold' })
    } else mem.set('cockpit:setting:detail', detail)
    for (let n = 1; n <= 8; n += 1) mem.set(`cockpit:session:s${n}`, { sessionId: `s${n}`, cwd: `/work/s${n}`, model: 'claude-opus-5', state: n === 3 ? 'waiting' : 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000 })
    mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000 })
    const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(1130) })) as unknown as Pane
    await ui.press({ key: fcKey('settings') }).catch(() => ui.press({ key: 'settings' }))
    await ui.redraw()
    const names = walk(await ui.drawn()).map(nameOf).filter((k): k is string => k !== undefined && k.startsWith(fcKey('ol-section:')) && !k.endsWith('-box'))
    expect(names.length).toBeGreaterThan(5)
    let last = 0
    for (const n of names) {
      await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: n })
      await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: n })
      await ui.redraw()
      const count = walk(await ui.drawn()).length
      expect(count, `${n}: the tree did not grow (${last} to ${count})`).toBeGreaterThan(last)
      last = count
    }
    await ui.unmount()
  })
}

test('the Back of Settings has autoFocus, and no row cover clips the focus ring', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000 })
  mem.set('cockpit:session:q1', { sessionId: 'q1', cwd: '/work/q1', model: 'claude-opus-5', state: 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000, ask: { kind: 'question', tool: 'AskUserQuestion', since: NOW - 60000 } })
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(1130) })) as unknown as Pane
  const covers = walk(await ui.drawn()).filter(x => (nameOf(x) ?? '').startsWith('cover-'))
  expect(covers.length, 'the board draws row covers').toBeGreaterThan(3)
  for (const c of covers) expect(c.props?.overflow, `${nameOf(c)} clips`).toBeUndefined()
  await ui.press({ key: 'settings' })
  await ui.redraw()
  const back = walk(await ui.drawn()).find(x => nameOf(x) === 'settings-done' && x.type === 'Button')
  expect(back?.props?.autoFocus).toBe(true)
  await ui.unmount()
})

// A Client's key is its address in the app and what the host sends back at ui.message.
test('every first-click Client key is plain (letters, digits, - and _) and unique, in the board and in Settings with sections open', { timeoutMs: 60_000 }, async ($, on) => {
  const mem = new Map<string, unknown>()
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on, mem)
  mem.set('cockpit:firstrun', 'done')
  mem.set('cockpit:session:test-session', { sessionId: 'test-session', cwd: '/work/app', model: 'claude-opus-5', state: 'working', startedAt: NOW - 1000000, updatedAt: NOW - 2000, lastEventAt: NOW - 2000, stateSince: NOW - 3000 })
  const ui = (await $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: propsAt(1130) })) as unknown as Pane
  const clientKeys = async (): Promise<string[]> => walk(await ui.drawn()).filter(x => x.type === 'Client').map(x => String(nameOf(x)))
  const home = await clientKeys()
  expect(home.length).toBeGreaterThan(3)
  await ui.press({ key: 'settings' })
  await ui.redraw()
  const shut = await clientKeys()
  for (const name of ['Notices', 'Safety']) {
    const key = fcKey(`ol-section:${name}`)
    await ui.pointer({ type: 'down', x: 1, y: 0, button: 'left', in: key })
    await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: key })
    await ui.redraw()
  }
  const open = await clientKeys()
  expect(open.length).toBeGreaterThan(shut.length)
  for (const list of [home, shut, open]) {
    for (const k of list) expect(k, `Client key ${k}`).toMatch(/^fc-[A-Za-z0-9_-]+$/)
    expect(new Set(list).size, 'Client keys are unique').toBe(list.length)
  }
  await ui.unmount()
})
