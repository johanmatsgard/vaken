// The typed ship steps: /vaken-ship check, /vaken-ship fix yes, /vaken-ship merge yes yes.
import { HALT_ON_SAID, haltIsOn } from '../core/guard'
import { PR_VIEW_ARGV, isNoPr, parsePrView, safeJson } from '../core/crewpr'
import type { Env } from '../core/guardjudge'
import { maskSecrets } from '../core/guardsecrets'
import type { Io } from '../core/io'
import { buildCiFix } from '../core/prcard'
import { readRecord } from '../core/record'
import { readSetting } from '../core/settings'
import { SS_T_FIX_FAILED, SS_T_FIX_FILLED, SS_T_FIX_SENT, SS_T_GH, SS_T_MERGE_DONE, SS_T_MERGE_FAILED, SS_WHAT_CHECK, SS_WHAT_FIX, SS_WHAT_MERGE, SS_WHAT_NOMERGE } from '../core/shipstepwords'
import { byEnglish } from '../i18n/table'
import {
  CHECK_SCRIPT, FIX_SCRIPT, SHIP_ERR_CHARS, SHIP_GH_MS, SHIP_MERGE_MS, badText, checkText, decideMerge, fixShowText, judgeStep, mergeArgv, mergeOneText, mergeRefusedText, mergeScript, mergeShowText, noGuardText, noPrText,
  parseShipStep, wrongPrText,
} from '../core/shipsteps'
import type { PrNow, Say } from '../core/shipsteps'
import { LEDGER_KEY, pushLog } from './compaction'
import { BY_PERSON_ONLY } from '../core/origin'
import { flags, langOf } from './home/state'

const fill = (s: string, v: Record<string, string | number>): string => Object.entries(v).reduce((acc, [k, x]) => acc.split(`{${k}}`).join(String(x)), s)

const sayOf = async (i: Io): Promise<Say> => {
  const lang = langOf(await readSetting(i, 'look.language'), flags.macLang)
  if (lang === 'en') return s => s
  const ix = byEnglish(lang)
  return s => ix[s] ?? s
}

export type StepDeps = { tell: (note: string) => boolean; shipLine: () => Promise<string>; byPerson: boolean }

type Gh = { code: number; out: string; err: string }
async function gh(i: Io, env: Env, argv: string[], timeoutMs: number): Promise<Gh | undefined> {
  try {
    const r = await i.run(argv, { cwd: env.cwd, timeoutMs })
    return { code: r.exitCode, out: r.stdout, err: r.stderr }
  } catch {
    return undefined
  }
}

type Pr = { kind: 'pr'; v: PrNow } | { kind: 'none' } | { kind: 'fail' }
async function fetchPr(i: Io, env: Env): Promise<Pr> {
  const r = await gh(i, env, [...PR_VIEW_ARGV], SHIP_GH_MS)
  if (r === undefined) return { kind: 'fail' }
  if (r.code !== 0) return isNoPr(r.err) ? { kind: 'none' } : { kind: 'fail' }
  const v = parsePrView(safeJson(r.out))
  return v === undefined ? { kind: 'fail' } : { kind: 'pr', v }
}

// A missed line must not lose the result.
async function ledger(i: Io, what: string, detail: string, did: boolean): Promise<void> {
  try {
    await pushLog(i, LEDGER_KEY, { at: await i.now(), session: await i.sessionId(), what, detail, how: 'typed', did })
  } catch {
  }
}

export const reasonOf = (text: string): string => (maskSecrets(text.trim()).split('\n')[0] ?? '').slice(0, SHIP_ERR_CHARS)

// Never throws a step that cannot run: it answers in words.
export async function shipStepText(i: Io, env: Env, args: string, deps: StepDeps): Promise<string | undefined> {
  const ask = parseShipStep(args)
  if (ask.kind === 'verdict') return undefined
  const t = await sayOf(i)
  if (ask.kind === 'bad') return badText(t)
  const { step, level } = ask

  if ((step === 'merge' || step === 'fix') && level > 0 && (await haltIsOn(k => i.get(k), await i.sessionId()))) return t(HALT_ON_SAID)

  const first = step === 'check' ? CHECK_SCRIPT : step === 'fix' ? FIX_SCRIPT : undefined
  if (first !== undefined) {
    const stop = await judgeStep(i, env, first, 'safe')
    if (stop !== undefined) return noGuardText(stop, t)
  }

  if (step === 'fix' && level > 0) {
    const built = await buildCiFix(i, async () => (await readRecord(i, await i.sessionId()))?.branch)
    if (built.kind !== 'prompt') return t(built.text)
    const sent = deps.tell(built.prompt)
    await ledger(i, SS_WHAT_FIX, sent ? built.head : 'could not be sent', sent)
    return sent ? `${fill(t(SS_T_FIX_SENT), { x: built.head })} ${t(SS_T_FIX_FILLED)}` : t(SS_T_FIX_FAILED)
  }

  const p = await fetchPr(i, env)
  if (p.kind === 'none') return noPrText(t)
  if (p.kind === 'fail') return t(SS_T_GH)
  const v = p.v

  if (step === 'check') {
    await ledger(i, SS_WHAT_CHECK, `PR ${v.number}`, false)
    let line: string | undefined
    try {
      line = await deps.shipLine()
    } catch {
      line = undefined
    }
    return checkText(v, await i.now(), t, line)
  }
  if (step === 'fix') return fixShowText(v, t)

  if (ask.n !== undefined && ask.n !== v.number) return wrongPrText(v.number, t)
  const d = decideMerge(v, level, t)
  if (d.kind === 'refused') {
    await ledger(i, SS_WHAT_NOMERGE, `PR ${v.number}: ${d.reasons[0] ?? ''}`, false)
    return mergeRefusedText(d.reasons, t)
  }
  const sha = v.head ?? ''
  const stop = await judgeStep(i, env, mergeScript(v.number, sha), 'risky')
  if (stop !== undefined) {
    await ledger(i, SS_WHAT_NOMERGE, `PR ${v.number}: the guard stopped it`, false)
    return noGuardText(stop, t)
  }
  if (d.kind === 'show') return mergeShowText(v.number, sha, t)
  if (d.kind === 'one') return mergeOneText(v.number, sha, t)
  if (!deps.byPerson) return t(BY_PERSON_ONLY)
  const r = await gh(i, env, mergeArgv(v.number, sha), SHIP_MERGE_MS)
  if (r !== undefined && r.code === 0) {
    await ledger(i, SS_WHAT_MERGE, `PR ${v.number}`, true)
    i.invalidate()
    return fill(t(SS_T_MERGE_DONE), { n: v.number })
  }
  const why = r === undefined ? 'no answer in time' : reasonOf(r.err === '' ? r.out : r.err)
  await ledger(i, SS_WHAT_NOMERGE, `PR ${v.number}: GitHub did not merge it`, false)
  return fill(t(SS_T_MERGE_FAILED), { n: v.number, x: why })
}
