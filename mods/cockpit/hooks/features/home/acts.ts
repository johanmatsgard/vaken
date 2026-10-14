// What the pane's buttons do (Acts): each one keeps its choice (a view flag or a stored setting) and asks for a redraw.
import { langNow, tr } from '../../core/lang'
import { modeLabel, presetLabel } from '../../core/settingsmap'
import { QUIET_ASKED_KEY, parseAsked } from '../../core/whatis'
import { USUAL_MODE, findPreset, presetSteps } from '../../core/presets'
import { isRoleKey, rolesChanged, tasksCommand } from '../orchestra'
import { lastAnswer, simpler } from '../simple'
import { applySteps, clearProjectSetting, clearSessionSetting, projectOf, readGlobalSettings, readProjectSet, writeProjectSetting, writeSessionSetting } from '../../core/projects'
import { ROLE_NAMES, THROW_HOLD, roleSettingKey } from '../../core/orchestra'
import { FIND_PAUSE_MS, findWords } from '../../core/skills'
import { SECTIONS, findSetting, readSetting, sectionOf, writeSetting } from '../../core/settings'
import { REPORT_KEY } from '../../core/overnight'
import { setWatch } from '../../core/watch'
import { dismissOpenEnds, endFocus, startFocus } from '../calm'
import { LEDGER_KEY, pushLog } from '../compaction'
import { ASK_WHAT } from '../../core/autosafe'
import { applyLayout, deleteLayout, renameLayout, saveLayout, snapshot } from './layouts'
import { MODE_IS_ON, openedCard } from '../../core/cardrules'
import { NEEDS_CALM_OPEN, START_OPEN_CARDS, glanceToggled, keepGlance, openCardsOf, withOpenCards } from '../../core/headline'
import { parseOpenDetail, setMark } from './logic'
import { compactAnyway, compactNotNow, compactNow, loadCommands, noteActed, runRow, startSkill } from './actions'
import type { HomeEngine } from './engine'
import { talkActsOf } from './talk'
import { fitActsOf } from './modelfit'
import { forPane, startActsOf } from './starttask'
import { popOutPress } from './popout'
import { eraseAll, erasePreview } from '../../core/erase'
import { loadView } from './load'
import { FIRST_RUN_KEY, PREF_AGENTS_OPEN, PREF_LISTS, PREF_MARKS, PREF_OTHERS_OPEN, parseLists, resetEverything } from './prefs'
import type { Acts } from './prefs'
import { flags, simple, skillFind } from './state'
import type { PaneView } from './state'
import { fillIn } from '../../core/fillin'
import { ARRANGING_TO_CUSTOM } from '../../core/cardwords'
import { arrangeSeed } from './arrangeseed'
import { BUCKETS, writeOrder } from './layouts'
import { fixedIds, viewModeOf } from './viewset'

// The folds are open unless "off"
export async function flip(eng: HomeEngine, key: string): Promise<void> {
  const i = eng.io()
  const isOn = key === PREF_OTHERS_OPEN || key === PREF_AGENTS_OPEN ? (await i.get(key)) !== 'off' : (await i.get(key)) === 'on'
  await i.set(key, isOn ? 'off' : 'on')
  i.invalidate()
}

async function markOpened(eng: HomeEngine, id: string): Promise<void> {
  const i = eng.io()
  const lists = parseLists(await i.get(PREF_LISTS))
  const seen = openedCard(lists.seen, id)
  if (seen === undefined) return
  await i.set(PREF_LISTS, { ...lists, seen })
  i.invalidate()
}

// The cards that start open (core/headline.ts START_OPEN_CARDS): after a press that opens or shuts a card
async function keepOpenCards(eng: HomeEngine): Promise<void> {
  const i = eng.io()
  const lists = parseLists(await i.get(PREF_LISTS))
  if (lists.open === undefined) return
  await i.set(PREF_LISTS, { ...lists, open: openCardsOf(flags.openSections, flags.openWhat === NEEDS_CALM_OPEN) })
}

function enterView(view: PaneView): void {
  if (flags.paneView === 'help' || flags.paneView === 'guide') flags.backStack.push(flags.paneView)
  else if (flags.paneView === 'cards') flags.backStack = []
  flags.paneView = view
}
function leaveView(view: PaneView): void {
  if (flags.paneView !== view) return
  flags.paneView = flags.backStack.pop() ?? 'cards'
}

let modePress: Promise<void> = Promise.resolve()

export function actsOf(eng: HomeEngine): Acts {
  return {
    open: (key, acted) => {
      const needsPress = key === NEEDS_CALM_OPEN || (key === undefined && flags.openWhat === NEEDS_CALM_OPEN)
      flags.openWhat = key
      if (needsPress) void keepOpenCards(eng)
      if (key !== undefined) void markOpened(eng, key.split(':')[0] as string)
      if (acted !== undefined) void noteActed(eng.io(), acted)
      eng.io().invalidate()
    },
    toggleSection: key => {
      flags.openSections = flags.openSections.includes(key) ? flags.openSections.filter(k => k !== key) : [...flags.openSections, key]
      eng.io().invalidate()
    },
    glance: (id, loudness) => {
      flags.openSections = glanceToggled(flags.openSections, id, loudness)
      void markOpened(eng, id)
      void keepOpenCards(eng)
      eng.io().invalidate()
    },
    openSettingsAt: (group, acted) => {
      const from = group === undefined && flags.settingsFocus !== undefined ? sectionOf(flags.settingsFocus) : undefined
      flags.openSections = [...keepGlance(flags.openSections), ...(from === undefined ? [] : [`section:${from.name}`])]
      flags.openWhat = undefined
      flags.settingsFocus = group
      enterView('settings')
      if (acted !== undefined) void noteActed(eng.io(), acted)
      eng.io().invalidate()
    },
    previewStart: name => {
      flags.startPreview = name
      eng.io().invalidate()
    },
    quiet: (q, isQuiet) => {
      void (async () => {
        const i = eng.io()
        if (isQuiet) await writeSetting(i, q.setting, 'off')
        await i.set(QUIET_ASKED_KEY, { ...parseAsked(await i.get(QUIET_ASKED_KEY)), [q.what]: await i.now() })
        i.invalidate()
        if (isQuiet) i.toast(fillIn(tr('{label}: Off. Settings can turn it on again.'), { label: tr(q.label) }), true)
      })()
    },
    closeBandList: () => {
      flags.bandListOpen = false
      eng.io().invalidate()
    },
    startHere: name => {
      flags.startPreview = undefined
      flags.backAsk = false
      // The next press waits for the one before it, so the last press wins whole.
      modePress = modePress
        .then(async () => {
          const i = eng.io()
          const preset = findPreset(name)
          const fromWelcome = (await i.get(FIRST_RUN_KEY)) !== 'done'
          if (preset !== undefined) {
            // At This project the mode sets the project's own rows (Settings' scope), else All projects.
            const root = flags.settingsScope === 'project' ? await projectOf(i) : undefined
            const was = root === undefined ? await readGlobalSettings(i) : { ...(await readGlobalSettings(i)), ...(await readProjectSet(i, root)) }
            let changed = 0
            const steps = presetSteps(preset)
            for (const st of steps) if (was[st.key] !== (st.value ?? findSetting(st.key)?.default)) changed += 1
            await applySteps(i, steps, root)
            if (Object.keys(preset.values).some(isRoleKey)) await rolesChanged(eng.runnerOps())
            if (fromWelcome) i.toast(tr(MODE_IS_ON).replace('{mode}', modeLabel(preset.name, langNow())), true)
            if (!fromWelcome && changed > 0) i.toast(tr('{preset}: {n} settings changed. /vaken-settings lists them.').replace('{preset}', presetLabel(preset.name, langNow())).replace('{n}', String(changed)), true)
          }
          // The Start choice on a fresh store (a mode or Got it): Needs you, This session and Plan limits start open
          if (fromWelcome) {
            const lists = parseLists(await i.get(PREF_LISTS))
            if (lists.open === undefined) {
              await i.set(PREF_LISTS, { ...lists, open: [...START_OPEN_CARDS] })
              flags.openSections = withOpenCards(flags.openSections, START_OPEN_CARDS)
              if (flags.openWhat === undefined) flags.openWhat = NEEDS_CALM_OPEN
            }
          }
          await eng.io().set(FIRST_RUN_KEY, 'done')
          eng.io().invalidate()
        })
        .catch(() => undefined)
    },
    askBack: step => {
      if (step === 'yes') {
        actsOf(eng).startHere(USUAL_MODE)
        return
      }
      flags.backAsk = step === 'ask'
      eng.io().invalidate()
    },
    compactNow: () => void compactNow(eng),
    compactAnyway: () => void compactAnyway(eng),
    compactNotNow: () => compactNotNow(eng),
    // The ask-once on the This session card: Yes sets Compacting > Mode to Auto, either answer is a ledger line
    askShorten: yes =>
      void (async () => {
        const i = eng.io()
        if (yes) await writeSetting(i, 'compact.mode', 'auto')
        await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: ASK_WHAT, detail: yes ? 'yes' : 'not now' })
        i.invalidate()
      })(),
    startSkill: command => void startSkill(eng, command),
    // A row that acts (home/rowact.ts): only the small typed actions listed there, never a free string.
    run: action => void runRow(eng, action),
    // Typing in the Skills card's search box: the words stay in memory (no store read or write) and the pane redraws once
    findSkill: (text, force) => {
      skillFind.query = text
      skillFind.all = false
      skillFind.pause += 1
      const mine = skillFind.pause
      const redraw = (): void => {
        void (async () => {
          if (findWords(skillFind.query).length > 0) await loadCommands(eng, force === true)
          if (mine === skillFind.pause) eng.io().invalidate()
        })()
      }
      if (force === true) redraw()
      else eng.after(FIND_PAUSE_MS, redraw)
    },
    findMore: () => {
      skillFind.all = !skillFind.all
      eng.io().invalidate()
    },
    watch: (id, on, name, isWorking) => {
      void (async () => {
        const i = eng.io()
        await setWatch(i, id, on, name, isWorking)
        i.invalidate()
      })()
    },
    calm: what => {
      void (async () => {
        const i = eng.io()
        if (what === 'focus') await startFocus(i)
        else if (what === 'endFocus') await endFocus(i, true)
        else await dismissOpenEnds(i)
      })().catch(() => undefined)
    },
    openHelp: isOpen => {
      if (isOpen) enterView('help')
      else leaveView('help')
      eng.io().invalidate()
    },
    openGuide: isOpen => {
      if (isOpen) enterView('guide')
      else leaveView('guide')
      eng.io().invalidate()
    },
    openSettings: isOpen => {
      if (isOpen) enterView('settings')
      else leaveView('settings')
      flags.resetStep = 'none'
      flags.eraseStep = 'none'
      flags.erasePreview = undefined
      flags.openWhat = undefined
      flags.openSections = keepGlance(flags.openSections)
      if (!isOpen) flags.settingsFocus = undefined
      eng.io().invalidate()
    },
    setSetting: (key, value) => {
      flags.resetStep = 'none'
      void (async () => {
        const i = eng.io()
        const root = flags.settingsScope === 'project' ? await projectOf(i) : undefined
        if (root === undefined) await writeSetting(i, key, value)
        else await writeProjectSetting(i, root, key, value)
        if (isRoleKey(key)) await rolesChanged(eng.runnerOps())
        i.invalidate()
      })()
    },
    saveLayout: name => {
      void (async () => {
        const i = eng.io()
        const { prefs: now } = await loadView(i)
        const r = await saveLayout(i, name, snapshot(now.values, now.orders))
        if (r.why !== undefined) i.toast(r.why)
        else flags.layoutDraft = ''
        i.invalidate()
      })()
    },
    renameLayout: (from, to) => {
      void (async () => {
        const i = eng.io()
        const r = await renameLayout(i, from, to)
        if (r.why !== undefined) i.toast(r.why)
        else flags.layoutDraft = ''
        i.invalidate()
      })()
    },
    applyLayout: name => {
      void applyLayout(eng.io(), name).then(() => eng.io().invalidate())
    },
    deleteLayout: name => {
      void deleteLayout(eng.io(), name).then(() => eng.io().invalidate())
    },
    setMark: (id, mark) => {
      void (async () => {
        const i = eng.io()
        const { prefs: now } = await loadView(i)
        await i.set(PREF_MARKS, JSON.stringify(setMark(now.marks, id, mark, now.allOthers.map(r => r.rec.sessionId))))
        i.invalidate()
      })()
    },
    // The runner's buttons do what `/vaken-tasks` does (a plugin cannot run its own command from its pane)
    askThrow: n => {
      flags.throwAsk = n
      if (n !== flags.throwSure) flags.throwSure = undefined
      eng.io().invalidate()
    },
    askApply: name => {
      flags.applyAsk = name
      eng.io().invalidate()
    },
    runSteer: args => {
      flags.throwAsk = undefined
      flags.throwSure = undefined
      flags.applyAsk = undefined
      void (async () => {
        try {
          const said = (await tasksCommand(eng.io(), eng.runnerOps(), args)).split('\n')[0]
          // A Throw away that would lose work asks once more, in the same row, and the next press says yes.
          const held = /^throw (\d+)$/.exec(args.trim())
          if (held !== null && said.startsWith(THROW_HOLD)) {
            flags.throwAsk = Number(held[1])
            flags.throwSure = Number(held[1])
          }
          if (said !== '') eng.toast(forPane(said))
        } catch {
        }
        eng.io().invalidate()
      })()
    },
    arrange: isOn => {
      const open = (): void => {
        flags.arranging = isOn
        if (isOn) flags.paneView = 'cards'
        eng.io().invalidate()
      }
      if (!isOn) return open()
      void (async () => {
        const i = eng.io()
        try {
          const { prefs: now } = await loadView(i)
          const fixed = fixedIds(viewModeOf(now.values))
          if (fixed !== undefined) {
            const seed = arrangeSeed(fixed)
            const root = await projectOf(i)
            const here = flags.settingsScope === 'project' ? root : undefined
            for (const [k, v] of Object.entries(seed.values)) await (here === undefined ? writeSetting(i, k, v) : writeProjectSetting(i, here, k, v))
            if (here === undefined && root !== undefined && (await readSetting(i, 'look.view')) !== 'custom') for (const [k, v] of Object.entries(seed.values)) await writeProjectSetting(i, root, k, v)
            for (const b of BUCKETS) await writeOrder(i, b, seed.order)
            i.toast(tr(ARRANGING_TO_CUSTOM), true)
          }
        } catch {
        }
        open()
      })()
    },
    // A card's More or Less: its own level, kept for all projects, the pane's level is kept as "Default"
    flipDetail: (id, level, exact) => {
      void (async () => {
        const i = eng.io()
        await writeSetting(i, `detail.${id}`, exact !== true && level === parseOpenDetail(await readSetting(i, 'detail')) ? 'inherit' : level)
        i.invalidate()
      })()
    },
    setList: (field, value) => {
      void (async () => {
        const i = eng.io()
        await i.set(PREF_LISTS, { ...parseLists(await i.get(PREF_LISTS)), [field]: value })
        i.invalidate()
      })()
    },
    closeReport: () => {
      void (async () => {
        const i = eng.io()
        await i.del(REPORT_KEY)
        i.invalidate()
      })()
    },
    openRunner: isOpen => {
      flags.paneView = isOpen ? 'runner' : flags.paneView === 'runner' ? 'cards' : flags.paneView
      eng.io().invalidate()
    },
    saySimpler: () => {
      if (simple.pending) return
      simple.pending = true
      eng.io().invalidate()
      void (async () => {
        const i = eng.io()
        simple.lines = await simpler(i, lastAnswer())
        simple.pending = false
        i.invalidate()
      })()
    },
    closeSimpler: () => {
      simple.lines = undefined
      eng.io().invalidate()
    },
    setScope: scope => {
      flags.settingsScope = scope
      eng.io().invalidate()
    },
    setRolesScope: scope => {
      flags.rolesScope = scope
      eng.io().invalidate()
    },
    setRoleModel: (key, value) => {
      void (async () => {
        const i = eng.io()
        const root = flags.rolesScope === 'project' ? await projectOf(i) : undefined
        if (flags.rolesScope === 'session') await writeSessionSetting(i, await i.sessionId(), key, value)
        else if (root !== undefined) await writeProjectSetting(i, root, key, value)
        else await writeSetting(i, key, value)
        if (isRoleKey(key)) await rolesChanged(eng.runnerOps())
        i.invalidate()
      })()
    },
    followForSession: () => {
      void (async () => {
        const i = eng.io()
        const sid = await i.sessionId()
        for (const r of ROLE_NAMES) await clearSessionSetting(i, sid, roleSettingKey(r))
        i.invalidate()
      })()
    },
    askReset: on => {
      flags.resetStep = on ? 'ask' : 'none'
      eng.io().invalidate()
    },
    askErase: on => {
      if (!on) {
        flags.eraseStep = 'none'
        flags.erasePreview = undefined
        eng.io().invalidate()
        return
      }
      void (async () => {
        const i = eng.io()
        flags.erasePreview = await erasePreview(i)
        flags.eraseStep = 'preview'
        i.invalidate()
      })()
    },
    eraseAll: () => {
      if (flags.eraseStep !== 'preview') return
      flags.eraseStep = 'none'
      void (async () => {
        const i = eng.io()
        flags.eraseDone = await eraseAll(i)
        flags.erasePreview = undefined
        flags.eraseStep = 'done'
        i.invalidate()
      })()
    },
    resetSettings: () => {
      void (async () => {
        const i = eng.io()
        const root = flags.settingsScope === 'project' ? await projectOf(i) : undefined
        if (root !== undefined) await clearProjectSetting(i, root)
        else await resetEverything(i)
        flags.resetStep = 'done'
        i.invalidate()
      })()
    },
    popOut: () => void popOutPress(eng),
    talk: talkActsOf(eng),
    fit: fitActsOf(eng),
    starting: startActsOf(eng),
  }
}
