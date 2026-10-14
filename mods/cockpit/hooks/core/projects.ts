// Settings per project: a project (the session's root folder) can override any setting. The overlay is in core/io.ts. Keys and values only.
import { PROJECT_OF_KEY, PROJSET_KEY, SESSSET_KEY, USE_DEFAULT } from './io'
import type { Io } from './io'
import { lastName } from './platform'
import { sessionKeyOk } from './models'
import { WORST_KEYS } from './presets'
import { SETTINGS, findSetting, normalValue, settingKeys, settingStoreKey, validValue, writeSetting } from './settings'
import type { Values } from './settings'

export { PROJECT_OF_KEY, PROJSET_KEY, SESSSET_KEY, USE_DEFAULT }

export const projectName = (root: string): string => lastName(root)

export async function projectOf(i: Io): Promise<string | undefined> {
  const root = await (i.getGlobal ?? i.get)(PROJECT_OF_KEY(await i.sessionId()))
  return typeof root === 'string' && root !== '' ? root : undefined
}

// A Guard worst kind kept as 'use the default' reads as its default; `marks` keeps the mark itself so a write does not turn it into a choice.
export function parseProjectSet(raw: unknown, marks = false): Values {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Values = {}
  for (const [key, value] of Object.entries(raw)) {
    const s = findSetting(key)
    if (s !== undefined && value === USE_DEFAULT && WORST_KEYS.includes(key)) {
      out[key] = marks ? USE_DEFAULT : s.default
      continue
    }
    const v = s !== undefined && typeof value === 'string' ? normalValue(s, value) : undefined
    if (s !== undefined && v !== undefined && s.options.some(o => o.value === v)) out[key] = v
  }
  return out
}

export const readProjectSet = async (i: Io, root: string): Promise<Values> => parseProjectSet(await (i.getGlobal ?? i.get)(PROJSET_KEY(root)))
const readProjectRaw = async (i: Io, root: string): Promise<Values> => parseProjectSet(await (i.getGlobal ?? i.get)(PROJSET_KEY(root)), true)

export async function readGlobalSettings(i: Io): Promise<Values> {
  const out: Values = {}
  const many = i.getGlobal !== undefined ? i.getGlobalMany : i.getMany
  if (many !== undefined) {
    const got = await many(settingKeys())
    for (const [n, s] of SETTINGS.entries()) out[s.key] = validValue(s, got[n])
    return out
  }
  const get = i.getGlobal ?? i.get
  for (const s of SETTINGS) out[s.key] = validValue(s, await get(settingStoreKey(s.key)))
  return out
}

export async function writeProjectSetting(i: Io, root: string, key: string, value: string): Promise<boolean> {
  const s = findSetting(key)
  const v = s === undefined ? value : normalValue(s, value)
  if (s === undefined || !s.options.some(o => o.value === v)) return false
  await i.set(PROJSET_KEY(root), { ...(await readProjectRaw(i, root)), [key]: v })
  return true
}

// Reads as the default, and the Guard does not take it for the person's choice.
async function writeProjectDefault(i: Io, root: string, key: string): Promise<void> {
  await i.set(PROJSET_KEY(root), { ...(await readProjectRaw(i, root)), [key]: USE_DEFAULT })
}

export async function clearProjectSetting(i: Io, root: string, key?: string): Promise<void> {
  if (key === undefined) {
    await i.del(PROJSET_KEY(root))
    return
  }
  const set = await readProjectRaw(i, root)
  delete set[key]
  await i.set(PROJSET_KEY(root), set)
}

const labelOf = (key: string, value: string): string => findSetting(key)?.options.find(o => o.value === value)?.label ?? value

export function projectText(root: string | undefined, set: Values): string[] {
  if (root === undefined) return []
  const keys = Object.keys(set)
  return [
    '',
    `This project (${projectName(root)}): ${keys.length === 0 ? 'follows All projects.' : `${keys.length} of its own:`}`,
    ...keys.map(k => `  ${k}: ${labelOf(k, set[k])}`),
    'For this project only: /vaken-settings here <key> <value>. Follow All projects again: /vaken-settings here reset',
  ]
}

// This session's choices are laid over This project and All projects, and kept 7 days after the session ends.

export const parseSessionSet = (raw: unknown): Values => Object.fromEntries(Object.entries(parseProjectSet(raw)).filter(([k]) => sessionKeyOk(k)))

export const readSessionSet = async (i: Io, sessionId: string): Promise<Values> => parseSessionSet(await i.get(SESSSET_KEY(sessionId)))

export async function writeSessionSetting(i: Io, sessionId: string, key: string, value: string): Promise<boolean> {
  const s = findSetting(key)
  if (s === undefined || !sessionKeyOk(key) || !s.options.some(o => o.value === value)) return false
  await i.set(SESSSET_KEY(sessionId), { ...(await readSessionSet(i, sessionId)), [key]: value })
  return true
}

export async function clearSessionSetting(i: Io, sessionId: string, key?: string): Promise<void> {
  if (key === undefined) {
    await i.del(SESSSET_KEY(sessionId))
    return
  }
  const set = await readSessionSet(i, sessionId)
  delete set[key]
  await i.set(SESSSET_KEY(sessionId), set)
}

export function sessionText(set: Values): string[] {
  const keys = Object.keys(set)
  return [
    '',
    `This session: ${keys.length === 0 ? 'follows the project.' : `${keys.length} of its own:`}`,
    ...keys.map(k => `  ${k}: ${labelOf(k, set[k])}`),
    'For this session only (the models and Routing): /vaken-settings session <key> <value>. Follow the project again: /vaken-settings session reset',
  ]
}

// A step with no value puts the row back to its default. The Guard's two worst kinds keep 'use the default' instead of a written Warn, which would be a choice and lose the stop where Claude Code would not ask.
export async function applySteps(i: Io, steps: readonly { key: string; value?: string }[], root?: string): Promise<void> {
  for (const st of steps) {
    const s = findSetting(st.key)
    if (s === undefined) continue
    if (root === undefined) {
      if (st.value === undefined) await i.del(settingStoreKey(st.key))
      else await writeSetting(i, st.key, st.value)
    } else if (st.value !== undefined) await writeProjectSetting(i, root, st.key, st.value)
    else {
      const global = await (i.getGlobal ?? i.get)(settingStoreKey(st.key))
      // A saved Warn is a choice, which would lose the stop as well.
      if (WORST_KEYS.includes(st.key)) await (global === undefined ? clearProjectSetting(i, root, st.key) : writeProjectDefault(i, root, st.key))
      else if (validValue(s, global) === s.default) await clearProjectSetting(i, root, st.key)
      else await writeProjectSetting(i, root, st.key, s.default)
    }
  }
}
