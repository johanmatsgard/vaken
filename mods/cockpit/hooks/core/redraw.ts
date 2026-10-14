// Redraw only when something on screen would look different, because every redraw repaints the whole pane and flickers. Each surface registers a probe signature; a trigger asks for a redraw only when one differs.
import type { Io } from './io'

type Probe = {
  key: string
  isShown: () => Promise<boolean>
  signature: () => Promise<string>
}

const probes = new Map<string, Probe>()
const drawn = new Map<string, string>()
let lastCheckAt = 0

export function addProbe(probe: Probe): void {
  probes.set(probe.key, probe)
}

export function remember(key: string, signature: string): void {
  drawn.set(key, signature)
}

export function hashOf(text: string): string {
  let h = 5381
  for (let n = 0; n < text.length; n++) h = ((h << 5) + h + text.charCodeAt(n)) | 0
  return `${text.length}:${h >>> 0}`
}

// Probes that read the same things share one read per check number.
let checks = 0
export const checkNumber = (): number => checks

// A probe that throws is skipped, so a broken surface never blocks the others.
export async function redrawIfChanged(io: Io, minGapMs = 500): Promise<boolean> {
  const now = await io.now()
  if (now - lastCheckAt < minGapMs) return false
  lastCheckAt = now
  checks += 1
  for (const probe of probes.values()) {
    try {
      if (!(await probe.isShown())) continue
      if (drawn.get(probe.key) !== (await probe.signature())) {
        io.invalidate()
        return true
      }
    } catch {
    }
  }
  return false
}
