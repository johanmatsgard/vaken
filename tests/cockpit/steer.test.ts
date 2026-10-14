import { expect } from 'claude-code/testing'
import { test } from './slow'

import { STEER_DESCRIPTION, STEER_SCHEMA, TOPICS, isTopic, unknownTopic } from '../hooks/core/steer'

test('only the listed topics are answered', () => {
  expect(isTopic('proof')).toBe(true)
  expect(isTopic('goal')).toBe(true)
  expect(isTopic('constructor')).toBe(false)
  expect(isTopic('settings')).toBe(false)
  expect(isTopic(7)).toBe(false)
  expect(unknownTopic()).toMatch(/Ask about one of: proof/)
})

test('the tool is read only: it names no topic that changes anything', () => {
  for (const t of ['halt', 'settings', 'compact', 'keeper', 'away', 'reviewed', 'extend']) expect(TOPICS).not.toContain(t)
  expect(STEER_SCHEMA.properties.topic.enum).toEqual([...TOPICS])
  expect(STEER_DESCRIPTION).toMatch(/Read only/)
})
