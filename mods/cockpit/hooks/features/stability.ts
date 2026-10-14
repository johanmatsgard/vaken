// The stability layer's runtime: on every session start, a few seconds later, run small self-tests of the things vaken leans on, keep the result
import type { EngineInterface, On } from 'claude-code'

import { postBand } from '../core/band'
import { BROKEN_WHAT, CHECKED_WHAT, HEALTH_KEY, changed, failures, healthText, summary } from '../core/stability'
import type { Health, TestResult } from '../core/stability'
import { withToastGate } from '../core/io'
import { tr } from '../core/lang'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readSetting } from '../core/settings'
import { LEDGER_KEY, pushLog, why } from './compaction'
import { subArgs } from '../core/menu'

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

// The self-tests run this long after the session starts, so they do not slow the start.
const SELFTEST_DELAY_MS = 5_000
const PROBE_KEY = 'cockpit:selftest'

const attempt = async (name: string, fn: () => Promise<boolean>): Promise<TestResult> => {
  try {
    return (await fn()) ? { name, ok: true } : { name, ok: false, why: 'unexpected answer' } // en-only: plain answer of a slash command (text twin)
  } catch (err) {
    // A part this run mode does not offer (a headless run has no session to register commands in) is not a broken part.
    if (/not available in this mode/i.test(why(err))) return { name, ok: true }
    return { name, ok: false, why: why(err) }
  }
}

async function selfTest($: EngineInterface): Promise<void> {
  const i = io($)
  try {
    if ((await readSetting(i, 'stability.check')) === 'off') return
    const stamp = await i.now()
    const results: TestResult[] = [
      await attempt('shared store', async () => {
        await i.set(PROBE_KEY, stamp)
        const back = await i.get(PROBE_KEY)
        await i.del(PROBE_KEY)
        return back === stamp
      }),
      await attempt('clock', async () => typeof stamp === 'number' && stamp > 0),
      await attempt('session id', async () => (await i.sessionId()).length > 0),
      await attempt('files', async () => await $.fs.exists('/')),
      await attempt('commands', async () => {
        return true
      }),
    ]
    const version = (await $.session.version()).version
    const old = (await i.get(HEALTH_KEY)) as Health | undefined
    const previous = typeof old?.version === 'string' ? old.version : undefined
    const health: Health = { at: stamp, version, ...(previous === undefined ? {} : { previous }), results }
    await i.set(HEALTH_KEY, health)
    const bad = failures(results)
    if (bad.length > 0) {
      const reasons = bad.map(r => `${r.name}: ${(r.why ?? '').slice(0, 80)}`).join('; ')
      await pushLog(i, LEDGER_KEY, { at: stamp, session: await i.sessionId(), what: BROKEN_WHAT, detail: `${summary(health)} ${reasons}`, how: 'auto', did: true })
      // Typed commands keep working when the second registration fails
      if (bad.some(r => r.name !== 'commands')) {
        await postBand(i, 'warn', 'health', 'Vaken self-test failed')
        i.toast(`${summary(health)} ${tr('Type /vaken-help run health to see why.')}`)
      }
    } else if (changed(previous, version)) {
      await pushLog(i, LEDGER_KEY, { at: stamp, session: await i.sessionId(), what: CHECKED_WHAT, detail: summary(health), how: 'auto', did: true })
      i.toast(summary(health))
    }
  } catch {
    // the self-test never breaks the session
  }
}

export function registerStability(on: On): void {
  on('session.start', { cwd: /(?<stability>)/ }, async ($, e, next) => {
    try {
      $.clock.after(SELFTEST_DELAY_MS, () => void selfTest($))
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'vaken-help' }, async ($, e0, next) => {
    const rest0 = subArgs(e0.args, 'run', 'health')
    if (rest0 === undefined) return next(e0)
    const i = io($)
    return { text: healthText((await i.get(HEALTH_KEY)) as Health | undefined) }
  })
}
