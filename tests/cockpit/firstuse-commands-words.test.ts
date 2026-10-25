// The words and asks of the first-use flow.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { batchText } from '../hooks/core/attention'
import { gapToast } from '../hooks/core/proofclaims'
import { POPOUT_RETRY_MS, popMem } from '../hooks/core/popout'
import { FRONT_DOOR } from '../hooks/core/menu'
import { COMMAND_GROUPS, EVERYDAY_COMMANDS } from '../hooks/core/registry'
import { SETTINGS, defaults, parseAsk, settingPath, settingsText } from '../hooks/core/settings'
import { settingIn } from '../hooks/core/whatis'
import { heldToast, warnToast } from '../hooks/core/guard'
import { needsChip } from '../hooks/core/cardrules'
import { helpText } from '../hooks/features/home/commands'
import { popOut } from '../hooks/features/home/popout'
import type { HomeEngine } from '../hooks/features/home/engine'
import { keepThrow } from '../hooks/features/home/throwask'
import { flags } from '../hooks/features/home/state'

const same = (s: string): string => s

test('Throw away asks in place first; Keep drops the question and changes nothing', () => {
  const calls: string[] = []
  const act = { runSteer: (a: string) => calls.push(`steer ${a}`), askThrow: (n: number | undefined) => calls.push(`ask ${n}`) } as never
  const task = { n: 2, text: 'x', path: '/w/x', state: 'done' } as never
  flags.throwAsk = undefined
  const first = keepThrow(task, act, 'rv')
  expect(first.ask).toEqual([])
  expect(first.actions.map(a => a.label)).toEqual(['Keep work', 'Throw away'])
  first.actions[1]?.onPress()
  expect(calls).toEqual(['ask 2'])
  flags.throwAsk = 2
  const asking = keepThrow(task, act, 'rv')
  expect(asking.ask[0]).toMatch(/^Throw away the work of task 2\? Its folder copy and its branch are deleted\.$/)
  expect(asking.actions.map(a => a.label)).toEqual(['Throw away', 'Keep'])
  calls.length = 0
  asking.actions[1]?.onPress()
  expect(calls).toEqual(['ask undefined'])
  calls.length = 0
  asking.actions[0]?.onPress()
  expect(calls).toEqual(['ask undefined', 'steer throw 2'])
  flags.throwAsk = undefined
})

test('/vaken-help names the 15 commands once each, by job, with a few words and the words that can follow them', () => {
  const listed = COMMAND_GROUPS.flatMap(g => g.commands)
  expect(EVERYDAY_COMMANDS.map(e => e.command)).toEqual(FRONT_DOOR)
  for (const e of EVERYDAY_COMMANDS) {
    expect(e.command === 'vaken' || listed.includes(e.command), e.command).toBe(true)
    expect(e.words.split(/\s+/).length, e.command).toBeLessThanOrEqual(10)
  }
  expect(listed.slice().sort()).toEqual(FRONT_DOOR.slice().sort())
  const text = helpText('')
  const lines = text.split('\n')
  expect(lines.indexOf('Usage and cost')).toBeGreaterThan(0)
  expect(text).toContain('- `/vaken-settings`: see or change a setting')
  expect(text).toContain('- `/vaken-usage`: your plan limits, cost and budget (cost, budget, limits, fit, why)')
  expect(text).toContain('`/vaken-help run` lists the parts in the pane')
  expect(text).toContain('`/vaken-help <word>` finds one')
})

test('/vaken-settings prints the name and the one-line note of a row, then its key, value and choices', () => {
  const text = settingsText(defaults(), false, [], true)
  const lines = text.split('\n')
  const at = lines.findIndex(l => l.startsWith('    detail: '))
  expect(at).toBeGreaterThan(0)
  const row = SETTINGS.find(s => s.key === 'detail')
  expect(lines[at - 1]).toBe(`  ${row?.label}: ${row?.note.replace(/\.$/, '')}.`)
  expect(lines[at]).toMatch(/^ {4}detail: Glance \(glance \/ simple \/ explained\)$/)
})

test('a typed reset needs a yes, as the pane asks first', () => {
  expect(parseAsk('reset')).toEqual({ kind: 'reset' })
  expect(parseAsk('reset yes')).toEqual({ kind: 'reset', yes: true })
})

test('a sentence names a row by its Settings section, and settingIn finds the row again', () => {
  const guard = SETTINGS.find(s => s.key === 'guard.destructive')
  expect(guard).toBeDefined()
  expect(settingPath(guard as never)).toBe('Settings > Safety > Risky commands')
  expect(settingIn(`Read it. ${settingPath(guard as never)} sets Warn or Stop.`)).toBe('guard.destructive')
  const notes = SETTINGS.find(s => s.key === 'claude.notes')
  expect(settingPath(notes as never)).toBe('Settings > Advanced > Notes to Claude')
  const titles = ['Notices', 'Money and plan', 'Agents', 'Safety', 'Prompts and memory', 'Cards and look', 'Health', 'Advanced']
  for (const s of SETTINGS) if (s.hidden !== true) expect(titles.some(t => settingPath(s).startsWith(`Settings > ${t} > `)), settingPath(s)).toBe(true)
})

test('many notices tell who asks and who finished', () => {
  const list = [
    { id: 'a', marker: 'needs:1', text: '"Fix login" needs you.' },
    { id: 'b', marker: 'needs:2', text: '"Docs" needs you: a question.' },
    { id: 'c', marker: 'done:3', text: '"Build" finished.' },
  ]
  expect(batchText(list)).toBe('Waiting for you: Fix login, Docs. Finished: Build.')
})

test('the unproven claim is shown in quotes, as what Claude said', () => {
  expect(gapToast([{ kind: 'generic', why: 'missing' } as never])).toBe('An unproven claim: "verified"')
})

test('the guard toast says what happened and the press that lets it through', () => {
  const toast = heldToast([{ block: 'destructive', words: 'Deletes.' }] as never)
  expect(toast).toBe('Stopped a risky command. Press Allow once in Needs you to let it through.')
  expect(warnToast([{ block: 'packages', words: 'x' }] as never)).toBe('Claude was told about a package that looks odd.')
})

test('the verb follows the number', () => {
  expect(needsChip(1, same)).toBe('1 needs you')
  expect(needsChip(3, same)).toBe('3 need you')
})

test('a failed pop out is tried again after ten minutes', async () => {
  let n = 0
  const eng = { mcpCall: async () => { n += 1; return { content: [{ type: 'text', text: 'ok' }] } } } as unknown as HomeEngine
  popMem.failed = true
  popMem.failedAt = Date.now()
  expect((await popOut(eng, same)).ok).toBe(false)
  expect(n).toBe(0)
  popMem.failedAt = Date.now() - POPOUT_RETRY_MS - 1
  expect((await popOut(eng, same)).ok).toBe(true)
  expect(n).toBe(1)
  popMem.failed = false
  delete popMem.failedAt
})
