import { expect } from 'claude-code/testing'
import { test } from './slow'

import { FOLDED, FRONT_DOOR, HIDDEN, isFolded, subArgs } from '../hooks/core/menu'
import { COMMAND_GROUPS, EVERYDAY_COMMANDS } from '../hooks/core/registry'

test('vaken has 15 commands, and every one is in the help once', () => {
  expect(FRONT_DOOR).toHaveLength(15)
  expect(new Set(FRONT_DOOR).size).toBe(15)
  const listed = COMMAND_GROUPS.flatMap(g => g.commands)
  expect(listed.slice().sort()).toEqual(FRONT_DOOR.slice().sort())
  expect(EVERYDAY_COMMANDS.map(e => e.command)).toEqual(FRONT_DOOR)
})

test('a folded word belongs to one command, is not a command itself, and a hidden name is neither', () => {
  const folded = Object.values(FOLDED).flat()
  expect(new Set(folded).size).toBe(folded.length)
  for (const parent of Object.keys(FOLDED)) expect(FRONT_DOOR).toContain(parent)
  for (const w of [...folded, ...HIDDEN]) expect(FRONT_DOOR).not.toContain(`vaken-${w}`)
  for (const h of HIDDEN) expect(folded).not.toContain(h)
})

test('the words after a command are read the way a person types them', () => {
  expect(subArgs('cost', 'cost')).toBe('')
  expect(subArgs('  Budget   extend day ', 'budget')).toBe('extend day')
  expect(subArgs('run focus 20', 'run', 'focus')).toBe('20')
  expect(subArgs('costly', 'cost')).toBeUndefined()
  expect(subArgs('', 'cost')).toBeUndefined()
  expect(isFolded('vaken-usage', 'why')).toBe(true)
  expect(isFolded('vaken-usage', 'cost now')).toBe(true)
  expect(isFolded('vaken-usage', '')).toBe(false)
  expect(isFolded('vaken-usage', 'sessions')).toBe(false)
  expect(isFolded('vaken-help', 'glossary')).toBe(true)
  expect(isFolded('vaken-help', 'run ports')).toBe(true)
  expect(isFolded('vaken-help', 'run nothing')).toBe(false)
  expect(isFolded('vaken-help', 'ports')).toBe(false)
  expect(isFolded('vaken-compact', 'why')).toBe(false)
})
