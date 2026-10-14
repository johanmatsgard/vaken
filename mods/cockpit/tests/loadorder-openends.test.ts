// Loading core/openends.ts first, before any other file, must work.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { openWords } from '../hooks/core/openends'
import { backShort } from '../hooks/core/backcard'

test('core/openends.ts loads first, then core/backcard.ts', () => {
  expect(typeof openWords).toBe('function')
  expect(typeof backShort).toBe('function')
})
