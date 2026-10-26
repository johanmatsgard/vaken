// Home: the collector that writes this session to the shared record, the /cockpit pane, and the one-row band above the prompt.
import type { EngineInterface, On } from 'claude-code'

import { APPEARS } from '../core/cardrules'
import { ensureBundles, withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import { bindPlatform, procPlatformOf } from '../core/procs'
import { bindSafeFs } from '../core/safewrite'
import { setWordSystem, wordSystemNow } from '../core/syswords'
import type { Io } from '../core/io'
import { addProbe, remember } from '../core/redraw'
import { flushNotes, useLater } from '../core/flush'
import { notePress } from '../core/offerlearn'
import type { OfferKind } from '../core/offerlearn'
import { noteActive } from '../core/quiet'
import { forgetLeader, releaseLease } from '../core/leader'
import { markSelfStart, noteCall, noteRun } from '../core/selfcost'
import { runnerOpsOf } from './orchestra'
import type { RunnerOps } from './orchestra'
import { PROJECT_OF_KEY } from '../core/projects'
import { cacheFromUsage } from '../core/cachefacts'
import { alivePids, dropRecord, label, listRecords, readRecord } from '../core/record'
import type { SessionRecord } from '../core/record'
import { CARD_IDS, limitBlocks, titleOf } from './home/logic'
import { chatReply } from './home/chatreply'
import { sayIn } from './saylang'
import { planShortName, statusMem, statusNext, statusText, tellNow } from '../core/tellme'
import type { CardId } from './home/logic'
import { isBucket, readOrderSet, writeLists } from './home/layouts'
import { readSetting, readSettings, startWindowsLanguage, systemLanguage } from '../core/settings'
import { OPEN_START_SEEN, OPEN_START_SETTING, openSeenOf, wantsOpenAtStart } from '../core/openstart'
import { BORDER_X_PT, CARD_MIN_INNER_PT, columnPt, setColumnSystem } from '../ui/tokens'
import { elementsFor } from '../ui/kit'
import { runPress } from '../ui/firstclick'
import { compactAnyway, compactCheckLines, runRow } from './home/actions'
import { FRESH_BRIEF } from './home/rowact'
import { t as tNow } from '../i18n/t'
import { actsOf, flip } from './home/acts'
import { seedCardHistory } from './home/appear'
import { HomeBand, bandChipShown } from './home/band'
import type { BandStep } from './home/band'
import { RUNAWAY_BAND_ID, RUNAWAY_NO_STOP, RUNAWAY_STOPPED, RUNAWAY_WAITING, runawayMem, silenceRunaway } from '../core/attention'
import { clearBand } from '../core/band'
import { endFocus } from './calm'
import { compactText, helpText, settingsCommand, usageText } from './home/commands'
import { BY_PERSON_ONLY, byPerson, originKind } from '../core/origin'
import type { HomeEngine } from './home/engine'
import { askClear, bandSignature, bandSignatureForCheck, busyEnd, busyReset, busyStart, collect, collector, donePatch, ensure, loadView, nextActs, paneSignature, viewForCheck, write } from './home/load'
import { QUICK_BUSY, clearPicks, nextMem, nextModeOf } from '../core/actions'
import type { Action } from '../core/actions'
import { leanMem, leanModeOf } from '../core/lean'
import { allowMem, allowRulesModeOf } from '../core/allowrules'
import { ASK_FAILED, SUBMIT_AFTER_MS } from '../core/phonenote'
import { tr } from '../core/lang'
import { HomePane, forgetSteady } from './home/pane'
import { openRelaySession, popOut } from './home/popout'
import { cardLouds, cardOrder } from './home/loud'
import { DRAW_FAILED, PANE, PANE_TITLE } from './home/prefs'
import { setSetupExists } from './setupfiles'
import { refreshContext, refreshSessions, refreshUsage } from './home/refresh'
import { flags, settleCompactAsk } from './home/state'
import { startTimers, stopTimers } from './home/timers'
import { askEffort, askMem, fitPatch, forgetAsks, noteAsk, noteStep } from './home/modelfit'
import { FIT_KEY, fitOn } from '../core/modelfit'
import { isPersonMessage } from '../core/proof'
import { HINTS, isFolded, subArgs, unknownWord } from '../core/menu'

export { langOf } from './home/state'
export { HELP } from './home/views/help'

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

function ioSys($: EngineInterface): Io {
  return bindSafeFs(bindPlatform(io($), () => $.env.get('OS')), { stat: (path, options) => $.fs.stat(path, options), list: path => $.fs.list(path) })
}

// An Io for loading the pane
function ioWithExists($: EngineInterface): Io {
  setSetupExists(path => $.fs.exists(path))
  return io($)
}

// The task runner's engine calls, for the pane's buttons and the heartbeat (core/orchestra.ts
function runnerOps($: EngineInterface): RunnerOps {
  return runnerOpsOf({
    send: (agentId, text) => $.session.send({ to: { agentId }, text } as never),
    run: (argv, init) => {
      noteRun()
      return $.process.run(argv, init)
    },
    root: () => $.session.root(),
    cwd: () => $.session.cwd(),
    list: () => $.agent.list(),
    submit: text => $.prompt.submit({ text, asUser: true }),
    after: (ms, f) => $.clock.after(ms, f),
    io: ioSys($),
  })
}

// The engine calls the pane's other files need, as closures (home/engine.ts): they may not take `$` itself.
function engineOf($: EngineInterface): HomeEngine {
  // The Agent setup card tells a file that is not there from one it cannot read with the engine's own check (features/setupfiles.ts).
  setSetupExists(path => $.fs.exists(path))
  return {
    io: () => ioSys($),
    now: () => $.clock.now(),
    every: (ms, f) => $.clock.every(ms, f),
    mcpCall: (server, tool, args) => {
      noteCall()
      return $.mcp.call(server, tool, args)
    },
    command: args => $.command.run(args),
    submit: text => $.prompt.submit({ text, asUser: true }),
    fill: (text, mode) => $.prompt.fill({ text, ...(mode === undefined ? {} : { mode }) }),
    boxText: async () => {
      const box = await $.prompt.read()
      return box.text
    },
    cwd: () => $.session.cwd(),
    commandList: () => $.command.list(),
    after: (ms, f) => $.clock.after(ms, f),
    toast: text => $.ui.toast(text),
    copy: async text => {
      const done = await $.ui.copy({ text })
      return done.isCopied === true
    },
    selection: async () => {
      const picked = await $.ui.selection()
      return picked?.text
    },
    messages: () => $.session.messages(),
    agentMessages: agentId => $.session.messages({ agentId }),
    runnerOps: () => runnerOps($),
    send: (sessionId, text) => $.session.send({ to: { sessionId }, text }),
    pluginName: () => $.plugin.name,
    titleSource: () => ({
      home: () => ioSys($).home(),
      stat: async path => {
        try {
          const st = await $.fs.stat(path)
          return st.kind === 'file' ? { size: st.size, mtimeMs: st.mtimeMs } : undefined
        } catch {
          return undefined
        }
      },
      list: async dir => {
        try {
          const entries = await $.fs.list(dir)
          return entries.filter(e => e.kind === 'dir').map(e => e.name)
        } catch {
          return []
        }
      },
      read: path => $.fs.read(path),
      run: (argv, init) => $.process.run(argv, init),
      win: async () => {
        const os = await $.env.get('OS')
        return procPlatformOf(os) === 'win32'
      },
    }),
    probe: async path => {
      try {
        const s = await $.fs.stat(path)
        return { kind: s.kind, size: s.size }
      } catch {
        return undefined
      }
    },
    agentsRunning: async () => {
      const list = await $.agent.list()
      return list.filter(a => a.status === 'running').length
    },
  }
}

async function paneShown($: EngineInterface): Promise<boolean> {
  const panes = await $.ui.panes()
  return panes.some(p => p.id === PANE && p.isShown)
}

// Open at start (core/openstart.ts): no `focus`, so the chat keeps the keyboard. The result is kept for the live check.
async function openAtStart($: EngineInterface, i: Io, isInteractive: boolean): Promise<void> {
  try {
    if (!wantsOpenAtStart(await readSetting(i, OPEN_START_SETTING), isInteractive, await paneShown($))) return
    const r = await $.ui.open({ id: PANE, title: PANE_TITLE, closeOnEscape: true, rows: 30 })
    await i.set(OPEN_START_SEEN, openSeenOf(await i.now(), r))
  } catch {
  }
}

const AGENT_BEAT_MS = 30_000
let agentBeatAt = 0

// What a tool call carries as `command` (the Bash line), read without casting the event.
function commandOf(x: object): unknown {
  return 'command' in x ? x.command : undefined
}

export function registerHome(on: On): void {
  on('session.start', { cwd: /(?<cockpit>)/ }, async ($, e, next) => {
    await $.command.register({ name: 'vaken', description: 'Show what needs you, the plan limit and your other sessions. A word after it runs a part: inbox, neighbors, show <file>, run <command>, pic [port].', argumentHint: HINTS['vaken'], immediate: true }) // en-only: slash menu text
    await $.command.register({ name: 'vaken-usage', description: 'Read the app usage card now: every plan limit, its reset and its pace. A word after it runs a part: cost, budget, limits, fit, why.', argumentHint: HINTS['vaken-usage'], immediate: true })
    await $.command.register({ name: 'vaken-help', description: 'Help: compacting the session and every other topic, in plain words. A word after it runs a part: glossary, run <name>.', argumentHint: 'glossary | run <name>', immediate: true })
    await $.command.register({ name: 'vaken-compact', description: 'Is now a good moment to compact the session? Also a line to paste after /compact. "now" compacts it at once. "why" says what stops it now.', argumentHint: HINTS['vaken-compact'], immediate: true })
    await $.command.register({ name: 'vaken-settings', description: 'List the vaken settings, change one, or reset them. A word after it runs a part: preset, shape, simple.', argumentHint: HINTS['vaken-settings'], immediate: true })
    try {
      const i = io($)
      const eng = engineOf($)
      collector.local = undefined
      forgetAsks()
      // Hot notes (core/flush.ts) are saved a few seconds later by the engine's timer
      useLater((ms, run) => $.clock.after(ms, run))
      const startAt = await $.clock.now()
      noteActive(startAt)
      markSelfStart(startAt)
      forgetLeader()
      try {
        const sysName = await $.env.get('OS')
        setWordSystem(procPlatformOf(sysName))
        // The pane's text cell is narrower on Windows (ui/tokens.ts, columnPt): set before anything is drawn
        setColumnSystem(procPlatformOf(sysName))
      } catch {
      }
      try {
        const win = wordSystemNow() === 'win32'
        const langVar = await $.env.get('LANG')
        let lcAll: string | undefined
        let languageVar: string | undefined
        if (win) {
          const lcAllRaw = await $.env.get('LC_ALL')
          const languageRaw = await $.env.get('LANGUAGE')
          lcAll = lcAllRaw
          languageVar = languageRaw
        }
        const env = { LANG: langVar, LC_ALL: lcAll, LANGUAGE: languageVar }
        flags.macLang = systemLanguage(env, wordSystemNow())
        // Windows with no language variable: one PowerShell read of the UI language, once per session
        if (win) {
          startWindowsLanguage((argv, init) => $.process.run(argv, init), env, flags.macLang, found => {
            flags.macLang = found
            io($).invalidate()
          })
        }
      } catch {
      }
      await ensureBundles(i)
      await seedCardHistory(i)
      try {
        const rootNow = await $.session.root()
        await i.set(PROJECT_OF_KEY(await i.sessionId()), rootNow || e.cwd)
      } catch {
      }
      await ensure(i, e.cwd)
      collector.local!.isWatched = e.isInteractive
      addProbe({
        key: 'home',
        isShown: () => paneShown($),
        signature: async () => {
          const { view, prefs } = await viewForCheck(io($))
          return paneSignature(view, prefs)
        },
      })
      addProbe({
        key: 'band',
        isShown: async () => true,
        signature: () => bandSignatureForCheck(eng.io),
      })
      let model = 'unknown'
      try {
        const modelNow = await $.session.model()
        model = String(modelNow)
      } catch {
      }
      await write(i, { model, state: 'idle' })
      startTimers(eng)
      void openAtStart($, i, e.isInteractive)
      void refreshUsage(eng)
      void refreshSessions(eng)
      void refreshContext(eng)
      const now = await i.now()
      const records = await listRecords(i)
      const alive = await alivePids(i, records)
      for (const r of records) if (now - r.updatedAt > 86_400_000 || (alive !== undefined && r.pid !== undefined && !alive.has(r.pid))) await dropRecord(i, r.sessionId)
    } catch {
      // vaken shows less, never breaks the session
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', { changed: /(?<cockpit>)/ }, async ($, e, next) => {
    const five = e.rateLimits.find(r => r.kind === 'five_hour')
    const seven = e.rateLimits.find(r => r.kind === 'seven_day')
    const spend = e.rateLimits.find(r => r.kind === 'spend_limit')
    const eng = engineOf($)
    void refreshUsage(eng)
    void refreshContext(eng)
    await collect(eng.io, {
      contextPercent: e.context.percent,
      costUsd: e.cost?.usd,
      fiveHourPercent: five?.percentUsed,
      fiveHourResetsAt: five?.resetsAt,
      sevenDayPercent: seven?.percentUsed,
      sevenDayResetsAt: seven?.resetsAt,
      spendPercent: spend?.percentUsed,
      spendResetsAt: spend?.resetsAt,
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', { text: /(?<cockpit>)/ }, async ($, e, next) => {
    try {
      const now = await $.clock.now()
      noteActive(now)
      const l = await ensure(io($))
      const title = l.title === undefined ? titleOf(e.text) : undefined
      if (title !== undefined) l.title = title
      const typed = !e.text.trimStart().startsWith('/')
      const patch = { ...(title === undefined ? {} : { title }), ...(typed ? { promptAt: now } : {}) }
      // Only a new title changes what the band shows. The stamp alone rides on the record kept in memory, with no redraw check, so a prompt reads nothing more (while a step is held, features/inbox.ts saves it at once)
      if (title !== undefined) await collect(() => io($), patch, false)
      else if (typed) await write(io($), patch, false)
      // Effort fits the ask: memory only, the free word rule alone.
      if (isPersonMessage(e.text, e.origin)) noteAsk(e.text)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<cockpit>)/ }, async ($, e, next) => {
    const startedAt = await $.clock.now()
    noteActive(startedAt)
    if (settleCompactAsk(startedAt, true)) io($).invalidate()
    await collect(() => io($), { state: 'working', ...(await askClear(io($), undefined)), ...busyReset() })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<cockpit>)/ }, async ($, e, next) => {
    const isMain = e.agentId === undefined
    const calledAt = await $.clock.now()
    noteActive(calledAt)
    // A question waits for you, so it is not work that keeps the session busy.
    const isQuestion = e.tool === 'AskUserQuestion'
    if (isMain) {
      await collect(() => io($), isQuestion ? { state: 'working', ask: { kind: 'question', tool: e.tool, since: calledAt } } : { state: 'working' })
      if (!isQuestion) busyStart(calledAt)
      else tellNow({ kind: 'ask' })
    } else if (calledAt - agentBeatAt >= AGENT_BEAT_MS) {
      // An agent's step is a sign of life for this session too, at most once in AGENT_BEAT_MS.
      agentBeatAt = calledAt
      await collect(() => io($), {})
    }
    let ended: Partial<SessionRecord> = {}
    const result = await Promise.resolve(next(e)).finally(() => {
      if (isMain && !isQuestion) ended = busyEnd()
    })
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (isMain) await collect(() => io($), { ...(await askClear(io($), undefined)), ...ended, ...(e.tool === 'Bash' ? await donePatch(io($), false) : {}), ...(await fitPatch(io($), e.tool, commandOf(e))) })
      else {
        const clear = await askClear(io($), e.agentId)
        if ('ask' in clear) await collect(() => io($), clear)
      }
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // Claude Code tells the person it needs a permission: from then on the call may wait for your OK. It only notes it, never answers.
  on('classic.Notification', async ($, e, next) => {
    try {
      if (/permission/i.test(e.notification_type)) {
        const tool = /\buse (.+?)\s*$/i.exec(e.message)?.[1] ?? ''
        // An agent's ask shows too, but never over one already waiting.
        const sid = await $.session.id()
        const isFree = e.agent_id === undefined || (await readRecord(io($), sid))?.ask === undefined
        if (tool !== 'AskUserQuestion' && isFree) {
          const askedAt = await $.clock.now()
          await collect(() => io($), { ask: { kind: 'permission', tool: label(tool, 40), since: askedAt, ...(e.agent_id === undefined ? {} : { agentId: e.agent_id }) } })
          tellNow({ kind: 'ask' })
        }
      }
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The main loop's model and effort; low effort only after the person pressed it for quick asks.
  on('turn.step', { turnId: /(?<modelfit>)/ }, async function* ($, e, next) {
    let effort: 'low' | undefined
    try {
      if (e.agentId === undefined) {
        noteStep(e.model, e.effort)
        effort = askEffort(e.effort)
      }
    } catch {
    }
    return yield* next(effort === undefined ? e : { ...e, effort })
  })

  // The desktop app runs the session as the SDK (`isInteractive` false), so its pane opens when the app joins; a reopened session gets it back too.
  on('session.attach', { surface: 'desktop' }, async ($, e, next) => {
    const r = await next(e)
    void openAtStart($, io($), true)
    return r
  })

  on('turn.complete', { turnId: /(?<cockpit>)/ }, async ($, e, next) => {
    const doneAt = await $.clock.now()
    noteActive(doneAt)
    if (e.agentId === undefined) {
      let isWatched = collector.local?.isWatched ?? true
      if (!isWatched) {
        try {
          const surfaces = await $.session.surfaces()
          isWatched = surfaces.length > 0
        } catch {
          isWatched = false
        }
      }
      const cacheAt = await $.clock.now()
      const cache = cacheFromUsage(e.usage, cacheAt)
      await collect(() => io($), { state: e.reason === 'aborted' || !isWatched ? 'idle' : 'waiting', ...(await askClear(io($), undefined)), ...busyReset(), ...(cache === undefined ? {} : { cache }), ...(await donePatch(io($), true)) })
      const r = await next(e)
      await flushNotes(false)
      return r
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { sessionId: /(?<cockpit>)/ }, async ($, e, next) => {
    try {
      stopTimers()
      if (collector.local !== undefined && collector.local.id === e.sessionId) collector.local.isEnded = true
      await releaseLease(io($))
      await dropRecord(io($), e.sessionId)
      await io($).del(PROJECT_OF_KEY(e.sessionId))
    } catch {
      // the record goes stale by itself within ten minutes
    }
    await flushNotes()
    useLater(undefined)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-usage' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    await sayIn(io($))
    const unknown = unknownWord(e.command, e.args)
    if (unknown !== undefined) return { text: unknown }
    return { text: await usageText(engineOf($)) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    // A word asks for a topic in the chat; only the bare command opens the Help page
    if (e.args.trim() === '') {
      flags.paneView = 'help'
      await $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
      io($).invalidate()
    }
    await sayIn(io($))
    return { text: helpText(e.args, await readSettings(io($))) }
  })

  on('command.run', { command: 'vaken-compact' }, async ($, e) => {
    // It starts a moment after the command ends
    await sayIn(io($))
    const unknown = unknownWord(e.command, e.args, ['now', 'why'])
    if (unknown !== undefined) return { text: unknown }
    if (e.args.trim().toLowerCase() === 'now') {
      // Compacting changes the session, so only the person typing here may start it (core/origin.ts).
      if (!byPerson(e.origin)) return { text: BY_PERSON_ONLY }
      const eng = engineOf($)
      const notGood = await compactCheckLines(eng, tNow)
      $.clock.after(1500, () => void compactAnyway(eng))
      const head = tr('Compacting the session in a moment, with what Claude keeps. Watch for the compact marker.')
      const why = tr('Not a good moment by the checks; compacting anyway because you asked:')
      return { text: [head, ...(notGood.length === 0 ? [] : [why, ...notGood.map(l => `  ${l}`)])].join('\n') }
    }
    return { text: await compactText(engineOf($), e.args) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'popout')
    if (rest0 === undefined) return next(e)
    await sayIn(io($))
    return { text: (await popOut(engineOf($))).text }
  })

  on('command.run', { command: 'vaken-settings' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    return { text: await settingsCommand(engineOf($), e.args, byPerson(e.origin)) }
  })

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    // On the phone the pane does not show: features/phone.ts answers with the number menu.
    if (e.args.trim() === '' && originKind(e.origin) === 'bridge') return next(e)
    await sayIn(io($))
    const unknown = unknownWord(e.command, e.args)
    if (unknown !== undefined) return { text: unknown }
    await $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
    // A broken store value never fails the command: the pane draws its own plain line
    try {
      const { view, prefs } = await loadView(ioWithExists($))
      const louds = cardLouds(view, prefs)
      // The pane opens with every card: the chat answer says only what is hot (features/home/chatreply.ts)
      return { text: chatReply(view, prefs, louds, cardOrder(prefs, louds)) }
    } catch {
      return { text: tr(DRAW_FAILED) }
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const resolved = $.ui.resolve(e)
    const el = elementsFor(resolved, e.surface)
    // A throw anywhere in the load or the draw leaves one plain line, never a blank pane
    try {
      // The pane's own load: a view with no cards (Settings, Help
      const { view, prefs } = await loadView(ioWithExists($), true)
      remember('home', paneSignature(view, prefs))
      const eng = engineOf($)
      const innerPt = Math.max(CARD_MIN_INNER_PT, Math.round(e.props.bodyColumns * columnPt() - 2 * BORDER_X_PT))
      return HomePane(el, view, prefs, innerPt, key => void flip(eng, key), e.props.bodyColumns, actsOf(eng), e.props.scroll?.bodyRows)
    } catch {
      return <el.Box key="draw-failed"><el.Text>{tr(DRAW_FAILED)}</el.Text></el.Box>
    }
  })

  // A pane that closes draws its cards in their own order when it opens again
  on('ui.close', async (_$, e, next) => {
    if (e.id === PANE) forgetSteady()
    return next(e)
  })

  on('ui.press', { element: /(?<quiet>)/ }, async ($, e, next) => {
    try {
      const pressedAt = await $.clock.now()
      noteActive(pressedAt)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.message', { element: /^fc-/ }, async ($, e, next) => {
    try {
      const now = await $.clock.now()
      noteActive(now)
      const data = e.data as { press?: unknown; log?: unknown } | null | undefined
      if (data?.log === undefined || data.press === true) runPress(e.element, now)
    } catch {
    }
    return next(e)
  })

  on('ui.message', { element: /^arrange-board$/ }, async ($, e, next) => {
    try {
      const data = e.data as { lists?: unknown; order?: unknown; bucket?: unknown } | null
      const i = io($)
      const values = await readSettings(i)
      const hidden = CARD_IDS.filter(id => values[`cards.${id}`] === 'hide')
      const bucket = data?.bucket
      if (!isBucket(bucket)) return next(e)
      const set = await readOrderSet(i)
      const old = set.orders[bucket]
      // The board sends its columns split by "|" (an older board sends one order)
      const text = typeof data?.lists === 'string' ? data.lists : typeof data?.order === 'string' ? data.order : ''
      const cols = text.split('|').map(part => part.split(',').filter(id => id !== '' && id !== 'needs'))
      const shown = cols.flat()
      // Only the cards still shown, each once, are a drop.
      const away = (id: CardId): boolean => hidden.includes(id) || (APPEARS[id] !== undefined && !shown.includes(id))
      const want = old.filter(id => !away(id))
      if (shown.length === want.length && want.every(id => shown.includes(id)) && new Set(shown).size === shown.length) {
        // A card not on the board keeps its column under the cards there (with no columns kept yet, the last column)
        const lists = cols.map(c => [...(c as CardId[])])
        const oldLists = set.lists[bucket]
        if (oldLists === undefined) lists[lists.length - 1].push(...old.filter(away))
        else for (const [n, l] of oldLists.entries()) for (const id of l) if (away(id)) lists[Math.min(n, lists.length - 1)].push(id)
        const before = set.lists[bucket] === undefined ? old.join(',') : set.lists[bucket].map(l => l.join(',')).join('|')
        const after = lists.length > 1 ? lists.map(l => l.join(',')).join('|') : lists.flat().join(',')
        if (after !== before) {
          await writeLists(i, bucket, lists)
          i.invalidate()
        }
      }
    } catch {
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt', surface: /(?<cockpit>)/ }, async ($, e, next) => {
    const theirs = await next(e)
    const resolved = $.ui.resolve(e)
    const el = elementsFor(resolved, e.surface)
    const { view, detail, prefs } = await loadView(ioWithExists($))
    nextMem.mode = nextModeOf(prefs.values['next.mode'])
    leanMem.mode = leanModeOf(prefs.values['lean.mode'])
    allowMem.mode = allowRulesModeOf(prefs.values['allow.rules'])
    askMem.on = fitOn(prefs.values[FIT_KEY])
    remember('band', bandSignature(view, detail))
    // The status line under the prompt box, from the facts this draw already loaded
    try {
      statusMem.on = prefs.values['status.line'] !== 'off'
      const lead = limitBlocks(view)[0]
      statusMem.facts = { context: view.here?.rec.contextPercent, planUsed: lead?.percent, planName: lead === undefined ? undefined : planShortName(lead), bandChip: bandChipShown(view, detail, e.props.bodyColumns, nextActs(view).map(a => tr(a.label)), el.Svg !== undefined) }
      const line = statusNext(statusMem.on, statusText(statusMem.facts), statusMem.shown)
      if (line !== null) {
        statusMem.shown = line
        $.ui.status(line)
      }
    } catch {
    }
    const { Box } = el
    // A next step button sends its fixed request a moment later, and only while Claude is not working
    const pressNext = (a: Action) => {
      const i = io($)
      if (nextMem.busy) {
        i.toast(tr(QUICK_BUSY))
        return
      }
      clearPicks()
      i.invalidate()
      void notePress(i, a.id as OfferKind)
      $.clock.after(SUBMIT_AFTER_MS, () => {
        void (async () => {
          try {
            const r = await $.prompt.submit({ text: a.prompt, asUser: true })
            if ('drop' in r && r.drop !== undefined) i.toast(tr(ASK_FAILED), true)
          } catch {
            i.toast(tr(ASK_FAILED), true)
          }
        })()
      })
    }
    const openPane = () => {
      flags.bandListOpen = true
      flags.paneView = 'cards'
      const opened = $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
      void opened
      io($).invalidate()
    }
    // From the Needs you chip: the pane opens on its cards, not on the band list
    const openNeeds = () => {
      flags.bandListOpen = false
      flags.paneView = 'cards'
      const opened = $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
      void opened
      io($).invalidate()
    }
    // The runaway step line's presses (core/attention.ts): Stop the answer ends the running answer and its step through the engine's turn.abort,
    // only while that answer's id is known; Keep waiting keeps vaken quiet about this step. Only on a press.
    const turnId = runawayMem.turnId
    const stopStep = async (id: string) => {
      const i = io($)
      let stopped = true
      try {
        await $.turn.abort({ turnId: id })
      } catch {
        stopped = false
      }
      await clearBand(i, RUNAWAY_BAND_ID)
      i.toast(tr(stopped ? RUNAWAY_STOPPED : RUNAWAY_NO_STOP), true)
      i.invalidate()
    }
    const keepWaiting = async () => {
      const i = io($)
      silenceRunaway(await i.now())
      await clearBand(i, RUNAWAY_BAND_ID)
      i.toast(tr(RUNAWAY_WAITING), true)
      i.invalidate()
    }
    const step: BandStep = { ...(turnId === undefined ? {} : { stop: () => void stopStep(turnId) }), wait: () => void keepWaiting() }
    return (
      <Box flexDirection="column">
        {theirs}
        {HomeBand(el, view, detail, openPane, () => void endFocus(io($), true), openNeeds, e.props.bodyColumns, { actions: nextActs(view), press: pressNext }, () => void runRow(engineOf($), FRESH_BRIEF), r => void openRelaySession(engineOf($), r), step)}
      </Box>
    )
  })
}
