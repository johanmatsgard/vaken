// /vaken-help run do: run a command from Claude's last answer, typed on a phone or pressed on a card.
import type { EngineInterface, On } from 'claude-code'

import { tr } from '../core/lang'
import { HALT_ON_SAID, haltIsOn } from '../core/guard'
import { DO_RAN_WHAT, DO_T_TELL_FAILED, DO_T_TOLD } from '../core/dowords'
import { bindFs } from '../core/fileops'
import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import { bindPlatform, platformOfIo } from '../core/procs'
import { shellArgv } from '../core/shellrun'
import type { Io } from '../core/io'
import type { Env } from '../core/guardjudge'
import { DO_TIMEOUT_MS, badText, blockedText, changedText, cutOutput, doBlocks, doMem, doModeOf, findBlocks, judgeBlocks, judgeScript, listText, needYesText, noSuchText, noneText, offText, parseDo, ranText, setDoBlocks, showText, tellNote } from '../core/phonedo'
import type { DoBlock, DoShown, Say } from '../core/phonedo'
import { readSetting } from '../core/settings'
import { byEnglish } from '../i18n/table'
import { sysWord } from '../core/syswords'
import { LEDGER_KEY, pushLog } from './compaction'
import { flags, langOf } from './home/state'
import { subArgs } from '../core/menu'
import { BY_PERSON_ONLY, byPerson } from '../core/origin'

// IO-BLOCK-START
function ioBase($: EngineInterface): Io {
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

// The runtime's file calls are bound too (closures only)
function io($: EngineInterface): Io {
  const made = bindFs(ioBase($), {
    stat: path => $.fs.stat(path),
    list: path => $.fs.list(path),
    readBytes: async path => await $.fs.read(path, { as: 'bytes' }),
  })
  return bindPlatform(made, () => $.env.get('OS'))
}

export type DoOutcome =
  | { kind: 'off' }
  | { kind: 'halted' }
  | { kind: 'none'; n: number }
  | { kind: 'show'; block: DoBlock }
  | { kind: 'blocked'; block: DoBlock }
  | { kind: 'needyes'; block: DoBlock }
  | { kind: 'changed'; block: DoBlock }
  | { kind: 'ran'; block: DoBlock; shown: DoShown; cut: boolean }

// Never throws.
export async function noteAnswerBlocks(i: Io, envLater: () => Promise<Env>, answer: string): Promise<void> {
  try {
    if (doModeOf(await readSetting(i, 'do.mode')) === 'off') {
      if (doBlocks().length > 0) setDoBlocks([])
      return
    }
    const sys = await platformOfIo(i)
    const dropped = { n: 0 }
    const raws = findBlocks(answer, sys, dropped)
    const before = doBlocks()
    const blocks = raws.length === 0 ? [] : await judgeBlocks(i, await envLater(), raws, sys)
    setDoBlocks(blocks, dropped.n)
    if (blocks.length > 0 || before.length > 0) i.invalidate()
  } catch {
  }
}

// The guard's judge looks again first, so the verdict is the one of this moment.
export async function runBlock(i: Io, env: Env, n: number, level: 0 | 1 | 2, how: 'typed' | 'button', pin?: string): Promise<DoOutcome> {
  if (doModeOf(await readSetting(i, 'do.mode')) === 'off') return { kind: 'off' }
  if (level > 0 && (await haltIsOn(k => i.get(k), await i.sessionId()))) return { kind: 'halted' }
  const found = doBlocks().find(b => b.n === n)
  if (found === undefined) return { kind: 'none', n }
  const sys = await platformOfIo(i)
  const fresh = await judgeScript(i, env, found.script, found.outside, sys)
  const block: DoBlock = { ...found, verdict: fresh.verdict, why: fresh.why }
  if (block.verdict !== found.verdict) doMem.blocks = doMem.blocks.map(b => (b === found ? block : b))
  if (pin !== undefined && pin !== block.script) return { kind: 'changed', block }
  if (block.verdict === 'blocked') return { kind: 'blocked', block }
  if (level === 0) return { kind: 'show', block }
  if (block.verdict === 'risky' && level < 2) return { kind: 'needyes', block }
  const start = await i.now()
  let exit: number | 'timeout' | 'failed' = 'failed'
  let text = ''
  try {
    const r = await i.run(shellArgv(sys, block.script), { cwd: env.cwd, timeoutMs: DO_TIMEOUT_MS })
    exit = r.exitCode
    text = `${r.stdout}${r.stderr === '' || r.stdout === '' || r.stdout.endsWith('\n') ? '' : '\n'}${r.stderr}`
  } catch {
    // A run that is cut off took its whole time; one that cannot start fails at once.
    exit = (await i.now()) - start >= DO_TIMEOUT_MS - 250 ? 'timeout' : 'failed'
  }
  const { lines, cut } = cutOutput(text)
  const shown: DoShown = { n, exit, lines, ...(cut ? { cut: true } : {}) }
  doMem.shown = shown
  try {
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what: DO_RAN_WHAT, detail: `Block ${n}: ${exit === 'timeout' ? 'stopped after the time limit' : exit === 'failed' ? 'could not start' : `exit ${exit}`}`, how, did: true })
  } catch {
    // a missed ledger line must not lose the result
  }
  i.invalidate()
  return { kind: 'ran', block, shown, cut }
}

const sayOf = async (i: Io): Promise<Say> => {
  const lang = langOf(await readSetting(i, 'look.language'), flags.macLang)
  if (lang === 'en') return s => sysWord(s)
  const ix = byEnglish(lang)
  return s => ix[sysWord(s)] ?? sysWord(s)
}

// `person`: the person typed it here (core/origin.ts byPerson); a yes from anywhere else runs nothing.
export async function doText(i: Io, env: Env, args: string, tell: (note: string) => boolean, person: boolean): Promise<string> {
  const t = await sayOf(i)
  if (doModeOf(await readSetting(i, 'do.mode')) === 'off') return offText(t)
  const ask = parseDo(args)
  if (ask.kind === 'bad') return badText(t)
  if (ask.kind === 'list') {
    if (doBlocks().length === 0) return noneText(t)
    doMem.seen = Object.fromEntries(doBlocks().map(b => [b.n, b.script]))
    return listText(doBlocks(), t)
  }
  // A yes after a look runs only the script that was looked at
  if (ask.level > 0 && (await haltIsOn(k => i.get(k), await i.sessionId()))) return t(HALT_ON_SAID)
  // A yes runs a block, so only the person may type it.
  if (ask.level > 0 && !person) return t(BY_PERSON_ONLY)
  const pin = ask.level === 0 || doMem.seen === undefined ? undefined : (doMem.seen[ask.n] ?? '')
  const o = await runBlock(i, env, ask.n, ask.level, 'typed', pin)
  if (o.kind === 'off') return offText(t)
  if (o.kind === 'halted') return t(HALT_ON_SAID)
  if (o.kind === 'none') return doBlocks().length === 0 ? noneText(t) : noSuchText(ask.n, t)
  if (o.kind === 'show' || o.kind === 'changed' || o.kind === 'blocked') doMem.seen = { ...(doMem.seen ?? {}), [o.block.n]: o.block.script }
  if (o.kind === 'changed') return changedText(o.block, t)
  if (o.kind === 'show') return showText(o.block, t)
  if (o.kind === 'blocked') return blockedText(o.block, t)
  if (o.kind === 'needyes') return needYesText(o.block.n, t)
  const said = ranText(o.block.n, o.shown.exit, o.shown.lines, o.cut, t)
  if (!ask.tell) return said
  const queued = tell(tellNote(o.block.n, o.block.first, o.shown.exit, o.shown.lines))
  return `${said}\n${t(queued ? DO_T_TOLD : DO_T_TELL_FAILED)}`
}

async function envOf($: EngineInterface): Promise<Env> {
  const homeVar = await $.env.get('HOME')
  const profile = await $.env.get('USERPROFILE')
  const drive = await $.env.get('HOMEDRIVE')
  const homePath = await $.env.get('HOMEPATH')
  const home = await homeFrom({ HOME: async () => homeVar, USERPROFILE: async () => profile, HOMEDRIVE: async () => drive, HOMEPATH: async () => homePath })
  const cwd = await $.session.cwd()
  const root = await $.session.root()
  return { home, cwd, root }
}

// The note goes to Claude as a message of the person in this session
function tellClaude($: EngineInterface, note: string): boolean {
  // The note holds a command's output, so it is put in the prompt box for the person to read and send with Enter
  const failed = (): void => $.ui.toast(tr(DO_T_TELL_FAILED))
  $.clock.after(1_500, () => {
    void (async () => {
      let filled
      try {
        const result = await $.prompt.fill({ text: note, mode: 'append' })
        filled = result
      } catch {
        failed()
        return
      }
      if (!filled.isFilled) failed()
    })()
  })
  return true
}



export function registerPhoneDo(on: On): void {
  on('turn.complete', { turnId: /(?<phonedo>)/ }, async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined || e.reason !== 'answer' || e.answer.trim() === '') return r
    // Nothing here may throw or change the turn's own result: a failure only means no list this time.
    try {
      const i = io($)
      const env = await envOf($)
      const envLater = async (): Promise<Env> => env
      await noteAnswerBlocks(i, envLater, e.answer)
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e, next) => {
    const rest0 = subArgs(e.args, 'run', 'do')
    if (rest0 === undefined) return next(e)
    const i = io($)
    const env = await envOf($)
    const tell = (note: string): boolean => tellClaude($, note)
    return { text: await doText(i, env, rest0, tell, byPerson(e.origin)) }
  })
}
