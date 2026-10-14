// The Commands from the last answer card's facts and presses (core/docard.ts).
import type { DoFacts, DoDo } from '../../core/docard'
import { doOpenKey } from '../../core/docard'
import { DO_SAID_BLOCKED, DO_SAID_FAILED, DO_SAID_GONE, DO_SAID_OFF, DO_SAID_RAN, DO_SAID_RAN_BAD, DO_SAID_TIMEOUT } from '../../core/dowords'
import { HALT_ON_SAID } from '../../core/guard'
import { tr } from '../../core/lang'
import { doBlocks, doMem, doModeOf } from '../../core/phonedo'
import { projectOf } from '../../core/projects'
import { runBlock } from '../phonedo'
import type { HomeEngine } from './engine'
import type { Prefs } from './prefs'
import { flags } from './state'

export function doFactsOf(prefs: Prefs): DoFacts {
  return { blocks: doBlocks(), ...(doMem.dropped === undefined ? {} : { dropped: doMem.dropped }), mode: doModeOf(prefs.values['do.mode']), ...(prefs.open === undefined ? {} : { open: prefs.open }), ...(doMem.shown === undefined ? {} : { shown: doMem.shown }) }
}

const fold = (): void => {
  flags.openWhat = undefined
  delete doMem.shown
}

const said = (text: string, n: number, c: string = ''): string => tr(text).split('{n}').join(String(n)).split('{c}').join(c)

// Never throws; the toast answers the press.
export async function runDoRow(eng: HomeEngine, a: DoDo): Promise<void> {
  const i = eng.io()
  try {
    if (a.do === 'close') fold()
    else {
      const key = doOpenKey(a.n)
      if (a.do === 'ask' || (a.do === 'run' && flags.openWhat === key)) {
        const was = flags.openWhat === key
        fold()
        if (!was) flags.openWhat = key
      } else {
        const cwd = await eng.cwd()
        const o = await runBlock(i, { home: await i.home(), cwd, root: (await projectOf(i)) ?? cwd }, a.n, a.do === 'yes' ? 2 : 1, 'button', a.script)
        if (o.kind === 'ran') {
          flags.openWhat = key
          i.toast(said(o.shown.exit === 'timeout' ? DO_SAID_TIMEOUT : o.shown.exit === 'failed' ? DO_SAID_FAILED : o.shown.exit === 0 ? DO_SAID_RAN : DO_SAID_RAN_BAD, a.n, String(o.shown.exit)), true)
        } else if (o.kind === 'needyes') {
          fold()
          flags.openWhat = key
        } else if (o.kind === 'changed') {
          fold()
          i.toast(tr(DO_SAID_GONE), true)
        } else if (o.kind === 'blocked') i.toast(said(DO_SAID_BLOCKED, a.n), true)
        else if (o.kind === 'off') i.toast(tr(DO_SAID_OFF), true)
        else if (o.kind === 'halted') {
          fold()
          i.toast(tr(HALT_ON_SAID), true)
        }
        else i.toast(tr(DO_SAID_GONE), true)
      }
    }
  } catch {
    i.toast(said(DO_SAID_FAILED, a.do === 'close' ? 0 : a.n), true)
  }
  i.invalidate()
}
