// Tell me: the Mac notification's escape, cap, grouping, the away rule, quiet hours, Focus, the ways and the status line.
import { expect } from 'claude-code/testing'
import { test } from './slow'

import { ATTENTION_SETTINGS, notices } from '../hooks/core/attention'
import { AWAY_MS, TELL_CHARS, TELL_GAP_MS, WIN_SOUND_SCRIPT, asString, clip, isAwayAt, isMacHome, latestAt, mayTell, mergeItems, notifyArgv, planShortName, statusNext, statusText, tellStep, tellText, waysOf, winSoundArgv } from '../hooks/core/tellme'
import type { TellFacts } from '../hooks/core/tellme'
import { FEATURE_SETTINGS } from '../hooks/core/registry'
import { TEXT_ONLY_KEYS } from '../hooks/core/settingsmap'

const NOW = Date.parse('2026-10-16T12:00:00Z')
const away: TellFacts = { mode: 'needs', quiet: false, focused: false, away: true }

test('the text is escaped for AppleScript: a quote or backslash cannot end the string, a new line is flattened', () => {
  expect(asString('say "hi" \\ there')).toBe('"say \\"hi\\" \\\\ there"')
  expect(asString('one\ntwo\r\nthree')).toBe('"one two three"')
  const argv = notifyArgv('1 session needs you.', false)
  expect(argv).toEqual(['osascript', '-e', 'display notification "1 session needs you." with title "vaken"'])
  expect(notifyArgv('x', true)[2]).toBe('display notification "x" with title "vaken" sound name "Glass"')
  expect(argv.length).toBe(3)
})

test('the text is at most 120 characters', () => {
  const long = 'a'.repeat(400)
  expect(clip(long).length).toBe(TELL_CHARS)
  expect(clip(long).endsWith('…')).toBe(true)
  expect(clip('short')).toBe('short')
})

test('at most one notification in 30 seconds; what comes sooner waits and goes out as one', () => {
  const a = tellStep({ held: [] }, { kind: 'needs', n: 1 }, NOW)
  expect(a.send).toEqual([{ kind: 'needs', n: 1 }])
  const b = tellStep(a.gate, { kind: 'needs', n: 1 }, NOW + 5_000)
  expect(b.send).toBeUndefined()
  expect(b.waitMs).toBe(TELL_GAP_MS - 5_000)
  const c = tellStep(b.gate, { kind: 'limit' }, NOW + 10_000)
  expect(c.send).toBeUndefined()
  const d = tellStep(c.gate, undefined, NOW + TELL_GAP_MS)
  expect(d.send).toEqual([{ kind: 'needs', n: 1 }, { kind: 'limit' }])
  expect(d.gate.held).toEqual([])
  expect(tellStep(d.gate, undefined, NOW + 2 * TELL_GAP_MS).send).toBeUndefined()
})

test('several become one line: sessions are counted, the same kind once', () => {
  expect(mergeItems([{ kind: 'needs', n: 1 }, { kind: 'done' }, { kind: 'needs', n: 1 }, { kind: 'done' }], undefined)).toEqual([{ kind: 'needs', n: 2 }, { kind: 'done' }])
  expect(tellText([{ kind: 'needs', n: 1 }, { kind: 'needs', n: 1 }])).toBe('2 sessions need you.')
  expect(tellText([{ kind: 'needs', n: 1 }])).toBe('1 session needs you.')
  expect(tellText([{ kind: 'done' }, { kind: 'ask' }, { kind: 'limit' }])).toBe('A step waits for your yes. A plan limit is near. Claude is done with a long answer.')
  expect(tellText([{ kind: 'needs', n: 3 }, { kind: 'ask' }, { kind: 'limit' }, { kind: 'done' }]).length).toBeLessThanOrEqual(TELL_CHARS)
  // A limit names its fact; the latest one wins when several wait
  expect(tellText([{ kind: 'limit', text: 'Week 92% used' }])).toBe('Week 92% used.')
  expect(tellText([{ kind: 'limit', text: 'Old.' }, { kind: 'limit', text: '5-hour limit runs out about 11:20' }])).toBe('5-hour limit runs out about 11:20.')
})

test('away: no press or prompt in any session for 2 minutes', () => {
  expect(isAwayAt(NOW - AWAY_MS + 1, NOW)).toBe(false)
  expect(isAwayAt(NOW - AWAY_MS, NOW)).toBe(true)
  expect(isAwayAt(undefined, NOW)).toBe(true)
  expect(latestAt(NOW - 10 * AWAY_MS, NOW - 1000)).toBe(NOW - 1000)
  expect(latestAt(NOW, 'junk')).toBe(NOW)
  expect(latestAt(undefined, undefined)).toBeUndefined()
  expect(mayTell('needs', { ...away, away: false })).toBe(false)
})

test('quiet hours hold every notification; Off sends none', () => {
  for (const kind of ['needs', 'ask', 'limit', 'done'] as const) {
    expect(mayTell(kind, { ...away, mode: 'self', quiet: true })).toBe(false)
    expect(mayTell(kind, { ...away, mode: 'off' })).toBe(false)
  }
})

test('Focus lets through only what needs you', () => {
  const f = { ...away, mode: 'self', focused: true }
  expect(mayTell('needs', f)).toBe(true)
  expect(mayTell('ask', f)).toBe(true)
  expect(mayTell('limit', f)).toBe(false)
  expect(mayTell('done', f)).toBe(false)
})

test('this session is told only with This session too; other sessions and limits with any choice but Off', () => {
  expect(mayTell('done', away)).toBe(false)
  expect(mayTell('ask', { ...away, mode: 'all' })).toBe(false)
  expect(mayTell('done', { ...away, mode: 'self' })).toBe(true)
  expect(mayTell('needs', away)).toBe(true)
  expect(mayTell('limit', { ...away, mode: 'all' })).toBe(true)
})

test('This session too is a Notices choice; the stored choices still work and tell finished sessions', () => {
  const s = ATTENTION_SETTINGS.find(x => x.key === 'notify.mode')
  expect(s?.options.map(o => o.value)).toEqual(['off', 'needs', 'all', 'self'])
  expect(s?.default).toBe('self')
  expect((s?.note ?? '').split(/\s+/).length).toBeLessThanOrEqual(16)
  const prev = { a: { kind: 'working', since: NOW - 10 * 60_000 } }
  const rows = [{ id: 'a', name: 'x', kind: 'waiting', reason: '', since: NOW }]
  expect(notices(prev, rows, {}, 'self', NOW).notices.length).toBe(1)
  expect(notices(prev, rows, {}, 'all', NOW).notices.length).toBe(1)
  expect(notices(prev, rows, {}, 'needs', NOW).notices.length).toBe(0)
})

test('Windows sound: one fixed PowerShell call with no profile, no prompt and no text from anyone', () => {
  const argv = winSoundArgv()
  expect(argv).toEqual(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', WIN_SOUND_SCRIPT])
  expect(WIN_SOUND_SCRIPT).toContain('PlaySync()')
  expect(WIN_SOUND_SCRIPT).toContain('Windows Notify System Generic.wav')
  expect(WIN_SOUND_SCRIPT).toContain('SystemSounds]::Asterisk')
  expect(winSoundArgv()).toEqual(argv)
})

test('how: a banner tries the app first then the Mac; a sound goes to the Mac; speak only speaks', () => {
  expect(waysOf('banner', true)).toEqual(['notify', 'mac'])
  expect(waysOf('banner', false)).toEqual(['notify'])
  expect(waysOf('sound', true)).toEqual(['mac'])
  expect(waysOf('sound', false)).toEqual(['notify'])
  expect(waysOf('speak', true)).toEqual(['speak'])
  expect(waysOf('anything', true)).toEqual(['notify', 'mac'])
  // Windows: a sound is the banner and the Windows sound; banner and speak stay as they are
  expect(waysOf('sound', false, true)).toEqual(['notify', 'winsound'])
  expect(waysOf('banner', false, true)).toEqual(['notify'])
  expect(waysOf('speak', false, true)).toEqual(['speak'])
  expect(isMacHome('/Users/someone')).toBe(true)
  expect(isMacHome('/home/someone')).toBe(false)
  expect(isMacHome('C:\\Users\\someone')).toBe(false)
})

test('the new rows are expert keys with their defaults', () => {
  const how = FEATURE_SETTINGS.find(s => s.key === 'notify.how')
  const line = FEATURE_SETTINGS.find(s => s.key === 'status.line')
  expect(how?.default).toBe('banner')
  expect(how?.options.map(o => o.value)).toEqual(['banner', 'sound', 'speak'])
  expect(line?.default).toBe('on')
  expect(TEXT_ONLY_KEYS.includes('notify.how')).toBe(true)
  expect(TEXT_ONLY_KEYS.includes('status.line')).toBe(true)
})

test('the status line shows only a hot fact: context nearly full or plan nearly used, never the branch', () => {
  expect(statusText({ context: 42.4, planUsed: 37 })).toBeUndefined()
  expect(statusText({ context: 80, planUsed: 37 })).toBe('Context 80% used')
  // The plan is said as used, like the band, rounded as the band rounds it, with the lead window's short name
  expect(statusText({ context: 42, planUsed: 85 })).toBe('Plan 85% used')
  expect(statusText({ context: 42, planUsed: 88.4, planName: '5 h' })).toBe('Plan 5 h 88% used')
  expect(statusText({ context: 42, planUsed: 99.6, planName: 'Week' })).toBe('Plan Week 99% used')
  expect(statusText({ context: 140, planUsed: 120 })).toBe('Context 100% used · Plan 100% used')
  expect(statusText({ context: 79.4, planUsed: 79.6 })).toBeUndefined()
  expect(planShortName({ kind: 'session', short: '5-hour limit', label: '5-hour limit' })).toBe('5 h')
  expect(planShortName({ kind: 'week', short: 'Week', label: 'Weekly limit' })).toBe('Week')
  expect(planShortName({ kind: 'Weekly · Fable', short: 'Fable', label: 'Weekly limit · Fable' })).toBe('Week · Fable')
  expect(statusText({})).toBeUndefined()
  // The band's plan chip already shows the plan: the line keeps only context
  expect(statusText({ context: 42, planUsed: 85, bandChip: true })).toBeUndefined()
  expect(statusText({ context: 90, planUsed: 85, bandChip: true })).toBe('Context 90% used')
  expect(statusText({ context: 42, planUsed: 85, bandChip: false })).toBe('Plan 85% used')
  expect(statusNext(true, 'a', undefined)).toBe('a')
  expect(statusNext(true, 'a', 'a')).toBeNull()
  expect(statusNext(false, 'a', 'a')).toBeUndefined()
  expect(statusNext(false, 'a', undefined)).toBeNull()
})
