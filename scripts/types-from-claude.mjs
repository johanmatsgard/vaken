// Writes the engine's plugin type file (claude-code.d.ts) out of an installed `claude` program, for scripts/typecheck.sh.
// Usage: node scripts/types-from-claude.mjs OUT_FILE CANDIDATE...
// Each candidate is a path to a `claude` program or a link to one (the native install's link, or the npm package's bin/claude.exe).
// The program carries the type file inside itself as a zstd frame; this finds the frame whose text opens the way the type file does and writes it.
// Exit: 0 written (prints the program it came from), 1 not found. Needs a Node with zlib.zstdDecompressSync (22.15 or newer).
import { readFileSync, realpathSync, statSync, writeFileSync } from "fs";
import zlib from "zlib";

const [out, ...candidates] = process.argv.slice(2);
if (!out || typeof zlib.zstdDecompressSync !== "function") process.exit(1);
// The type file's own first line; the engine adds a "Written by" line above it when it writes the file out.
const HEAD = Buffer.from("// Claude Code function hooks: the plugin API's TypeScript declarations.");
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
// A JavaScript or shell launcher is small; the program itself is large.
const MIN_PROGRAM_BYTES = 20 * 1024 * 1024;
// Read at most this much from each frame; the type file is under a megabyte packed.
const FRAME_WINDOW_BYTES = 8 * 1024 * 1024;

const seen = new Set();
for (const c of candidates) {
  let file;
  try { file = realpathSync(c); } catch { continue; }
  if (seen.has(file)) continue;
  seen.add(file);
  try { if (statSync(file).size < MIN_PROGRAM_BYTES) continue; } catch { continue; }
  const buf = readFileSync(file);
  for (let i = buf.indexOf(MAGIC); i !== -1; i = buf.indexOf(MAGIC, i + MAGIC.length)) {
    let text;
    try { text = zlib.zstdDecompressSync(buf.subarray(i, Math.min(buf.length, i + FRAME_WINDOW_BYTES))); } catch { continue; }
    if (!text.subarray(0, HEAD.length).equals(HEAD)) continue;
    writeFileSync(out, text);
    console.log(file);
    process.exit(0);
  }
}
process.exit(1);
