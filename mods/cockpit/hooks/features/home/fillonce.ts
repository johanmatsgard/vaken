// A request put in the prompt box for the person to read and send (Fix on a pull request, Fix on a failed check).
import type { HomeEngine } from './engine'

// Never throws.
export async function fillOnce(eng: HomeEngine, text: string): Promise<boolean> {
  const fill = eng.fill
  if (fill === undefined) return false
  try {
    const box = eng.boxText === undefined ? '' : await eng.boxText().catch(() => '')
    if (box.includes(text)) return true
    return (await fill(text, 'append')).isFilled
  } catch {
    return false
  }
}
