// The one gate for toasts: an hourly cap across all blocks, urgent ones always show, a failing store never hides a toast.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { TOAST_DEFAULT_CAP, TOAST_LOG_KEY, TOAST_WINDOW_MS, repeatVerdict, toastVerdict, withToastGate } from '../hooks/core/io'
import type { Io } from '../hooks/core/io'

const NOW = 1_000_000_000_000

test('the cap counts ordinary toasts in the last hour and then holds the rest back', () => {
  let stamps: unknown = []
  const shown: boolean[] = []
  for (let n = 0; n < TOAST_DEFAULT_CAP + 2; n += 1) {
    const v = toastVerdict(stamps, NOW + n, undefined)
    shown.push(v.show)
    stamps = v.stamps
  }
  expect(shown.filter(Boolean)).toHaveLength(TOAST_DEFAULT_CAP)
  expect(shown.slice(-2)).toEqual([false, false])
})

test('old toasts leave the count after an hour, and the cap is fixed at 6 an hour', () => {
  const old = Array.from({ length: 6 }, (_, n) => NOW - TOAST_WINDOW_MS - n)
  expect(toastVerdict(old, NOW).show).toBe(true)
  expect(TOAST_DEFAULT_CAP).toBe(6)
  const six = Array.from({ length: 6 }, (_, n) => NOW - 1000 - n)
  expect(toastVerdict(six, NOW).show).toBe(false)
  expect(toastVerdict(six.slice(1), NOW).show).toBe(true)
  expect(toastVerdict('junk', NOW).show).toBe(true)
})

const fakeIo = (store: Map<string, unknown>, shown: string[], broken = false): Io =>
  ({
    now: async () => NOW,
    get: async (k: string) => {
      if (broken) throw new Error('no store')
      return store.get(k)
    },
    set: async (k: string, v: unknown) => {
      if (broken) throw new Error('no store')
      store.set(k, v)
    },
    toast: (text: string) => void shown.push(text),
  }) as unknown as Io

const settle = async (): Promise<void> => {
  for (let n = 0; n < 20; n += 1) await Promise.resolve()
}

test('through the gate, six ordinary toasts show and the seventh does not; an urgent one always shows', async () => {
  const store = new Map<string, unknown>()
  const shown: string[] = []
  const io = withToastGate(fakeIo(store, shown))
  for (const word of ['one', 'two', 'three', 'four', 'five', 'six', 'seven']) {
    io.toast(`note ${word}`)
    await settle()
  }
  expect(shown).toHaveLength(TOAST_DEFAULT_CAP)
  io.toast('Halted.', true)
  expect(shown.at(-1)).toBe('Halted.')
  expect((store.get(TOAST_LOG_KEY) as number[]).length).toBe(TOAST_DEFAULT_CAP)
})

test('a store that fails still shows the toast', async () => {
  const shown: string[] = []
  withToastGate(fakeIo(new Map(), shown, true)).toast('hello')
  await settle()
  expect(shown).toEqual(['hello'])
})

test('the same toast, numbers aside, shows once an hour and does not use up the cap; an urgent one still shows', async () => {
  const store = new Map<string, unknown>()
  const shown: string[] = []
  const io = withToastGate(fakeIo(store, shown))
  for (const n of [15, 16, 17]) {
    io.toast(`${n} tool calls changed no file and the chat keeps growing.`)
    await settle()
  }
  expect(shown).toEqual(['15 tool calls changed no file and the chat keeps growing.'])
  expect((store.get(TOAST_LOG_KEY) as number[]).length).toBe(1)
  io.toast('17 tool calls changed no file and the chat keeps growing.', true)
  expect(shown).toHaveLength(2)
})

test('a repeat shows again after an hour', () => {
  const first = repeatVerdict(undefined, NOW, 'Claude said done without proof.')
  expect(first.show).toBe(true)
  expect(repeatVerdict(first.seen, NOW + 60_000, 'Claude said done without proof.').show).toBe(false)
  expect(repeatVerdict(first.seen, NOW + TOAST_WINDOW_MS, 'Claude said done without proof.').show).toBe(true)
  expect(repeatVerdict('junk', NOW, 'x').show).toBe(true)
})

// Two blocks of one session may raise a toast in the same moment: the gate takes them one after the other.
test('toasts raised at the same moment in one session wait for each other and keep to the cap', async () => {
  const store = new Map<string, unknown>()
  const shown: string[] = []
  const io = withToastGate(fakeIo(store, shown))
  for (const word of ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']) io.toast(`note ${word}`)
  for (let n = 0; n < 400; n += 1) await Promise.resolve()
  expect(shown).toHaveLength(TOAST_DEFAULT_CAP)
  expect((store.get(TOAST_LOG_KEY) as number[]).length).toBe(TOAST_DEFAULT_CAP)
})
