// One-time steps for rows added to the helper class: a store on Only alerts from before a row existed keeps reading that mode.
import type { Io } from './io'
import { modeNow } from './presets'
import { readSettings, settingStoreKey, writeSetting } from './settings'

export const NEXT_UPGRADE_DONE = 'cockpit:upgrade:nextmode'
export const LEAN_UPGRADE_DONE = 'cockpit:upgrade:leanmode'
export const ALLOW_RULES_UPGRADE_DONE = 'cockpit:upgrade:allowrules'
export const TEACH_UPGRADE_DONE = 'cockpit:upgrade:teachmode'
const QUIET_NEW_ROWS: readonly { key: string; done: string }[] = [
  { key: 'next.mode', done: NEXT_UPGRADE_DONE },
  { key: 'lean.mode', done: LEAN_UPGRADE_DONE },
  { key: 'allow.rules', done: ALLOW_RULES_UPGRADE_DONE },
  { key: 'teach.mode', done: TEACH_UPGRADE_DONE },
]

// Every new row the store never saved reads Off for the check, so a store that misses two of them is still seen as Only alerts.
export function quietRowToWrite(key: string, values: Record<string, string>, stored: ReadonlySet<string>): string | undefined {
  if (stored.has(key)) return undefined
  const off = Object.fromEntries(QUIET_NEW_ROWS.filter(r => !stored.has(r.key)).map(r => [r.key, 'off']))
  // The Notices step comes after this one, so a saved Needs you is read at its new default here
  return modeNow({ ...values, ...off, ...(values['notify.mode'] === 'needs' ? { 'notify.mode': 'self' } : {}) }) === 'quiet' ? 'off' : undefined
}
export const nextModeToWrite = (values: Record<string, string>, stored: ReadonlySet<string>): string | undefined => quietRowToWrite('next.mode', values, stored)

export async function upgradeQuietRows(i: Io): Promise<string[]> {
  const todo: { key: string; done: string }[] = []
  for (const r of QUIET_NEW_ROWS) if ((await i.get(r.done)) !== 'done') todo.push(r)
  if (todo.length === 0) return []
  const stored = new Set<string>()
  for (const r of QUIET_NEW_ROWS) {
    const raw = await i.get(settingStoreKey(r.key))
    if (raw !== undefined && raw !== null) stored.add(r.key)
  }
  const values = await readSettings(i)
  const wrote: string[] = []
  for (const r of todo) {
    const v = quietRowToWrite(r.key, values, stored)
    if (v !== undefined) {
      await writeSetting(i, r.key, v)
      wrote.push(r.key)
    }
    await i.set(r.done, 'done')
  }
  return wrote
}

// Notices now default to This session too: a store whose only difference from its mode is the saved "Needs you" from a mode press moves once. Any other choice stays.
export const NOTIFY_UPGRADE_DONE = 'cockpit:upgrade:notifymode'
export const notifyModeToWrite = (values: Record<string, string>): string | undefined =>
  values['notify.mode'] === 'needs' && modeNow(values) === 'custom' && modeNow({ ...values, 'notify.mode': 'self' }) !== 'custom' ? 'self' : undefined

export async function upgradeNotifyMode(i: Io): Promise<boolean> {
  if ((await i.get(NOTIFY_UPGRADE_DONE)) === 'done') return false
  const v = notifyModeToWrite(await readSettings(i))
  if (v !== undefined) await writeSetting(i, 'notify.mode', v)
  await i.set(NOTIFY_UPGRADE_DONE, 'done')
  return v !== undefined
}

// Everything useful now sets Buttons and hint: a store on that mode from before keeps reading it, once.
export const NEXT_HINT_UPGRADE_DONE = 'cockpit:upgrade:nexthint'
export const fullHintToWrite = (values: Record<string, string>): string | undefined =>
  values['next.mode'] === 'buttons' && modeNow({ ...values, 'next.mode': 'hint' }) === 'full' ? 'hint' : undefined

export async function upgradeFullHint(i: Io): Promise<boolean> {
  if ((await i.get(NEXT_HINT_UPGRADE_DONE)) === 'done') return false
  const v = fullHintToWrite(await readSettings(i))
  if (v !== undefined) await writeSetting(i, 'next.mode', v)
  await i.set(NEXT_HINT_UPGRADE_DONE, 'done')
  return v !== undefined
}
