// The tests' shared kit.
import { test as engineTest } from 'claude-code/testing'
import type { TestOptions, TestRest } from 'claude-code/testing'

export const DEFAULT_TIMEOUT_MS = 60_000

// Kept for the tests that still pass it; the default above is longer, so a test's own timeoutMs wins only when it asks for more.
export const SLOW = { timeoutMs: 20_000 }

// The engine's `test`, with a generous timeout filled in when the caller gave none.
export const test = (name: string, ...rest: TestRest): void => {
  if (rest.length === 1) {
    engineTest(name, { timeoutMs: DEFAULT_TIMEOUT_MS }, rest[0])
    return
  }
  const [options, body] = rest
  const timeoutMs = Math.max(options.timeoutMs ?? 0, DEFAULT_TIMEOUT_MS)
  const filled: TestOptions = { ...options, timeoutMs }
  engineTest(name, filled, body)
}
