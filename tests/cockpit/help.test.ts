// Help and the way back.
import { expect, mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { HELP_TOPICS } from '../hooks/core/registry'
import { HIDDEN, HIDDEN_ABOUT } from '../hooks/core/menu'
import { helpText } from '../hooks/features/home/commands'
import { HELP, HELP_BY_TOPIC } from '../hooks/features/home/views/help'
import { SLOW, test } from './slow'

const NOW = Date.parse('2026-10-12T12:00:00Z')

test('Help titles name the question, not vaken part', () => {
  const titles = HELP_TOPICS.flatMap(g => g.entries.map(e => e.title))
  for (const old of ['quota planner', 'wait tracker', 'outside guard', 'back-end guard', 'value meter', 'the audit', 'anomaly sentinel', 'merge order, CI fix']) {
    expect(titles.filter(t => t.toLowerCase().includes(old)), `a title still names "${old}"`).toEqual([])
  }
  expect(titles).toContain('Why did it stop me?')
  expect(titles).toContain('Will this job fit in my plan?')
  expect(titles.filter(t => t.endsWith('?')).length).toBeGreaterThan(15)
  expect(HELP_BY_TOPIC.flatMap(g => g.entries).length).toBe(HELP.length)
})

test('/vaken-help with a word lists the entries that hold it, and says so when none does', () => {
  const found = helpText('cache')
  expect(found).toContain('Help topics with "cache"')
  expect(found).toContain('What is the cache?')
  expect(found).not.toContain('Every day:')
  expect(helpText('zzzzqq')).toBe('No help topic holds "zzzzqq". All topics: `/vaken-help all`')
  expect(helpText('')).toContain('`/vaken-help all` reads every topic')
  expect(helpText('all')).toContain('Claude re-reads the whole session on every answer.')
})

test('/vaken-help starts with Start here, a word matches titles first, many matches show only titles, and run lists each hidden name with its purpose', () => {
  const lines = helpText('').split('\n')
  expect(lines.slice(2, 6)).toEqual(['Start here', '- `/vaken`: what needs you now (inbox, neighbors, show, run, pic, quick)', '- `/vaken-today`: today in a few lines (value, recap, glance, standup, waits)', '- `/vaken-undo`: put files back as they were (checkpoint)'])
  // Each command once, across all groups
  const named = lines.filter(l => l.startsWith('- `/')).map(l => /`([^`]+)`/.exec(l)?.[1])
  expect(new Set(named).size).toBe(named.length)
  const removing = helpText('removing vaken')
  expect(removing).toContain('Removing vaken')
  expect(removing.split('\n').filter(l => /^[1-9]\. /.test(l)).length).toBe(4)
  const many = helpText('what')
  expect(many).toContain('Type `/vaken-help <title words>` to read one.')
  expect(many).not.toContain('Claude re-reads the whole session on every answer.')
  const run = helpText('run').split('\n')
  expect(run).toHaveLength(HIDDEN.length + 2)
  for (const h of HIDDEN) expect(run.find(l => l.startsWith(`- \`/vaken-help run ${h}\`: `)), h).toBeDefined()
  expect(Object.keys(HIDDEN_ABOUT).sort()).toEqual([...HIDDEN].sort())
})

const paneProps ={ title: 'Vaken', isFocused: false, bodyColumns: 120, placement: 'inline' as const, scroll: { bodyRows: 40, offset: 0, total: 40 }, view: {} }
function engine(on: On): Map<string, unknown> {
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
  on('session.id', () => ({ value: 'test-session' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: '4242\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  return mem
}
type Pane = { find: (q: unknown) => Promise<unknown>; press: (q: unknown) => Promise<void>; unmount: () => Promise<void> }
type Mount = () => Promise<Pane>

// One press in a fresh mount, then unmount: a view is drawn from the stored flags.
async function step(mount: Mount, key: string): Promise<void> {
  const pane = await mount()
  await pane.press({ key })
  await pane.unmount()
}
async function has(mount: Mount, key: string): Promise<boolean> {
  const pane = await mount()
  const found = (await pane.find({ key })) !== undefined
  await pane.unmount()
  return found
}

test('Back from the guide or from Settings, opened from Help, returns to Help; opened from the board it returns to the board', SLOW, async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/test' })
  engine(on).set('cockpit:firstrun', 'done')
  const mount: Mount = () => $.ui.mount({ plugin: 'vaken', surface: 'desktop', component: 'Pane', requestId: 'cockpit-home', props: paneProps }) as unknown as Promise<Pane>
  await step(mount, 'help')
  expect(await has(mount, 'help-done'), 'Help is open').toBe(true)
  await step(mount, 'press-help-guide-0')
  expect(await has(mount, 'guide-done'), 'the guide is open').toBe(true)
  await step(mount, 'guide-done')
  expect(await has(mount, 'help-done'), 'Back from the guide returns to Help').toBe(true)
  await step(mount, 'help-settings')
  expect(await has(mount, 'settings-done'), 'Settings is open').toBe(true)
  await step(mount, 'settings-done')
  expect(await has(mount, 'help-done'), 'Back from Settings returns to Help').toBe(true)
  await step(mount, 'help-done')
  expect(await has(mount, 'help-done'), 'Help is shut').toBe(false)
  await step(mount, 'settings')
  expect(await has(mount, 'settings-done')).toBe(true)
  await step(mount, 'settings-done')
  expect(await has(mount, 'help-done')).toBe(false)
  expect(await has(mount, 'settings-done')).toBe(false)
})
