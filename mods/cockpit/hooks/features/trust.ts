// Plugin trust card and add-on health. /vaken-help run trust prints what each plugin can do
import type { EngineInterface, On } from 'claude-code'

import { tLine } from '../i18n/t'
import { postBand } from '../core/band'
import { HEALTH_MODE_KEY, healthText, noteFailure, readCounts } from '../core/health'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { CHANGES_KEY, SEEN_KEY, UPDATE_WHAT, VERSIONS_KEY, addChange, changeDetail, changeToast, parseChanges, parseSeen, parseVersions, plainName, trustCard, versionChange, withSeen, withVersion } from '../core/trust'
import type { Change, Row, Servers } from '../core/trust'
import { LEDGER_KEY, pushLog } from './compaction'
import { subArgs } from '../core/menu'

// IO-BLOCK-START
function io($: EngineInterface): Io {
  return withToastGate({
    now: () => $.clock.now(),
    home: () => homeFrom({ HOME: () => $.env.get('HOME'), USERPROFILE: () => $.env.get('USERPROFILE'), HOMEDRIVE: () => $.env.get('HOMEDRIVE'), HOMEPATH: () => $.env.get('HOMEPATH') }),
    sessionId: () => $.session.id(),
    get: key => $.store.get(key),
    set: (key, value) => $.store.set(key, value),
    del: key => $.store.delete(key),
    keys: () => $.store.keys(),
    read: path => $.fs.read(path),
    write: (path, text) => $.fs.write(path, text),
    run: (argv, init) => $.process.run(argv, init),
    ask: (question, options) => $.ui.ask(question, options),
    complete: req => $.model.complete(req),
    toast: text => $.ui.toast(text),
    invalidate: () => $.ui.invalidate('ui.render'),
  })
}
// IO-BLOCK-END

// Plugins the engine refused at load, with the reason it gave.
const refused = new Map<string, string>()
let chain: Promise<unknown> = Promise.resolve()
const serial = <T>(job: () => Promise<T>): Promise<T> => {
  const p = chain.then(job)
  chain = p.catch(() => undefined)
  return p
}

export function noteVersion(i: Io, name: string, version: string | undefined): Promise<Change | undefined> {
  return serial(async () => {
    if (version === undefined || version === '') return undefined
    const now = await i.now()
    const old = parseVersions(await i.get(VERSIONS_KEY))
    const change = versionChange(old, name, version, now)
    await i.set(VERSIONS_KEY, withVersion(old, name, version))
    if (change !== undefined) await i.set(CHANGES_KEY, addChange(parseChanges(await i.get(CHANGES_KEY)), change))
    return change
  })
}

export function tellChanges(i: Io, sid: string): Promise<void> {
  return serial(async () => {
    const all = parseChanges(await i.get(CHANGES_KEY))
    const fresh = all.filter(c => !c.told)
    if (fresh.length === 0) return
    await i.set(CHANGES_KEY, all.map(c => ({ ...c, told: true })))
    for (const c of fresh) await pushLog(i, LEDGER_KEY, { at: c.at, session: sid, what: UPDATE_WHAT, detail: changeDetail(c), how: 'auto', did: true })
    i.toast(changeToast(fresh))
    await postBand(i, 'info', 'trust:update', fresh.length === 1 ? tLine('band.plugin_updated_name_to', { name: fresh[0].name, to: fresh[0].to }) : tLine('band.n_plugins_updated', { n: fresh.length }), 10 * 60_000, sid)
    i.invalidate()
  })
}

// Vaken's own version, read from its plugin.json (the engine does not give it to the plugin).
async function ownVersion($: EngineInterface): Promise<string | undefined> {
  for (const file of ['plugin.json', '.claude-plugin/plugin.json']) {
    try {
      const v = (JSON.parse(await $.fs.read(`${$.plugin.root}/${file}`)) as { version?: unknown }).version
      if (typeof v === 'string') return v
    } catch {
    }
  }
  return undefined
}

async function card($: EngineInterface): Promise<string> {
  const i = io($)
  const now = await i.now()
  const own = plainName($.plugin.name)
  const versions = parseVersions(await i.get(VERSIONS_KEY))
  const seen = parseSeen(await i.get(SEEN_KEY), now)
  const commands = new Map<string, number>()
  const agents = new Map<string, number>()
  const servers = new Map<string, number>()
  try {
    for (const c of await $.command.list()) if (c.source === 'plugin' && c.plugin !== undefined) commands.set(plainName(c.plugin), (commands.get(plainName(c.plugin)) ?? 0) + 1)
  } catch {
  }
  try {
    for (const a of await $.agent.list()) if (a.spawnedBy !== undefined) agents.set(plainName(a.spawnedBy), (agents.get(plainName(a.spawnedBy)) ?? 0) + 1)
  } catch {
  }
  try {
    for (const t of await $.tool.list()) {
      const m = /^mcp__(.+?)__.+$/.exec(t.name)
      if (t.mcp && m !== null) servers.set(m[1], (servers.get(m[1]) ?? 0) + 1)
    }
  } catch {
  }
  const names = [...new Set([own, ...Object.keys(seen), ...commands.keys(), ...agents.keys()])]
  const rows: Row[] = names
    .map(name => ({ name, version: versions[name], seen: seen[name], commands: commands.get(name) ?? 0, agentsStarted: agents.get(name) ?? 0, own: name === own ? true : undefined }))
    .sort((a, b) => (a.own === true ? -1 : b.own === true ? 1 : a.name.localeCompare(b.name)))
  const list: Servers = [...servers.entries()].map(([name, tools]) => ({ name, tools })).sort((a, b) => b.tools - a.tools)
  return trustCard(rows, list, parseChanges(await i.get(CHANGES_KEY)), now)
}

// A module the engine is about to load: keep its version (and the change
type Registered = { name: string; tier: string; version?: string; events: readonly string[]; calls: readonly string[] }
export async function noteRegistered(i: Io, r: Registered): Promise<void> {
  const now = await i.now()
  await noteVersion(i, r.name, r.version)
  await serial(async () => i.set(SEEN_KEY, withSeen(parseSeen(await i.get(SEEN_KEY), now), { name: r.name, tier: r.tier, events: r.events, calls: r.calls }, now)))
}

export function registerTrust(on: On): void {
  on('session.start', { cwd: /(?<trust>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the commands are optional: a failure shows less, never breaks the session
    }
    try {
      const i = io($)
      await noteVersion(i, $.plugin.name, await ownVersion($))
      await tellChanges(i, await i.sessionId())
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The engine raises this for each module that loads after vaken
  on('plugin.register', { name: /(?<trust>)/ }, async ($, e, next) => {
    const i = io($)
    try {
      await noteRegistered(i, { name: e.name, tier: e.tier, version: e.version, events: e.uses.events, calls: e.uses.calls })
    } catch {
    }
    const result = await next(e)
    try {
      if (result.refuse !== undefined) {
        refused.set(plainName(e.name), result.refuse.slice(0, 120))
        await noteFailure(i, `plugin:${plainName(e.name)}`, 'refused')
      }
    } catch {
    }
    return result
  }).catch(async ($, e, next) => {
    if (next.error.kind !== 're-entry') await noteFailure(io($), 'trust', next.error.kind)
    return next(e)
  })

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'trust')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    try {
      await tellChanges(i, await i.sessionId())
    } catch {
    }
    return { text: await card($) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'modhealth')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    const mode = (await i.get(HEALTH_MODE_KEY)) === 'off' ? 'off' : 'on'
    return { text: healthText(mode, await readCounts(i), await i.now(), { problems: [...refused.entries()].map(([name, why]) => `${name}: ${why}`) }) }
  })
}
