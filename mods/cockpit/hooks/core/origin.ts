// Who typed a command. A step that unlocks or runs something must come from the person (`composer` or `bridge`); any other origin, or a missing one, is refused. Looking stays open to all.

// A typed reply is English like every command reply; the pane says it in the language.
export const BY_PERSON_ONLY = 'This step needs you to type it in this session.'

const PERSON_KINDS: readonly string[] = ['composer', 'bridge']

export function byPerson(origin: unknown): boolean {
  if (typeof origin !== 'object' || origin === null) return false
  const kind = (origin as { kind?: unknown }).kind
  return typeof kind === 'string' && PERSON_KINDS.includes(kind)
}
