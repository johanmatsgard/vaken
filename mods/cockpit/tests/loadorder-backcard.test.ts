// Loading core/backcard.ts first, before any other file, must work.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { backShort } from '../hooks/core/backcard'
import { openWords } from '../hooks/core/openends'

test('core/backcard.ts loads first, then core/openends.ts', () => {
  expect(typeof backShort).toBe('function')
  expect(typeof openWords).toBe('function')
})
