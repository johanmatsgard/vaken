// Question relay: when a tool server (MCP) asks the person something here, every other session's band names this session (core/relay.ts).
// It only notes and clears: the answer is always the person's, in the app's own dialog. This session's record keeps a hash and the time of each open question.
import type { EngineInterface, On } from 'claude-code'

import { withToastGate } from '../core/io'
import { homeFrom } from '../core/platform'
import type { Io } from '../core/io'
import { readRecord } from '../core/record'
import { hashOf } from '../core/redraw'
import { withQuestion, withoutQuestion } from '../core/relay'
import { collect } from './home/load'

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

// This session's open questions by server and question id, so an answer clears the right one; memory only
const QUESTIONS_MAX = 8
export const relayMem = new Map<string, string>()
const askKey = (server: string, id: string | undefined): string => `${server}|${id ?? ''}`

export async function noteQuestion(i: Io, server: string, id: string | undefined, message: string): Promise<void> {
  const h = hashOf(`${server}|${id ?? ''}|${message}`)
  relayMem.delete(askKey(server, id))
  relayMem.set(askKey(server, id), h)
  if (relayMem.size > QUESTIONS_MAX) relayMem.delete(relayMem.keys().next().value as string)
  const had = (await readRecord(i, await i.sessionId()))?.questions
  await collect(() => i, { questions: withQuestion(had, h, await i.now()) })
}

// The answer came (accepted, turned down or cancelled): that question goes; with no match the oldest goes, as questions are answered in turn
export async function clearQuestion(i: Io, server: string, id: string | undefined): Promise<void> {
  const h = relayMem.get(askKey(server, id))
  relayMem.delete(askKey(server, id))
  const had = (await readRecord(i, await i.sessionId()))?.questions
  if (had === undefined || had.length === 0) return
  const left = withoutQuestion(had, h)
  await collect(() => i, { questions: left.length === 0 ? undefined : left })
}

export function registerRelay(on: On): void {
  // A hook beneath that blocks the question (its reason in `block`) means no dialog shows: nothing to relay. This hook returns what it got, never an answer.
  on('classic.Elicitation', { mcp_server_name: /(?<relay>)/ }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (r.block === undefined) await noteQuestion(io($), e.mcp_server_name, e.elicitation_id, e.message)
    } catch {
    }
    return r
  }).catch(($, e, next) => next(e))

  on('classic.ElicitationResult', { mcp_server_name: /(?<relay>)/ }, async ($, e, next) => {
    try {
      await clearQuestion(io($), e.mcp_server_name, e.elicitation_id)
    } catch {
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
