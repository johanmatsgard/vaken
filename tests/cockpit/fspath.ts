// Shared by tests that mock `fs.*` with a map keyed by POSIX paths.
export const posix = (p: string): string => p.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')
