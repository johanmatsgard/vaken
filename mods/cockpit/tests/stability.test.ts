import { expect, mock } from 'claude-code/testing'
import { test } from './slow'
import type { On } from 'claude-code'

import { changed, failures, healthText, summary } from '../hooks/core/stability'
import type { Health } from '../hooks/core/stability'
import { viaParent } from './viaparent'

const ok = (name: string) => ({ name, ok: true })
const bad = (name: string) => ({ name, ok: false, why: 'no answer' })

test('a version change is known only when there was an earlier version', () => {
  expect(changed(undefined, '2.1.300')).toBe(false)
  expect(changed('2.1.295', '2.1.295')).toBe(false)
  expect(changed('2.1.295', '2.1.300')).toBe(true)
})

test('the summary says what failed, or that the update passed', () => {
  const h: Health = { at: 1, version: '2.1.300', previous: '2.1.295', results: [ok('clock'), ok('files')] }
  expect(summary(h)).toBe('Updated from 2.1.295 to 2.1.300. All 2 self-tests passed.')
  expect(summary({ ...h, previous: '2.1.300' })).toBe('All 2 self-tests passed.')
  const broken = { ...h, results: [ok('clock'), bad('files')] }
  expect(failures(broken.results)).toHaveLength(1)
  expect(summary(broken)).toBe('1 of 2 self-tests failed: files.')
})

test('the text twin lists every check', () => {
  const text = healthText({ at: 1, version: '2.1.300', results: [ok('clock'), bad('files')] })
  expect(text).toMatch(/Engine version: 2\.1\.300/)
  expect(text).toMatch(/✓ clock/)
  expect(text).toMatch(/✗ files: no answer/)
  expect(healthText(undefined)).toMatch(/has not checked itself yet/)
})

function memStore(on: On): Map<string, unknown> {
  const mem = new Map<string, unknown>()
  on('store.get', (_$, e) => ({ value: mem.get(e.key) }) as never)
  on('store.set', (_$, e) => {
    mem.set(e.key, e.value)
    return { value: undefined } as never
  })
  on('store.delete', (_$, e) => {
    mem.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...mem.keys()] }) as never)
  return mem
}

test('/vaken-help run health answers before any check, with a plain sentence', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  memStore(on)
  mock.session(on)
  const r = (await $.command.run(viaParent('vaken-health', ''))) as { text: string }
  expect(r.text).toMatch(/has not checked itself yet/)
})
