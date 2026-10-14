// The one text table's tools: export it to a sheet, import a filled sheet back, and check it. Node 18 or newer, no packages: it runs on the
// Mac and in Git Bash on Windows (Node comes with the Claude Code install there; CI sets it up). The shell wrappers are scripts/strings-export.sh,
// scripts/strings-import.sh and scripts/check-strings.sh.
//
//   node scripts/strings.mjs export [FILE] [--lang CODE] [--bom] [--sep ";"|","] [--excel-sv]
//        the sheet as CSV (UTF-8) to FILE or stdout; --bom adds the mark Excel needs to read UTF-8; --sep ";" is for Excel with a list separator of ";"
//        (Swedish and most European settings); --excel-sv is the same as --bom --sep ";" (the words "semicolon" and "comma" also work for --sep).
//        --lang CODE writes a translator's sheet: name, where, note, en and one column for CODE (empty for a new language, else what it has), with three
//        first lines for the language itself (@name, @decimal, @plural).
//   node scripts/strings.mjs import FILE [--dry-run] [--allow-english] [--allow-to-claude]   reads a filled sheet back into hooks/i18n/rows/*.ts; a new
//        language column adds the language to hooks/i18n/langs.ts as "partial" (with its @name, @decimal and @plural lines when the sheet has them). A translator's
//        sheet (a "note" column, as --lang writes) never changes the English and must hold exactly one language column after "en". The English of any row,
//        and a new row, change only with --allow-english (a maintainer's step). The English and note of a row tagged [to-claude] (its English is sent to
//        Claude) change only with --allow-to-claude as well.
//        The separator ("," or ";") is read from the header line; a BOM, CRLF line ends and the ";;;;" padding Excel adds are accepted. A relative FILE is
//        resolved against the folder the wrapper was started from (STRINGS_CALLER_DIR). Import never starts another program.
//   node scripts/strings.mjs md [FILE]                 the page of every text, as Markdown (generated on demand; the wrapper is scripts/strings-md.sh); check fails when it is stale
//   node scripts/strings.mjs check [--verbose] [--strict] [--root DIR]
//   node scripts/strings.mjs check --selftest
//
// The table format: hooks/i18n/rows/<area>.ts, one row per line, sorted by name, each line `  "area.name": {"en":"...","sv":"..."},` (a JSON object, so
// these tools read it without running TypeScript). A plural row has {"one":"...","other":"..."} in place of a text; in the sheet it is two lines, name#one
// and name#other. "=" in a language's cell means "the same as English, on purpose". hooks/i18n/langs.ts holds the languages, one JSON object per line
// (code, name, status full or partial, decimal mark, plural rule): a full language needs every row; a partial one passes, and the check prints how much is done.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, relative, dirname, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// ---- reading the table
const ROW_LINE = /^ {2}("(?:[^"\\]|\\.)*"): (\{.*\}),$/
const NAME = /^[a-z0-9]+\.[a-z0-9_]+$/

// Every dialog of the plugin that asks yes or no, as [yes row, no row]: the check fails when the two say the same in any language (core/confirm.ts).
// A new two-button question adds its pair here.
const DIALOGS = [
  ['talk.send', 'do.cancel'], // /vaken-pause steer send (core/inbox.ts sendButtons)
  ['engines.packet_write_it', 'engines.packet_do_not_write'], // the session packet (features/continuity.ts packetText)
]

function paths(root) {
  const mod = join(root, 'mods', 'cockpit')
  return { mod, hooks: join(mod, 'hooks'), rows: join(mod, 'hooks', 'i18n', 'rows'), langs: join(mod, 'hooks', 'i18n', 'langs.ts'), table: join(mod, 'hooks', 'i18n', 'table.ts') }
}

// The language registry, hooks/i18n/langs.ts: the lines of REGISTRY (one JSON object each) and the names of PLURAL_RULES with the forms each needs.
const REG_OPEN = /^export const REGISTRY: readonly LangInfo\[\] = \[$/
const LANG_CODE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/
function readRegistry(p) {
  const lines = readFileSync(p.langs, 'utf8').replace(/\r/g, '').split('\n')
  const open = lines.findIndex(l => REG_OPEN.test(l))
  const close = lines.findIndex((l, i) => i > open && l === ']')
  if (open < 0 || close < 0) throw new Error('hooks/i18n/langs.ts: no "export const REGISTRY: readonly LangInfo[] = [" ... "]" block')
  const list = []
  const bad = []
  for (let i = open + 1; i < close; i += 1) {
    const m = /^ {2}(\{.*\}),$/.exec(lines[i])
    if (m === null) { bad.push(`langs.ts:${i + 1}: not one language on one line: ${lines[i].slice(0, 80)}`); continue }
    try { list.push(JSON.parse(m[1])) } catch (e) { bad.push(`langs.ts:${i + 1}: not JSON: ${String(e.message)}`) }
  }
  const rules = {}
  for (const m of lines.join('\n').matchAll(/^ {2}(\w+): \{ forms: \[([^\]]*)\]/gm)) rules[m[1]] = [...m[2].matchAll(/'(\w+)'/g)].map(x => x[1])
  return { lines, open, close, list, bad, rules }
}
// The table for export and import: a bad registry line stops them, so a language never drops out of a sheet or the registry without a word.
function readTableSafe(p) {
  const t = readTable(p)
  if (t.reg.bad.length > 0) throw new Error(`hooks/i18n/langs.ts has a bad line; fix it first (scripts/check-strings.sh lists it):\n  ${t.reg.bad.join('\n  ')}`)
  return t
}
function readLangs(p) {
  return readRegistry(p).list.map(l => l.code)
}
const regLine = l => `  ${JSON.stringify({ code: l.code, name: l.name, status: l.status, decimal: l.decimal, plural: l.plural })},`

// The areas in the order of table.ts (the order the English lookup uses), then any rows file table.ts does not list (the check reports it).
function readAreas(p) {
  const order = [...readFileSync(p.table, 'utf8').matchAll(/^ {2}\['([a-z0-9]+)', \w+\],$/gm)].map(m => m[1])
  const files = readdirSync(p.rows).filter(f => f.endsWith('.ts')).map(f => f.slice(0, -3))
  return { order, files, all: [...order.filter(a => files.includes(a)), ...files.filter(f => !order.includes(f)).sort()] }
}

// One rows file: its header lines, its rows in file order, and the lines that are neither (problems).
function readArea(p, area) {
  const file = join(p.rows, `${area}.ts`)
  const lines = readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')
  const open = lines.findIndex(l => /^export const ROWS: Rows = \{$/.test(l))
  const close = lines.findIndex((l, i) => i > open && l === '}')
  const where = (lines.find(l => l.startsWith('// where: ')) ?? '').slice('// where: '.length).trim()
  const rows = []
  const bad = []
  if (open < 0 || close < 0) bad.push(`${area}.ts: no "export const ROWS: Rows = {" ... "}" block`)
  else
    for (let i = open + 1; i < close; i += 1) {
      const m = ROW_LINE.exec(lines[i])
      if (m === null) {
        bad.push(`${area}.ts:${i + 1}: not one row on one line: ${lines[i].slice(0, 80)}`)
        continue
      }
      try {
        rows.push({ name: JSON.parse(m[1]), row: JSON.parse(m[2]), line: i + 1 })
      } catch (e) {
        bad.push(`${area}.ts:${i + 1}: not JSON: ${String(e.message)}`)
      }
    }
  return { area, file, lines, open, close, where, rows, bad }
}

function readTable(p) {
  const reg = readRegistry(p)
  const langs = reg.list.map(l => l.code)
  const areas = readAreas(p)
  return { langs, reg, areas, data: areas.all.map(a => readArea(p, a)) }
}

const formsOf = x => (x === undefined || x === null ? [] : typeof x === 'string' ? [['', x]] : Object.entries(x).map(([k, v]) => [`#${k}`, v]))

// ---- the sheet (CSV, RFC 4180)
const cellWith = sep => v => {
  const s = v === undefined || v === null ? '' : String(v)
  return s.includes(sep) || /["\r\n]/.test(s) || /^\s|\s$|;$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// The separator of a sheet: the character after "name" in the header ("," or ";", as Excel on a Swedish PC writes it).
function sepOf(text) {
  const m = /^"?name"?([,;])/.exec(text.replace(/^﻿/, '').trimStart())
  return m === null ? ',' : m[1]
}

function parseCsv(text, sepIn) {
  const s = text.replace(/^﻿/, '')
  const sep = sepIn ?? sepOf(s)
  const out = parseRaw(s, sep)
  // Excel (Swedish) opens a comma sheet as one column and saves it back with ";" padding: a record that is one cell holding commas is the real line
  if (sep === ',') return out.map(r => (r.length === 1 && r[0].includes(',') ? (parseRaw(r[0], ',')[0] ?? r) : r)).filter(r => r.some(x => x !== ''))
  return out
}

// Where a run of ";" from i ends, if the run is followed by the end of the line or the text; else 0.
function padEnd(s, i) {
  let j = i
  while (s[j] === ';') j += 1
  return j >= s.length || s[j] === '\n' || s[j] === '\r' ? j : 0
}

function parseRaw(s, sep) {
  const out = []
  let row = []
  let f = ''
  let q = false
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]
    if (q) {
      if (c === '"' && s[i + 1] === '"') { f += '"'; i += 1 }
      else if (c === '"') q = false
      else f += c
    } else if (c === '"') q = true
    else if (c === sep) { row.push(f); f = '' }
    else if (c === ';' && sep === ',' && padEnd(s, i)) i = padEnd(s, i) - 1 // the ";;;;" padding Excel adds to the end of every line of a comma sheet
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i += 1
      row.push(f); out.push(row); row = []; f = ''
    } else f += c
  }
  if (f !== '' || row.length > 0) { row.push(f); out.push(row) }
  return out.filter(r => r.some(x => x !== ''))
}

// Where a name is used in code (the files that call t('name')), for the sheet's "where" column; else the area's own file.
function usesByName(p) {
  const uses = {}
  for (const f of codeFiles(p.hooks)) {
    const src = readFileSync(f, 'utf8')
    for (const m of codeOnly(src).matchAll(NAME_USE)) (uses[m[1] ?? m[2]] ??= new Set()).add(relative(p.hooks, f).split(sep).join('/'))
  }
  return uses
}

// The three first lines of a translator's sheet: the language itself. The English column shows English's own value as an example.
const META = {
  '@name': { key: 'name', note: 'The name of your language, in your language (for example Deutsch). Shown in Settings.' },
  '@decimal': { key: 'decimal', note: 'The decimal mark of your language: . or , (for example 1.5 or 1,5).' },
  '@plural': { key: 'plural', note: 'How a count picks its form: one_other (one for 1, else other), one_other_0_1 (one for 0 and 1), or other_only (one form for every count).' },
}

// A translator's sheet: name, where, note, en and one column for the language. A plural row is two lines (name#one and name#other).
function exportLang(root, out, bom, sep, code) {
  if (!LANG_CODE.test(code ?? '') || code === 'en') throw new Error(`--lang takes a language code such as de or pt-BR, not ${JSON.stringify(code)}`)
  const cell = cellWith(sep)
  const p = paths(root)
  const { reg, data } = readTableSafe(p)
  const uses = usesByName(p)
  const info = reg.list.find(l => l.code === code)
  const en = reg.list.find(l => l.code === 'en') ?? { name: 'English', decimal: '.', plural: 'one_other' }
  const lines = [['name', 'where', 'note', 'en', code].join(sep)]
  for (const [name, m] of Object.entries(META)) lines.push([name, '', m.note, en[m.key], info?.[m.key] ?? ''].map(cell).join(sep))
  for (const a of data)
    for (const { name, row } of [...a.rows].sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0))) {
      const where = uses[name] === undefined ? a.where : [...uses[name]].sort().join(' ')
      for (const [suffix, text] of formsOf(row.en)) {
        const x = row[code]
        const own = x === undefined ? '' : typeof x === 'string' ? x : (x[suffix.slice(1)] ?? '')
        lines.push([name + suffix, where, row.note ?? '', text, own].map(cell).join(sep))
      }
    }
  const text = (bom ? '﻿' : '') + lines.join('\n') + '\n'
  if (out === undefined) process.stdout.write(text)
  else writeFileSync(out, text)
  return lines.length - 1
}

function exportSheet(root, out, bom, sep = ',') {
  const cell = cellWith(sep)
  const p = paths(root)
  const { langs, data } = readTableSafe(p)
  const uses = usesByName(p)
  const lines = [['name', 'area', 'where', ...langs, 'notes'].join(sep)]
  for (const a of data)
    for (const { name, row } of [...a.rows].sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0))) {
      const where = uses[name] === undefined ? a.where : [...uses[name]].sort().join(' ')
      for (const [suffix] of formsOf(row.en)) {
        const pick = l => {
          const x = row[l]
          if (x === undefined) return ''
          if (typeof x === 'string') return x
          return x[suffix.slice(1)] ?? ''
        }
        lines.push([name + suffix, a.area, where, ...langs.map(pick), row.note ?? ''].map(cell).join(sep))
      }
    }
  const text = (bom ? '﻿' : '') + lines.join('\n') + '\n'
  if (out === undefined) process.stdout.write(text)
  else writeFileSync(out, text)
  return lines.length - 1
}

function rowLine(name, row, langs) {
  const ordered = {}
  for (const l of ['en', ...langs.filter(x => x !== 'en'), ...Object.keys(row).filter(k => k !== 'note' && !langs.includes(k) && k !== 'en')]) if (row[l] !== undefined) ordered[l] = row[l]
  if (row.note !== undefined && row.note !== '') ordered.note = row.note
  return `  ${JSON.stringify(name)}: ${JSON.stringify(ordered)},`
}

function writeArea(a, langs) {
  const sorted = [...a.rows].sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0))
  const lines = [...a.lines.slice(0, a.open + 1), ...sorted.map(r => rowLine(r.name, r.row, langs)), ...a.lines.slice(a.close)]
  writeFileSync(a.file, lines.join('\n'))
}

// A row whose English is sent to Claude (a note to Claude, a hook's reason, a tool's answer) carries this tag in its note. Import never changes its English or
// its note (so the tag stays) unless --allow-to-claude is given as well as --allow-english; its other languages are only shown, and import them as usual.
// A prompt sent as the person belongs in code as an en-only constant, not in the table.
const TO_CLAUDE = '[to-claude]'
const toClaude = row => typeof row?.note === 'string' && row.note.includes(TO_CLAUDE)

function importSheet(root, file, dry, { allowEnglish = false, allowToClaude = false } = {}) {
  const p = paths(root)
  const t = readTableSafe(p)
  const recs = parseCsv(readFileSync(file, 'utf8'))
  if (recs.length === 0) throw new Error('the sheet is empty')
  const head = recs[0].map(h => h.trim())
  const col = n => head.indexOf(n)
  if (col('name') < 0 || col('en') < 0) throw new Error('the sheet needs a "name" and an "en" column')
  // A translator's sheet (export --lang: a "note" column, not "notes") never changes the English: it is only shown there as the source.
  const translator = col('note') >= 0 && col('notes') < 0
  const sheetLangs = head.filter(h => LANG_CODE.test(h) && !(translator && h === 'en'))
  // A translator's sheet holds one language after en, the one export --lang wrote: a sheet with more language columns is refused whole, so one language's
  // translator cannot change another language.
  if (translator && sheetLangs.length !== 1) throw new Error(`a translator's sheet (export --lang) holds one language column after "en"; this one has ${sheetLangs.length === 0 ? 'none' : sheetLangs.join(', ')}`)
  const newLangs = sheetLangs.filter(l => !t.langs.includes(l))
  const langs = [...t.langs, ...newLangs]
  const byArea = Object.fromEntries(t.data.map(a => [a.area, a]))
  const byName = {}
  for (const a of t.data) for (const r of a.rows) byName[r.name] = { a, r }
  const notes = []
  let changed = 0
  let added = 0
  // The registry: a new language comes in as "partial"; @name, @decimal and @plural lines set its name, decimal mark and plural rule.
  const reg = t.reg.list.map(l => ({ ...l }))
  for (const l of newLangs) reg.push({ code: l, name: l, status: 'partial', decimal: '.', plural: 'one_other' })
  let regChanged = newLangs.length > 0
  for (const rec of recs.slice(1)) {
    const full = (rec[col('name')] ?? '').trim()
    if (full === '') continue
    const meta = META[full]
    if (meta !== undefined) {
      for (const l of sheetLangs.filter(x => x !== 'en')) {
        const v = (rec[col(l)] ?? '').trim()
        const info = reg.find(x => x.code === l)
        if (v === '' || info === undefined || info[meta.key] === v) continue
        if (meta.key === 'decimal' && v !== '.' && v !== ',') { notes.push(`skipped @decimal for ${l}: give . or , (not ${JSON.stringify(v)})`); continue }
        if (meta.key === 'plural' && t.reg.rules[v] === undefined) { notes.push(`skipped @plural for ${l}: give one of ${Object.keys(t.reg.rules).join(', ')} (not ${JSON.stringify(v)})`); continue }
        info[meta.key] = v
        regChanged = true
        changed += 1
      }
      continue
    }
    if (translator) {
      const e = rec[col('en')] ?? ''
      const now = byName[full.split('#')[0]]?.r.row.en
      const was = now === undefined ? undefined : typeof now === 'string' ? now : now[full.split('#')[1] ?? '']
      if (was !== undefined && e !== '' && e !== was) notes.push(`the English of ${full} differs from the table; a translator's sheet does not change English (the table keeps it)`)
    }
    const [name, form] = full.split('#')
    if (!NAME.test(name) || (form !== undefined && !['one', 'other'].includes(form))) { notes.push(`skipped, not a name: ${full}`); continue }
    let hit = byName[name]
    // A translator's sheet only fills rows the table has: a new row comes from the code, never from a translation.
    if (hit === undefined && translator) { notes.push(`skipped, not in the table: ${full}`); continue }
    // A new row brings new English: a maintainer's step only.
    if (hit === undefined && !allowEnglish) { notes.push(`skipped, a new row needs --allow-english: ${full}`); continue }
    if (hit === undefined) {
      const area = byArea[name.split('.')[0]]
      if (area === undefined) { notes.push(`skipped, no area file for: ${full}`); continue }
      hit = { a: area, r: { name, row: {} } }
      area.rows.push(hit.r)
      byName[name] = hit
      added += 1
    }
    const row = hit.r.row
    const locked = toClaude(row) && !allowToClaude
    for (const l of sheetLangs) {
      const v = rec[col(l)] ?? ''
      if (v === '') continue
      const was = form === undefined ? row[l] : typeof row[l] === 'object' && row[l] !== null ? row[l][form] : undefined
      if (was === v) continue
      if (l === 'en' && !(allowEnglish && !locked)) { notes.push(`skipped the English of ${full}: changing English needs --allow-english${toClaude(row) ? ` and --allow-to-claude (its English is sent to Claude, ${TO_CLAUDE})` : ''}`); continue }
      if (form === undefined) {
        if (row[l] !== v) { row[l] = v; changed += 1 }
      } else {
        const cur = typeof row[l] === 'object' && row[l] !== null ? row[l] : {}
        if (cur[form] !== v) { row[l] = { ...cur, [form]: v }; changed += 1 }
      }
    }
    const nc = col('notes')
    if (nc >= 0 && (rec[nc] ?? '') !== '' && row.note !== rec[nc]) {
      if (locked) notes.push(`skipped the note of ${full}: its English is sent to Claude (${TO_CLAUDE}); that needs --allow-to-claude`)
      else { row.note = rec[nc]; changed += 1 }
    }
  }
  if (!dry) {
    for (const a of t.data) writeArea(a, langs)
    if (regChanged) writeFileSync(p.langs, [...t.reg.lines.slice(0, t.reg.open + 1), ...reg.map(regLine), ...t.reg.lines.slice(t.reg.close)].join('\n'))
  }
  return { changed, added, newLangs, notes }
}


// ---- the Markdown page of every text, generated on demand from the table; check compares it with the file
const TEXTS_PAGE = 'docs/TEXTS.md'
// Where each area shows, in a few words (an area not listed here shows the code file it comes from).
const AREA_ABOUT = {
  band: 'The band above the prompt, and the lines it posts.', toast: 'Toasts and short notices.', needs: 'Needs you: what waits for an answer, and the inbox.',
  explain: 'What is this? and the plain-words explanations.', guard: 'The guard: what it stops and why.', winwords: 'The guard on Windows (PowerShell).',
  pane: 'The pane: the live lines of the cards.', glance: 'Glance rows: one headline per card.', cards: 'Cards: rules and titles.', cardsettings: 'The flip side of a card (its own settings).',
  settings: 'Settings: sections, rows, modes and layout names.', guide: 'The card guide.', common: 'Words shared by many places: buttons, levels, states, menus, help.',
  sys: 'Words of the system (Mac or PC).', compact: 'Shortening the chat: the card, advice and commands.', context: 'The Context health card.', skills: 'The Skills card.',
  find: 'Finding a skill.', talk: 'The Talk to other sessions card.', calm: 'Calm: focus and quiet times.', phone: 'The phone face.', phonecmds: 'Phone commands (/ok, /no, /go, /st).',
  awake: 'Keeping the computer awake.', popout: 'Pop out.', prs: 'The pull requests card.', ship: 'The Ship card.', shipstep: 'Ship steps (merge and check).', back: 'Where was I.',
  safety: 'The Safety card.', preview: 'The Preview card.', setup: 'The Agent setup card.', do: 'Do: run commands from the last answer.', runcost: 'Cost check before a task run.',
  fit: 'Model fit (the card and its advice).', fitsettings: 'Model fit settings.', selfcost: 'What vaken itself costs.',
  fmt: 'Numbers and times: a time gone, a length of time, an estimated price, day and month names.',
}
const mdCell = v => String(v ?? '').replace(/\\/g, '\\\\').replace(/[|*_`[\]<>&]/g, c => (c === '|' ? '\\|' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : `\\${c}`)).replace(/\r?\n/g, '<br>')
const mdText = x => (x === undefined || x === null ? '' : typeof x === 'string' ? mdCell(x) : Object.entries(x).map(([k, v]) => `${k}: ${mdCell(v)}`).join('<br>'))

function mdPage(root) {
  const { langs, data } = readTable(paths(root))
  const total = data.reduce((n, a) => n + a.rows.length, 0)
  const out = [
    '# Every text of vaken',
    '',
    `<!-- GENERATED from hooks/i18n/rows/*.ts by scripts/strings-md.sh. Do not edit by hand. -->`,
    '',
    `**Generated, never edit by hand.** This page is the one text table (\`mods/cockpit/hooks/i18n/rows\`) written out to read: ${total} texts in ${data.length} areas, languages ${langs.join(', ')}. To change a text, edit the table (or export the sheet with \`sh scripts/strings-export.sh sheet.csv\`, change it, and import it with \`sh scripts/strings-import.sh sheet.csv\`), then regenerate this page with \`sh scripts/strings-md.sh\`. \`sh scripts/check-strings.sh\` fails when this page is out of date.`,
    '',
    'A text with a count has two lines, `one` and `other`. `{n}` and the like are filled in when the text is shown.',
    '',
    '## Areas',
    '',
    ...data.map(a => `- [${a.area}](#${a.area}) (${a.rows.length}): ${AREA_ABOUT[a.area] ?? `Shown from ${a.where || 'the code'}.`}`),
  ]
  for (const a of data) {
    out.push('', `## ${a.area}`, '', `${AREA_ABOUT[a.area] ?? 'Shown from the code.'} (Code: ${a.where === '' ? 'n/a' : a.where.split(' ').map(f => `\`${f}\``).join(', ')}.)`, '')
    out.push(`| name | ${langs.join(' | ')} | note |`, `| --- | ${langs.map(() => '---').join(' | ')} | --- |`)
    for (const { name, row } of a.rows) out.push(`| \`${name}\` | ${langs.map(l => mdText(row[l])).join(' | ')} | ${mdCell(row.note ?? '')} |`)
  }
  return `${out.join('\n')}\n`
}

// ---- the check
const NAME_USE = /\b(?:t|tEn)\(\s*'([a-z0-9]+\.[a-z0-9_]+)'|\btIn\([^,()]+,\s*'([a-z0-9]+\.[a-z0-9_]+)'/g

function codeFiles(dir) {
  const out = []
  const walk = d => {
    for (const n of readdirSync(d)) {
      const f = join(d, n)
      if (statSync(f).isDirectory()) {
        if (relative(dir, f).split(sep).join('/') !== 'i18n/rows') walk(f)
      } else if (/\.tsx?$/.test(n)) out.push(f)
    }
  }
  walk(dir)
  return out
}

// The string literals of a source file, with their line, outside comments. Template literals with ${} are left out (they are built, not fixed). A light scanner:
// it knows comments, the three quotes and regex literals well enough for this code base.
function literals(src) {
  const out = []
  let i = 0
  let line = 1
  let prev = ''
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === '\n') { line += 1; i += 1; continue }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i += 1; continue }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; line += (src.slice(i, end).match(/\n/g) ?? []).length; i = end; continue }
    if (c === "'" || c === '"' || c === '`') {
      const start = line
      let j = i + 1
      let s = ''
      let built = false
      while (j < n && src[j] !== c) {
        if (src[j] === '\\') { s += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; continue }
        if (c === '`' && src[j] === '$' && src[j + 1] === '{') {
          built = true
          let depth = 1
          j += 2
          while (j < n && depth > 0) { if (src[j] === '{') depth += 1; else if (src[j] === '}') depth -= 1; if (src[j] === '\n') line += 1; j += 1 }
          continue
        }
        if (src[j] === '\n') { if (c !== '`') break; line += 1 }
        s += src[j]
        j += 1
      }
      if (!built) out.push({ s, line: start })
      i = j + 1
      prev = 'x'
      continue
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$|return$/.test(prev)) {
      // a regex literal
      let j = i + 1
      let cls = false
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') cls = true
        else if (src[j] === ']') cls = false
        else if (src[j] === '/' && !cls) break
        j += 1
      }
      i = j + 1
      prev = 'x'
      continue
    }
    if (!/\s/.test(c)) {
      if (/[A-Za-z_$]/.test(c)) {
        let j = i
        while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j += 1
        prev = src.slice(i, j) === 'return' ? 'return' : 'x'
        i = j
        continue
      }
      prev = c
    }
    i += 1
  }
  return out
}

// The source with its comments blanked (strings kept, line count kept), so a name in a comment is not counted as used.
function codeOnly(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i += 1; continue }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; out += src.slice(i, end).replace(/[^\n]/g, ' '); i = end; continue }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < n && src[j] !== c && !(c !== '`' && src[j] === '\n')) j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
      continue
    }
    out += c
    i += 1
  }
  return out
}

// A literal that reads like words a person sees: two or more words with letters, or one capitalised word of 3+ letters followed by nothing code-like.
function looksVisible(s) {
  if (s.length < 3 || s.length > 2000) return false
  if (!/[A-Za-z]{2}/.test(s)) return false
  if (/^[a-z0-9_.:\-/]+$/.test(s)) return false // ids, keys, paths, commands
  if (/^[A-Z0-9_]+$/.test(s)) return false // CONSTANT_NAMES
  if (/^(https?:|file:|data:|\.{0,2}\/|~\/|[A-Za-z]:\\)/.test(s)) return false
  if (/[{};]\s*$|^\s*[<{[(]|=>|\$\(|\|\||&&|^#!|\\[nrt]/.test(s) && !/^[A-Z][a-z]/.test(s)) return false
  if (/^-{1,2}[a-z]/.test(s)) return false // flags
  if (/^[a-z]+(\.[a-z0-9_]+)+$/i.test(s)) return false // dotted names
  const words = s.trim().split(/\s+/)
  if (words.length >= 2) return /[A-Za-z]{2}/.test(words[0] + words[1]) && !/^[a-z]+\(/.test(s)
  return /^[A-Z][a-z]{2,}[.!?…]?$/.test(s) // one capitalised word: a title or a button
}

// English on purpose, marked per text: a `// en-only: <reason>` comment at the end of a line covers the texts that start on that line; alone on a line it covers the
// next line. A marker covers every text that starts on its line (two strings on one line are both covered); a template literal that runs over several lines is covered only
// by a marker on its first line, and a text that starts on a later line needs its own. (The slash menu's descriptions and hints, the plain answers of slash commands and notes to Claude stay English; the reason says which.)
function enOnlyLines(src) {
  const out = new Set()
  src.split('\n').forEach((l, i) => {
    const m = /\/\/ en-only\b/.exec(l)
    if (m === null) return
    out.add(l.slice(0, m.index).trim() === '' ? i + 2 : i + 1)
  })
  return out
}

// The area of the text table (band and toasts, Settings and Help, pane cards, other) a file belongs to, by its path: the first rule that matches.
const BUCKETS = [
  ['2b band, toasts, Needs you, ledger', /features\/home\/(band|needs|rowact|actions|acts)|core\/(guard[a-z]*|band|toast|ledger|explain|titles|happened|inbox|attention|notify|needs)|features\/(happened|inbox|attention|explain)/],
  ['2c Settings, Help, guide, Arrange, phone', /arrange|views\/|settings|settingrow|help|guide|cardguide|phone|popout|registry|options|presets|menu/],
  ['2a pane cards', /features\/home\/|core\/(?!sys)[a-z]*(card|words)|core\/(headline|appcontext|cachefacts|computer|proof|ship|safety|context|preview|setup|back|prcard|skills|talk|calm|runcost|modelfit|selfcost|agentboard|crew|awake|compact|limits|cost|focus|layouts|look)/],
]
const bucketOf = rel => (BUCKETS.find(([, re]) => re.test(rel)) ?? ['other (commands, tools, engines)'])[0]

function readAllow(root) {
  const f = join(root, 'scripts', 'check-strings.allow')
  const out = { files: [], texts: new Set(), res: [], same: new Set(), built: [] }
  if (!existsSync(f)) return out
  for (const raw of readFileSync(f, 'utf8').replace(/\r/g, '').split('\n')) {
    const l = raw.trim()
    if (l === '' || l.startsWith('#')) continue
    const [kind, ...rest] = l.split(':')
    const val = rest.join(':').split(' | ')[0].trim()
    if (kind === 'file') out.files.push(val)
    else if (kind === 'text') out.texts.add(val)
    else if (kind === 'same') out.same.add(val)
    else if (kind === 'built') out.built.push(val)
    else if (kind === 're') out.res.push(new RegExp(val))
  }
  return out
}


// The lint for hand-made English outside hooks/i18n/: a plural built with an "s" (`n === 1 ? 'file': 'files'`, `file${n === 1 ? '': 's'}`, the
// plural() helper that took English words), a verb that agrees with a count (`n === 1 ? 'is' : 'are'`), and an array of English day or month names.
// Those are table rows with one and other forms (the "words" area) and fmt.day() and fmt.month(). A line that is not a text but looks like one carries `i18n-ok` in a comment.
const PLURAL_LINT = [
  [/[!=]==?\s*1\s*\?\s*(['"`])(s|es)?\1\s*:\s*(['"`])(s|es)?\3/, 'a plural made with an "s"'],
  [/[!=]==?\s*1\s*\?\s*(['"`])([A-Za-z][A-Za-z ]*)\1\s*:\s*(['"`])\2(s|es)\3/, 'a plural made with an "s"'],
  [/[!=]==?\s*1\s*\?\s*(['"`])([A-Za-z][A-Za-z ]*)\1\s*:\s*(['"`])[A-Za-z][A-Za-z ]*\3(?!\s*[?+])/, 'a word chosen by a count'],
  [/[!=]==?\s*1\s*\?\s*(['"`])(once)\1/, 'a count word made by hand'],
  [/(?<![.\w])plural\(/, 'a plural() helper that takes English words (use a "words" row with one and other)'],
  [/\b(Sun|Sunday)['"`],\s*['"`](Mon|Monday)\b|\b(Jan|January)['"`],\s*['"`](Feb|February)\b|\b(Mon|Monday)['"`],\s*['"`](Tue|Tuesday)\b/, 'an array of English day or month names (use fmt.day() and fmt.month())'],
]
function handMade(rel, src) {
  const out = []
  const raw = src.split('\n')
  codeOnly(src).split('\n').forEach((l, i) => {
    if (/i18n-ok/.test(raw[i] ?? '')) return
    for (const [re, what] of PLURAL_LINT) if (re.test(l)) { out.push(`${rel}:${i + 1}: ${what}: ${l.trim().slice(0, 110)}`); break }
  })
  return out
}

function check(root, { verbose = false, strict = false, dialogs = DIALOGS } = {}) {
  const p = paths(root)
  const t = readTable(p)
  const fails = []
  const warns = []
  const english = new Set()
  const names = new Set()
  // (r) the registry: well-formed lines, English first and full, known codes, statuses, decimal marks and plural rules, no code twice
  const rules = t.reg.rules
  fails.push(...t.reg.bad)
  if (t.reg.list[0]?.code !== 'en' || t.reg.list[0]?.status !== 'full') fails.push('langs.ts: English ("en", full) must be the first language')
  t.reg.list.forEach((l, i) => {
    const at = `langs.ts: ${l.code ?? `line ${i + 1}`}`
    if (!LANG_CODE.test(l.code ?? '')) fails.push(`${at}: the code must be a language code such as de or pt-BR`)
    if (t.reg.list.findIndex(x => x.code === l.code) !== i) fails.push(`${at}: the code is listed twice`)
    if (typeof l.name !== 'string' || l.name.trim() === '') fails.push(`${at}: no name`)
    if (l.status !== 'full' && l.status !== 'partial') fails.push(`${at}: the status must be "full" or "partial"`)
    if (l.decimal !== '.' && l.decimal !== ',') fails.push(`${at}: the decimal mark must be "." or ","`)
    if (rules[l.plural] === undefined) fails.push(`${at}: the plural rule must be one of ${Object.keys(rules).join(', ')}`)
  })
  const slots = s => (s.match(/\{[A-Za-z]+\}/g) ?? []).sort().join(' ')
  // How much of each language is done: rows with a line, and the names missing per area (a partial language's report).
  const cover = Object.fromEntries(t.reg.list.filter(l => l.code !== 'en').map(l => [l.code, { status: l.status, done: 0, total: 0, missing: {} }]))
  // (a) every row: a well-formed line, a name of its area, every full language (a partial one may miss rows), the plural forms of each language's rule, the same fill-ins
  for (const a of t.data) {
    fails.push(...a.bad)
    if (!t.areas.order.includes(a.area)) fails.push(`${a.area}.ts: not listed in hooks/i18n/table.ts AREAS`)
    let last = ''
    for (const { name, row, line } of a.rows) {
      const at = `${a.area}.ts:${line} ${name}`
      if (!NAME.test(name) || !name.startsWith(`${a.area}.`)) fails.push(`${at}: the name must be "${a.area}.<lower_case_slug>"`)
      if (names.has(name)) fails.push(`${at}: the name is used twice`)
      if (name < last) fails.push(`${at}: rows are not sorted by name`)
      last = name
      names.add(name)
      const en = formsOf(row.en)
      if (en.length === 0 || en.some(([, s]) => s === '')) fails.push(`${at}: no English`)
      for (const [, s] of en) english.add(s)
      const enOf = f => (en.find(([k]) => k === f) ?? en[0] ?? ['', ''])[1]
      for (const info of t.reg.list) {
        const l = info.code
        if (l === 'en') continue
        const x = row[l]
        const c = cover[l]
        c.total += 1
        // What the language says, form by form ("=" is the English on purpose); undefined when the row has no line for it.
        let got
        if (x === undefined || x === '') got = undefined
        else if (x === '=') got = en.map(([f, s]) => [f, s])
        else if (typeof x === 'string') {
          if (typeof row.en !== 'string') { fails.push(`${at}: "${l}" needs the plural forms ${(rules[info.plural] ?? []).join(' and ')}, or "="`); continue }
          got = [['', x]]
        } else {
          if (typeof row.en === 'string') { fails.push(`${at}: "${l}" has plural forms, and the English has none`); continue }
          const extra = Object.keys(x).filter(k => k !== 'one' && k !== 'other')
          if (extra.length > 0) { fails.push(`${at}: "${l}" has forms the table does not know: ${extra.join(', ')}`); continue }
          got = (rules[info.plural] ?? ['one', 'other']).map(f => [`#${f}`, x[f] === '=' ? enOf(`#${f}`) : (x[f] ?? '')])
        }
        if (got === undefined || got.some(([, s]) => s === '')) {
          if (info.status === 'full') fails.push(`${at}: no "${l}" line`)
          else (c.missing[a.area] ??= []).push(name)
          continue
        }
        c.done += 1
        for (const [f, s] of got) if (slots(enOf(f)) !== slots(s)) fails.push(`${at}: "${l}" has other fill-ins than English${f === '' ? '' : ` (${f.slice(1)})`}`)
      }
    }
  }
  // (a2) the same English in two rows must say the same in every language, in the same area or not, and a plural row's form against a plain row ("{n} things" as the
  // "other" form of one row and the whole of another): the lookup by English text keeps only one of them, so a different wording in the other is silently lost (it hid
  // the band wording after the pane cards in step 2b). The forms of one row are not compared with each other (a language may need two forms where English has one).
  // `same:<English> | reason` in scripts/check-strings.allow lists the few lines that are meant to differ (a mode name and a button with the same word).
  {
    const allowSame = readAllow(root).same
    const seen = new Map()
    for (const a of t.data)
      for (const { name, row } of a.rows)
        for (const [form, en] of formsOf(row.en))
          for (const l of t.langs) {
            if (l === 'en') continue
            const x = row[l]
            // "=" is the English (a whole row, or one form)
            const raw = x === '=' ? en : formsOf(x).find(([f]) => f === form)?.[1]
            if (raw === undefined || raw === '') continue
            const said = raw === '=' ? en : raw
            const key = `${l}\u0000${en}`
            const first = seen.get(key)
            if (first === undefined) seen.set(key, { name, sv: said, area: a.area })
            else if (first.sv !== said && first.name !== name && !allowSame.has(en)) fails.push(`${name}: "${en}" is also ${first.name} with other ${l} words ("${first.sv}" and "${said}"); use one wording, or list it as same:<English> in scripts/check-strings.allow`)
          }
  }
  // (a3) a dialog's two buttons say different things in every language: the engine gives back the label pressed, so the same word on both would make No a yes
  // (core/confirm.ts counts it as No; this stops it before it ships). A pair whose row is missing fails too, so a renamed row cannot skip the check.
  {
    const rowOf = Object.fromEntries(t.data.flatMap(a => a.rows.map(r => [r.name, r.row])))
    const label = (row, l) => {
      const x = row[l]
      return (x === undefined || x === '' || x === '=' || typeof x !== 'string' ? row.en : x).trim().toLowerCase()
    }
    for (const [yes, no] of dialogs) {
      const y = rowOf[yes]
      const n = rowOf[no]
      if (y === undefined || n === undefined) { fails.push(`dialog ${yes} / ${no}: the row ${y === undefined ? yes : no} is not in the table (scripts/strings.mjs DIALOGS)`); continue }
      if (typeof y.en !== 'string' || typeof n.en !== 'string') { fails.push(`dialog ${yes} / ${no}: a dialog button must be a plain row, not a plural row`); continue }
      for (const l of t.langs) if (label(y, l) === label(n, l)) fails.push(`dialog ${yes} / ${no}: both buttons say "${label(y, l)}" in "${l}"; a dialog's yes and no must differ`)
    }
  }
  for (const a of t.areas.order) if (!t.areas.files.includes(a)) fails.push(`hooks/i18n/table.ts lists area "${a}" but rows/${a}.ts is missing`)
  // (b) names used in code but not in the table; (c) rows never used; (d) visible literals not through the table
  const allow = readAllow(root)
  const usedNames = new Set()
  const literalsSeen = new Set()
  const loose = []
  for (const f of codeFiles(p.hooks)) {
    const rel = relative(p.hooks, f).split(sep).join('/')
    if (rel.startsWith('i18n/')) continue
    const src = readFileSync(f, 'utf8')
    fails.push(...handMade(rel, src))
    for (const m of codeOnly(src).matchAll(NAME_USE)) {
      const n = m[1] ?? m[2]
      usedNames.add(n)
      if (!names.has(n)) fails.push(`${rel}: uses "${n}", which is not in the table`)
    }
    const skipFile = allow.files.some(x => rel === x || rel.startsWith(x.endsWith('/') ? x : `${x}/`))
    const marked = enOnlyLines(src)
    for (const { s, line } of literals(src)) {
      literalsSeen.add(s)
      if (names.has(s)) usedNames.add(s) // a name held in a table of names (core/settingsmap.ts NOTES) is a use too
      if (skipFile || marked.has(line) || english.has(s) || !looksVisible(s) || allow.texts.has(s) || allow.res.some(r => r.test(s))) continue
      loose.push({ rel, line, s })
    }
    if (rel.endsWith('.tsx'))
      src.split('\n').forEach((l, i) => {
        for (const m of l.matchAll(/>([^<>{}=]*[A-Za-z]{2,}[^<>{}=]*)<\//g)) {
          const s = m[1].trim()
          if (!skipFile && !marked.has(i + 1) && !english.has(s) && !allow.texts.has(s)) loose.push({ rel, line: i + 1, s, jsx: true })
        }
        // A picture's `alt` is read aloud, so it is visible text. A fixed `alt="..."` and the literals inside `alt={...}` are checked even when they look like one lowercase
        // word ("rule", "on"), which looksVisible lets through. Built (`${}`) alts are left to their caller.
        for (const m of l.matchAll(/\balt=(?:"([^"{}$]*)"|\{([^{}]*)\})/g)) {
          const lits = m[1] !== undefined ? [m[1]] : [...m[2].matchAll(/'([^'$]*)'|"([^"$]*)"/g)].map(x => x[1] ?? x[2])
          for (const s of lits) {
            if (!/[A-Za-z]{2}/.test(s) || skipFile || marked.has(i + 1) || names.has(s) || english.has(s) || allow.texts.has(s) || allow.res.some(r => r.test(s))) continue
            if (!loose.some(x => x.rel === rel && x.line === i + 1 && x.s === s)) loose.push({ rel, line: i + 1, s, alt: true })
          }
        }
      })
  }
  let unused = 0
  const unusedList = []
  for (const a of t.data)
    for (const { name, row } of a.rows) {
      // built:<name or area.> in scripts/check-strings.allow: a row whose line is put together from parts at run time (a stored line said again, a template read by its shape)
      if (usedNames.has(name) || allow.built.some(b => (b.endsWith('.') ? name.startsWith(b) : name === b)) || formsOf(row.en).some(([, s]) => literalsSeen.has(s))) continue
      unused += 1
      unusedList.push(name)
    }
  if (unused > 0) warns.push(`${unused} rows are never used by name, and their English is not a literal in the code (it may be built from parts). ${verbose ? '' : 'Add --verbose to list them.'}`)
  if (verbose) for (const n of unusedList) warns.push(`  unused: ${n}`)
  // The generated page of every text comes from the table: stale (or missing, in a repo with a docs folder) fails
  if (existsSync(join(root, 'docs'))) {
    const page = join(root, TEXTS_PAGE)
    if (!existsSync(page)) fails.push(`${TEXTS_PAGE} is missing: run sh scripts/strings-md.sh`)
    else if (readFileSync(page, 'utf8').replace(/\r/g, '') !== mdPage(root)) fails.push(`${TEXTS_PAGE} is out of date with the table: run sh scripts/strings-md.sh`)
  }
  const buckets = {}
  for (const x of loose) (buckets[bucketOf(x.rel)] ??= []).push(x)
  return { t, fails, warns, loose, buckets, strict, cover }
}

// The coverage lines: each language, how much is done; a partial one also lists, per area with gaps, how many rows are missing and the first few names.
function coverageLines(cover, verbose) {
  const out = []
  for (const [l, c] of Object.entries(cover)) {
    const pct = c.total === 0 ? 100 : Math.floor((c.done / c.total) * 100)
    out.push(`coverage ${l} (${c.status}): ${c.done} of ${c.total} rows (${pct}%)${c.done < c.total ? ', the rest shows English' : ''}`)
    for (const [area, xs] of Object.entries(c.missing)) out.push(`  ${area}: ${xs.length} missing, first ${xs.slice(0, verbose ? xs.length : 3).join(', ')}`)
  }
  return out
}

function report(r, verbose) {
  const rows = r.t.data.reduce((s, a) => s + a.rows.length, 0)
  console.log(`check-strings: ${rows} rows in ${r.t.data.length} areas, languages ${r.t.langs.join(', ')}`)
  for (const l of coverageLines(r.cover, verbose)) console.log(l)
  for (const w of r.warns) console.log(`warn: ${w}`)
  console.log(`warn: ${r.loose.length} text literals look visible and are not in the table (--strict, which CI runs, makes this a failure):`)
  for (const [b, xs] of Object.entries(r.buckets).sort()) {
    console.log(`  ${String(xs.length).padStart(5)}  ${b}`)
    const files = {}
    for (const x of xs) files[x.rel] = (files[x.rel] ?? 0) + 1
    const top = Object.entries(files).sort((a, b) => b[1] - a[1])
    console.log(`         ${top.slice(0, verbose ? top.length : 6).map(([f, n]) => `${f} ${n}`).join(', ')}${!verbose && top.length > 6 ? `, and ${top.length - 6} more files` : ''}`)
  }
  if (verbose) for (const x of r.loose) console.log(`  ${x.rel}:${x.line}: ${JSON.stringify(x.s).slice(0, 140)}`)
  if (r.fails.length > 0) {
    console.log(`check-strings: FAILED, ${r.fails.length} problems:`)
    for (const f of r.fails.slice(0, 200)) console.log(`  ${f}`)
    return 1
  }
  if (r.strict && r.loose.length > 0) {
    console.log('check-strings: FAILED (--strict): visible literals not in the table')
    return 1
  }
  console.log('check-strings: clean (table)')
  return 0
}

// ---- the selftest: a throwaway copy with one planted fault per rule; each must be found, and the clean copy must pass
function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-strings-selftest-'))
  try {
    const mk = (files) => {
      const root = mkdtempSync(join(base, 'r-'))
      for (const [f, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, f)), { recursive: true })
        writeFileSync(join(root, f), text)
      }
      return root
    }
    // The registry of the throwaway copy: the real langs.ts (its plural rules) with the given languages.
    const realLangs = readFileSync(join(HERE, '..', 'mods', 'cockpit', 'hooks', 'i18n', 'langs.ts'), 'utf8').replace(/\r/g, '').split('\n')
    const ro = realLangs.findIndex(l => REG_OPEN.test(l))
    const rc = realLangs.findIndex((l, i) => i > ro && l === ']')
    const L = (code, status = 'full', plural = 'one_other', decimal = '.') => ({ code, name: code, status, decimal, plural })
    const langsFile = list => [...realLangs.slice(0, ro + 1), ...list.map(regLine), ...realLangs.slice(rc)].join('\n')
    const types = langsFile([L('en'), L('sv', 'full', 'one_other', ',')])
    const table = "import { ROWS as demo } from './rows/demo'\nexport const AREAS = [\n  ['demo', demo],\n]\n"
    const rows = rs => `// where: core/demo.ts\nimport type { Rows } from '../types'\n\nexport const ROWS: Rows = {\n${rs.join('\n')}\n}\n`
    const good = ['  "demo.hello": {"en":"Hello {n}","sv":"Hej {n}"},', '  "demo.save": {"en":"Save","sv":"Spara"},']
    const code = "import { t } from '../i18n/t'\nexport const a = (n: number) => t('demo.hello', { n })\nexport const b = 'Save'\n"
    const files = rs => ({ 'mods/cockpit/hooks/i18n/langs.ts': types, 'mods/cockpit/hooks/i18n/table.ts': table, 'mods/cockpit/hooks/i18n/rows/demo.ts': rows(rs) })
    // two areas: 'other' holds "Save" too, with the Swedish given
    const two = sv => ({ ...files(good), 'mods/cockpit/hooks/i18n/table.ts': "import { ROWS as demo } from './rows/demo'\nimport { ROWS as other } from './rows/other'\nexport const AREAS = [\n  ['demo', demo],\n  ['other', other],\n]\n", 'mods/cockpit/hooks/i18n/rows/other.ts': rows([`  "other.save": {"en":"Save","sv":"${sv}"},`]) })
    const cases = [
      ['clean', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0 && r.loose.length === 0],
      ['a row with no Swedish', { ...files(['  "demo.hello": {"en":"Hello {n}"},', good[1]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('no "sv" line'))],
      ['other fill-ins', { ...files(['  "demo.hello": {"en":"Hello {n}","sv":"Hej {m}"},', good[1]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('other fill-ins'))],
      ['a name used but not in the table', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': `${code}export const c = t('demo.missing')\n` }, r => r.fails.some(f => f.includes('"demo.missing", which is not in the table'))],
      ['an unused row (warn)', { ...files([...good, '  "demo.zzz": {"en":"Never shown","sv":"Visas aldrig"},']), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0 && r.warns.some(w => w.startsWith('1 rows are never used'))],
      ['an unused row listed as built (no warn)', { ...files([...good, '  "demo.zzz": {"en":"Never shown","sv":"Visas aldrig"},']), 'scripts/check-strings.allow': 'built:demo.zzz | put together at run time\n', 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0 && !r.warns.some(w => w.includes('never used'))],
      ['a visible text not in the table (warn)', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': `${code}export const d = 'Could not read the file.'\n` }, r => r.fails.length === 0 && r.loose.some(x => x.s === 'Could not read the file.')],
      ['a visible text marked en-only at the end of its line', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': `${code}export const d = 'Could not read the file.' // en-only: text twin\n` }, r => r.fails.length === 0 && r.loose.length === 0],
      ['a visible text marked en-only on the line above', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': `${code}// en-only: slash menu text\nexport const d = 'Could not read the file.'\nexport const e = 'Read it twice.'\n` }, r => r.loose.length === 1 && r.loose[0].s === 'Read it twice.'],
      ['one marker covers both strings on its line', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': `${code}export const d = ['Could not read the file.', 'Read it twice.'] // en-only: text twin\n` }, r => r.loose.length === 0],
      ['a marker covers a multi-line template only from its start line', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': `${code}// en-only: text twin\nexport const d = \`Could not read the file.\nRead it twice.\`\nexport const e = [\`First long sentence here\nand more\`, 'Another sentence here.']\n` }, r => r.loose.length === 2],
      ['a bare alt in a tsx file (A7)', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code, 'mods/cockpit/hooks/ui/demo.tsx': "export const e = <Svg alt=\"rule\" />\nexport const f = <Svg alt={on ? 'open' : 'Save'} />\nexport const g = <Svg alt={t('demo.hello')} />\n" }, r => r.loose.some(x => x.s === 'rule' && x.alt === true) && r.loose.some(x => x.s === 'open' && x.alt === true) && !r.loose.some(x => x.s === 'Save' || x.s === 'demo.hello')],
      ['a row that is not one line', { ...files([good[0], '  "demo.save": {"en":"Save",', '    "sv":"Spara"},']), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('not one row on one line'))],
      ['rows out of order', { ...files([good[1], good[0]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('not sorted'))],
      ['the same English in two areas with other Swedish', { ...two('Sparar'), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('other.save') && f.includes('with other sv words'))],
      ['the same English in two areas with the same Swedish', { ...two('Spara'), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0],
      ['the same English in two areas, listed as meant to differ', { ...two('Sparar'), 'scripts/check-strings.allow': 'same:Save | a mode name and a button\n', 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0],
      ['the same English twice in one area with other Swedish', { ...files([...good, '  "demo.save_now": {"en":"Save","sv":"Sparar"},']), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('demo.save_now') && f.includes('with other sv words'))],
      ['a plural form and a plain row with the same English and other Swedish', { ...files([good[0], '  "demo.n": {"en":{"one":"{n} file","other":"{n} files"},"sv":{"one":"{n} fil","other":"{n} filer"}},', '  "demo.n_plain": {"en":"{n} files","sv":"{n} st filer"},', good[1]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('demo.n_plain') && f.includes('with other sv words'))],
      ['a plural row whose English forms are the same, with two Swedish forms', { ...files([good[0], '  "demo.n": {"en":{"one":"{n} sheep","other":"{n} sheep"},"sv":{"one":"{n} får","other":"{n} fåren"}},', good[1]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => !r.fails.some(f => f.includes('with other sv words'))],
      ['"=" is the English on purpose, fill-ins and all', { ...files(['  "demo.hello": {"en":"Hello {n}","sv":"="},', good[1]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0],
      ['a partial language may miss rows; its coverage names them', { ...files([good[0], '  "demo.save": {"en":"Save","sv":"Spara","de":"Speichern"},']), 'mods/cockpit/hooks/i18n/langs.ts': langsFile([L('en'), L('sv'), L('de', 'partial')]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0 && r.cover.de.done === 1 && r.cover.de.total === 2 && r.cover.de.missing.demo?.[0] === 'demo.hello' && coverageLines(r.cover, false).some(l => l.startsWith('coverage de (partial): 1 of 2 rows (50%)'))],
      ['a partial language still needs the same fill-ins', { ...files(['  "demo.hello": {"en":"Hello {n}","sv":"Hej {n}","de":"Hallo"},', good[1]]), 'mods/cockpit/hooks/i18n/langs.ts': langsFile([L('en'), L('sv'), L('de', 'partial')]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('"de" has other fill-ins'))],
      ['a language with one form for every count needs only "other"', { ...files([good[0], '  "demo.n": {"en":{"one":"{n} file","other":"{n} files"},"sv":{"one":"{n} fil","other":"{n} filer"},"ja":{"other":"{n} ファイル"}},', good[1]]), 'mods/cockpit/hooks/i18n/langs.ts': langsFile([L('en'), L('sv'), L('ja', 'partial', 'other_only')]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.length === 0 && r.cover.ja.done === 1],
      ['a full language with a plural form missing fails', { ...files([good[0], '  "demo.n": {"en":{"one":"{n} file","other":"{n} files"},"sv":{"other":"{n} filer"}},', good[1]]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('demo.n: no "sv" line'))],
      ['a plural made by hand fails', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code + "\nexport const n = (c: number) => `${c} file${c === 1 ? '' : 's'}`\n" }, r => r.fails.some(f => f.includes('demo.ts') && f.includes('a plural made with an "s"'))],
      ['a word chosen by a count fails', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code + "\nexport const w = (c: number) => (c === 1 ? 'is' : 'are')\n" }, r => r.fails.some(f => f.includes('a word chosen by a count'))],
      ['an array of English day names fails', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code + "\nexport const days = ['Sun', 'Mon', 'Tue']\n" }, r => r.fails.some(f => f.includes('an array of English day or month names'))],
      ['a hand-made plural marked i18n-ok passes', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code + "\nexport const w = (c: number) => (c === 1 ? 'is' : 'are') // i18n-ok: a code word\n" }, r => r.fails.length === 0],
      ['a dialog whose two buttons say the same in a language fails', { ...files([...good, '  "demo.skip": {"en":"Skip","sv":"spara "},']), 'mods/cockpit/hooks/core/demo.ts': `${code}export const s = t('demo.skip')\n` }, r => r.fails.some(f => f.includes('dialog demo.save / demo.skip') && f.includes('"sv"')), { dialogs: [['demo.save', 'demo.skip']] }],
      ['a dialog whose two buttons differ passes', { ...files([...good, '  "demo.skip": {"en":"Skip","sv":"Hoppa över"},']), 'mods/cockpit/hooks/core/demo.ts': `${code}export const s = t('demo.skip')\n` }, r => r.fails.length === 0, { dialogs: [['demo.save', 'demo.skip']] }],
      ['a dialog row that is not in the table fails', { ...files(good), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('demo.gone is not in the table')), { dialogs: [['demo.save', 'demo.gone']] }],
      ['a bad registry line fails', { ...files(good), 'mods/cockpit/hooks/i18n/langs.ts': langsFile([L('en'), L('sv', 'full', 'one_other', ';'), L('de', 'half', 'nine_forms')]), 'mods/cockpit/hooks/core/demo.ts': code }, r => r.fails.some(f => f.includes('sv: the decimal mark')) && r.fails.some(f => f.includes('de: the status')) && r.fails.some(f => f.includes('de: the plural rule'))],
    ]
    let missed = 0
    for (const [what, fs, ok, opts] of cases) {
      const r = check(mk(fs), { dialogs: [], ...opts })
      if (!ok(r)) { console.log(`check-strings selftest: FAILED on: ${what}`); console.log(JSON.stringify({ fails: r.fails, warns: r.warns, loose: r.loose }, null, 1)); missed += 1 }
    }
    // export and import: a sheet with a changed Swedish line and a new language column comes back into the table
    const root = mk({ ...files(good), 'mods/cockpit/hooks/core/demo.ts': code })
    const sheet = join(base, 'sheet.csv')
    exportSheet(root, sheet, true)
    const csv = readFileSync(sheet, 'utf8').replace('Spara', 'Spara nu').replace('name,area,where,en,sv,notes', 'name,area,where,en,sv,de,notes').replace(/^(demo\.save,[^\n]*?),Spara nu,/m, '$1,Spara nu,Speichern,')
    writeFileSync(sheet, csv)
    importSheet(root, sheet, false)
    const after = readArea(paths(root), 'demo')
    const save = after.rows.find(x => x.name === 'demo.save')?.row ?? {}
    if (save.sv !== 'Spara nu' || save.de !== 'Speichern' || !readLangs(paths(root)).includes('de')) { console.log(`check-strings selftest: FAILED on: export, edit and import (${JSON.stringify(save)})`); missed += 1 }
    // a translator's sheet: export --lang de, fill the language lines and one row, touch an English cell; import adds "de" as partial with its name and mark,
    // takes the row, and leaves the English as it was
    const root3 = mk({ ...files(good), 'mods/cockpit/hooks/core/demo.ts': code })
    const tsheet = join(base, 'de.csv')
    exportLang(root3, tsheet, false, ',', 'de')
    const tcsv = readFileSync(tsheet, 'utf8').split('\n')
    if (tcsv[0] !== 'name,where,note,en,de' || !tcsv[1].startsWith('@name,') || !tcsv.some(l => l.startsWith('demo.save,'))) { console.log(`check-strings selftest: FAILED on: export --lang (${tcsv.slice(0, 3).join(' | ')})`); missed += 1 }
    const filled = tcsv.map(l => (l.startsWith('@name,') ? `${l}Deutsch` : l.startsWith('@decimal,') ? `${l}","` : l.startsWith('demo.save,') ? `${l.replace(',Save,', ',Save now,')}Speichern` : l)).join('\n')
    writeFileSync(tsheet, filled)
    const ti = importSheet(root3, tsheet, false)
    const tsave = readArea(paths(root3), 'demo').rows.find(x => x.name === 'demo.save')?.row ?? {}
    const de = readRegistry(paths(root3)).list.find(l => l.code === 'de')
    if (tsave.de !== 'Speichern' || tsave.en !== 'Save' || de?.name !== 'Deutsch' || de?.decimal !== ',' || de?.status !== 'partial' || !ti.notes.some(n => n.includes('English of demo.save'))) { console.log(`check-strings selftest: FAILED on: import of a translator's sheet (${JSON.stringify({ tsave, de, notes: ti.notes })})`); missed += 1 }
    const tnew = join(base, 'de-new.csv')
    writeFileSync(tnew, 'name,where,note,en,de\ndemo.brand_new,,,Brand new,Ganz neu\n')
    const tn = importSheet(root3, tnew, false)
    if (readArea(paths(root3), 'demo').rows.some(x => x.name === 'demo.brand_new') || !tn.notes.some(n => n.includes('skipped, not in the table: demo.brand_new'))) { console.log(`check-strings selftest: FAILED on: a translator's row that is not in the table (${JSON.stringify(tn)})`); missed += 1 }
    const badReg = mk({ ...files(good), 'mods/cockpit/hooks/i18n/langs.ts': types.replace('{"code":"sv"', '{code:"sv"'), 'mods/cockpit/hooks/core/demo.ts': code })
    for (const [what, run] of [['import', () => importSheet(badReg, tnew, true)], ['export', () => exportSheet(badReg, join(base, 'x.csv'), false)], ['export --lang', () => exportLang(badReg, join(base, 'y.csv'), false, ',', 'de')]]) {
      let threw = false
      try { run() } catch (e) { threw = String(e.message).includes('bad line') }
      if (!threw) { console.log(`check-strings selftest: FAILED on: ${what} with a bad registry line must stop`); missed += 1 }
    }
    if (check(root3, { dialogs: [] }).fails.length > 0) { console.log(`check-strings selftest: FAILED on: the check after a translator's import (${JSON.stringify(check(root3, { dialogs: [] }).fails)})`); missed += 1 }
    // a translator's sheet with a second language column is refused whole
    const tmore = join(base, 'de-more.csv')
    writeFileSync(tmore, 'name,where,note,en,de,sv\ndemo.save,,,Save,Speichern,Rädda\n')
    let moreThrew = false
    try { importSheet(root3, tmore, false) } catch (e) { moreThrew = String(e.message).includes('one language column') }
    if (!moreThrew || readArea(paths(root3), 'demo').rows.find(x => x.name === 'demo.save')?.row.sv !== 'Spara') { console.log("check-strings selftest: FAILED on: a translator's sheet with two language columns must be refused"); missed += 1 }
    // English changes only with --allow-english; the English and note of a [to-claude] row only with --allow-to-claude too (its Swedish is only shown)
    const guarded = ['  "demo.hello": {"en":"Hello {n}","sv":"Hej {n}"},', '  "demo.note": {"en":"Run the checks.","sv":"Kör kontrollerna.","note":"Sent to Claude [to-claude]"},', good[1]]
    const root4 = mk({ ...files(guarded), 'mods/cockpit/hooks/core/demo.ts': code })
    const gsheet = join(base, 'g.csv')
    writeFileSync(gsheet, 'name,area,where,en,sv,notes\ndemo.save,demo,,Delete all,Spara,\ndemo.note,demo,,Delete every file.,Radera allt.,Plain note\ndemo.added,demo,,New,Ny,\n')
    const rowsOf4 = () => Object.fromEntries(readArea(paths(root4), 'demo').rows.map(x => [x.name, x.row]))
    const g0 = importSheet(root4, gsheet, false)
    const r0 = rowsOf4()
    if (r0['demo.save'].en !== 'Save' || r0['demo.note'].en !== 'Run the checks.' || r0['demo.note'].sv !== 'Radera allt.' || r0['demo.note'].note !== 'Sent to Claude [to-claude]' || r0['demo.added'] !== undefined || g0.changed !== 1 || !g0.notes.some(n => n.includes('needs --allow-english'))) { console.log(`check-strings selftest: FAILED on: English and [to-claude] rows without a flag (${JSON.stringify({ r0, g0 })})`); missed += 1 }
    importSheet(root4, gsheet, false, { allowEnglish: true })
    const r1 = rowsOf4()
    if (r1['demo.save'].en !== 'Delete all' || r1['demo.added']?.en !== 'New' || r1['demo.note'].en !== 'Run the checks.' || r1['demo.note'].note !== 'Sent to Claude [to-claude]') { console.log(`check-strings selftest: FAILED on: --allow-english (${JSON.stringify(r1)})`); missed += 1 }
    importSheet(root4, gsheet, false, { allowEnglish: true, allowToClaude: true })
    const r2 = rowsOf4()
    if (r2['demo.note'].en !== 'Delete every file.' || r2['demo.note'].note !== 'Plain note') { console.log(`check-strings selftest: FAILED on: --allow-english with --allow-to-claude (${JSON.stringify(r2)})`); missed += 1 }
    // sheet round trips that must give 0 changes: comma; semicolon with a BOM; the comma sheet as Excel on a Swedish PC saves it back (one column, ";;;;"
    // padding, a cell with quotes wrapped and doubled); and CRLF line ends. The Swedish line holds a comma, a quote, a semicolon at its end.
    const tricky = ['  "demo.hello": {"en":"Hello {n}","sv":"Hej {n}"},', '  "demo.q": {"en":"Say \\"hi\\", then go;","sv":"Säg \\"hej\\", gå;"},', good[1]]
    const root2 = mk({ ...files(tricky), 'mods/cockpit/hooks/core/demo.ts': code })
    const read = (f, sepChar, bom) => { exportSheet(root2, f, bom, sepChar); return readFileSync(f, 'utf8') }
    const comma = read(join(base, 'c.csv'), ',', false)
    const semi = read(join(base, 's.csv'), ';', true)
    const excelSv = comma.split('\n').filter(l => l !== '').map(l => `${/["\n]/.test(l) ? `"${l.replace(/"/g, '""')}"` : l};;;;`).join('\r\n') + '\r\n'
    const variants = [
      ['comma', comma],
      ['semicolon with a BOM', semi],
      ['comma sheet as Excel (Swedish) saves it, ";;;;" padding', excelSv],
      ['comma with CRLF line ends', comma.replace(/\n/g, '\r\n')],
      ['semicolon with CRLF and a BOM and padding', semi.replace(/\n/g, ';;;;\r\n')],
    ]
    for (const [what, text] of variants) {
      const f = join(base, 'variant.csv')
      writeFileSync(f, text)
      const r = importSheet(root2, f, true)
      if (r.changed !== 0 || r.added !== 0 || r.notes.length > 0) { console.log(`check-strings selftest: FAILED on round trip: ${what} (${JSON.stringify(r)})`); missed += 1 }
    }
    if (sepOf(semi) !== ';' || sepOf(comma) !== ',' || !semi.startsWith('﻿')) { console.log('check-strings selftest: FAILED on the separator or the BOM of the export'); missed += 1 }
    // the Markdown page: current passes; stale and missing fail; a pipe, a line break, a plural and a tag are escaped
    const withDocs = mk({ ...files(['  "demo.hello": {"en":"Hello {n}","sv":"Hej {n}"},', '  "demo.pipe": {"en":"a | b\\nc <i>","sv":"x"},', '  "demo.save": {"en":"Save","sv":"Spara"},']), 'docs/keep': '', 'mods/cockpit/hooks/core/demo.ts': code })
    const page = mdPage(withDocs)
    if (!page.includes('a \\| b<br>c &lt;i&gt;') || page.split('\n').some(l => l.startsWith('| `demo.') && !l.endsWith('|'))) { console.log('check-strings selftest: FAILED on: the Markdown page escapes'); missed += 1 }
    if (!check(withDocs, { dialogs: [] }).fails.some(f => f.includes('is missing'))) { console.log('check-strings selftest: FAILED on: a missing docs/TEXTS.md'); missed += 1 }
    writeFileSync(join(withDocs, TEXTS_PAGE), page)
    if (check(withDocs, { dialogs: [] }).fails.some(f => f.includes('TEXTS.md'))) { console.log('check-strings selftest: FAILED on: a current docs/TEXTS.md'); missed += 1 }
    writeFileSync(join(withDocs, TEXTS_PAGE), page.replace('Spara', 'Spara nu'))
    if (!check(withDocs, { dialogs: [] }).fails.some(f => f.includes('out of date'))) { console.log('check-strings selftest: FAILED on: a stale docs/TEXTS.md'); missed += 1 }
    if (missed > 0) return 1
    console.log(`check-strings selftest: ok (${cases.length} cases, export, edit, import with a new language, a translator's sheet (one language only), English and [to-claude] rows behind their flags, and ${variants.length} sheet round trips with 0 changes, and the Markdown page current, stale and missing)`)
    return 0
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
}

// ---- the command line
const [cmd, ...args] = process.argv.slice(2)
const flag = f => args.includes(f)
const OPTS = ['--root', '--sep', '--lang'] // options that take a value
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined }
const positional = args.filter((a, i) => !a.startsWith('--') && !OPTS.includes(args[i - 1]))
// The wrapper scripts start in the repo root; a relative sheet path means the folder the person was in (STRINGS_CALLER_DIR, set by the wrapper).
const fromCaller = f => (f === undefined ? undefined : resolve(process.env.STRINGS_CALLER_DIR || process.cwd(), f))
const ROOT = opt('--root') ?? join(HERE, '..')
const sepArg = () => {
  if (flag('--excel-sv')) return ';'
  const v = opt('--sep')
  if (v === undefined) return ','
  if (v === ',' || v === 'comma') return ','
  if (v === ';' || v === 'semicolon') return ';'
  throw new Error(`--sep takes ";" or "," (or the words semicolon and comma), not ${JSON.stringify(v)}`)
}
try {
  if (cmd === 'export') {
    const out = fromCaller(positional[0])
    const n = flag('--lang') ? exportLang(ROOT, out, flag('--bom') || flag('--excel-sv'), sepArg(), opt('--lang')) : exportSheet(ROOT, out, flag('--bom') || flag('--excel-sv'), sepArg())
    if (out !== undefined) console.error(`strings-export: ${n} lines written to ${out}`)
  } else if (cmd === 'import') {
    const file = fromCaller(positional[0])
    if (file === undefined) { console.error('usage: strings-import.sh SHEET.csv [--dry-run] [--allow-english] [--allow-to-claude]'); process.exit(2) }
    const r = importSheet(ROOT, file, flag('--dry-run'), { allowEnglish: flag('--allow-english'), allowToClaude: flag('--allow-to-claude') })
    for (const n of r.notes) console.log(`note: ${n}`)
    console.log(`strings-import: ${r.changed} cells changed, ${r.added} rows added${r.newLangs.length > 0 ? `, new languages: ${r.newLangs.join(', ')}` : ''}${flag('--dry-run') ? ' (dry run, nothing written)' : ''}`)
  } else if (cmd === 'md') {
    const out = fromCaller(positional[0]) ?? join(ROOT, TEXTS_PAGE)
    writeFileSync(out, mdPage(ROOT))
    console.error(`strings-md: written to ${out}`)
  } else if (cmd === 'check') {
    if (flag('--selftest')) process.exit(selftest())
    process.exit(report(check(ROOT, { verbose: flag('--verbose'), strict: flag('--strict') }), flag('--verbose')))
  } else {
    console.error('usage: node scripts/strings.mjs md [FILE] | export [FILE] [--lang CODE] [--bom] [--sep ";"] [--excel-sv] | import FILE [--dry-run] [--allow-english] [--allow-to-claude] | check [--verbose] [--strict] | check --selftest')
    process.exit(2)
  }
} catch (e) {
  console.error(`strings: ${e.message}`)
  process.exit(2)
}
