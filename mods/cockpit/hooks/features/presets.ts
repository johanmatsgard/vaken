// Presets runtime: /vaken-settings preset lists them, shows what one would change, and applies it after "yes".
import type { EngineInterface, On } from 'claude-code'

import { tEn, tLine } from '../i18n/t'
import { postBand } from '../core/band'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { diffLines, listText, parseAsk, presetSteps, presetWhat } from '../core/presets'
import { findSetting } from '../core/settings'
import { keepUndo } from '../core/settingsundo'
import { applySteps, projectName, projectOf, readGlobalSettings, readProjectSet } from '../core/projects'
import { LEDGER_KEY, pushLog } from './compaction'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'
import { TIPS_KEPT_WHAT, upgradeTipDefaults } from '../core/tipsupgrade'
import { COST_KEPT_WHAT, installedBefore, upgradeCompactAuto, upgradeCostModes } from '../core/costupgrade'
import { upgradeFullHint, upgradeNotifyMode, upgradeQuietRows } from '../core/nextupgrade'

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

const label = (key: string): string => {
  const s = findSetting(key)
  return s === undefined ? key : `${s.group} > ${s.label}`
}
const valueLabel = (key: string, value: string): string => findSetting(key)?.options.find(o => o.value === value)?.label ?? value

export function registerPresets(on: On): void {
  on('session.start', { cwd: /(?<presets>)/ }, async ($, e, next) => {
    try {
      const i = io($)
      // Read before the steps below leave their marks, so a brand-new store is told from one from before
      const before = await installedBefore(i)
      const wrote = await upgradeTipDefaults(i)
      // One ledger line when it changed anything, so the history says why a row moved.
      if (Object.keys(wrote).length > 0) await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: TIPS_KEPT_WHAT, detail: Object.keys(wrote).map(k => findSetting(k)?.label ?? k).join(', '), how: 'auto', did: true })
      const moved = await upgradeCostModes(i)
      if (moved.length > 0) await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: COST_KEPT_WHAT, detail: moved.map(k => findSetting(k)?.label ?? k).join(', '), how: 'auto', did: true })
      await upgradeQuietRows(i)
      await upgradeFullHint(i)
      await upgradeNotifyMode(i)
      await upgradeCompactAuto(i, before)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-settings' }, async ($, e, next) => {
    const rest = subArgs(e.args, 'preset')
    if (rest === undefined) return next(e)
    const i = io($)
    const words = rest.trim().split(/\s+/).filter(w => w !== '')
    const forHere = words.some(w => w.toLowerCase() === 'here')
    const ask = parseAsk(words.filter(w => w.toLowerCase() !== 'here').join(' '))
    if (ask.kind === 'list') return { text: listText() }
    if (ask.kind === 'bad') return { text: ask.why }
    // Applying a preset changes settings, the guard's among them, so only the person may type it.
    if (ask.kind === 'apply' && !byPerson(e.origin)) return { text: BY_PERSON_ONLY }
    const root = forHere ? await projectOf(i) : undefined
    if (forHere && root === undefined) return { text: 'This session has no project folder. Leave out "here" to apply it to all projects.' }
    const where = root === undefined ? '' : ` for this project (${projectName(root)}) only`
    // Compared with what the apply writes: All projects alone
    const current = root === undefined ? await readGlobalSettings(i) : { ...(await readGlobalSettings(i)), ...(await readProjectSet(i, root)) }
    const changes = diffLines(ask.preset, current, label, valueLabel, key => findSetting(key)?.default ?? '')
    // Answers name the preset by its plain title; the id is only the word to type.
    const title = ask.preset.title
    if (ask.kind === 'show') return { text: changes.length === 0 ? `${title}: nothing would change${where}; your choices already match.` : [`${title} (${ask.preset.name}): ${ask.preset.about}`, `It would change${where}:`, ...changes, '', `To apply${where}: /vaken-settings preset ${ask.preset.name} yes${forHere ? ' here' : ''}`].join('\n') }
    // Settings > Mode offers Undo for the rows a typed preset writes, as for a mode press
    if (changes.length > 0) await keepUndo(i, ask.preset.name, presetSteps(ask.preset).map(st => st.key), root)
    await applySteps(i, presetSteps(ask.preset), root)
    await i.set('cockpit:firstrun', 'done')
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: presetWhat(title), detail: `${tEn('words.choice', { n: changes.length })} changed.`, how: 'typed', did: true })
    await postBand(i, 'info', 'preset', tLine('band.preset_name', { preset: title }), 5 * 60_000)
    i.invalidate()
    return { text: `Applied ${title}${where}: ${tEn('words.choice', { n: changes.length })} changed. A new session picks up tools and prompts; guards work at once.` }
  })
}
