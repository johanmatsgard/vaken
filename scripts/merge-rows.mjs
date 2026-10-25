#!/usr/bin/env node
// Git merge driver for the i18n rows files (mods/cockpit/hooks/i18n/rows/*.ts), so branches that add rows merge with no hand work.
// Usage (set up by scripts/setup-merge.sh): node scripts/merge-rows.mjs %O %A %B   (base, ours, theirs; the result is written over %A).
// A row is one line `  "key": {...},`. Per key: a row added or changed by only one side wins, a deletion by one side is kept, and the same change on both sides is kept.
// It stops with a conflict (exit 1, `git merge-file` conflict markers in %A) only when both sides changed one key differently, a side deleted a row the other changed,
// or a file has a line that is not one row. The result is sorted by key (the order scripts/strings.mjs writes), with the header and footer kept.
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const ROW_LINE = /^ {2}("(?:[^"\\]|\\.)*"): (\{.*\}),$/
const OPEN = /^export const ROWS: Rows = \{$/

// One version: the header lines (up to and with the opening line), the rows (key to its whole line), the footer lines (from the closing brace on).
function parse(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const open = lines.findIndex(l => OPEN.test(l))
  const close = lines.findIndex((l, i) => i > open && l === '}')
  if (open < 0 || close < 0) return undefined
  const rows = new Map()
  for (let i = open + 1; i < close; i += 1) {
    const m = ROW_LINE.exec(lines[i])
    if (m === null) return undefined
    let key
    try {
      key = JSON.parse(m[1])
    } catch {
      return undefined
    }
    rows.set(key, lines[i])
  }
  return { header: lines.slice(0, open + 1).join('\n'), footer: lines.slice(close).join('\n'), rows }
}

// Three-way pick of one value: undefined result with `conflict` set when both sides moved differently.
function pick(o, a, b) {
  if (a === b) return { v: a }
  if (a === o) return { v: b }
  if (b === o) return { v: a }
  return { conflict: true }
}

function conflictMarkers(base, ours, theirs) {
  spawnSync('git', ['merge-file', '-L', 'ours', '-L', 'base', '-L', 'theirs', ours, base, theirs], { stdio: 'inherit' })
  return 1
}

function main(argv) {
  const [pathO, pathA, pathB] = argv
  if (pathO === undefined || pathA === undefined || pathB === undefined) {
    console.error('usage: node scripts/merge-rows.mjs <base> <ours> <theirs>')
    return 2
  }
  const o = parse(readFileSync(pathO, 'utf8'))
  const a = parse(readFileSync(pathA, 'utf8'))
  const b = parse(readFileSync(pathB, 'utf8'))
  if (o === undefined || a === undefined || b === undefined) {
    console.error('merge-rows: a rows file is not in the one-row-per-line shape; merging it as plain text')
    return conflictMarkers(pathO, pathA, pathB)
  }
  const header = pick(o.header, a.header, b.header)
  const footer = pick(o.footer, a.footer, b.footer)
  if (header.conflict || footer.conflict) return conflictMarkers(pathO, pathA, pathB)
  const keys = new Set([...o.rows.keys(), ...a.rows.keys(), ...b.rows.keys()])
  const out = []
  const clashes = []
  for (const k of keys) {
    const p = pick(o.rows.get(k), a.rows.get(k), b.rows.get(k))
    if (p.conflict) clashes.push(k)
    else if (p.v !== undefined) out.push([k, p.v])
  }
  if (clashes.length > 0) {
    console.error(`merge-rows: both sides changed ${clashes.length} row(s) differently: ${clashes.slice(0, 5).join(', ')}${clashes.length > 5 ? ', ...' : ''}`)
    return conflictMarkers(pathO, pathA, pathB)
  }
  out.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
  writeFileSync(pathA, [header.v, ...out.map(r => r[1]), footer.v].join('\n'))
  return 0
}

process.exit(main(process.argv.slice(2)))
