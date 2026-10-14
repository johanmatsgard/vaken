// The text twins of the pane (/vaken-usage, /vaken-help, /vaken-compact, /vaken-settings): the same facts as words
import { diffKey, diffWords, filesFromMessages, previewWords } from '../../core/compactdiff'
import type { Diff } from '../../core/compactdiff'
import { REST_KEY, WOULD_WHAT, parseVerdict, restSection } from '../../core/compactrest'
import { compactLine } from '../../core/compactmoment'
import { lastAfterTokens } from '../../core/cachefacts'
import { FOLDED, HIDDEN } from '../../core/menu'
import { COMMAND_GROUPS, EVERYDAY_COMMANDS, GROUP_ABOUT } from '../../core/registry'
import { clearProjectSetting, clearSessionSetting, projectName, projectOf, projectText, readGlobalSettings, readProjectSet, readSessionSet, sessionText, writeProjectSetting, writeSessionSetting } from '../../core/projects'
import { SESSION_KEYS } from '../../core/models'
import { CARD_SETTINGS, cardSettingsText } from '../../core/cardsettings'
import { RESET_ASK, RESET_DONE } from '../../core/settingsmap'
import { findSetting, parseAsk, readSetting, readSettings, settingsText, writeSetting } from '../../core/settings'
import type { Ask } from '../../core/settings'
import { BY_PERSON_ONLY } from '../../core/origin'
import { LEDGER_KEY, logLines, readLog } from '../compaction'
import { isRoleKey, rolesChanged } from '../orchestra'
import { applyLayout, deleteLayout, readLayouts, saveLayout, seedRecipes, snapshot } from './layouts'
import { extraOf, whyNotNow } from './compactwhy'
import { cacheTtlMs, foldWords, hereLines, limitBlocks, limitLines } from './logic'
import type { HomeEngine } from './engine'
import { loadView } from './load'
import { resetEverything } from './prefs'
import { refreshContext, refreshSessions, refreshUsage } from './refresh'
import { HELP, helpFill } from './views/help'

export async function usageText(eng: HomeEngine): Promise<string> {
  const got = [await refreshUsage(eng, true), await refreshSessions(eng, true), await refreshContext(eng, true)]
  const status = got.every(g => g.startsWith('ok')) ? 'Read just now.' : 'Not everything could be read just now: ' + [...new Set(got.filter(g => !g.startsWith('ok')))].join('; ') + '.' // en-only: plain answer of a slash command (text twin)
  const { view } = await loadView(eng.io())
  const blocks = limitBlocks(view)
  const lines = limitLines(blocks, 'explained', view)
  const said = lines.groups.map(g => g.join(' '))
  const nLimits = lines.shown?.length ?? said.length
  return [...said.slice(0, nLimits), lines.folded === undefined ? '' : foldWords(lines.folded), ...said.slice(nLimits), lines.source, status].filter(l => l !== '').join('\n')
}

export function helpText(args: string, values?: Record<string, string>): string {
  const word = args.trim().toLowerCase()
  const all = word === 'all'
  const everyday = EVERYDAY_COMMANDS.map(e => `/${e.command}  ${e.words}`)
  const withWords = (c: string): string => `/${c}${(FOLDED[c] ?? []).length === 0 ? '' : ` [${(FOLDED[c] ?? []).join(' | ')}]`}`
  const groups = COMMAND_GROUPS.map(g => `${g.group} (${GROUP_ABOUT[g.group] ?? ''}): ${g.commands.map(withWords).join(' ')}`)
  if (word !== '' && !all) {
    const found = HELP.filter(item => `${item.title} ${item.text}`.toLowerCase().includes(word))
    return found.length === 0 ? `No help topic holds "${word}". All topics: /vaken-help all` : [`Help topics with "${word}"`, '', ...found.flatMap(item => [item.title, helpFill(item.text, values), ''])].join('\n').trimEnd()
  }
  const topics = HELP
  const body = all ? topics.flatMap(item => [item.title, helpFill(item.text, values), '']) : ['Topics: /vaken-help all, or /vaken-help <word> to find a topic', ...topics.map(item => `- ${item.title}`)] // en-only: plain answer of a slash command (text twin)
  return ['Commands', '', 'Every day:', ...everyday, '', 'By job (a word in brackets goes after the command):', ...groups, '', `Also in the pane, or with /vaken-help run <name>: ${HIDDEN.join(', ')}`, '', ...body].join('\n').trimEnd() // en-only: plain answer of a slash command (text twin)
}

export async function compactText(eng: HomeEngine, args = ''): Promise<string> {
  await refreshContext(eng, true)
  const { view, prefs } = await loadView(eng.io())
  const here = view.here
  if (args.trim().toLowerCase() === 'why') return whyNotNow(here, cacheTtlMs(view.usage), view.now, extraOf(prefs)) ?? 'Nothing to show yet. This appears after the first answer.'
  const advice = hereLines(here === undefined ? undefined : { ...here, kind: 'waiting' }, 'explained', cacheTtlMs(view.usage), view.now, true, false, extraOf(prefs))
  const said = (advice.advice === undefined ? ['No need to compact the session yet.'] : [...advice.advice, ...(advice.why === undefined ? [] : [advice.why])]).map(l => l.replace('Compact now.', 'Type /vaken-compact now to compact.')) // en-only: plain answer of a slash command (text twin)
  const done = logLines((await readLog(eng.io(), LEDGER_KEY)).filter(x => x.before !== undefined || x.what.startsWith('compaction')), 3)
  const kept = diffWords((await eng.io().get(diffKey(await eng.io().sessionId()))) as Diff | undefined)
  const ledger = done.length === 0 ? [] : ['', 'Last times the session was compacted:', ...done, ...(kept === '' ? [] : [kept])] // en-only: plain answer of a slash command (text twin)
  let preview: string[] = []
  try {
    const msgs = await eng.messages()
    preview = ['', previewWords({ messages: msgs.length, files: filesFromMessages(msgs), keepList: (await readSetting(eng.io(), 'compact.card')) === 'on', tokens: here?.rec.ctx?.tokens, after: lastAfterTokens(here?.rec.compacts) })]
  } catch {
    // no preview when the chat cannot be read
  }
  const all = await readLog(eng.io(), LEDGER_KEY)
  const restPart = restSection(await readSetting(eng.io(), 'compact.mode'), parseVerdict(await eng.io().get(REST_KEY(await eng.io().sessionId()))), all.filter(x => x.what === WOULD_WHAT), view.now ?? 0)
  return [...(advice.context === undefined ? [] : [advice.context]), ...(advice.used === undefined ? [] : [advice.used]), ...(advice.compact === undefined ? [] : [advice.compact]), ...(advice.cacheHit === undefined ? [] : [advice.cacheHit]), ...(advice.top === undefined ? [] : [advice.top]), ...said, '', 'To compact with a note of what to keep, paste:', compactLine({ title: here?.rec.title, branch: here?.rec.branch }), ...restPart, ...preview, ...ledger].join('\n') // en-only: plain answer of a slash command (text twin)
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
    if (isRoleKey(words[1])) await rolesChanged(eng.runnerOps())
    i.invalidate()
    const kept = (await readProjectSet(i, root))[words[1]]
    return `For this project (${projectName(root)}) only: ${words[1]} is ${findSetting(words[1])?.options.find(o => o.value === kept)?.label ?? words[2]}.`
  }
  if (words[0]?.toLowerCase() === 'session') {
    const sid = await i.sessionId()
    if (words.length === 2 && words[1].toLowerCase() === 'reset') {
      await clearSessionSetting(i, sid)
      i.invalidate()
      return 'This session follows the project again.' // en-only: plain answer of a slash command (text twin)
    }
    if (words.length !== 3) return `Use: /vaken-settings session KEY VALUE, or /vaken-settings session reset. Keys: ${SESSION_KEYS.join(', ')}.`
    if (!(await writeSessionSetting(i, sid, words[1], words[2]))) return `This session can keep only ${SESSION_KEYS.join(', ')}, each with one of its values. /vaken-settings all lists them.`
    if (isRoleKey(words[1])) await rolesChanged(eng.runnerOps())
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
    if (isRoleKey(ask.key)) await rolesChanged(eng.runnerOps())
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
      const r = await saveLayout(i, ask.name, snapshot(prefs.values, prefs.orders))
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
