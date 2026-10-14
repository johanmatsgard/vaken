// Pop out: put this session in its own window with the app's `ccd_window` tool `open_session_in` (core/popout.ts).
import { tr } from '../../core/lang'
import { POPOUT_ARGS, POPOUT_FAILED, POPOUT_RETRY_MS, POPOUT_SAID, POPOUT_SERVER, POPOUT_TOOL, popMem } from '../../core/popout'
import type { HomeEngine } from './engine'

// A server or tool that is not there (the call throws) is remembered: the next press does not call again and says the way by hand.
export async function popOut(eng: HomeEngine, say: (english: string) => string = tr): Promise<{ ok: boolean; text: string }> {
  if (popMem.failed && popMem.failedAt !== undefined && Date.now() - popMem.failedAt >= POPOUT_RETRY_MS) popMem.failed = false
  if (popMem.failed) return { ok: false, text: say(POPOUT_FAILED) }
  if (popMem.busy) return { ok: false, text: '' }
  popMem.busy = true
  try {
    const r = await eng.mcpCall(POPOUT_SERVER, POPOUT_TOOL, { ...POPOUT_ARGS })
    if (r.isError === true) return { ok: false, text: say(POPOUT_FAILED) }
    return { ok: true, text: say(POPOUT_SAID) }
  } catch {
    popMem.failed = true
    popMem.failedAt = Date.now()
    return { ok: false, text: say(POPOUT_FAILED) }
  } finally {
    popMem.busy = false
  }
}

export async function popOutPress(eng: HomeEngine): Promise<void> {
  try {
    const r = await popOut(eng)
    if (r.text !== '') eng.io().toast(r.text, true)
  } catch {
  }
}
