// Finds comment text that a stranger does not need. Run through scripts/check-comments.sh,
// which explains the rules and the modes. Usage: node check-comments.mjs MODE ROOT
// where MODE is check, report or selftest.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2];
let root = process.argv[3];

function readList(rel) {
  const out = [];
  let text;
  try { text = fs.readFileSync(path.join(root, rel), "utf-8"); } catch { return out; }
  for (let ln of text.split(/\r\n|\r|\n/)) {
    ln = ln.trim();
    if (ln && !ln.startsWith("#")) out.push(ln);
  }
  return out;
}

// Shell-style pattern match: * and ? match any character, [..] is a set.
function fnmatch(name, pat) {
  let re = "";
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === "*") re += ".*";
    else if (c === "?") re += ".";
    else if (c === "[") {
      let j = i + 1;
      if (pat[j] === "!") j++;
      if (pat[j] === "]") j++;
      while (j < pat.length && pat[j] !== "]") j++;
      if (j >= pat.length) re += "\\[";
      else {
        let set = pat.slice(i + 1, j);
        if (set[0] === "!") set = "^" + set.slice(1);
        re += "[" + set.replace(/\\/g, "\\\\") + "]";
        i = j;
      }
    } else re += c.replace(/[.+^${}()|\\\]]/g, "\\$&");
  }
  return new RegExp("^" + re + "$", "s").test(name);
}

const matches = (p, pats) => pats.some((x) => fnmatch(p, x));

let LISTS = fs.existsSync(path.join(root, "scripts/release/keep.txt"));
let KEEP = readList("scripts/release/keep.txt");
let NOSHIP = readList("scripts/release/cut.txt").concat(readList("scripts/release/ask.txt"));

// True when a path, which may hold *, names something that exists under root.
function globExists(rel) {
  const parts = rel.split("/").filter((x) => x !== "");
  const walk = (dir, i) => {
    if (i === parts.length) return true;
    if (!parts[i].includes("*")) {
      const next = path.join(dir, parts[i]);
      return fs.existsSync(next) && walk(next, i + 1);
    }
    let names;
    try { names = fs.readdirSync(dir); } catch { return false; }
    return names.some((n) => (n[0] !== "." || parts[i][0] === ".") && fnmatch(n, parts[i]) && walk(path.join(dir, n), i + 1));
  };
  return walk(root, 0);
}

function docKept(p) {
  if (LISTS) return matches(p, KEEP) && !matches(p, NOSHIP);
  return globExists(p);
}

const SLASH_LANGS = [".ts", ".tsx", ".mjs", ".js"];
const HASH_LANGS = [".sh", ".py"];
const isAlnum = (c) => /[\p{L}\p{N}]/u.test(c);

function commentsSlash(text) {
  const n = text.length;
  let i = 0, line = 1;
  const out = new Map();
  const add = (ln, s) => out.set(ln, ((out.get(ln) || "") + " " + s).trim());
  const tstack = [];
  let depth = 0;
  let prev = "";
  const skipTemplate = (i, line) => {
    while (i < n) {
      if (text[i] === "\\") { i += 2; continue; }
      if (text[i] === "\n") line++;
      if (text[i] === "`") return [i + 1, line, false];
      if (text.slice(i, i + 2) === "${") return [i + 2, line, true];
      i++;
    }
    return [i, line, false];
  };
  while (i < n) {
    const c = text[i];
    if (c === "\n") { line++; i++; continue; }
    if (" \t\r".includes(c)) { i++; continue; }
    const two = text.slice(i, i + 2);
    if (two === "//") {
      let j = text.indexOf("\n", i);
      j = j < 0 ? n : j;
      add(line, text.slice(i + 2, j)); i = j; continue;
    }
    if (two === "/*") {
      let j = text.indexOf("*/", i + 2);
      j = j < 0 ? n : j;
      const body = text.slice(i + 2, j);
      body.split("\n").forEach((part, k) => add(line + k, part));
      line += body.split("\n").length - 1; i = j + 2; prev = ")"; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== c && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      i = j + 1; prev = "a"; continue;
    }
    if (c === "`") {
      let sub;
      [i, line, sub] = skipTemplate(i + 1, line);
      if (sub) { tstack.push(depth); depth++; }
      prev = "a"; continue;
    }
    if (c === "{") { depth++; i++; prev = "{"; continue; }
    if (c === "}") {
      depth--; i++; prev = "}";
      if (tstack.length && tstack[tstack.length - 1] === depth) {
        tstack.pop();
        let sub;
        [i, line, sub] = skipTemplate(i, line);
        if (sub) { tstack.push(depth); depth++; }
        prev = "a";
      }
      continue;
    }
    if (c === "/" && (prev === "" || "(,=:[!&|?{};+-*%<>~^".includes(prev))) {
      let j = i + 1, incls = false;
      while (j < n && text[j] !== "\n") {
        if (text[j] === "\\") { j += 2; continue; }
        if (text[j] === "[") incls = true;
        else if (text[j] === "]") incls = false;
        else if (text[j] === "/" && !incls) break;
        j++;
      }
      i = j + 1; prev = "a"; continue;
    }
    prev = (isAlnum(c) || c === "_" || c === "$") ? "a" : c;
    i++;
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]);
}

function commentsHash(text, py) {
  const out = [];
  let quote = null;
  text.split("\n").forEach((raw, idx) => {
    const ln = idx + 1;
    let i = 0;
    const n = raw.length;
    while (i < n) {
      if (quote) {
        const j = raw.indexOf(quote, i);
        if (j < 0) { i = n; break; }
        i = j + quote.length; quote = null; continue;
      }
      const c = raw[i];
      if (py && (raw.slice(i, i + 3) === '"""' || raw.slice(i, i + 3) === "'''")) {
        quote = raw.slice(i, i + 3); i += 3; continue;
      }
      if (c === "'" || c === '"') {
        let j = i + 1;
        while (j < n && raw[j] !== c) j += (raw[j] === "\\" && (py || c === '"')) ? 2 : 1;
        i = j + 1; continue;
      }
      if (c === "#" && (i === 0 || " \t;|&(".includes(raw[i - 1])) && !(ln === 1 && raw.startsWith("#!"))) {
        out.push([ln, raw.slice(i + 1)]); break;
      }
      i++;
    }
  });
  return out;
}

const TASK = /(?<![A-Za-z0-9_-])(?:L[VWH]?\d+(?:-\d+)?|G\d|(?!P(?:50|75|90|95|99)\b)[PRMOUTAI]-?\d{2,}|[PU]-\d+|[A-Z]{1,2}\d+-[A-Z]?\d+)(?![A-Za-z0-9_-])/;
const BWP = /\b[Bb]atch \d+[a-z]?\b|\b[Ww]ave \d+|\b[Pp]hase \d+|\b[Ss]tep \d+\b/;
const DATE = /\b20\d\d-[01]\d-[0-3]\d\b|\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? 20\d\d\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? 20\d\d\b/;
const OWNER = /[Oo]wner/;
const LIVE = /[Ll]ive round|[Ff]ound live|[Ll]ive finding|[Ll]ive pass|[Ll]ive test round/;
const DOCS = /\bdocs\/[A-Za-z0-9_./*-]*[A-Za-z0-9_*]/;
const DOCS_G = new RegExp(DOCS.source, "g");
const ITEM = /\b[Ii]tems? \d+/;
const KINDS = ["task-code", "batch-wave-phase", "date", "owner", "live-round", "docs-link", "item-ref", "docs-path"];

function rules(c, rel = "") {
  const r = [];
  const inMod = rel.startsWith("mods/cockpit/");
  if (ITEM.test(c)) r.push("item-ref");
  if (inMod && DOCS.test(c)) r.push("docs-path");
  if (TASK.test(c)) r.push("task-code");
  if (BWP.test(c)) r.push("batch-wave-phase");
  if (DATE.test(c)) r.push("date");
  if (OWNER.test(c)) r.push("owner");
  if (LIVE.test(c)) r.push("live-round");
  if (!inMod && (c.match(DOCS_G) || []).some((m) => !docKept(m.replace(/\.+$/, "")))) r.push("docs-link");
  return r;
}

function scanText(text, ext, rel = "") {
  text = text.replace(/\r\n|\r/g, "\n");
  let cs;
  if (SLASH_LANGS.includes(ext)) cs = commentsSlash(text);
  else if (ext === ".py") cs = commentsHash(text, true);
  else cs = commentsHash(text, false);
  const res = [];
  for (const [ln, c] of cs) {
    const ks = rules(c, rel);
    if (ks.length) res.push([ln, c.trim(), ks]);
  }
  return res;
}

function files() {
  const res = [];
  const walk = (dir) => {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const names = ents.map((e) => e.name).sort();
    const byName = new Map(ents.map((e) => [e.name, e]));
    for (const f of names) {
      if (byName.get(f).isDirectory()) continue;
      const rel = path.relative(root, path.join(dir, f)).split(path.sep).join("/");
      if (![...SLASH_LANGS, ...HASH_LANGS].some((e) => rel.endsWith(e))) continue;
      if (rel.endsWith(".d.ts") && rel.startsWith("scripts/types/")) continue;
      if (rel.startsWith("scripts/drive-app/") || (LISTS && matches(rel, NOSHIP))) continue;
      res.push(rel);
    }
    for (const d of names) {
      if (!byName.get(d).isDirectory() || d === "node_modules" || d === ".git") continue;
      walk(path.join(dir, d));
    }
  };
  for (const top of ["mods/cockpit/hooks", "mods/cockpit/tests", "scripts"]) walk(path.join(root, top));
  return res;
}

const extOf = (p) => path.extname(p);
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const kindsOf = (hitsList) => [...new Set(hitsList.flatMap((h) => h[2]))].sort();

if (mode === "selftest") {
  const S = "//", H = "#";
  let cases = [
    [".ts", S + " Sorts the rows by name.", []],
    [".ts", S + " Severity S1 to S4 labels are kept.", []],
    [".ts", S + " Uses H264 and P50 here.", []],
    [".ts", "const a = '" + S + " L12 owner';", []],
    [".ts", "const re = /a" + S[0] + "b/; " + S + " fine", []],
    [".ts", "const t = `x ${a} " + S + " L12`;", []],
    [".ts", S + " Fixed in L" + "12.", ["task-code"]],
    [".ts", S + " from batch " + "3 and wave " + "2", ["batch-wave-phase"]],
    [".ts", S + " added 2026-" + "10-11", ["date"]],
    [".ts", S + " the " + "owner wants this", ["owner"]],
    [".ts", S + " found " + "live in the app", ["live-round"]],
    [".ts", S + " see docs/" + "TASKS.md", ["docs-link"]],
    [".ts", S + " see docs/" + "DESIGN-SYSTEM.md", []],
    [".ts", S + " per item " + "139 here", ["item-ref"]],
    [".ts", S + " the items " + "135 and 136", ["item-ref"]],
    [".ts", S + " an item in the list", []],
    [".ts", "/* one\n * two G" + "4 gate\n */", ["task-code"]],
    [".sh", 'echo "a ' + H + ' L12"', []],
    [".sh", "x=${" + H + "y}", []],
    [".sh", "ls " + H + " wave " + "4", ["batch-wave-phase"]],
    [".py", "s = '" + H + " owner'", []],
    [".py", "x = 1 " + H + " owner note", ["owner"]],
  ];
  let bad = 0, total = 0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cc-"));
  fs.mkdirSync(path.join(tmp, "docs"));
  fs.writeFileSync(path.join(tmp, "docs", "DESIGN-SYSTEM.md"), "");
  const docsGone = S + " see docs/" + "TASKS.md";
  const docsCut = S + " see docs/" + "CUT-ME.md";
  cases = cases.concat([[".ts", docsCut, ["docs-link"]]]);
  for (const [rel_, src_, want_] of [["mods/cockpit/hooks/a.ts", S + " see docs/" + "DESIGN-SYSTEM.md", ["docs-path"]]]) {
    total++;
    const got_ = kindsOf(scanText(src_, extOf(rel_), rel_));
    if (!sameList(got_, want_)) {
      bad++; console.log(`selftest FAIL (rel) ${rel_}: want ${pyList(want_)} got ${pyList(got_)}`);
    }
  }
  for (const name of ["workshop", "public"]) {
    let cs;
    if (name === "workshop") {
      LISTS = true; KEEP = ["docs/DESIGN-SYSTEM.md", "docs/CUT-ME.md"]; NOSHIP = ["docs/CUT-ME.md"];
      cs = cases;
    } else {
      LISTS = false; KEEP = []; NOSHIP = []; root = tmp;
      fs.writeFileSync(path.join(tmp, "docs", "TASKS.md"), "");
      cs = cases.map(([e, sr, w]) => [e, sr, sr === docsGone ? [] : w]);
    }
    for (const [ext, src, want] of cs) {
      total++;
      const got = kindsOf(scanText(src, ext));
      if (!sameList(got, [...want].sort())) {
        bad++;
        console.log(`selftest FAIL (${name}) ${ext} ${pyRepr(src)}: want ${pyList(want)} got ${pyList(got)}`);
      }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`selftest: ${total} cases, ${bad} wrong`);
  process.exit(bad ? 1 : 0);
}

function pyList(a) { return "[" + a.map((x) => "'" + x + "'").join(", ") + "]"; }
function pyRepr(s) { return "'" + s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/'/g, "\\'") + "'"; }

const hits = [];
for (const rel of files()) {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(path.join(root, rel))); } catch { continue; }
  for (const [ln, c, ks] of scanText(text, extOf(rel), rel)) hits.push([rel, ln, c, ks]);
}

if (mode === "report") {
  const short = { "task-code": "task", "batch-wave-phase": "bwp", date: "date", owner: "owner", "live-round": "live", "docs-link": "docs", "item-ref": "item", "docs-path": "docpath" };
  const widths = [5, 5, 5, 5, 5, 5, 5, 7, 6];
  const row = (d, vals) => d.padEnd(44) + vals.map((v, i) => " " + String(v).padStart(widths[i])).join("");
  const table = new Map(), linesBy = new Map();
  for (const [rel, , , ks] of hits) {
    const d = path.posix.dirname(rel) === "." ? "" : path.posix.dirname(rel);
    if (!table.has(d)) table.set(d, Object.fromEntries(KINDS.map((k) => [k, 0])));
    const r = table.get(d);
    for (const k of ks) r[k]++;
    linesBy.set(d, (linesBy.get(d) || 0) + 1);
  }
  console.log(row("folder", KINDS.map((k) => short[k]).concat(["lines"])));
  const tot = Object.fromEntries(KINDS.map((k) => [k, 0]));
  for (const d of [...table.keys()].sort()) {
    for (const k of KINDS) tot[k] += table.get(d)[k];
    console.log(row(d, KINDS.map((k) => table.get(d)[k]).concat([linesBy.get(d)])));
  }
  console.log(row("TOTAL", KINDS.map((k) => tot[k]).concat([hits.length])));
  process.exit(0);
}

for (const [rel, ln, c, ks] of hits) console.log(`${rel}:${ln}:${ks.join(",")}: ${Array.from(c).slice(0, 100).join("")}`);
if (hits.length) {
  process.stderr.write(`check-comments: ${hits.length} comment lines with workshop notes\n`);
  process.exit(1);
}
