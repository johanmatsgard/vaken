// Finds the typescript JS API for the scripts that read the code with it (TS 7 and newer ship none): TYPESCRIPT_JS (path of typescript.js), TSC (a tsc path),
// the tsc on PATH, or a node_modules/typescript under the home folder. Returns undefined when there is none.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'
import { execFileSync } from 'child_process'

export function findTypescript() {
  const cands = []
  const add = p => { if (p) try { cands.push(path.resolve(path.dirname(fs.realpathSync(p)), '..', 'lib', 'typescript.js')) } catch {} }
  if (process.env.TYPESCRIPT_JS) cands.push(process.env.TYPESCRIPT_JS)
  add(process.env.TSC)
  try { add(execFileSync(process.platform === 'win32' ? 'where' : 'which', ['tsc'], { encoding: 'utf8' }).split('\n')[0].trim()) } catch {}
  const home = os.homedir()
  try {
    for (const a of fs.readdirSync(home)) {
      cands.push(path.join(home, a, 'node_modules', 'typescript', 'lib', 'typescript.js'))
      try { for (const b of fs.readdirSync(path.join(home, a))) cands.push(path.join(home, a, b, 'node_modules', 'typescript', 'lib', 'typescript.js')) } catch {}
    }
  } catch {}
  for (const c of cands) if (fs.existsSync(c)) return createRequire(import.meta.url)(c)
  return undefined
}
