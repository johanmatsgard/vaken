// The Agent setup card's facts and presses (core/setupcard.ts).
import type { Io } from '../../core/io'
import { tr } from '../../core/lang'
import { projectOf, writeProjectSetting, writeSessionSetting } from '../../core/projects'
import { roleSettingKey } from '../../core/orchestra'
import { readSettings, writeSetting } from '../../core/settings'
import type { SetupDo, SetupFacts, SetupRead } from '../../core/setupcard'
import { parseScope, setupApplyOn } from '../../core/setupcard'
import { SETUP_SAID_CAP, SETUP_SAID_FAILED, SETUP_SAID_KEPT, SETUP_SAID_MODEL, SETUP_SAID_OFF, SETUP_SAID_REPLACED, SETUP_SAID_SESSION, SETUP_SAID_SYNC, SETUP_SAID_WROTE } from '../../core/setupwords'
import { isRoleKey, rolesChanged } from '../orchestra'
import { readSetup, writeItem } from '../setupfiles'
import { refusedWords } from '../../core/safewrite'
import type { HomeEngine } from './engine'
import type { Prefs } from './prefs'
import { flags } from './state'

export const SETUP_FRESH_MS = 60_000
let kept: { key: string; at: number; read: SetupRead; asking?: Promise<void> } | undefined
const empty = (scope: ReturnType<typeof parseScope>, home: string, root: string | undefined): SetupRead => ({ home, ...(root === undefined ? {} : { root }), scope, disk: {} })

// Never throws.
export async function loadSetup(i: Io, hidden: boolean, values: Record<string, string>, root: string | undefined, now: number): Promise<SetupRead | undefined> {
  if (hidden) return undefined
  try {
    const home = await i.home()
    const scope = parseScope(values['setup.scope'])
    const key = `${scope}|${home}|${root ?? ''}`
    const ask = async (quiet: boolean): Promise<void> => {
      const before = JSON.stringify(kept?.read.disk)
      const read = await readSetup(i, values, home, root)
      kept = { key, at: now, read }
      if (!quiet && before !== JSON.stringify(read.disk)) i.invalidate()
    }
    if (kept === undefined || kept.key !== key) {
      kept = { key, at: now, read: empty(scope, home, root) }
      kept.asking = ask(true)
      await kept.asking
      if (kept !== undefined) kept.asking = undefined
    } else if ((now < kept.at || now - kept.at >= SETUP_FRESH_MS) && kept.asking === undefined) {
      const asking = ask(false).finally(() => {
        if (kept !== undefined) kept.asking = undefined
      })
      kept.asking = asking
    }
  } catch {
  }
  return kept?.read
}
export const forgetSetup = (): void => {
  kept = undefined
}

export function setupFactsOf(prefs: Prefs): SetupFacts {
  return { values: prefs.values, ...(prefs.setup === undefined ? {} : { read: prefs.setup }), ...(prefs.open === undefined ? {} : { open: prefs.open }) }
}

const openKey = (key: string): string => `setup:${key}`

// Never throws; the toast answers the press.
export async function runSetup(eng: HomeEngine, a: SetupDo): Promise<void> {
  const i = eng.io()
  try {
    if (a.do === 'open') {
      flags.openWhat = flags.openWhat === openKey(a.key) ? undefined : openKey(a.key)
    } else if (a.do === 'close') {
      flags.openWhat = undefined
    } else if (a.do === 'cap') {
      await writeSetting(i, 'cap.max', `n${a.n}`)
      i.toast(tr(SETUP_SAID_CAP).replace('{n}', String(a.n)), true)
    } else if (a.do === 'keepCap') {
      await writeSetting(i, 'setup.keep', String(a.n))
      i.toast(tr(SETUP_SAID_KEPT), true)
    } else if (a.do === 'model') {
      const key = roleSettingKey(a.role)
      const root = flags.rolesScope === 'project' ? await projectOf(i) : undefined
      if (flags.rolesScope === 'session') await writeSessionSetting(i, await i.sessionId(), key, a.family)
      else if (root !== undefined) await writeProjectSetting(i, root, key, a.family)
      else await writeSetting(i, key, a.family)
      if (isRoleKey(key)) await rolesChanged(eng.runnerOps())
      i.toast(tr(SETUP_SAID_MODEL).replace('{name}', a.role).replace('{a}', a.family), true)
    } else {
      const values = await readSettings(i)
      if (!setupApplyOn(values)) i.toast(tr(SETUP_SAID_OFF), true)
      else if (parseScope(values['setup.scope']) === 'session') i.toast(tr(SETUP_SAID_SESSION), true)
      else {
        const confirmed = flags.openWhat === openKey(a.key)
        const home = await i.home()
        const root = (await projectOf(i)) ?? ((await eng.cwd()) || undefined)
        const r = await writeItem(i, values, home, root, a.key, confirmed, 'button')
        if (r.ok) i.toast(r.wrote ? (r.bak === undefined ? tr(SETUP_SAID_WROTE).replace('{name}', r.name) : tr(SETUP_SAID_REPLACED).replace('{name}', r.name).replace('{bak}', r.bak)) : tr(SETUP_SAID_SYNC), true)
        else if (r.why === 'link') i.toast(refusedWords(r.name, tr), true)
        else if (r.why !== 'confirm') i.toast(tr(SETUP_SAID_FAILED).replace('{name}', r.name), true)
        flags.openWhat = undefined
        kept = { key: kept?.key ?? '', at: 0, read: await readSetup(i, values, home, root) }
        kept.at = await i.now()
      }
    }
  } catch {
    i.toast(tr(SETUP_SAID_FAILED).replace('{name}', ''), true)
  }
  i.invalidate()
}
