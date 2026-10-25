import { expect } from 'claude-code/testing'
import { test } from './slow'

import { BACK_MODE, MODE_CLASSES, PRESETS, USUAL_MODE, WORST_KEYS, backLines, backOffered, changeCount, diffLines, findPreset, listText, modeNow, parseAsk, presetSteps } from '../hooks/core/presets'
import { SETTINGS, defaults } from '../hooks/core/settings'
import { SETTING_KEY } from '../hooks/core/guard'
import { SECRETS_KEY } from '../hooks/core/guardworld'

test('every preset sets only real settings to real options', () => {
  for (const p of PRESETS) {
    for (const [key, value] of Object.entries(p.values)) {
      const s = SETTINGS.find(x => x.key === key)
      expect(s, `${p.name}: ${key}`).toBeDefined()
      expect(s!.options.map(o => o.value), `${p.name}: ${key}=${value}`).toContain(value)
    }
  }
})

test('no preset turns on a block that spends model usage by itself: none sets the cache keeper', () => {
  for (const p of PRESETS) expect(p.values['cache.keeper'], p.name).toBeUndefined()
})

test('Every check on turns on every check row of the three modes', () => {
  const every = findPreset('everything')!.values
  for (const k of [...MODE_CLASSES.alerts, ...MODE_CLASSES.helpers, ...MODE_CLASSES.sends]) {
    expect(every[k], k).toBeDefined()
    expect(every[k], k).not.toBe('off')
  }
})

test('the modes sorted by cost: Recommended matches the registry defaults for the rows it names, and a fresh store reads as Recommended', () => {
  const rec = findPreset('balanced')!
  for (const [key, value] of Object.entries(rec.values)) expect(SETTINGS.find(s => s.key === key)!.default, key).toBe(value)
  expect(modeNow(defaults())).toBe('balanced')
  expect(USUAL_MODE).toBe('balanced')
  // Compacting: Recommended and Everything useful compact by themselves (Auto, the default); Only alerts only watches
  expect(PRESETS.map(p => p.values['compact.mode'])).toEqual(PRESETS.map(() => undefined))
  expect(SETTINGS.find(s => s.key === 'compact.mode')!.default).toBe('watch')
  const [quiet, full] = [findPreset('quiet')!, findPreset('full')!]
  for (const k of MODE_CLASSES.alerts) expect([quiet.values[k], rec.values[k], full.values[k]], k).toEqual([rec.values[k], rec.values[k], rec.values[k]])
  for (const k of MODE_CLASSES.helpers) {
    expect(quiet.values[k], k).toBe('off')
    expect(rec.values[k], k).not.toBe('off')
  }
  for (const k of MODE_CLASSES.helpers.filter(x => !MODE_CLASSES.sends.includes(x))) expect(full.values[k], k).toBe(rec.values[k])
  expect([rec.values['prompt.check'], rec.values['plan.first'], rec.values['assume.check'], rec.values['claude.notes']]).toEqual(['tip', 'suggest', 'off', 'safety'])
  // The budget is in no mode: a stored budget never makes a mode read as Custom
  for (const m of ['quiet', 'balanced', 'full']) expect(findPreset(m)!.values['cost.budget'], m).toBeUndefined()
  expect([full.values['prompt.check'], full.values['plan.first'], full.values['assume.check'], full.values['claude.notes']]).toEqual(['ask', 'ask', 'on', 'all'])
  expect(rec.values).toMatchObject({ 'decisions.mode': 'on', 'coach.mode': 'on', 'recap.mode': 'on', 'value.weekly': 'on', 'today.brief': 'on', 'proof.claims': 'warn', 'preview.auto': 'on', 'resume.mode': 'remind', 'plan.first': 'suggest', 'fresh.nudge': 'on', 'compact.card': 'on' })
})

test('every preset has a plain title, and no title repeats a mode id, a view name or another title', () => {
  const titles = PRESETS.map(p => p.title)
  expect(new Set(titles).size).toBe(titles.length)
  for (const t of titles) expect(['Quiet', 'Balanced', 'Full', 'Standard', 'All', 'Custom']).not.toContain(t)
  expect(PRESETS.map(p => [p.name, p.title])).toEqual([['quiet', 'Only alerts'], ['balanced', 'Recommended'], ['full', 'Everything useful'], ['careful', 'Ask before risky steps'], ['thrifty', 'Save usage'], ['everything', 'Every check on'], ['backoffice', 'No coding']])
})

test('a preset never stores Warn for the two worst kinds: it puts them back to their default, so the stop when Claude Code would not ask stays', () => {
  expect([...WORST_KEYS]).toEqual([SETTING_KEY.destructive, SECRETS_KEY])
  for (const p of PRESETS) {
    for (const st of presetSteps(p)) if (WORST_KEYS.includes(st.key)) expect(st.value, `${p.name}: ${st.key}`).toBe(p.values[st.key] === 'warn' ? undefined : p.values[st.key])
  }
  expect(presetSteps(findPreset('careful')!).find(st => st.key === 'guard.destructive')?.value).toBe('hold')
  expect(presetSteps(findPreset('quiet')!).some(st => st.key === 'compact.mode')).toBe(false)
})

test('the change count: zero for the mode a store is on, the rows that differ for another', () => {
  const def = (k: string): string => SETTINGS.find(s => s.key === k)?.default ?? ''
  expect(changeCount(findPreset('balanced')!, defaults(), def)).toBe(0)
  expect(changeCount(findPreset('quiet')!, defaults(), def)).toBe(diffLines(findPreset('quiet')!, defaults(), k => k, (_k, v) => v, def).length)
  expect(changeCount(findPreset('quiet')!, defaults(), def)).toBeGreaterThan(10)
  expect(diffLines(findPreset('balanced')!, { ...defaults(), 'compact.mode': 'auto' }, k => k, (_k, v) => v, def)).toEqual([])
})

test('no preset touches Compact by itself: a choice the person made stays, an unset row reads its default, Watch only', () => {
  const def = (k: string): string => SETTINGS.find(s => s.key === k)?.default ?? ''
  for (const m of ['quiet', 'balanced', 'full']) {
    const p = findPreset(m)!
    expect(presetSteps(p).some(st => st.key === 'compact.mode'), m).toBe(false)
    expect(modeNow({ ...defaults(), ...p.values }), m).toBe(m)
    expect(changeCount(p, { ...defaults(), ...p.values }, def), m).toBe(0)
    expect(modeNow({ ...defaults(), ...p.values, 'compact.mode': 'suggest' }), m).toBe(m)
  }
})

test('the ask is parsed: list, show, apply, bad', () => {
  expect(parseAsk('')).toEqual({ kind: 'list' })
  expect(parseAsk('Careful').kind).toBe('show')
  expect(parseAsk('careful yes').kind).toBe('apply')
  expect(parseAsk('wild').kind).toBe('bad')
  expect(findPreset('Recommended')?.name).toBe('balanced')
  expect(parseAsk('recommended yes')).toMatchObject({ kind: 'apply', preset: { name: 'balanced' } })
  expect(listText()).toMatch(/Ask before risky steps \(careful\): /)
})

test('the diff lists only what differs, in words', () => {
  const lines = diffLines(findPreset('careful')!, { 'guard.destructive': 'warn', 'guard.scope': 'hold' }, k => k, (_k, v) => v)
  expect(lines).toContain('  guard.destructive: warn -> hold')
  expect(lines.join('\n')).not.toMatch(/guard\.scope:/)
})

test('the presets set the agent cap, and Thrifty sets the model map', () => {
  expect(findPreset('careful')!.values).toMatchObject({ 'cap.mode': 'hold', 'cap.max': 'auto' })
  expect(findPreset('everything')!.values).toMatchObject({ 'cap.mode': 'hold', 'cap.max': 'auto' })
  expect(findPreset('thrifty')!.values).toMatchObject({ 'cap.mode': 'hold', 'runner.researcher': 'haiku', 'runner.builder': 'sonnet', 'runner.reviewer': 'haiku', 'runner.fixer': 'opus' })
})

test('the way back from Custom: offered only while the values match no mode, it lists what Recommended would change, and Recommended is where it goes', () => {
  const def = (k: string): string => SETTINGS.find(s => s.key === k)?.default ?? ''
  expect(BACK_MODE).toBe('balanced')
  expect(backOffered(defaults())).toBe(false)
  for (const m of ['quiet', 'balanced', 'full']) expect(backOffered({ ...defaults(), ...findPreset(m)!.values }), m).toBe(false)
  const mine = { ...defaults(), 'prompt.check': 'off', 'recap.mode': 'off' }
  expect(modeNow(mine)).toBe('custom')
  expect(backOffered(mine)).toBe(true)
  expect(backLines(mine, k => k, (_k, v) => v, def)).toEqual(['  recap.mode: off -> on', '  prompt.check: off -> tip'])
  expect(changeCount(findPreset('balanced')!, mine, def)).toBe(2)
})
