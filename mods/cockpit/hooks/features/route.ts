// Routing (Settings > Agents): when Claude starts a helper agent that only looks things up
import { tr } from '../core/lang'
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { shownTitle } from '../core/ledger'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { ROUTED_WHAT, STATS_KEY, SUGGEST_WHAT, SWITCH_BAND_ID, SWITCH_BAND_MS, WARNED_WHAT, addRun, agentFilePaths, decideRoute, definedElsewhere, fileModel, jobType, normalizeStats, routeMode, routeText, shouldWarnSwitch, suggestDetail, suggestDue, switchBandLine, switchDetail, switchDue, switchKey, switchPercent, switchWarning } from '../core/route'
import type { JobType } from '../core/route'
import { postBand } from '../core/band'
import { HINT_KEY, parseSamples } from '../core/costhint'
import { lookupModel } from '../core/models'
import type { Family } from '../core/models'
import { readSessionSet } from '../core/projects'
import { readSetting, settingStoreKey } from '../core/settings'
import { LEDGER_KEY, logLines, pushLog, readLog } from './compaction'
import { subArgs } from '../core/menu'
import { sayIn } from './saylang'

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

const PENDING_MAX = 60
const pending = new Map<string, JobType>()
let lastSuggestAt: number | undefined
let lastSwitch: { key: string; at: number } | undefined

// Where each agent type was defined
const SOURCES_MAX = 80
const sources = new Map<string, string>()

async function agentFile(i: Io, type: string, folders: string[]): Promise<{ found: boolean; model?: string }> {
  let home = ''
  try {
    home = await i.home()
  } catch {
    // no home folder is known: only the project's folders are looked in
  }
  for (const path of agentFilePaths(type, home, folders)) {
    try {
      const text = await i.read(path)
      if (typeof text !== 'string') continue
      const model = fileModel(text)
      return model === undefined ? { found: true } : { found: true, model }
    } catch {
    }
  }
  return { found: false }
}

const setting = async (i: Io, key: string): Promise<unknown> => i.get(settingStoreKey(key))
const lookupOf = async (i: Io): Promise<Family> => lookupModel(await setting(i, 'runner.researcher'), await setting(i, 'route.cheap'))

export function registerRoute(on: On): void {
  on('session.start', { cwd: /(?<route>)/ }, async ($, e, next) => {
    try {
    } catch {
      // the command is optional: a failure shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.offer', { agent: /(?<route>)/ }, async (_$, e, next) => {
    try {
      if (sources.size >= SOURCES_MAX && !sources.has(e.agent)) sources.delete(sources.keys().next().value as string)
      sources.set(e.agent, e.source)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', { subagentType: /(?<route>)/ }, async ($, e, next) => {
    const i = io($)
    let job: JobType = 'normal'
    try {
      job = jobType(e.subagentType, e.description)
      const mode = routeMode(await readSetting(i, 'route.mode'))
      let userDefined = definedElsewhere(sources.get(e.subagentType), e.provider?.plugin)
      let ownModel: string | undefined
      if (mode !== 'off' && job === 'lookup' && e.model === undefined) {
        const folders: string[] = []
        for (const where of [() => $.session.root(), () => $.session.cwd()]) {
          try {
            const f = await where()
            if (typeof f === 'string') folders.push(f)
          } catch {
          }
        }
        const file = await agentFile(i, e.subagentType, e.cwd === undefined ? folders : [...folders, e.cwd])
        if (file.found) userDefined = true
        ownModel = file.model
      }
      const route = decideRoute({
        mode,
        cheap: await lookupOf(i),
        job,
        userDefined,
        ...(ownModel === undefined ? {} : { ownModel }),
        model: e.model,
        parentModel: e.parentModel ?? '',
        fork: e.fork === true,
        isTeammate: e.isTeammate === true,
        isWorkflow: e.workflow !== undefined,
      })
      // A tip only: the helper starts as Claude asked.
      if (route.action === 'suggest') {
        const now = await i.now()
        if (suggestDue(lastSuggestAt, now)) {
          lastSuggestAt = now
          await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: SUGGEST_WHAT, detail: suggestDetail(route.model), how: 'auto' })
          i.toast(`${tr(shownTitle(SUGGEST_WHAT))}. ${tr('Settings > Agents.')}`)
          i.invalidate()
        }
      }
    } catch {
      // the tip is optional: the helper starts as Claude asked
    }
    const result = await next(e)
    // Nothing below may throw: the helper has started.
    try {
      if (result.deny === undefined && result.agentId !== undefined) {
        if (pending.size >= PENDING_MAX) pending.delete(pending.keys().next().value as string)
        pending.set(result.agentId, job)
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', { turnId: /(?<route>)/ }, async ($, e, next) => {
    try {
      const job = e.agentId === undefined ? undefined : pending.get(e.agentId)
      if (e.agentId !== undefined && job !== undefined && e.reason === 'answer') {
        pending.delete(e.agentId)
        const i = io($)
        const stats = normalizeStats(await i.get(STATS_KEY))
        await i.set(STATS_KEY, addRun(stats, job, e.usage?.model ?? 'other', e.usage?.output_tokens ?? 0, e.durationMs))
      } else if (e.agentId !== undefined && job !== undefined && e.reason !== 'answer') {
        pending.delete(e.agentId)
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The person switches model: warn once when it throws away a warm cache of a big chat (a calm band line; never a block).
  on('classic.PreModelSwitch', { to_model: /(?<route>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      if (shouldWarnSwitch({ cacheWarm: e.prompt_cache_warm, contextTokens: e.context_tokens, from: e.from_model, to: e.to_model })) {
        const now = await i.now()
        const key = switchKey(e.from_model, e.to_model, e.context_tokens)
        if (switchDue(lastSwitch, key, now)) {
          lastSwitch = { key, at: now }
          await pushLog(i, LEDGER_KEY, { at: now, session: await i.sessionId(), what: WARNED_WHAT, detail: switchDetail(e.from_model, e.to_model, e.estimated_cache_write_usd), how: 'auto', did: true })
          // One calm band line with vaken's own percent of the 5-hour window; the dollars in a toast only when there is no honest percent yet
          const pct = switchPercent(parseSamples(await i.get(HINT_KEY)), e.estimated_cache_write_usd)
          if (pct === undefined) i.toast(switchWarning(e.context_tokens, e.estimated_cache_write_usd))
          else await postBand(i, 'info', SWITCH_BAND_ID, switchBandLine(pct), SWITCH_BAND_MS)
          i.invalidate()
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-tasks' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'route')
    if (rest0 === undefined) return next(e)
    const i = io($)
    await sayIn(i).catch(() => undefined)
    const mode = routeMode(await readSetting(i, 'route.mode'))
    const cheap = await lookupOf(i)
    const kinds = new Set([ROUTED_WHAT, SUGGEST_WHAT, WARNED_WHAT])
    const last = logLines((await readLog(i, LEDGER_KEY)).filter(x => kinds.has(x.what)), 3)
    const own = await readSessionSet(i, await i.sessionId())
    return { text: routeText(mode, cheap, last, normalizeStats(await i.get(STATS_KEY)), own['runner.researcher'] !== undefined) }
  })
}
