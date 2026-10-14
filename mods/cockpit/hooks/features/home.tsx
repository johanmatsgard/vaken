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
import { noteActive } from '../core/quiet'
import { forgetLeader, releaseLease } from '../core/leader'
import { markSelfStart, noteCall, noteRun } from '../core/selfcost'
import { hasProgress } from './agentboard'
import { ROLES, ROLE_PROMPT, roleDescription } from '../core/orchestra'
import { runnerOpsOf } from './orchestra'
import type { RunnerOps } from './orchestra'
import { PROJECT_OF_KEY } from '../core/projects'
import { cacheFromUsage } from '../core/cachefacts'
import { alivePids, decidedByClassifier, dropRecord, label, listRecords } from '../core/record'
import { CARD_IDS, homeText, titleOf } from './home/logic'
import type { CardId } from './home/logic'
import { isBucket, readOrders, writeOrder } from './home/layouts'
import { readSetting, readSettings, startWindowsLanguage, systemLanguage } from '../core/settings'
import { PHONE_MODE_KEY, modeOf, phoneCockpitLine } from '../core/phonecmds'
import { BORDER_X_PT, CARD_MIN_INNER_PT, COL_PT } from '../ui/tokens'
import { elementsFor } from '../ui/kit'
import { noteFault, runPress } from '../ui/firstclick'
import { compactAnyway, compactCheckLines } from './home/actions'
import { tEn } from '../i18n/t'
import { actsOf, flip } from './home/acts'
import { seedCardHistory } from './home/appear'
import { HomeBand } from './home/band'
import { endFocus } from './calm'
import { compactText, helpText, settingsCommand, usageText } from './home/commands'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'
import type { HomeEngine } from './home/engine'
import { bandSignature, bandSignatureForCheck, collect, collector, donePatch, ensure, loadView, paneSignature, viewForCheck, write } from './home/load'
import { HomePane } from './home/pane'
import { popOut } from './home/popout'
import { cardLouds, cardOrder } from './home/loud'
import { PANE, PANE_TITLE } from './home/prefs'
import { prsText } from '../core/prcard'
import { backCardText } from '../core/backcard'
import { safetyCardText } from '../core/safetycard'
import { contextCardText } from '../core/contextcard'
import { previewCardText } from '../core/previewcard'
import { doBlocks, doCardText } from '../core/phonedo'
import { previewFactsOf } from './home/preview'
import { setupCardText } from '../core/setupcard'
import { setupFactsOf } from './home/setup'
import { setSetupExists } from './setupfiles'
import { startTaskText } from './home/starttask'
import { agentsText } from '../core/agentboard'
import { explainCmd } from '../core/whatis'
import { contextFactsOf } from './home/context'
import { shipCardText } from '../core/shipcard'
import { backFactsOf } from './home/back'
import { safetyFactsOf } from './home/safety'
import { safetyFacts } from './home/linecards'
import { refreshContext, refreshSessions, refreshUsage } from './home/refresh'
import { flags, settleCompactAsk } from './home/state'
import { startTimers, stopTimers } from './home/timers'
import { fitPatch, noteStep } from './home/modelfit'
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
    spawn: async a => {
      const got = await $.agent.spawn(a)
      return got as { agentId?: string; deny?: unknown; model?: unknown }
    },
    stop: agentId => $.tool.call({ tool: 'TaskStop', task_id: agentId } as never),
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
    register: (r, m) => {
      if (ROLES[r].tools === undefined) return $.agent.register({ name: r, description: roleDescription(r), prompt: ROLE_PROMPT(r), model: m })
      return $.agent.register({ name: r, description: roleDescription(r), prompt: ROLE_PROMPT(r), model: m, tools: ROLES[r].tools })
    },
    seen: hasProgress,
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
    messages: () => $.session.messages(),
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

export function registerHome(on: On): void {
  on('session.start', { cwd: /(?<cockpit>)/ }, async ($, e, next) => {
    await $.command.register({ name: 'vaken', description: 'Show what needs you, the plan limit and your other sessions. A word after it runs a part: inbox, neighbors.', argumentHint: HINTS['vaken'], immediate: true })
    await $.command.register({ name: 'vaken-usage', description: 'Read the app usage card now: every plan limit, its reset and its pace. A word after it runs a part: cost, budget, limits, fit, why.', argumentHint: HINTS['vaken-usage'], immediate: true })
    await $.command.register({ name: 'vaken-help', description: 'Help: compacting the session and every other topic, in plain words. A word after it runs a part: glossary, run <name>.', argumentHint: 'glossary | run <name>', immediate: true })
    await $.command.register({ name: 'vaken-compact', description: 'Is now a good moment to compact the session? Also a line to paste after /compact. "now" compacts it at once. "why" says what stops it now.', argumentHint: HINTS['vaken-compact'], immediate: true })
    await $.command.register({ name: 'vaken-settings', description: 'List the vaken settings, change one, or reset them. A word after it runs a part: preset, shape, simple.', argumentHint: HINTS['vaken-settings'], immediate: true })
    try {
      const i = io($)
      const eng = engineOf($)
      collector.local = undefined
      // Hot notes (core/flush.ts) are saved a few seconds later by the engine's timer
      useLater((ms, run) => $.clock.after(ms, run))
      const startAt = await $.clock.now()
      noteActive(startAt)
      markSelfStart(startAt)
      forgetLeader()
      try {
        const sysName = await $.env.get('OS')
        setWordSystem(procPlatformOf(sysName))
      } catch {
      }
      try {
        const win = wordSystemNow() === 'win32'
        const langVar = await $.env.get('LANG')
        const lcAll = win ? await $.env.get('LC_ALL') : undefined
        const languageVar = win ? await $.env.get('LANGUAGE') : undefined
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
      // Only a new title changes what the band shows. The stamp alone rides on the record kept in memory, with no redraw check, so a prompt reads nothing more
      if (title !== undefined) await collect(() => io($), patch, false)
      else if (typed) await write(io($), patch, false)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', { turnId: /(?<cockpit>)/ }, async ($, e, next) => {
    const startedAt = await $.clock.now()
    noteActive(startedAt)
    if (settleCompactAsk(startedAt, true)) io($).invalidate()
    await collect(() => io($), { state: 'working', ask: undefined })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: /(?<cockpit>)/ }, async ($, e, next) => {
    const isMain = e.agentId === undefined
    const calledAt = await $.clock.now()
    noteActive(calledAt)
    if (isMain) await collect(() => io($), e.tool === 'AskUserQuestion' ? { state: 'working', ask: { kind: 'question', tool: e.tool, since: calledAt } } : { state: 'working' })
    const result = await next(e)
    // Nothing below may throw: a failure after next must not run the tool twice.
    try {
      if (isMain) await collect(() => io($), { ask: undefined, ...(e.tool === 'Bash' ? await donePatch(io($), false) : {}), ...(await fitPatch(io($), e.tool, (e as { command?: unknown }).command)) })
    } catch {
    }
    return result
  }).catch(($, e, next) => next(e))

  // The engine says it will ask about a real tool call: from then on the call may wait for your OK.
  on('tool.check', { tool: /(?<cockpit>)/ }, async ($, e, next) => {
    const verdict = await next(e)
    try {
      if (e.tool_use_id !== undefined && e.agentId === undefined && e.tool !== 'AskUserQuestion' && verdict.decision === 'ask' && !decidedByClassifier(verdict)) {
        const askedAt = await $.clock.now()
        await collect(() => io($), { ask: { kind: 'permission', tool: label(e.tool, 40), since: askedAt } })
      }
    } catch {
    }
    return verdict
  }).catch(($, e, next) => next(e))

  // The main loop's model and effort
  on('turn.step', { turnId: /(?<modelfit>)/ }, async function* ($, e, next) {
    try {
      if (e.agentId === undefined) noteStep(e.model, e.effort)
    } catch {
    }
    return yield* next(e)
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
      await collect(() => io($), { state: e.reason === 'aborted' || !isWatched ? 'idle' : 'waiting', ask: undefined, ...(cache === undefined ? {} : { cache }), ...(await donePatch(io($), true)) })
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
    const unknown = unknownWord(e.command, e.args)
    if (unknown !== undefined) return { text: unknown }
    return { text: await usageText(engineOf($)) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    flags.paneView = 'help'
    await $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
    io($).invalidate()
    return { text: helpText(e.args, await readSettings(io($))) }
  })

  on('command.run', { command: 'vaken-compact' }, async ($, e) => {
    // It starts a moment after the command ends
    const unknown = unknownWord(e.command, e.args, ['now', 'why'])
    if (unknown !== undefined) return { text: unknown }
    if (e.args.trim().toLowerCase() === 'now') {
      // Compacting changes the session, so only the person typing here may start it (core/origin.ts).
      if (!byPerson(e.origin)) return { text: BY_PERSON_ONLY }
      const eng = engineOf($)
      const notGood = await compactCheckLines(eng, tEn)
      $.clock.after(1500, () => void compactAnyway(eng))
      const head = 'Compacting the session in a moment, with what Claude keeps. Watch for the compact marker.' // en-only: plain answer of a slash command (text twin)
      const why = 'Not a good moment by the checks; compacting anyway because you asked:' // en-only: plain answer of a slash command (text twin)
      return { text: [head, ...(notGood.length === 0 ? [] : [why, ...notGood.map(l => `  ${l}`)])].join('\n') }
    }
    return { text: await compactText(engineOf($), e.args) }
  })

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'popout')
    if (rest0 === undefined) return next(e)
    return { text: (await popOut(engineOf($), s => s)).text }
  })

  on('command.run', { command: 'vaken-settings' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    return { text: await settingsCommand(engineOf($), e.args, byPerson(e.origin)) }
  })

  on('command.run', { command: 'vaken' }, async ($, e, next) => {
    if (isFolded(e.command, e.args)) return next(e)
    const unknown = unknownWord(e.command, e.args)
    if (unknown !== undefined) return { text: unknown }
    await $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
    const { view, prefs } = await loadView(ioWithExists($))
    const phoneLine = phoneCockpitLine(modeOf(await readSetting(io($), PHONE_MODE_KEY)))
    return { text: `${homeText(view, cardOrder(prefs, cardLouds(view, prefs)), { agents: [...agentsText(prefs.agents ?? [], view.now ?? 0, r => prefs.agentFrom[r.session] ?? 'a closed session', explainCmd('agents')), ...startTaskText(prefs)], back: backCardText(backFactsOf(view, prefs)), preview: prefs.hidden.includes('preview') ? [] : previewCardText(previewFactsOf(prefs)), setup: prefs.hidden.includes('setup') ? [] : setupCardText(setupFactsOf(prefs)), do: prefs.hidden.includes('do') ? [] : doCardText(doBlocks()), context: contextCardText(contextFactsOf(view, prefs)), safety: safetyCardText(safetyFacts({ now: view.now ?? 0, ledger: prefs.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), halted: prefs.halted, modes: {}, safety: safetyFactsOf(prefs) })), prs: prsText(prefs.prs), ship: shipCardText({ ...(prefs.proof === undefined ? {} : { proof: prefs.proof }), ledger: prefs.ledger, now: view.now ?? 0, ...(prefs.prs === undefined ? {} : { prs: prefs.prs }) }) })}\n${phoneLine}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const resolved = $.ui.resolve(e)
    const el = elementsFor(resolved, e.surface)
    // The pane's own load: a view with no cards (Settings, Help
    const { view, prefs } = await loadView(ioWithExists($), true)
    remember('home', paneSignature(view, prefs))
    const eng = engineOf($)
    const innerPt = Math.max(CARD_MIN_INNER_PT, Math.round(e.props.bodyColumns * COL_PT - 2 * BORDER_X_PT))
    return HomePane(el, view, prefs, innerPt, key => void flip(eng, key), e.props.bodyColumns, actsOf(eng), e.props.scroll?.bodyRows)
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

  // A press Client that failed (a resize can do it) is left out of the next drawings, in the pane and the band alike
  on('ui.fault', { element: /^fc-/ }, ($, e, next) => {
    noteFault(e.element, Date.now())
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.message', { element: /^arrange-board$/ }, async ($, e, next) => {
    try {
      const data = e.data as { order?: unknown; bucket?: unknown } | null
      const i = io($)
      const values = await readSettings(i)
      const hidden = CARD_IDS.filter(id => values[`cards.${id}`] === 'hide')
      const bucket = data?.bucket
      if (!isBucket(bucket)) return next(e)
      const old = (await readOrders(i))[bucket]
      const shown = typeof data?.order === 'string' ? data.order.split(',').filter(id => id !== 'needs') : []
      // Only the cards still shown, each once, are a drop.
      const away = (id: CardId): boolean => hidden.includes(id) || (APPEARS[id] !== undefined && !shown.includes(id))
      const want = old.filter(id => !away(id))
      if (shown.length === want.length && want.every(id => shown.includes(id)) && new Set(shown).size === shown.length) {
        const merged = [...(shown as CardId[]), ...old.filter(away)]
        if (merged.join(',') !== old.join(',')) {
          await writeOrder(i, bucket, merged)
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
    const { view, detail } = await loadView(ioWithExists($))
    remember('band', bandSignature(view, detail))
    const { Box } = el
    const openPane = () => {
      flags.bandListOpen = true
      flags.paneView = 'cards'
      void $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
      io($).invalidate()
    }
    // From the Needs you chip: the pane opens on its cards, not on the band list
    const openNeeds = () => {
      flags.bandListOpen = false
      flags.paneView = 'cards'
      void $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true, rows: 30 })
      io($).invalidate()
    }
    return (
      <Box flexDirection="column">
        {theirs}
        {HomeBand(el, view, detail, openPane, () => void endFocus(io($), true), openNeeds, e.props.bodyColumns)}
      </Box>
    )
  })
}
