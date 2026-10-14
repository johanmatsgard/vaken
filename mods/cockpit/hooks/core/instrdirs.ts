// Folders whose CLAUDE.md and AGENTS.md Claude reads: the session folder and each parent up to the repo root (a .git folder, or a file in a worktree).
import { samePath, walkUp } from './platform'

const NEVER = '\u0000'

export async function instructionDirs(cwd: string, root: string, isTop: (dir: string) => Promise<boolean>): Promise<string[]> {
  const all = walkUp(cwd, NEVER)
  let git = -1
  for (let n = 0; n < all.length && git < 0; n += 1) {
    try {
      if (await isTop(all[n])) git = n
    } catch {
    }
  }
  const rootAt = root === '' ? -1 : all.findIndex(d => samePath(d, root))
  const stop = Math.max(git, rootAt)
  if (stop < 0) return walkUp(cwd, root)
  return all.slice(0, stop + 1)
}
