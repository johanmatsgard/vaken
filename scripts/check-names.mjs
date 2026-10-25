import fs from 'fs'
import path from 'path'

const fails = []
const plugin = JSON.parse(fs.readFileSync('mods/cockpit/.claude-plugin/plugin.json', 'utf8'))
if (plugin.name !== 'vaken') fails.push(`plugin.json name is "${plugin.name}", not vaken`)
if (/cockpit/i.test(plugin.description ?? '')) fails.push('plugin.json description names the old product')
const market = JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json', 'utf8'))
const mine = market.plugins.find(p => p.source === './mods/cockpit')
if (mine === undefined || mine.name !== 'vaken') fails.push('marketplace.json: the plugin at ./mods/cockpit is not named vaken')
if (mine !== undefined && /cockpit/i.test(mine.description ?? '')) fails.push('marketplace.json description names the old product')

// What keeps the old name on purpose.
const KEPT = [
  /cockpit:(?=[a-z$`'"{*\\([])/g, // store keys
  /claude(?:\[\\\\\/\]|[\\/])+cockpit[A-Za-z0-9._-]*/g, // the data folder and generated files under .claude
  /cockpit\//g, // paths
  /cockpit-[a-z]+(?:\\?\*|-\d+)?\\?\.md/g, // generated note files in a project, and their numbered copies
  /cockpit-home/g, // the pane id
  /\(\?<cockpit>/g, // the named group that names a block's hooks
  /[A-Za-z]-cockpit\b/g, // the marketplace id
  /cockpit@/g,
  /[A-Za-z0-9_]cockpit|cockpit[A-Za-z0-9_]/gi, // identifiers, row names, environment names
]

const walk = d => fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [] })
for (const root of ['mods/cockpit/hooks', 'tests/cockpit']) {
  for (const f of walk(root)) {
    if (f.includes('/i18n/rows/') || f.endsWith('rename.test.ts') || f.endsWith('legacyagents.test.ts')) continue
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const t = line.trim()
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
      if (/legacy/i.test(line)) return // names kept on purpose so that old files and runs are still found
      if (f.startsWith(path.join('tests', 'cockpit')) && /\/\/ names-ok: \S/.test(line)) return // a test line that names the old product on purpose (a test that it is spotted), with its reason after the marker
      const rest = KEPT.reduce((s, re) => s.replace(re, ''), line)
      if (/cockpit/i.test(rest)) fails.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`)
    })
  }
}
// The old repo name must not appear in what ships. Tests keep it as sample folder names; the release scripts name it on purpose.
const SHIPPED = ['README.md', 'CONTRIBUTING.md', '.claude-plugin', '.github', 'mods/cockpit/hooks', 'mods/cockpit/.claude-plugin', 'mods/cockpit/commands', 'mods/cockpit/skills', 'mods/cockpit/agents']
const walkAll = d => !fs.existsSync(d) ? [] : fs.statSync(d).isDirectory() ? fs.readdirSync(d).flatMap(f => walkAll(path.join(d, f))) : [d]
for (const f of SHIPPED.flatMap(walkAll)) {
  if (f.includes('node_modules')) continue
  let text
  try { text = fs.readFileSync(f, 'utf8') } catch { continue }
  text.split('\n').forEach((line, i) => { if (line.includes('claude-cockpit')) fails.push(`${f}:${i + 1}: names the old repo`) })
}
if (fails.length > 0) {
  console.log('check-names: the old product name is still in use:')
  for (const x of fails) console.log('  ' + x)
  process.exit(1)
}
console.log('check-names: clean')
