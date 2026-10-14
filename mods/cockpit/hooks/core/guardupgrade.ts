// One-time step giving the two worst kinds their stop back: older versions saved Warn for these rows without it being a choice, so a saved Warn is cleared once per store. Off and Stop are never touched.
import type { Io } from './io'
import { GUARD_UPGRADE_WHAT, WORST_KEYS } from './presets'
import { settingStoreKey } from './settings'

export const GUARD_UPGRADE_DONE = 'cockpit:upgrade:guardworst'
export { GUARD_UPGRADE_WHAT }

export async function upgradeGuardWorst(i: Io): Promise<string[]> {
  if ((await i.get(GUARD_UPGRADE_DONE)) === 'done') return []
  const cleared: string[] = []
  for (const key of WORST_KEYS) {
    // A project's own Warn layered over it must neither stand in for this value nor have it deleted.
    if ((await (i.getGlobal ?? i.get)(settingStoreKey(key))) !== 'warn') continue
    await i.del(settingStoreKey(key))
    cleared.push(key)
  }
  await i.set(GUARD_UPGRADE_DONE, 'done')
  return cleared
}
