// A hook event as a plain record of its fields. The engine's event types name only some fields
// (a tool call also carries the tool's own input); a hook hands the event here whole instead of casting it.
export function fieldsOf(event: unknown): Record<string, unknown> {
  return event as Record<string, unknown>
}
