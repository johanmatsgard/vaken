// An ordinary toast is held while a full view of the pane is open and shown when it closes.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { HOLD_MAX, HOLD_MS, holdToast, releaseHeldToasts, toastHold } from '../hooks/core/io'

test('a toast is held while a view is open, once, and released when it closes', () => {
  const shown: string[] = []
  toastHold.show = t => shown.push(t)
  toastHold.held = []
  let open = true
  toastHold.on = () => open
  try {
    expect(holdToast('One', 1000)).toBe(true)
    expect(holdToast('One', 1001)).toBe(true)
    releaseHeldToasts(2000)
    expect(shown).toEqual([])
    open = false
    releaseHeldToasts(3000)
    expect(shown).toEqual(['One'])
    expect(holdToast('Two', 4000)).toBe(false)
  } finally {
    toastHold.on = () => false
    toastHold.held = []
  }
})

test('few wait, and none waits for ever', () => {
  const shown: string[] = []
  toastHold.show = t => shown.push(t)
  toastHold.held = []
  toastHold.on = () => true
  try {
    for (let n = 0; n < HOLD_MAX + 2; n += 1) holdToast(`T${n}`, 1000)
    expect(toastHold.held.length).toBe(HOLD_MAX)
    releaseHeldToasts(1000 + HOLD_MS - 1)
    expect(shown).toEqual([])
    releaseHeldToasts(1000 + HOLD_MS)
    expect(shown.length).toBe(HOLD_MAX)
  } finally {
    toastHold.on = () => false
    toastHold.held = []
  }
})
