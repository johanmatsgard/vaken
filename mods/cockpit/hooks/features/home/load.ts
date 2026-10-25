// The collector (this session's line in the shared record) and what a draw reads: the whole view for the pane, the few reads the band needs
import { releaseHeldToasts, toastHold } from '../../core/io'
import { HOST_NOTE_KEY, STRONG_KEYS, isExplicit, parseHostNote, warnReading } from '../../core/guardhost'
import type { Io } from '../../core/io'
import { checkNumber, hashOf, redrawIfChanged } from '../../core/redraw'
import { readNote } from '../../core/flush'
import { COUNTS_KEY, countsSince } from '../../core/counts'
import { QUIET_ASKED_KEY, parseAsked, quietAsk } from '../../core/whatis'
import { rowAge } from '../../core/agentboard'
import type { BoardRow } from '../../core/agentboard'
import { idleMem, loadBoard } from '../agentboard'
import { idleRows } from '../../core/agentboard'
import { loadOverlaps } from '../crew'
import { liveSamples, liveWhere } from '../cost'
import { leanMem } from '../../core/lean'
import { checkShown, loadRun } from '../orchestra'
import { loadStartCheck } from './starttask'
import { lastAnswer } from '../simple'
import { projectName, projectOf, readGlobalSettings, readProjectSet, readSessionSet } from '../../core/projects'
import { TEMPLATES_KEY, parseTemplates } from '../../core/orchestra'
import { REST_KEY, parseVerdict } from '../../core/compactrest'
import { readSettings, settingStoreKey } from '../../core/settings'
import { fixedIds, viewModeOf } from './viewset'
import { APP_USAGE_KEY, parseStoredUsage } from '../../core/appusage'
import { APP_SESSIONS_KEY, matchSession, parseStoredSessions } from '../../core/appsessions'
import { liveQuestions, relayOf } from '../../core/relay'
import type { RelayView } from '../../core/relay'
import { readBand } from '../../core/band'
import { focusBand, focusMem, isFocused } from '../../core/focus'
import { calmSignature, loadCalm } from '../calm'
import type { CalmView } from '../calm'
import { setLang } from '../../core/lang'
import { backFactsOf } from './back'
import { welcomeDue } from '../../core/backcard'
import { contextFactsOf, loadBriefMarks, loadContext } from './context'
import { loadPreview, previewFactsOf } from './preview'
import { lastPicture } from '../../core/previewcard'
import { loadSetup, setupFactsOf } from './setup'
import { doFactsOf } from './dorow'
import { doSignature } from '../../core/phonedo'
import { safetyFactsOf } from './safety'
import { announceNew, autoHiddenCards } from './appear'
import { lineCard } from './linecards'
import { cardLouds } from './loud'
import { SKILLS_COUNTS_KEY, SKILLS_LISTING_KEY, parseListing } from '../../core/skills'
import { LAPTOP_KEY, keepMemory } from '../../core/crewlaptop'
import type { Laptop } from '../../core/crewlaptop'
import { HISTORY_KEY as RUN_HISTORY_KEY, REPORT_KEY, freshReports, parseReports } from '../../core/overnight'
import { haltKey, haltMem, parseHalt } from '../../core/guard'
import { readState, stateKey } from '../../core/proof'
import { LEDGER_KEY, compacting, readLog } from '../compaction'
import { livePicks } from '../../core/actions'
import type { Action } from '../../core/actions'
import { hashText, loadIndex, markKey as undoMarkKey, namedKey, parseNamed, sinceWants } from '../../core/undo'
import type { Checkpoint } from '../../core/safetycard'
import { inboxForPane } from '../inbox'
import { heldNeedsCount, isOpenHold } from '../../core/inbox'
import type { PrRow, PrsFacts } from '../../core/prcard'
import { newsCount, newsFactsOf } from './needs'
import type { InboxItem } from '../../core/inbox'
import type { Entry } from '../../core/ledger'
import { loadPrs, prsSignature, shipShownNow } from './cards/prs'
import { fitSignature } from './modelfit'
import type { Row } from './logic'
import { HISTORY_KEY, parseHistory } from '../../core/pace'
import { alivePids, label, listRecords, listRecordsLight, putRecord, readRecord } from '../../core/record'
import { doneNow } from '../../core/sessionfacts'
import { readWatches } from '../../core/watch'
import type { SessionRecord } from '../../core/record'
import { hasSavedOrder, readLayouts, readOrderSet, sameLayout, seedRecipes, snapshot } from './layouts'
import { CARD_IDS, ageWord, allOthers, bandWord, buildView, cacheTtlMs, hereLines, homeText, needsBandWord, parseDetail, parseMarks, parseOpenDetail, postedBandWord, shareOf, withoutHidden } from './logic'
import type { CardId, Detail, View } from './logic'
import { THEME_ACCENTS, look } from '../../ui/tokens'
import { SETUP_OPEN_KEY, SETUP_STATE_KEY } from './firstsetup'
import { SETTINGS_UNDO_KEY, parseUndo, undoFresh } from '../../core/settingsundo'
import { FIRST_RUN_KEY, PREF_AGENTS_ALL, PREF_AGENTS_OPEN, PREF_LISTS, PREF_MARKS, PREF_OTHERS_ALL, PREF_OTHERS_OPEN, parseLists } from './prefs'
import type { ListPrefs, Prefs } from './prefs'
import { briefShown, compactAsk, flags, langOf, settleCompactAsk, simple, undoShown } from './state'
import { NEEDS_CALM_OPEN, withOpenCards } from '../../core/headline'
import { extraOf } from './compactwhy'
import { talkSignature } from './talk'
import { selfCostSignature } from '../../core/selfcost'
import { askShown, offersSignature } from '../../core/allowrules'
import type { AskView } from '../../core/allowrules'
import { stopSignature } from '../../core/allowonce'
import { wordSystemNow } from '../../core/syswords'

export type Local = { id: string; pid?: number; branch?: string; title?: string; cwd: string; isEnded: boolean; isWatched: boolean }
export const collector: { local: Local | undefined } = { local: undefined }

export async function ensure(i: Io, cwd?: string): Promise<Local> {
  const id = await i.sessionId()
  if (collector.local !== undefined && collector.local.id === id) return collector.local
  const prev = collector.local
  const local: Local = { id, pid: prev?.pid, branch: prev?.branch, title: prev?.title, cwd: cwd ?? prev?.cwd ?? '', isEnded: false, isWatched: prev?.isWatched ?? true }
  collector.local = local
  // Windows has no `sh`
  if (local.pid === undefined && wordSystemNow() !== 'win32') {
    try {
      const r = await i.run(['sh', '-c', 'echo $PPID'], { timeoutMs: 3000 })
      const n = Number(r.stdout.trim())
      if (r.exitCode === 0 && Number.isInteger(n) && n > 1) local.pid = n
    } catch {
    }
  }
  if (local.branch === undefined) {
    try {
      const r = await i.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 3000 })
      if (r.exitCode === 0 && r.stdout.trim() !== '') local.branch = label(r.stdout.trim(), 80)
    } catch {
    }
  }
  return local
}

export async function write(i: Io, patch: Partial<SessionRecord>, isEvent = true, isBeat = false): Promise<void> {
  const l = await ensure(i)
  if (l.isEnded) return
  await putRecord(i, { cwd: l.cwd, branch: l.branch, title: l.title, pid: l.pid, ...patch, sessionId: l.id }, isEvent, isBeat)
}

export async function donePatch(i: Io, withPr: boolean): Promise<Partial<SessionRecord>> {
  try {
    const l = await ensure(i)
    const done = await doneNow(i, (await readRecord(i, l.id))?.done, withPr)
    return done === undefined ? {} : { done }
  } catch {
    return {}
  }
}

// The collector never breaks the session, and redraws only when something on screen would look different.
export async function collect(io: () => Io, patch: Partial<SessionRecord>, isEvent = true): Promise<void> {
  try {
    await write(io(), patch, isEvent)
    await redrawIfChanged(io())
  } catch {
  }
}

// The main loop's tools that have not ended. Kept in memory; the heartbeat saves the start once a tool runs long, so a quick tool writes nothing more.
const busy: { count: number; since?: number; saved: boolean } = { count: 0, saved: false }
export function busyStart(now: number): void {
  if (busy.count === 0) busy.since = now
  busy.count += 1
}
export function busyEnd(): Partial<SessionRecord> {
  busy.count = Math.max(0, busy.count - 1)
  return busy.count === 0 ? busyReset() : {}
}
// A turn's start and end: a tool whose end was never seen stops counting.
export function busyReset(): Partial<SessionRecord> {
  busy.count = 0
  busy.since = undefined
  if (!busy.saved) return {}
  busy.saved = false
  return { busySince: undefined }
}
export function busyBeat(): Partial<SessionRecord> {
  if (busy.since === undefined) return {}
  busy.saved = true
  return { busySince: busy.since }
}

// Clears an ask only when it came from the same place: the main loop, or that one agent.
export async function askClear(i: Io, agentId: string | undefined): Promise<Partial<SessionRecord>> {
  const l = await ensure(i)
  const ask = (await readRecord(i, l.id))?.ask
  return ask !== undefined && ask.agentId === agentId ? { ask: undefined } : {}
}

const UNDO_LOOK_MS = 15_000
const UNDO_LOOK_MAX = 20
let undoLook: { key: string; at: number; n: number } | undefined
async function undoCopies(i: Io, sid: string, shown: boolean): Promise<number> {
  try {
    if (!shown) return 0
    // With no such copy the answer is 0 whatever the mark says, so the mark is not read.
    const idx = await loadIndex(i, sid)
    if (!idx.snaps.some(s => s.kind === 'saved')) return 0
    const mark = await readNote(i, undoMarkKey(sid))
    const wants = sinceWants(idx, typeof mark === 'number' ? mark : 0).filter(w => idx.snaps.find(s => s.id === w.snap)?.kind === 'saved')
    const key = `${sid}|${wants.map(w => w.snap).join(',')}`
    if (undoLook !== undefined && undoLook.key === key && (await i.now()) - undoLook.at < UNDO_LOOK_MS) return undoLook.n
    let differ = 0
    for (const [k, w] of wants.entries()) {
      const snap = idx.snaps.find(s => s.id === w.snap)
      const now = k < UNDO_LOOK_MAX ? await i.read(w.path).then(t => t, () => undefined) : undefined
      if (snap === undefined || k >= UNDO_LOOK_MAX || now === undefined || hashText(now) !== snap.hash) differ += 1
    }
    undoLook = { key, at: await i.now(), n: differ }
    return differ
  } catch {
    return 0
  }
}
async function namedCheckpoints(i: Io, sid: string, shown: boolean): Promise<Checkpoint[]> {
  try {
    return shown ? parseNamed(await i.get(namedKey(sid))).map(n => ({ name: n.name, at: n.at, files: n.items.length })) : []
  } catch {
    return []
  }
}

toastHold.on = () => flags.paneView !== 'cards' || flags.arranging
let openSeeded = false
export const forgetOpenSeed = (): void => {
  openSeeded = false
}
export function seedOpenCards(lists: ListPrefs): void {
  if (openSeeded) return
  openSeeded = true
  if (lists.open === undefined) return
  flags.openSections = withOpenCards(flags.openSections, lists.open)
  if (lists.open.includes('needs') && flags.openWhat === undefined) flags.openWhat = NEEDS_CALM_OPEN
}

// Settings, Help and the Agents view draw no card (home/pane.tsx)
// Settings, Help and the runner read no calm note; only whether Quiet is on (kept in memory, no store read), for the Quiet press in Settings > Notices
const leanCalm = (now: number): CalmView => (isFocused(focusMem.focus, now) && focusMem.focus !== undefined ? { open: [], more: 0, focus: focusMem.focus } : { open: [], more: 0 })
const cardless = (): boolean => flags.paneView === 'settings' || flags.paneView === 'help' || flags.paneView === 'runner'

export async function loadView(i: Io, forPane = false): Promise<{ view: View; now: number; detail: Detail; prefs: Prefs }> {
  const lean = forPane && cardless()
  const runner = flags.paneView === 'runner'
  const now = await i.now()
  releaseHeldToasts()
  settleCompactAsk(now)
  const records = await listRecords(i)
  const alive = await alivePids(i, records)
  const values = await readSettings(i)
  look.accent = THEME_ACCENTS[values['look.theme']] ?? THEME_ACCENTS.native
  look.motion = values['look.motion'] !== 'reduced'
  setLang(langOf(values['look.language'], flags.macLang))
  const detail = parseDetail(values.detail)
  // The view (core/settings.ts look.view): a person who arranged cards before it existed and never chose a view starts on Custom
  if ((await i.get(settingStoreKey('look.view'))) === undefined && (await hasSavedOrder(i))) values['look.view'] = 'custom'
  const mode = viewModeOf(values)
  const fixed = fixedIds(mode)
  const hidden = fixed !== undefined ? CARD_IDS.filter(id => !fixed.includes(id)) : CARD_IDS.filter(id => values[`cards.${id}`] === 'hide')
  const marks = parseMarks(await i.get(PREF_MARKS))
  const sid = await i.sessionId()
  const raw = buildView(records, now, sid, alive, parseStoredUsage(await i.get(APP_USAGE_KEY)), parseHistory(await i.get(HISTORY_KEY)), parseStoredSessions(await i.get(APP_SESSIONS_KEY)))
  const ledger = await readLog(i, LEDGER_KEY)
  const todayCounts = countsSince(await i.get(COUNTS_KEY), now)
  const shown = withoutHidden(raw, marks)
  const view: View = { ...shown.view, ledger, counts: todayCounts, band: focusBand(await readBand(i), focusMem.focus, now), ...askOf(now), ...(await relayFor(i, raw, sid, now)), firstRun: (await i.get(FIRST_RUN_KEY)) !== 'done' }
  const hiddenCount = shown.hiddenCount
  const { orders, lists: columnLists } = await readOrderSet(i)
  await seedRecipes(i)
  const layouts = await readLayouts(i)
  const here = snapshot(values, orders, columnLists)
  const asked = parseAsked(await i.get(QUIET_ASKED_KEY))
  const quiet = quietAsk(todayCounts, values, asked, now)
  const agentFrom: Record<string, string> = Object.fromEntries([...raw.needs, ...allOthers(raw)].map(r => [r.rec.sessionId.slice(0, 8), r.name]))
  agentFrom[sid.slice(0, 8)] = 'This session'
  const orch = await loadRun(i)
  const root = await projectOf(i)
  const project = root === undefined ? undefined : { root, name: projectName(root), set: await readProjectSet(i, root) }
  const kept = values['laptop.mode'] === 'on' && !hidden.includes('computer') && !lean ? ((await i.get(LAPTOP_KEY)) as Laptop | undefined) : undefined
  const readLaptop = typeof kept === 'object' && kept !== null && typeof kept.at === 'number' ? kept : undefined
  const laptop = readLaptop === undefined ? undefined : keepMemory(readLaptop, goodLaptop)
  // Only a reading that carried its OWN memory share becomes the good one
  if (readLaptop?.freeShare !== undefined && (goodLaptop === undefined || readLaptop.at >= goodLaptop.at)) goodLaptop = readLaptop
  const skills = hidden.includes('skills') || lean ? undefined : { counts: await i.get(SKILLS_COUNTS_KEY), listing: parseListing(await i.get(SKILLS_LISTING_KEY)) }
  const reportId = lean ? undefined : await i.get(REPORT_KEY)
  const reports = typeof reportId === 'string' || runner ? freshReports(parseReports(await i.get(RUN_HISTORY_KEY)), now) : []
  const report = typeof reportId === 'string' ? reports.find(r => r.id === reportId) : undefined
  // Needs you shows all that waits: the inbox of every session
  const proof = readState(await readNote(i, stateKey(sid)))
  const { items: inbox, rows, halted } = await inboxOf(i, raw, values, now, sid, ledger, proof)
  view.held = heldNeedsCount(inbox)
  heldMem = view.held
  const waits = halted ? 'halt' : inbox.some(it => it.here && isOpenHold(it)) ? 'hold' : undefined
  if (waits !== undefined) view.hereWaits = waits
  const undoFiles = await undoCopies(i, sid, !hidden.includes('safety') && !lean)
  const checkpoints = await namedCheckpoints(i, sid, !hidden.includes('safety') && !lean)
  const prMe = { id: sid, cwd: collector.local?.cwd ?? '', ...(collector.local?.branch === undefined ? {} : { branch: collector.local.branch }) }
  const { prs, myPr } = await prsAndMine(i, hidden, values, prMe, rows, now)
  const hereCwd = collector.local?.cwd || raw.here?.rec.cwd || ''
  const context = await loadContext(i, hidden.includes('context') || lean, hereCwd, root ?? hereCwd, now)
  // The note row's marks from facts already read, no program run; after the press the opened marks are counted (features/home/context.ts)
  const briefLoaded = briefShown.marks ?? loadBriefMarks(hidden.includes('context') || lean || values['brief.mode'] === 'off', hereCwd, proof, collector.local?.branch || raw.here?.rec.branch, now)
  // The card is shown where a dev server answers or a screen file was edited in this session
  const devServer = await loadPreview(i, hidden.includes('preview') || lean, now, root ?? (hereCwd === '' ? undefined : hereCwd))
  const setup = await loadSetup(i, hidden.includes('setup') || lean, values, root ?? (hereCwd === '' ? undefined : hereCwd), now)
  const startCheck = lean && !runner ? undefined : await loadStartCheck(i, orch, proof, values, now)
  // What the Guard card says when every rule is Warn (core/guardhost.ts): the host view noted for this session
  const hostNote = lean ? undefined : parseHostNote(await i.get(HOST_NOTE_KEY))
  // Which of the two rows the person chose themselves (Settings words the others as the default: "Warn (stops in auto mode)")
  const guardExplicit = lean ? undefined : (await Promise.all(STRONG_KEYS.map(async k => ((await isExplicit(i, k)) ? k : '')))).filter(k => k !== '')
  const guardChosen = guardExplicit !== undefined && guardExplicit.length > 0
  const guardWarn = lean ? undefined : warnReading(hostNote?.sid === sid ? hostNote.view : undefined, guardChosen)
  const lists = parseLists(await i.get(PREF_LISTS))
  seedOpenCards(lists)
  // The first-start setup: its place, read only while the Start here card shows (features/home/firstsetup.ts); the card is drawn in the cards view only
  const setupOpen = flags.paneView === 'cards' && (await i.get(SETUP_OPEN_KEY)) === 'on'
  const setupRaw = view.firstRun === true || setupOpen ? await i.get(SETUP_STATE_KEY) : undefined
  // Settings > Mode's Undo: read only while Settings is open
  const undoKept = flags.paneView === 'settings' ? parseUndo(await i.get(SETTINGS_UNDO_KEY)) : undefined
  const settingsUndo = undoFresh(undoKept, now) ? { what: undoKept.what, at: undoKept.at } : undefined
  // Same-file warning and teammates that wait: paths, names and times only
  const overlaps = lean || values['crew.collide'] === 'off' ? [] : await loadOverlaps(i, records, sid, now, id => agentFrom[id.slice(0, 8)])
  const idle = lean || values['agents.board'] === 'off' ? [] : idleRows(idleMem.idle, now)
  const drawn: Prefs = {
    ...(overlaps.length === 0 ? {} : { overlaps }),
    ...(idle.length === 0 ? {} : { idle }),
    guardWarn,
    ...(guardExplicit === undefined ? {} : { guardExplicit }),
    setupOpen,
    ...(settingsUndo === undefined ? {} : { settingsUndo }),
    ...(setupRaw === undefined ? {} : { setupRaw }),
    watching: lean ? [] : Object.keys(await readWatches(i)),
    inbox,
    undoFiles,
    ...(context === undefined ? {} : { context }),
    ...(devServer === undefined ? {} : { devServer }),
    ...(setup === undefined ? {} : { setup }),
    ...(startCheck === undefined ? {} : { startCheck }),
    ...(briefLoaded === undefined ? {} : { briefMarks: briefLoaded }),
    ...(undoShown.lines === undefined ? {} : { undoPreview: undoShown.lines }),
    ...(undoShown.of === undefined ? {} : { undoPreviewOf: undoShown.of }),
    checkpoints,
    lists,
    laptop,
    ...(skills === undefined ? {} : { skills }),
    report,
    history: runner ? reports : [],
    runner,
    templates: lean && !runner ? [] : Object.keys(parseTemplates(await i.get(TEMPLATES_KEY))),
    hasAnswer: lastAnswer() !== undefined,
    project,
    globalValues: await readGlobalSettings(i),
    settingsScope: project === undefined ? 'all' : flags.settingsScope,
    rolesScope: project === undefined && flags.rolesScope === 'project' ? 'all' : flags.rolesScope,
    sessionSet: runner ? await readSessionSet(i, sid) : {},
    run: orch,
    sid,
    rest: !lean && (values['compact.mode'] === 'watch' || values['compact.mode'] === 'auto') ? parseVerdict(await i.get(REST_KEY(sid))) : undefined,
    agentsOpen: (await i.get(PREF_AGENTS_OPEN)) !== 'off',
    agentsAll: (await i.get(PREF_AGENTS_ALL)) === 'on',
    agentFrom,
    open: flags.openWhat,
    openSections: flags.openSections,
    backAsk: flags.backAsk,
    quiet,
    startPreview: flags.startPreview,
    settingsFocus: flags.settingsFocus,
    bandList: flags.bandListOpen,
    agents: values['agents.board'] === 'off' || lean ? [] : await loadBoard(i),
    proof,
    halted,
    ledger,
    help: flags.paneView === 'help',
    guide: flags.paneView === 'guide',
    detail,
    othersOpen: (await i.get(PREF_OTHERS_OPEN)) !== 'off',
    othersAll: (await i.get(PREF_OTHERS_ALL)) === 'on',
    orders,
    columnLists,
    hidden,
    arrange: flags.arranging,
    settings: flags.paneView === 'settings',
    values,
    marks,
    allOthers: allOthers(raw),
    hiddenCount,
    cardDetail: Object.fromEntries(CARD_IDS.map(id => [id, values[`detail.${id}`] === 'inherit' ? parseOpenDetail(values.detail) : parseDetail(values[`detail.${id}`])])) as Record<CardId,
    Detail>,
    layouts,
    currentLayout: Object.keys(layouts).find(n => sameLayout(layouts[n], here)),
    calm: lean ? leanCalm(now) : await loadCalm(i, now),
    ...(prs === undefined ? {} : { prs }),
    ...(myPr === undefined ? {} : { myPr }),
    ...(shipShownNow() === undefined ? {} : { shipShown: shipShownNow() }),
  }
  // From facts already read: Where was I comes into Standard after a break with rows under Since you left, and the changed hidden list redraws the pane
  const placed: Prefs = mode === 'standard' && welcomeDue(backFactsOf(view, drawn)) ? { ...drawn, hidden: drawn.hidden.filter(id => id !== 'back') } : drawn
  const auto = fixed !== undefined ? [] : autoHiddenCards(view, placed)
  const visible: Prefs = auto.length === 0 ? placed : { ...placed, hidden: [...hidden, ...auto], autoHidden: auto }
  // The counted news rows of Needs you (this session's pause, failed pull request
  const news = newsFactsOf(visible, now)
  view.held = heldNeedsCount(inbox) + newsCount(news)
  heldMem = view.held
  newsMem = { rest: newsCount({ ...news, halted: false }) }
  const prefs: Prefs = { ...visible, lists: fixed !== undefined || lean ? visible.lists : await announceNew(i, view, visible, auto) }
  // This session's share of the 5-hour window: from facts already read (records, the agents board, this session's cost readings in memory)
  const share = shareOf(view, records, sid, prefs.agents ?? [], liveSamples(sid))
  if (share !== undefined) view.share = share
  return { view, now, detail, prefs }
}

// Where it went (the Plan limits card): its leading cause, its figure and whether it clearly leads
const whereSignature = (p: Prefs): string => {
  const w = liveWhere(p.sid)
  return w === undefined ? '' : `${w.top}${Math.round(w.pct)}${w.clear}${w.bigReads}${leanMem.mode}`
}

// The look is the pane's shared one (features/inbox.ts inboxForPane, kept 15 s)
let heldMem = 0
// From the last full load: whether the Safety card is left out (it has no Auto, so the view decides it)
let newsMem = { rest: 0 }
let goodLaptop: Laptop | undefined
async function inboxOf(i: Io, raw: View, values: Record<string, string>, now: number, sid: string, ledger: Entry[], proof: ReturnType<typeof readState>): Promise<{ items: InboxItem[]; rows: Row[]; halted: boolean }> {
  const halted = parseHalt(await i.get(haltKey(sid))) !== undefined
  haltMem.held = halted
  const rows = [raw.here, ...raw.needs, ...raw.working, ...raw.waiting, ...raw.idle].filter((r): r is Row => r !== undefined)
  return { items: values['inbox.mode'] === 'off' ? [] : await inboxForPane(i, { now, sid, rows, ledger }, `${proof.debt}|${halted}`), rows, halted }
}

export async function prsAndMine(i: Io, hidden: readonly string[], values: Record<string, string>, me: { id: string; cwd: string; branch?: string }, rows: Row[], now: number): Promise<{ prs?: PrsFacts; myPr?: PrRow }> {
  const prs = await loadPrs(i, hidden.includes('prs'), values['crew.pr'] === 'on', me, rows, now, values['crew.worktrees'] !== 'off')
  const myPr = hidden.includes('prs') && hidden.includes('ship') && values['crew.pr'] === 'on' ? (await loadPrs(i, false, true, me, rows, now))?.rows.find(r => r.mine && r.checks === 'failing') : undefined
  return { ...(prs === undefined ? {} : { prs }), ...(myPr === undefined ? {} : { myPr }) }
}

let checkView: { check: number; load: ReturnType<typeof loadView> } | undefined
export function viewForCheck(i: Io): ReturnType<typeof loadView> {
  const check = checkNumber()
  if (checkView === undefined || checkView.check !== check) checkView = { check, load: loadView(i, true) }
  return checkView.load
}

let haltLooked = false
async function bandView(i: Io): Promise<{ view: View; detail: Detail }> {
  const now = await i.now()
  const records = await listRecordsLight(i)
  const alive = await alivePids(i, records)
  const values = await readSettings(i)
  // The plan chip reads the same blocks as the Plan limits card (the app's reading while fresh
  const raw = buildView(records, now, await i.sessionId(), alive, parseStoredUsage(await i.get(APP_USAGE_KEY)))
  const sid = await i.sessionId()
  if (!haltLooked) {
    haltLooked = true
    if (parseHalt(await i.get(haltKey(sid))) !== undefined) haltMem.held = true
  }
  const halted = haltMem.held
  if (heldMem > 0 || halted) {
    const { items } = await inboxOf(i, raw, values, now, sid, await readLog(i, LEDGER_KEY), readState(await readNote(i, stateKey(sid))))
    heldMem = heldNeedsCount(items) + newsMem.rest
  }
  // The pause counts apart, so a cleared pause leaves no held count that makes the next beat read the inbox again
  return { view: { ...raw, held: heldMem + (halted ? 1 : 0), band: focusBand(await readBand(i), focusMem.focus, now), ...askOf(now), ...(await relayFor(i, raw, sid, now)) }, detail: parseDetail(values.detail) }
}

// A tool's question that waits in another live session (core/relay.ts), named as the sidebar names it. The questions ride on the records already read;
// the app's list is read only while one waits. A hidden session still counts: the question waits on the person all the same.
async function relayFor(i: Io, raw: View, sid: string, now: number): Promise<{ relay?: RelayView }> {
  const rows = [...raw.needs, ...allOthers(raw)].filter(r => r.rec.sessionId !== sid && liveQuestions(r.rec.questions, now).length > 0)
  if (rows.length === 0) return {}
  const app = parseStoredSessions(await i.get(APP_SESSIONS_KEY))
  const askers = rows.map(r => {
    const a = matchSession(app, r.rec)
    return { sid: r.rec.sessionId, name: a !== undefined && a.title !== '' ? a.title : r.name, ...(r.rec.questions === undefined ? {} : { questions: r.rec.questions }), ...(a?.link === undefined ? {} : { link: a.link }), ...(a === undefined ? {} : { appId: a.id }) }
  })
  const relay = relayOf(askers, sid, now)
  return relay === undefined ? {} : { relay }
}

// The waiting "Allow?" question for the band (core/allowrules.ts), from memory
const askOf = (now: number): { ask?: AskView } => {
  const ask = askShown(now)
  return ask === undefined ? {} : { ask }
}

export async function bandSignatureForCheck(io: () => Io): Promise<string> {
  const { view, detail } = checkView !== undefined && checkView.check === checkNumber() ? await checkView.load : await bandView(io())
  return bandSignature(view, detail)
}

export const paneSignature = (view: View, p: Prefs): string =>
  hashOf(
    [
      `${JSON.stringify(p.overlaps ?? [])}`,
      `${JSON.stringify(p.idle ?? [])}`,
      `${(p.watching ?? []).join(',')}`,
      `${p.inbox.map(x => `${x.id}${x.count}${x.allowed}${x.since === undefined ? '' : ageWord((view.now ?? 0) - x.since)}`).join(',')}`,
      `${p.undoFiles}`,
      `${p.undoPreview?.join('/') ?? ''}`,
      `${JSON.stringify(p.lists)}`,
      `${p.laptop?.at ?? 0}`,
      `${skillsSignature(p, view.now ?? 0)}`,
      `${p.report?.id ?? ''}:${p.report?.endedAt ?? 0}`,
      `${p.history.length}`,
      `${p.detail}`,
      `${p.open ?? ''}`,
      `${p.quiet?.what ?? ''}:${p.quiet?.n ?? 0}`,
      `${p.startPreview ?? ''}`,
      `${p.settingsFocus ?? ''}`,
      `${p.bandList}`,
      `${JSON.stringify(view.band ?? [])}`,
      `${view.firstRun === true}`,
      `${(p.agents ?? []).map(a => `${a.id}${a.state}${a.usd ?? ''}${rowAge(a, view.now ?? 0)}`).join(',')}`,
      `${p.agentsOpen}`,
      `${p.agentsAll}`,
      `${p.rest?.at ?? 0}`,
      `${p.settingsScope}`,
      `${p.rolesScope}`,
      `${JSON.stringify(p.sessionSet)}`,
      `${p.runner}${p.templates.join('/')}`,
      `${p.hasAnswer}${simple.pending}${simple.lines?.join('/') ?? ''}`,
      `${JSON.stringify(p.project?.set ?? {})}`,
      `${p.run === undefined ? '' : `${p.run.status}${p.run.choices.atOnce}${p.run.tasks.map(t => `${t.state}${t.check}${t.kept ?? ''}${t.usd ?? ''}${t.startedAt === undefined ? '' : rowAge({ startedAt: t.startedAt, state: t.state === 'running' ? 'running' : 'done', endedAt: t.endedAt } as BoardRow, view.now ?? 0)}`).join(',')}`}`,
      `${CARD_IDS.map(id => p.cardDetail[id]).join(',')}`,
      `${p.othersOpen}`,
      `${p.othersAll}`,
      `${JSON.stringify(p.orders)}${JSON.stringify(p.columnLists ?? {})}`,
      `${p.hidden.join(',')}`,
      `${p.arrange}`,
      `${p.settings}`,
      `${p.help}`,
      `${p.guide === true}`,
      `${p.ledger.length}:${p.ledger[0]?.at ?? 0}`,
      `${JSON.stringify(p.marks)}`,
      `${p.hiddenCount}`,
      `${homeText(view)}`,
      `${JSON.stringify(cardLouds(view, p))}`,
      `${p.values['view.problems']}`,
      `${p.values['compact.from']}`,
      `${JSON.stringify(view.here?.rec.ctx ?? null)}`,
      `${(() => { const lines = hereLines(view.here, 'explained', cacheTtlMs(view.usage), view.now, p.values['compact.mode'] !== 'off', p.values['cache.keeper'] === 'on', extraOf(p)); return `${lines.advice?.join('/') ?? ''}|${lines.cache ?? ''}|${compacting.pending}|${compactAsk.lines?.join('/') ?? ''}` })()}`,
      `${talkSignature(view.now ?? 0)}`,
      `${calmSignature(p.calm, view.now ?? 0)}`,
      `${prsSignature(p.prs)}`,
      `${p.myPr === undefined ? '' : `${p.myPr.key}${p.myPr.number}${p.myPr.at}`}`,
      `${p.halted}`,
      `${shipSignature(p, view.now ?? 0, view.counts)}`,
      `${backSignature(view, p)}`,
      `${safetySignature(view, p)}`,
      `${contextSignature(view, p)}`,
      `${previewSignature(p)}`,
      `${setupSignature(p)}`,
      `${doCardSignature(p)}`,
      `${startSignature(p)}`,
      `${fitSignature(view, p.values)}`,
      `${selfCostSignature()}`,
      `${offersSignature()}`,
      `${stopSignature()}`,
      `${p.values.detail}`,
      `${view.share === undefined ? '' : `${Math.round(view.share.here)}:${Math.round(view.share.agents)}`}`,
      `${whereSignature(p)}`,
      `${p.openSections.join(',')}`,
      `${p.backAsk === true}`,
      `${p.setupOpen === true}`,
      `${p.settingsUndo?.what ?? ''}:${p.settingsUndo?.at ?? 0}`,
      `${JSON.stringify(p.setupRaw ?? null)}`,
    ].join('|'),
  )
const skillsSignature = (p: Prefs, now: number): string =>
  p.skills === undefined ? '' : `${(lineCard('skills', { now, ledger: [], halted: false, modes: {}, skills: p.skills }).groups ?? []).map(g => g.rows.map(r => `${r.title}${r.right ?? ''}`).join(',')).join('/')}|${p.skills.listing?.at ?? 0}`
const shipSignature = (p: Prefs, now: number, counts?: Record<string, number>): string =>
  `${lineCard('ship', { now, ledger: p.ledger, ...(counts === undefined ? {} : { counts }), halted: false, modes: {}, ...(p.proof === undefined ? {} : { proof: p.proof }), ...(p.prs === undefined ? {} : { prs: p.prs }) }).lines.join('/')}|${p.shipShown?.length ?? 0}`
const backSignature = (view: View, p: Prefs): string => {
  const v = lineCard('back', { now: view.now ?? 0, ledger: [], halted: false, modes: {}, back: backFactsOf(view, p) })
  return `${v.lines.join('/')}|${(v.groups ?? []).map(g => g.rows.map(r => `${r.key}:${r.title}`).join(',')).join('/')}`
}
const safetySignature = (view: View, p: Prefs): string => lineCard('safety', { now: view.now ?? 0, ledger: p.ledger, ...(view.counts === undefined ? {} : { counts: view.counts }), halted: p.halted, modes: {}, safety: safetyFactsOf(p) }).lines.join('/')
const contextSignature = (view: View, p: Prefs): string => `${lineCard('context', { now: view.now ?? 0, ledger: [], halted: false, modes: {}, context: contextFactsOf(view, p) }).lines.join('/')}|${p.briefMarks?.length ?? 0}|${p.rest?.at ?? 0}`
const startSignature = (p: Prefs): string => `${p.startCheck?.check.sig ?? ''}${p.startCheck?.forGoal === true ? 'g' : ''}${checkShown.sig ?? ''}|${p.proof?.goal?.text ?? ''}|${p.proof?.done.join(',') ?? ''}|${p.values['plan.first'] ?? ''}`
const doCardSignature = (p: Prefs): string => `${lineCard('do', { now: 0, ledger: [], halted: false, modes: {}, doc: doFactsOf(p) }).lines.join('/')}|${doSignature()}`
const setupSignature = (p: Prefs): string => `${lineCard('setup', { now: 0, ledger: [], halted: false, modes: {}, setup: setupFactsOf(p) }).lines.join('/')}|${p.open ?? ''}`
const previewSignature = (p: Prefs): string => `${lineCard('preview', { now: 0, ledger: [], halted: false, modes: {}, preview: previewFactsOf(p) }).lines.join('/')}|${lastPicture.now?.at ?? 0}`
// The next step buttons wait while a step waits for the person, the session is paused or it compacts.
export const nextActs = (view: View): Action[] => (view.hereWaits !== undefined || compacting.pending || haltMem.held ? [] : livePicks(view.now ?? 0))
export const bandSignature =(view: View, detail: Detail): string => hashOf(`${detail}|${bandWord(view, detail)}|${needsBandWord(view)}|${postedBandWord(view)}|${nextActs(view).map(a => a.id).join(',')}|${JSON.stringify(view.ask ?? null)}|${JSON.stringify(view.relay ?? null)}`)
