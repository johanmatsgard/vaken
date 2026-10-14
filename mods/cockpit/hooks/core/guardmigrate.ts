// Migration hold rules: which commands apply migrations and which statements cannot be undone. Reads text, runs nothing. A speed bump, not a lock.
import type { Io } from './io'
import { basename, commandsOf, flagsOf } from './guardshell'
import type { Cmd } from './guardshell'
import { runsCommand } from './tools'

export type BackFound = { key: string; words: string }
type Risk = { id: string; text: string }

const MIGRATION_DIRS: readonly string[] = ['migrations', 'supabase/migrations', 'db/migrate', 'prisma/migrations', 'drizzle', 'alembic/versions']
const CODE_EXT = /\.(py|rb|ts|js|mjs|cjs|go|php|java|kt|cs|ex|exs)$/i

const clean = (p: string): string => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/')

export function isMigrationPath(path: string): boolean {
  const p = `/${clean(path)}`
  return MIGRATION_DIRS.some(d => {
    const at = p.indexOf(`/${d}/`)
    return at >= 0 && p.length > at + d.length + 2
  })
}

const isReadable = (path: string): boolean => /\.sql$/i.test(path) || CODE_EXT.test(path)


const RUNNERS = new Set(['npx', 'bunx', 'pnpx'])
const PKG = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const SCRIPT_YES = /migrat|^db:(push|deploy|reset)$/i
const SCRIPT_NO = /test|lint|check|status|list|create|generate|new|make|dry/i

export function applyKind(c: Cmd): string | undefined {
  const { short, long, positional } = flagsOf(c.args)
  if (long.has('--dry-run') || long.has('--help') || long.has('--sql') || short.has('h')) return undefined
  let prog = c.prog
  let pos = positional.filter(t => t.op !== true).map(t => t.t)
  if (RUNNERS.has(prog)) {
    prog = basename(pos[0] ?? '')
    pos = pos.slice(1)
  } else if (PKG.has(prog) && ['exec', 'dlx', 'x'].includes(pos[0] ?? '')) {
    prog = basename(pos[1] ?? '')
    pos = pos.slice(2)
  }
  const [a, b] = pos
  if (a !== undefined && /:status$|:list$/.test(a)) return undefined
  switch (prog) {
    case 'supabase':
      return (a === 'db' && (b === 'push' || b === 'reset')) || (a === 'migration' && b === 'up') ? `supabase ${a} ${b}` : undefined
    case 'prisma':
      return (a === 'migrate' && ['deploy', 'dev', 'reset'].includes(b ?? '')) || (a === 'db' && b === 'push') ? `prisma ${a} ${b}` : undefined
    case 'drizzle-kit':
      return a === 'push' || a === 'migrate' ? `drizzle-kit ${a}` : undefined
    case 'alembic':
      return a === 'upgrade' || a === 'downgrade' ? `alembic ${a}` : undefined
    case 'rails':
    case 'rake':
    case 'bin/rails':
      return /^db:(migrate|rollback|reset|schema:load|drop)/.test(a ?? '') ? `rails ${a}` : undefined
    case 'flyway':
      return a === 'migrate' || a === 'clean' ? `flyway ${a}` : undefined
    case 'knex':
      return /^migrate:(latest|up|rollback|down)/.test(a ?? '') ? `knex ${a}` : undefined
    case 'sequelize':
    case 'sequelize-cli':
      return /^db:migrate/.test(a ?? '') ? `sequelize ${a}` : undefined
    case 'typeorm':
      return a === 'migration:run' || a === 'migration:revert' ? `typeorm ${a}` : undefined
    case 'goose':
      return a === 'up' || a === 'down' || a === 'reset' ? `goose ${a}` : undefined
    case 'dbmate':
      return a === 'up' || a === 'migrate' || a === 'drop' ? `dbmate ${a}` : undefined
    case 'atlas':
      return a === 'migrate' && b === 'apply' ? 'atlas migrate apply' : undefined
    case 'diesel':
      return a === 'migration' && (b === 'run' || b === 'revert' || b === 'redo') ? `diesel migration ${b}` : undefined
    case 'sqlx':
      return a === 'migrate' && (b === 'run' || b === 'revert') ? `sqlx migrate ${b}` : undefined
    case 'liquibase':
      return a === 'update' || a === 'rollback' ? `liquibase ${a}` : undefined
    case 'dotnet':
      return a === 'ef' && b === 'database' && pos[2] === 'update' ? 'dotnet ef database update' : undefined
    case 'php':
      return a === 'artisan' && b !== undefined && /^migrate(:(fresh|refresh|reset|rollback))?$/.test(b) ? `php artisan ${b}` : undefined
    case 'mix':
      return a !== undefined && /^ecto\.(migrate|rollback|reset|drop)$/.test(a) ? `mix ${a}` : undefined
    case 'django-admin':
      return a === 'migrate' ? 'django-admin migrate' : undefined
    case 'python':
    case 'python3':
      return a !== undefined && /manage\.py$/.test(a) && b === 'migrate' ? 'manage.py migrate' : undefined
  }
  if (PKG.has(prog)) {
    const script = (prog === 'npm' || prog === 'bun' ? (a === 'run' || a === 'run-script' ? b : undefined) : a === 'run' ? b : a)
    if (script !== undefined && SCRIPT_YES.test(script) && !SCRIPT_NO.test(script)) return `${prog} ${script}`
  }
  return undefined
}

function sqlFilesOf(c: Cmd): string[] {
  if (!['psql', 'pgcli', 'mysql', 'mariadb', 'sqlite3', 'duckdb'].includes(c.prog)) return []
  const out: string[] = []
  for (let n = 0; n < c.args.length; n += 1) {
    const t = c.args[n]!.t
    if ((t === '-f' || t === '--file') && c.args[n + 1] !== undefined) out.push(c.args[n + 1]!.t)
    else if (t.startsWith('--file=')) out.push(t.slice(7))
  }
  for (const r of c.redirects) if (r.op === '<') out.push(r.target)
  return out.filter(f => /\.sql$/i.test(f))
}


const lastPart = (name: string): string => name.split('.').pop() ?? name

// Function bodies are dropped because they run later, not now.
function prepare(sql: string): string[] {
  const noBodies = sql.replace(/create\s+(?:or\s+replace\s+)?(?:function|procedure|trigger)[\s\S]*?(\$[A-Za-z_]*\$)[\s\S]*?\1/gi, ' ')
  const plain = noBodies
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\$[A-Za-z_]*\$/g, ' ; ')
  return plain
    .split(';')
    .map(s => s.trim().replace(/^(?:do\s+)?(?:begin|else|then|loop)\s+/i, '').replace(/^(?:if|elsif|when)\b[\s\S]*?\bthen\s+/i, '').trim())
    .filter(s => s !== '')
}

const NAME = '([\\w."`\\[\\]-]+)'

export function sqlRisks(sql: string): Risk[] {
  const out: Risk[] = []
  for (const s of prepare(sql)) {
    const hasWhere = /\bwhere\b/i.test(s) && !/\bwhere\s+(?:true|1\s*=\s*1)\s*$/i.test(s)
    let m = new RegExp(`^drop\\s+(table|schema|database)\\s+(?:if\\s+exists\\s+)?${NAME}`, 'i').exec(s)
    if (m !== null) {
      const what = m[1]!.toLowerCase()
      out.push({ id: `drop-${what}`, text: `DROP ${what.toUpperCase()} ${m[2]}: ${what === 'table' ? 'the table and all its rows' : what === 'schema' ? 'every table inside it' : 'the whole database'} is lost` })
      continue
    }
    m = new RegExp(`^truncate\\s+(?:table\\s+)?(?:only\\s+)?${NAME}`, 'i').exec(s)
    if (m !== null) {
      out.push({ id: 'truncate', text: `TRUNCATE ${m[1]}: every row is deleted` })
      continue
    }
    m = new RegExp(`^delete\\s+from\\s+(?:only\\s+)?${NAME}`, 'i').exec(s)
    if (m !== null) {
      if (!hasWhere) out.push({ id: 'delete-all', text: `DELETE FROM ${m[1]} with no WHERE: every row is deleted` })
      continue
    }
    m = new RegExp(`^update\\s+(?:only\\s+)?${NAME}\\s+set\\b`, 'i').exec(s)
    if (m !== null) {
      if (!hasWhere) out.push({ id: 'update-all', text: `UPDATE ${m[1]} with no WHERE: every row is changed` })
      continue
    }
    m = new RegExp(`^alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?${NAME}\\s+([\\s\\S]*)$`, 'i').exec(s)
    if (m !== null) {
      const table = lastPart(m[1]!)
      const rest = m[2]!
      for (const part of rest.split(/,(?![^()]*\))/)) {
        const p = part.trim()
        const col = /^drop\s+(?:column\s+)?(?:if\s+exists\s+)?([\w"`]+)/i.exec(p)
        if (col !== null && !/^(constraint|primary|foreign|index|key|check|partition)$/i.test(col[1]!)) out.push({ id: 'drop-column', text: `DROP COLUMN ${col[1]} on ${table}: the data in that column is lost` })
        else if (/^alter\s+(?:column\s+)?[\w"`]+\s+set\s+not\s+null/i.test(p)) out.push({ id: 'set-not-null', text: `SET NOT NULL on ${table}: it fails if any row has no value` })
        else if (/^alter\s+(?:column\s+)?[\w"`]+\s+(?:set\s+data\s+)?type\b/i.test(p)) out.push({ id: 'column-type', text: `A column type change on ${table}: values are converted and it can fail` })
        else if (/^rename\b/i.test(p)) out.push({ id: 'rename', text: `A rename on ${table}: code that uses the old name breaks` })
        else if (/^(?:disable|no\s+force)\s+(?:row\s+level|force\s+row)/i.test(p)) out.push({ id: 'rls-off', text: `Row level security switched off on ${table}: rows may become readable by anyone` })
      }
      continue
    }
    if (/^alter\s+(?:index|view|sequence|type|schema)\b[\s\S]*\brename\b/i.test(s)) out.push({ id: 'rename', text: 'A rename: code that uses the old name breaks' })
    else if (/^grant\b[\s\S]*\bto\b[\s\S]*\b(?:public|anon)\b/i.test(s)) out.push({ id: 'grant-public', text: 'GRANT to public or anon: anyone can get access, even without logging in' })
  }
  const seen = new Set<string>()
  return out.filter(r => (seen.has(r.text) ? false : (seen.add(r.text), true)))
}

const ORM: [RegExp, string, string][] = [
  [/\bop\.drop_table\(\s*['"]([^'"]+)/g, 'drop-table', 'drop_table $1: the table and all its rows are lost'],
  [/\bop\.drop_column\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)/g, 'drop-column', 'drop_column $2 on $1: the data in that column is lost'],
  [/\bdrop_table\s*[(:]\s*:?['"]?([A-Za-z0-9_.]+)/g, 'drop-table', 'drop_table $1: the table and all its rows are lost'],
  [/\bremove_column\s*[(:]?\s*:?['"]?([A-Za-z0-9_]+)['"]?\s*,\s*:?['"]?([A-Za-z0-9_]+)/g, 'drop-column', 'remove_column $2 on $1: the data in that column is lost'],
  [/\b(?:dropTable|dropTableIfExists)\(\s*['"]([^'"]+)/g, 'drop-table', 'dropTable $1: the table and all its rows are lost'],
  [/\bdropColumn\(\s*['"]([^'"]+)/g, 'drop-column', 'dropColumn $1: the data in that column is lost'],
  [/\bop\.rename_table\(|\brename_table\b|\brenameTable\(|\brename_column\b|\brenameColumn\(/g, 'rename', 'a rename: code that uses the old name breaks'],
]

export function ormRisks(text: string): Risk[] {
  const out: Risk[] = []
  for (const [re, id, tpl] of ORM) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) out.push({ id, text: tpl.replace(/\$(\d)/g, (_s, d: string) => m[Number(d)] ?? '') })
  }
  for (const m of text.matchAll(/(?:execute|exec|raw|op\.execute)\s*\(\s*(?:f?r?['"`]{1,3})([\s\S]*?)(?:['"`]{1,3})\s*\)/g)) out.push(...sqlRisks(m[1] ?? ''))
  const seen = new Set<string>()
  return out.filter(r => (seen.has(r.text) ? false : (seen.add(r.text), true)))
}

const risksOfFile = (path: string, text: string): Risk[] => (CODE_EXT.test(path) ? ormRisks(text) : sqlRisks(text))

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function proposedText(tool: string, a: Record<string, unknown>): string {
  if (tool === 'Write') return str(a.content)
  if (tool === 'Edit') return str(a.new_string)
  if (tool === 'MultiEdit' && Array.isArray(a.edits)) return (a.edits as Record<string, unknown>[]).map(x => str(x.new_string)).join('\n;\n')
  return ''
}

const short = (p: string): string => {
  const parts = clean(p).split('/')
  return parts[parts.length - 1] === 'migration.sql' && parts.length > 1 ? parts.slice(-2).join('/') : basename(p)
}
const listRisks = (risks: Risk[]): string => {
  const shown = risks.slice(0, 3).map(r => r.text)
  return `${shown.join('; ')}${risks.length > 3 ? `; and ${risks.length - 3} more` : ''}.`
}

type MigEnv = { cwd: string; root: string }

async function readCapped(io: Io, path: string): Promise<string | undefined> {
  try {
    const t = await io.read(path)
    return t.length > 400_000 ? t.slice(0, 400_000) : t
  } catch {
    return undefined
  }
}

const abs = (p: string, cwd: string): string => (p.startsWith('/') ? p : `${cwd}/${p}`)

async function pendingFiles(io: Io, env: MigEnv): Promise<string[]> {
  try {
    const r = await io.run(['git', 'status', '--porcelain', '-uall'], { cwd: env.root, timeoutMs: 5000 })
    if (r.exitCode !== 0) return []
    const files: string[] = []
    for (const line of r.stdout.split(/\r?\n/)) {
      if (line.length < 4 || line[0] === 'D' || line[1] === 'D') continue
      const rest = line.slice(3)
      const arrow = rest.indexOf(' -> ')
      files.push((arrow >= 0 ? rest.slice(arrow + 4) : rest).replace(/^"|"$/g, ''))
    }
    return files.filter(f => isMigrationPath(f) && isReadable(f)).slice(0, 6)
  } catch {
    return []
  }
}

const MCP_APPLY = /apply_migration/i

export async function judgeMigration(io: Io, env: MigEnv, tool: string, a: Record<string, unknown>): Promise<BackFound[]> {
  const out: BackFound[] = []
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') {
    const path = str(a.file_path)
    if (path === '' || !isMigrationPath(path) || !isReadable(path)) return out
    const risks = risksOfFile(path, proposedText(tool, a))
    if (risks.length > 0) out.push({ key: `w:${path}:${risks.map(r => r.id).join(',')}`, words: `The migration file ${short(path)} would hold steps that cannot be undone: ${listRisks(risks)}` })
    return out
  }
  if (runsCommand(tool)) {
    let pending: Promise<Risk[]> | undefined
    const pendingRisks = (): Promise<Risk[]> =>
      (pending ??= (async () => {
        const risks: Risk[] = []
        for (const f of await pendingFiles(io, env)) {
          const text = await readCapped(io, abs(f, env.root))
          if (text !== undefined) risks.push(...risksOfFile(f, text).map(r => ({ id: r.id, text: `${short(f)}: ${r.text}` })))
        }
        return risks
      })())
    for (const c of commandsOf(str(a.command))) {
      const kind = applyKind(c)
      if (kind !== undefined) {
        const risks = await pendingRisks()
        const detail = risks.length > 0 ? ` New migration files hold steps that cannot be undone: ${listRisks(risks)}` : ' It was not possible to see what the new migrations do.'
        out.push({ key: `a:${kind}:${risks.map(r => r.id).join(',')}`, words: `${kind} would change the database structure.${detail}` })
        continue
      }
      for (const f of sqlFilesOf(c)) {
        const text = await readCapped(io, abs(f, env.cwd))
        const risks = text === undefined ? [] : sqlRisks(text)
        if (risks.length > 0) out.push({ key: `f:${f}:${risks.map(r => r.id).join(',')}`, words: `${c.prog} would run ${short(f)}, which holds steps that cannot be undone: ${listRisks(risks)}` })
      }
    }
    return out
  }
  if (tool.startsWith('mcp__') && MCP_APPLY.test(tool)) {
    const sql = str(a.query) || str(a.sql) || str(a.migration) || str(a.statements)
    const risks = sqlRisks(sql)
    out.push({ key: `m:${tool}:${risks.map(r => r.id).join(',')}`, words: `${tool.split('__').slice(-2).join(' ')} would change the database structure.${risks.length > 0 ? ` It holds steps that cannot be undone: ${listRisks(risks)}` : ''}` })
  }
  return out
}
