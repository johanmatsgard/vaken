// How full the session's context window is, read through the app's `get_usage` tool. Plain data and parsing only.
import { fmt } from './fmt'
import { langNow } from '../i18n/t'


export type ContextFacts = {
  tokens?: number
  window?: number
  compactAt?: number
  top?: { name: string; percent: number }[]
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

// The tool answers with one JSON text block; a context that is not "ok" gives undefined, never a guess.
export function parseContext(text: string): ContextFacts | undefined {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return undefined
  }
  if (!isObj(data) || !isObj(data.context) || data.context.status !== 'ok') return undefined
  const c = data.context
  const top = Array.isArray(c.categories)
    ? c.categories
        .filter((x): x is { name: string; percent: number } => isObj(x) && typeof x.name === 'string' && num(x.percent) !== undefined)
        .slice(0, 3)
        .map(x => ({ name: x.name.slice(0, 24), percent: x.percent }))
    : []
  const facts: ContextFacts = { tokens: num(c.tokensUsed), window: num(c.contextWindow), compactAt: num(c.autoCompactsAtPercent), ...(top.length === 0 ? {} : { top }) }
  return facts.tokens === undefined && facts.compactAt === undefined ? undefined : facts
}

export const tokenWord = (n: number): string => fmt.tokens(n, langNow())

export function contextFacts(f: ContextFacts, percent: number | undefined, t: (s: string) => string = s => s): { compact?: string; used?: string; top?: string } {
  const compact =
    f.compactAt === undefined ? undefined : percent !== undefined && percent >= f.compactAt ? t('Compacts by itself now') : percent !== undefined && percent >= f.compactAt - 10 ? t('Compacts by itself soon, at {n}%').replace('{n}', String(Math.round(f.compactAt))) : t('Compacts at {n}%').replace('{n}', String(Math.round(f.compactAt)))
  const used = f.tokens === undefined ? undefined : f.window === undefined ? t('{n} tokens used').replace('{n}', tokenWord(f.tokens)) : t('{a} of {b} tokens').replace('{a}', tokenWord(f.tokens)).replace('{b}', tokenWord(f.window))
  const top = f.top === undefined ? undefined : t('Biggest: {list}').replace('{list}', f.top.map(x => `${x.name} ${Math.round(x.percent)}%`).join(', '))
  return { ...(compact === undefined ? {} : { compact }), ...(used === undefined ? {} : { used }), ...(top === undefined ? {} : { top }) }
}
