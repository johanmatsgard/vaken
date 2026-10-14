#!/bin/bash
# Before the repo goes public: scans the tracked files for secrets, personal data and words that must not be there.
# It prints file:line and the name of the rule, never the text that matched, so its own output is safe to paste.
# Usage: scripts/check-public.sh [--blocklist FILE] [--allow-email ADDRESS]... [--root DIR] | --selftest
#   --blocklist FILE      one word or phrase per line (a company, a project, a person); matched case-insensitively in file names and text.
#                         Keep this file OUTSIDE the repo. If it is tracked, that is itself a finding.
#   --allow-email ADDR    an address that may appear (the licence holder's). Addresses inside LICENSE are allowed as well, and the
#                         example and no-reply ones (example.com, example.org, noreply addresses).
#   --root DIR            scan another git repo (the tests use this)
#   --selftest            plant a secret, a home folder and a foreign email in a throwaway git repo; all three must be found
#   scripts/check-public.ignore (optional, tracked, reviewed): lines `path|rule name|reason` for an invented fixture that looks like a secret.
#                         A suppressed finding is counted and listed, never hidden.
# Exit: 0 clean, 1 findings, 2 the script could not run.
set -u

SELFTEST=0
ROOT=""
BLOCKLIST=""
ALLOWED_EMAILS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --blocklist) BLOCKLIST="${2:-}"; shift 2 ;;
    --allow-email) ALLOWED_EMAILS="$ALLOWED_EMAILS
${2:-}"; shift 2 ;;
    --root) ROOT="${2:-}"; shift 2 ;;
    --selftest) SELFTEST=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "check-public: unknown argument $1" >&2; exit 2 ;;
  esac
done
if [ "$SELFTEST" -eq 1 ]; then
  # Built at run time from pieces, so this source holds nothing the scanner would flag. All values are invented.
  tmpbase="${TMPDIR:-/tmp}"; tmpbase="${tmpbase%/}"
  T="$(mktemp -d "$tmpbase/check-public-selftest.XXXXXX")" || { echo "check-public: selftest cannot make a temp dir" >&2; exit 2; }
  case "$T" in "$tmpbase"/check-public-selftest.*) ;; *) echo "check-public: selftest temp dir is in an unexpected place" >&2; exit 2 ;; esac
  p1="pass"; p2="word"; q1="Zx9Kq"; q2="Lm3Wv"; q3="Rt7Yp"; q4="Hd2Nb"
  hm="/Us""ers/Marguerite/x"
  em="stranger""@""mailhost-selftest"".org"
  {
    printf 'const cfg = { %s%s: "%s%s%s%s" };\n' "$p1" "$p2" "$q1" "$q2" "$q3" "$q4"
    printf 'path = %s\n' "$hm"
    printf 'contact %s\n' "$em"
  } > "$T/planted.txt"
  printf 'x\n' > "$T/LICENSE"; printf 'x\n' > "$T/README.md"
  ( cd "$T" && git init -q && git add -A ) >/dev/null 2>&1 || { rm -rf "$T"; echo "check-public: selftest cannot set up its repo" >&2; exit 2; }
  out="$(bash "$0" --root "$T" 2>&1)"; rc=$?
  rm -rf "$T"
  missed=0
  for kind in "assignment that looks like a secret" "an absolute home folder with a personal name" "an email address that is not allowed"; do
    case "$out" in *"$kind"*) ;; *) echo "check-public selftest: FAILED, did not find: $kind"; missed=1 ;; esac
  done
  [ "$rc" -eq 1 ] || { echo "check-public selftest: FAILED, scanner exit code was $rc, expected 1"; missed=1; }
  [ "$missed" -eq 0 ] || exit 1
  echo "check-public selftest: ok (secret, home folder and foreign email all found)"
  exit 0
fi
[ -n "$ROOT" ] || ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || { echo "check-public: cannot enter $ROOT" >&2; exit 2; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "check-public: $ROOT is not a git repository" >&2; exit 2; }
if [ -n "$BLOCKLIST" ] && [ ! -f "$BLOCKLIST" ]; then echo "check-public: blocklist file not found" >&2; exit 2; fi

FINDINGS=0
SUPPRESSED=0
FILES=0
IGNORED=""
if [ -f scripts/check-public.ignore ]; then
  IGNORED="$(grep -v '^#' scripts/check-public.ignore | tr -d '\r' | cut -d'|' -f1,2)"
fi
report() {
  if [ -n "$IGNORED" ] && printf '%s\n' "$IGNORED" | grep -qxF -- "$1|$3"; then
    SUPPRESSED=$((SUPPRESSED + 1))
    printf 'ignored (reviewed): %s:%s: %s\n' "$1" "$2" "$3" >&2
    return
  fi
  printf '%s:%s: %s\n' "$1" "$2" "$3"
  FINDINGS=$((FINDINGS + 1))
}

# Rules for what a secret looks like: a name, then an extended regular expression.
RULE_NAMES=(
  "aws access key id"
  "github token"
  "github fine-grained token"
  "model provider key"
  "slack token"
  "google api key"
  "payment live key"
  "private key block"
  "json web token"
  "assignment that looks like a secret"
)
RULE_PATTERNS=(
  'AKIA[0-9A-Z]{16}'
  'gh[pousr]_[A-Za-z0-9]{30,}'
  'github_pat_[A-Za-z0-9_]{20,}'
  'sk-[A-Za-z0-9_-]{20,}'
  'xox[abprs]-[A-Za-z0-9-]{10,}'
  'AIza[0-9A-Za-z_-]{35}'
  '[sr]k_live_[0-9A-Za-z]{16,}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.'
  '(secret|token|passwd|password|api[_-]?key)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9+/_=-]{16,}["'"'"']'
)

# Names of files that must never be tracked.
bad_file_name() {
  case "$1" in
    .env|*/.env|.env.*|*/.env.*)
      case "$1" in *.example|*.sample|*.template) return 1 ;; esac
      return 0 ;;
    *.pem|*.p12|*.pfx|*.key|*.keystore|*/id_rsa*|id_rsa*|*/id_ed25519*|id_ed25519*|.npmrc|*/.npmrc|.netrc|*/.netrc|.DS_Store|*/.DS_Store) return 0 ;;
  esac
  return 1
}

# A home folder name that is a placeholder or a test value, not a person.
generic_home_name() {
  case "$1" in
    u|test|tester|user|you|me|name|example|runner|shared|Shared|username|yourname|your-name|someone|alice|bob|node|app|work|ci|build) return 0 ;;
  esac
  return 1
}

LICENCE_EMAILS="$(grep -hoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' LICENSE 2>/dev/null || true)"
allowed_email() {
  local e
  e="$(printf '%s' "$1" | tr 'A-Z' 'a-z')"
  case "$e" in
    *@example.com|*@example.org|*@example.net|noreply@*|*@users.noreply.github.com|*@localhost) return 0 ;;
  esac
  local list
  list="$(printf '%s\n%s' "$ALLOWED_EMAILS" "$LICENCE_EMAILS" | tr 'A-Z' 'a-z')"
  printf '%s\n' "$list" | grep -qxF -- "$e"
}

# The blocklist, one entry per line, without blanks and comments.
ENTRIES=()
if [ -n "$BLOCKLIST" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|'#'*) continue ;; esac
    ENTRIES+=("$line")
  done < "$BLOCKLIST"
  case "$(cd "$(dirname "$BLOCKLIST")" && pwd)/$(basename "$BLOCKLIST")" in
    "$ROOT"/*)
      rel="${BLOCKLIST#$ROOT/}"
      if git ls-files --error-unmatch -- "$rel" >/dev/null 2>&1; then report "$rel" 0 "the blocklist file is tracked; it must stay out of the repo"; fi ;;
  esac
fi

# The two files a public repo needs.
for needed in LICENSE README.md; do
  git ls-files --error-unmatch -- "$needed" >/dev/null 2>&1 || report "$needed" 0 "missing: a public repo needs this file"
done

# Speed: on Windows every ms, so nothing here runs per file. Each rule is one grep over all tracked files at once
# (grep --null gives "file<NUL>line:text"; never the short -Z, which is FUZZY in ugrep). A listed file that is gone is skipped (grep's error is dropped); binary files are skipped. Only long grep flags where short ones differ between GNU grep, BSD grep and ugrep.
ALLFILES=()
while IFS= read -r -d '' file; do
  ALLFILES+=("$file")
  FILES=$((FILES + 1))
  if bad_file_name "$file"; then report "$file" 0 "a file of this kind must not be tracked (keys, env files, credentials)"; fi
done < <(git ls-files -z)

# Names against the blocklist: one grep per entry over the list of names.
NAMES="$(git ls-files)"
idx=0
for entry in "${ENTRIES[@]+"${ENTRIES[@]}"}"; do
  idx=$((idx + 1))
  while IFS= read -r nm; do
    [ -n "$nm" ] && report "$nm" 0 "blocklist entry $idx in the file name"
  done < <(printf '%s\n' "$NAMES" | grep -iF -e "$entry" 2>/dev/null)
done

# scan FLAGS PATTERN: one grep over every tracked file at once.
scan() {
  [ ${#ALLFILES[@]} -gt 0 ] || return 0
  printf '%s\0' "${ALLFILES[@]}" | xargs -0 grep --binary-files=without-match --with-filename --line-number --null "$1" -e "$2" -- 2>/dev/null
}

i=0
while [ $i -lt ${#RULE_PATTERNS[@]} ]; do
  while IFS= read -r -d '' f && IFS= read -r rest; do
    report "$f" "${rest%%:*}" "${RULE_NAMES[$i]}"
  done < <(scan -E "${RULE_PATTERNS[$i]}")
  i=$((i + 1))
done

# An absolute home folder with a real name in it (a placeholder such as /Users/<name>/ does not match at all).
while IFS= read -r -d '' f && IFS= read -r rest; do
  ln="${rest%%:*}"; val="${rest#*:}"
  # The match may carry one character before the slash; a path segment inside a relative import (./home/x) is not an absolute path.
  case "$val" in /*) ;; *) val="${val#?}" ;; esac
  val="${val#/}"; who="${val#*/}"
  generic_home_name "$who" || report "$f" "$ln" "an absolute home folder with a personal name"
done < <(scan -oE '(^|[^A-Za-z0-9._/~-])/(Users|home)/[A-Za-z0-9._-]+')

# An email address that is not the licence holder's, an example or a no-reply one.
while IFS= read -r -d '' f && IFS= read -r rest; do
  ln="${rest%%:*}"; val="${rest#*:}"
  allowed_email "$val" || report "$f" "$ln" "an email address that is not allowed"
done < <(scan -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}')

idx=0
for entry in "${ENTRIES[@]+"${ENTRIES[@]}"}"; do
  idx=$((idx + 1))
  while IFS= read -r -d '' f && IFS= read -r rest; do
    report "$f" "${rest%%:*}" "blocklist entry $idx"
  done < <(scan -iF "$entry")
done

if [ "$FINDINGS" -gt 0 ]; then
  echo "check-public: $FINDINGS finding(s) in $FILES files. The matched text is never printed; open the file at that line." >&2
  exit 1
fi
echo "check-public: clean ($FILES files, ${#RULE_PATTERNS[@]} secret rules, home folders, emails, ${#ENTRIES[@]} blocklist entries, $SUPPRESSED reviewed suppressions)"
exit 0
