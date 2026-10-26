// The text twins of the pane (/vaken-usage, /vaken-help, /vaken-compact, /vaken-settings): the same facts as words
import { diffKey, diffWords, filesFromMessages, previewWords } from '../../core/compactdiff'
import type { Diff } from '../../core/compactdiff'
import { REST_KEY, WOULD_WHAT, parseVerdict, restSection } from '../../core/compactrest'
import { compactLine } from '../../core/compactmoment'
import { lastAfterTokens } from '../../core/cachefacts'
import { FOLDED, HIDDEN, HIDDEN_ABOUT } from '../../core/menu'
import { COMMAND_GROUPS, EVERYDAY_COMMANDS } from '../../core/registry'
import { code } from '../../core/chatmd'
import { t, tr } from '../../core/lang'
import { clearProjectSetting, clearSessionSetting, projectName, projectOf, projectText, readGlobalSettings, readProjectSet, readSessionSet, sessionText, writeProjectSetting, writeSessionSetting } from '../../core/projects'
import { SESSION_KEYS } from '../../core/models'
import { CARD_SETTINGS, cardSettingsText } from '../../core/cardsettings'
import { RESET_ASK, RESET_DONE } from '../../core/settingsmap'
import { findSetting, parseAsk, readSetting, readSettings, settingsText, writeSetting } from '../../core/settings'
import type { Ask } from '../../core/settings'
import { BY_PERSON_ONLY } from '../../core/origin'
import { LEDGER_KEY, logLines, readLog } from '../compaction'
import { applyLayout, deleteLayout, readLayouts, saveLayout, seedRecipes, snapshot } from './layouts'
import { extraOf, whyNotNow } from './compactwhy'
import { cacheTtlMs, foldWords, hereLines, limitBlocks, limitLines } from './logic'
import type { HomeEngine } from './engine'
import { loadView } from './load'
import { resetEverything } from './prefs'
import { refreshContext, refreshSessions, refreshUsage } from './refresh'
import { HELP, helpFill, helpSteps } from './views/help'
import { LEAN_CUT_LINE, LEAN_REPEAT_LINE, cutsToday } from '../../core/lean'
import { fillIn } from '../../core/fillin'

export async function usageText(eng: HomeEngine): Promise<string> {
  const got = [await refreshUsage(eng, true), await refreshSessions(eng, true), await refreshContext(eng, true)]
  const status = got.every(g => g.startsWith('ok')) ? tr('Read just now.') : fillIn(tr('Not everything could be read just now: {list}.'), { list: [...new Set(got.filter(g => !g.startsWith('ok')))].join('; ') })
  const { view } = await loadView(eng.io())
  const blocks = limitBlocks(view)
  const lines = limitLines(blocks, 'explained', view, tr)
  const said = lines.groups.map(g => g.join(' '))
  const nLimits = lines.shown?.length ?? said.length
  const lean = cutsToday(await eng.io().now())
  const leanLine = lean.cuts === 0 ? '' : t(LEAN_CUT_LINE, { n: lean.cuts, m: lean.lines })
  const repeatLine = lean.repeats === 0 ? '' : t(LEAN_REPEAT_LINE, { n: lean.repeats, m: lean.chars })
  return [...said.slice(0, nLimits), lines.folded === undefined ? '' : foldWords(lines.folded, tr), ...said.slice(nLimits), leanLine, repeatLine, lines.source, status].filter(l => l !== '').join('\n')
}

// More matches than this show only their titles
const HELP_TITLES_ONLY = 5

// In the person's language and as markdown: each command once, in the group of its job, as a list line; a topic's title and text as the Help page says them
export function helpText(args: string, values?: Record<string, string>): string {
  const word = args.trim().toLowerCase()
  if (word === 'run') return [t('chat.help_run_head'), '', ...HIDDEN.map(h => `- ${code(`/vaken-help run ${h}`)}${HIDDEN_ABOUT[h] === undefined ? '' : `: ${tr(HIDDEN_ABOUT[h])}`}`)].join('\n')
  const read = (item: { title: string; text: string }): string[] => [`**${tr(item.title)}**`, '', helpSteps(helpFill(tr(item.text), values)).join('\n\n'), '']
  if (word === 'all') return HELP.flatMap(read).join('\n').trimEnd()
  if (word !== '') {
    const inTitle = HELP.filter(item => item.title.toLowerCase().includes(word) || tr(item.title).toLowerCase().includes(word))
    const found = inTitle.length > 0 ? inTitle : HELP.filter(item => item.text.toLowerCase().includes(word) || tr(item.text).toLowerCase().includes(word))
    if (found.length === 0) return t('chat.help_none', { word, all: code('/vaken-help all') })
    if (found.length > HELP_TITLES_ONLY) return [t('chat.help_found', { word }), '', ...found.map(item => `- ${tr(item.title)}`), '', t('chat.help_read_one')].join('\n')
    return [t('chat.help_found', { word }), '', ...found.flatMap(read)].join('\n').trimEnd()
  }
  const wordsOf = (c: string): string => ((FOLDED[c] ?? []).length === 0 ? '' : ` (${(FOLDED[c] ?? []).join(', ')})`)
  const about = (c: string): string => tr(EVERYDAY_COMMANDS.find(e => e.command === c)?.words ?? '')
  const groups = COMMAND_GROUPS.flatMap(g => [tr(g.group), ...g.commands.map(c => `- ${code(`/${c}`)}: ${about(c)}${wordsOf(c)}`), ''])
  return [t('chat.help_head', { example: code('/vaken-usage cost') }), '', ...groups, t('chat.help_more')].join('\n')
}

export async function compactText(eng: HomeEngine, args = ''): Promise<string> {
  await refreshContext(eng, true)
  const { view, prefs } = await loadView(eng.io())
  const here = view.here
  if (args.trim().toLowerCase() === 'why') return whyNotNow(here, cacheTtlMs(view.usage), view.now, prefs, tr) ?? tr('Nothing to show yet. This appears after the first answer. Send a message in the chat.')
  const advice = hereLines(here === undefined ? undefined : { ...here, kind: 'waiting' }, 'explained', cacheTtlMs(view.usage), view.now, true, false, extraOf(prefs), tr)
  // The chat has no Compact now button, so a line that ends by pointing at it points at the command
  const button = `${tr('Compact now')}.`
  const toCommand = tr('Type /vaken-compact now to compact.')
  const said = (advice.advice === undefined ? [tr('No need to compact the session yet.')] : [...advice.advice, ...(advice.why === undefined ? [] : [advice.why])]).map(l => (l.endsWith(button) ? `${l.slice(0, -button.length)}${toCommand}` : l))
  const done = logLines((await readLog(eng.io(), LEDGER_KEY)).filter(x => x.before !== undefined || x.what.startsWith('compaction')), 3)
  const kept = diffWords((await eng.io().get(diffKey(await eng.io().sessionId()))) as Diff | undefined, tr)
  const ledger = done.length === 0 ? [] : ['', tr('Last times the session was compacted:'), ...done, ...(kept === '' ? [] : [kept])]
  let preview: string[] = []
  try {
    const msgs = await eng.messages()
    preview = ['', previewWords({ messages: msgs.length, files: filesFromMessages(msgs), keepList: (await readSetting(eng.io(), 'compact.card')) === 'on', tokens: here?.rec.ctx?.tokens, after: lastAfterTokens(here?.rec.compacts) }, tr)]
  } catch {
    // no preview when the chat cannot be read
  }
  const all = await readLog(eng.io(), LEDGER_KEY)
  const restPart = restSection(await readSetting(eng.io(), 'compact.mode'), parseVerdict(await eng.io().get(REST_KEY(await eng.io().sessionId()))), all.filter(x => x.what === WOULD_WHAT), view.now ?? 0, tr)
  return [...(advice.context === undefined ? [] : [advice.context]), ...(advice.used === undefined ? [] : [advice.used]), ...(advice.compact === undefined ? [] : [advice.compact]), ...(advice.cacheHit === undefined ? [] : [advice.cacheHit]), ...(advice.top === undefined ? [] : [advice.top]), ...said, '', tr('To compact with a note of what to keep, paste:'), compactLine({ title: here?.rec.title, branch: here?.rec.branch }), ...restPart, ...preview, ...ledger].join('\n')
}

function writesSetting(words: string[], ask: Ask): boolean {
  const first = words[0]?.toLowerCase()
  if (first === 'here' || first === 'session') return words.length > 1
  if (first === 'card') return false
  return ask.kind === 'set' || ask.kind === 'layout' || (ask.kind === 'reset' && ask.yes === true)
}

// Every change needs that, because a setting can loosen the guard; listing stays open to all.
export async function settingsCommand(eng: HomeEngine, args: string, person: boolean): Promise<string> {
  const i = eng.io()
  const words = args.trim().split(/\s+/).filter(w => w !== '')
  if (!person && writesSetting(words, parseAsk(args))) return BY_PERSON_ONLY
  if (words[0]?.toLowerCase() === 'here') {
    const root = await projectOf(i)
    if (root === undefined) return 'This session has no project folder, so it follows All projects.'
    if (words.length === 2 && words[1].toLowerCase() === 'reset') {
      await clearProjectSetting(i, root)
      i.invalidate()
      return `This project (${projectName(root)}) follows All projects again.`
    }
    if (words.length !== 3) return 'Use: /vaken-settings here KEY VALUE, or /vaken-settings here reset'
    if (!(await writeProjectSetting(i, root, words[1], words[2]))) {
      const row = findSetting(words[1])
      return row === undefined ? `No setting named "${words[1]}". /vaken-settings all lists every key and its values.` : `No such choice: ${words[1]} ${words[2]}. ${words[1]} takes: ${row.options.map(o => o.value).join(', ')}.`
    }
    i.invalidate()
    const kept = (await readProjectSet(i, root))[words[1]]
    return `For this project (${projectName(root)}) only: ${words[1]} is ${findSetting(words[1])?.options.find(o => o.value === kept)?.label ?? words[2]}.`
  }
  if (words[0]?.toLowerCase() === 'session') {
    const sid = await i.sessionId()
    if (words.length === 2 && words[1].toLowerCase() === 'reset') {
      await clearSessionSetting(i, sid)
      i.invalidate()
      return 'This session follows the project again.' // en-only: /vaken-settings answer stays English by rule
    }
    if (words.length !== 3) return `Use: /vaken-settings session KEY VALUE, or /vaken-settings session reset. Keys: ${SESSION_KEYS.join(', ')}.`
    if (!(await writeSessionSetting(i, sid, words[1], words[2]))) return `This session can keep only ${SESSION_KEYS.join(', ')}, each with one of its values. /vaken-settings all lists them.`
    i.invalidate()
    return `For this session only: ${words[1]} is ${findSetting(words[1])?.options.find(o => o.value === words[2])?.label ?? words[2]}.`
  }
  if (words[0]?.toLowerCase() === 'card') return words.length === 2 ? cardSettingsText(words[1].toLowerCase(), await readGlobalSettings(i)) : `Use: /vaken-settings card ID. Cards: ${Object.keys(CARD_SETTINGS).join(', ')}.`
  const ask = parseAsk(args)
  if (ask.kind === 'bad') return ask.why
  let resetSaid = ''
  if (ask.kind === 'reset' && ask.yes !== true) return `${RESET_ASK} Type /vaken-settings reset yes to do it.`
  if (ask.kind === 'reset') {
    await resetEverything(i)
    i.invalidate()
    resetSaid = `${RESET_DONE}\n\n`
  }
  if (ask.kind === 'set') {
    const row = findSetting(ask.key)
    const before = (await readGlobalSettings(i))[ask.key]
    const root = await projectOf(i)
    const ownHere = root === undefined ? undefined : (await readProjectSet(i, root))[ask.key]
    const word = (v: string | undefined): string => row?.options.find(o => o.value === v)?.label ?? String(v)
    await writeSetting(i, ask.key, ask.value)
    i.invalidate()
    const gone = ask.old === undefined ? '' : `"${ask.old}" is gone, so it is now ${word(ask.value)}. `
    return `${gone}${ask.key}: ${word(ask.value)}${before === ask.value ? ' (it was already so)' : ` (was ${word(before)})`}, for all projects.${ownHere === undefined ? '' : ` This project keeps its own: ${word(ownHere)}.`} /vaken-settings lists the rest.`
  }
  if (ask.kind === 'layout') {
    await seedRecipes(i)
    const layouts = await readLayouts(i)
    const found = Object.keys(layouts).find(n => n.toLowerCase() === ask.name.toLowerCase())
    let say = ''
    if (ask.action === 'save') {
      const { prefs } = await loadView(i)
      const r = await saveLayout(i, ask.name, snapshot(prefs.values, prefs.orders, prefs.columnLists))
      say = r.why ?? `Saved the layout "${r.name}".`
    } else if (found === undefined) say = `No layout named "${ask.name}".`
    else if (ask.action === 'apply') {
      await applyLayout(i, found)
      say = `Applied the layout "${found}".`
    } else {
      await deleteLayout(i, found)
      say = `Deleted the layout "${found}".`
    }
    i.invalidate()
    return `${say}\n\n${settingsText(await readSettings(i), false, Object.keys(await readLayouts(i)))}`
  }
  const root = await projectOf(i)
  const own = root === undefined ? [] : projectText(root, await readProjectSet(i, root))
  const mine = sessionText(await readSessionSet(i, await i.sessionId()))
  return [resetSaid + settingsText(await readGlobalSettings(i), false, Object.keys(await readLayouts(i)), ask.kind === 'list' && ask.all === true), ...own, ...mine].join('\n')
}
