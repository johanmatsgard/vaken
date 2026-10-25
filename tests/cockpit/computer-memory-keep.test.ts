// The Computer card keeps the last good memory reading while it is fresh, the Safety jump says where it goes.
import { expect, test } from 'claude-code/testing'
import { LAPTOP_EVERY_MS, MEMORY_KEEP_MS, keepMemory } from '../hooks/core/crewlaptop'
import type { Laptop } from '../hooks/core/crewlaptop'
import { memoryHead, memoryUsedPct, sharesLine } from '../hooks/core/computer'
import { SECTION_TABLE } from '../hooks/core/settingsmap'

const NOW = Date.parse('2026-10-12T10:00:00Z')
const good: Laptop = { at: NOW, schema: 3, pressure: 'normal', freeShare: 0.13, memMb: 24576, load: 3, cores: 18 }
const lacking: Laptop = { at: NOW + LAPTOP_EVERY_MS, schema: 3, load: 4.1, cores: 18 }

test('a reading without the memory share keeps the last good one while it is fresh', () => {
  expect(memoryUsedPct(lacking)).toBeUndefined()
  expect(sharesLine(lacking)).toMatch(/^Memory not read/)
  const kept = keepMemory(lacking, good)
  expect(memoryUsedPct(kept)).toBe(87)
  expect(sharesLine(kept)).toMatch(/^Memory 87%/)
  expect(memoryHead(kept)).toMatch(/^Memory 87% used/)
  expect(kept.load).toBe(4.1)
  expect(kept.at).toBe(lacking.at)
})

test('a newer memory figure is never replaced; a stale or missing good reading is not used', () => {
  const own = { ...lacking, freeShare: 0.09 }
  expect(keepMemory(own, good)).toBe(own)
  expect(keepMemory(lacking, undefined)).toBe(lacking)
  const noFree: Laptop = { at: good.at, schema: 3 }
  expect(keepMemory(lacking, noFree)).toBe(lacking)
  expect(keepMemory({ ...lacking, at: good.at + MEMORY_KEEP_MS + 1 }, good).freeShare).toBeUndefined()
  expect(keepMemory({ ...lacking, at: good.at - 1 }, good).freeShare).toBeUndefined()
})

test('the Safety section jump says where it goes', () => {
  expect(SECTION_TABLE.find(s => s.name === 'Safety')?.jump?.label).toBe('Open the Safety card ›')
})
