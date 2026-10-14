// The model map: which model does which kind of work. A choice can be kept for All projects, This project or This session. The Researcher's model is also where Routing sends a lookup helper.

// Each is an alias the Agent tool takes as it is.
export type Family = 'haiku' | 'sonnet' | 'opus' | 'fable'
export const FAMILIES: Family[] = ['haiku', 'sonnet', 'opus', 'fable']
export const MODEL_OPTIONS: { value: Family; label: string }[] = [
  { value: 'haiku', label: 'Haiku' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'fable', label: 'Fable' },
]

export const isFamily = (v: unknown): v is Family => typeof v === 'string' && (FAMILIES as string[]).includes(v)

export function familyIn(model: string): Family | undefined {
  const m = model.toLowerCase()
  if (m.includes('mythos')) return 'fable'
  return FAMILIES.find(f => m.includes(f))
}

// An unknown model counts as Opus so a helper is never sent up to Fable by a guess.
export const rankOf = (model: string): number => {
  const f = familyIn(model)
  return f === undefined ? 3 : FAMILIES.indexOf(f) + 1
}

// Fable is not a step up: it costs twice Opus, so only a person chooses it.
export function stepUp(model: string): Family | undefined {
  const f = familyIn(model)
  if (f === 'haiku') return 'sonnet'
  if (f === 'sonnet') return 'opus'
  return undefined
}

// An older choice kept under Routing still counts until the Researcher is set.
export function lookupModel(researcher: unknown, olderCheap: unknown): Family {
  if (isFamily(researcher)) return researcher
  if (olderCheap === 'sonnet' || olderCheap === 'haiku') return olderCheap
  return 'haiku'
}

export const SESSION_KEYS: readonly string[] = ['runner.researcher', 'runner.builder', 'runner.reviewer', 'runner.fixer', 'route.mode']
export const sessionKeyOk = (key: string): boolean => SESSION_KEYS.includes(key)
