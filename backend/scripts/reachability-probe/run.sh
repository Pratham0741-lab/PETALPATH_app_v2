#!/usr/bin/env bash
#
# How much of the curriculum a child can actually reach, run against the REAL
# unlock gate and the REAL curriculum JSON, with no database.
#
#   bash backend/scripts/reachability-probe/run.sh
#
# Re-run this after ANY change to the unlock gate or either completion path.
# The gate's failure mode is silent — nothing throws, the child simply runs out
# of lessons — so it is the one part of the engine that needs a standing check
# rather than a code review.
#
# Under test, unmodified and transpiled by tsc:
#   src/modules/curriculum/curriculum.service.ts        — the real curriculum
#   src/modules/curriculum/curriculum-engine.service.ts — evaluateLessonUnlock
#   src/modules/curriculum/unlock-policy.ts             — the unlock predicate
#   src/modules/mastery/mastery{.service,-scoring}.ts   — what a pass scores
#   src/modules/progress/lesson-evidence.ts             — stars -> accuracy
#
# Only persistence and logging are stubbed. The stubbed `prisma` exists as an
# object but throws on use, so a stray query fails loudly instead of quietly
# returning nothing and making the curriculum look smaller than it is. Note the
# gate itself is pure: it is handed progress and mastery as plain arrays.
#
# Run from `backend/` on purpose — `curriculum-loader.getCurriculumDir()` looks
# for `<cwd>/../curriculum/cbse`, which is where the grade JSON actually lives.
#
# `tsx` is deliberately not used: in a Windows-installed node_modules, esbuild
# cannot resolve its Linux platform binary.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$(cd "$HERE/../.." && pwd)"
OUT="${OUT:-/tmp/petalpath-reachability-probe}"

cd "$BACKEND"
rm -rf "$OUT"; mkdir -p "$OUT"

echo "==> transpiling real sources"
# tsc follows the import graph, so these five entry points pull in the loader,
# the validator, the types and the config as a side effect.
./node_modules/.bin/tsc \
  src/modules/curriculum/curriculum.service.ts \
  src/modules/curriculum/curriculum-engine.service.ts \
  src/modules/curriculum/unlock-policy.ts \
  src/modules/mastery/mastery.service.ts \
  src/modules/progress/lesson-evidence.ts \
  --outDir "$OUT" --rootDir src \
  --module nodenext --moduleResolution nodenext --target es2022 \
  --skipLibCheck --declaration false >/dev/null 2>&1 || true

echo '{"type":"module"}' > "$OUT/package.json"

# A missing emit would otherwise surface as an inscrutable module-not-found.
for required in modules/curriculum/curriculum-engine.service.js modules/curriculum/curriculum-loader.js; do
  if [ ! -f "$OUT/$required" ]; then
    echo "tsc produced no $required — run ./node_modules/.bin/tsc --noEmit to see why" >&2
    exit 1
  fi
done

echo "==> stubbing persistence + logging (NOT the logic under test)"
mkdir -p "$OUT/config" "$OUT/modules/curriculum/repositories" "$OUT/modules/mastery/repositories"

# `prisma` must be a live object at import time — the services destructure it at
# module scope — but every query must fail, because the gate under test is pure
# and any query means the probe is measuring something other than the gate.
cat > "$OUT/config/database.js" <<'EOF'
const fail = () => { throw new Error('DB stub called: the reachability probe must not touch the database'); };
const table = new Proxy({}, { get: () => fail });
export const prisma = new Proxy({}, { get: () => table });
export default prisma;
EOF

cat > "$OUT/utils/logger.js" <<'EOF'
const noop = () => {};
export const logger = { info: noop, warn: noop, error: noop, debug: noop, fatal: noop, trace: noop };
export default logger;
EOF

# Export names are derived from the filenames so adding a repository here cannot
# silently produce a stub nobody imports.
stub_repository() {
  local dir="$1" file="$2"
  local pascal
  pascal=$(echo "$file" | sed -r 's/(^|-)(\w)/\U\2/g')
  cat > "$OUT/modules/$dir/repositories/$file.repository.js" <<EOF
const notUsed = () => { throw new Error('DB stub called: $file — the logic under test should never reach this'); };
export const ${pascal,}Repository = new Proxy({}, { get: () => notUsed });
EOF
}
for f in subject child-skill-curriculum skill skill-dependency; do stub_repository curriculum "$f"; done
for f in skill-health skill-history regression-log review-schedule; do stub_repository mastery "$f"; done

echo "==> generating @prisma/client enum shim from schema.prisma"
mkdir -p "$OUT/node_modules/@prisma/client"
echo '{"name":"@prisma/client","version":"0.0.0-shim","type":"module","main":"index.js"}' \
  > "$OUT/node_modules/@prisma/client/package.json"
# Names come from the re-export block in shared/enums.ts, located by content
# rather than by line number so adding an enum there cannot silently drop it.
NAMES=$(awk '/^export \{/{f=1;next} /^\} from/{f=0} f' src/shared/enums.ts | tr -d ' \r' | tr -d ',')
python3 - "$NAMES" > "$OUT/node_modules/@prisma/client/index.js" <<'PY'
import re, sys
names = [n for n in sys.argv[1].split() if n]
src = open('prisma/schema.prisma', encoding='utf-8-sig').read()
found = {}
for m in re.finditer(r'^enum\s+(\w+)\s*\{([^}]*)\}', src, re.M):
    found[m.group(1)] = [v.strip() for v in m.group(2).split('\n')
                         if v.strip() and not v.strip().startswith(('//', '@@'))]
missing = [n for n in names if n not in found]
print("// Generated from prisma/schema.prisma. Values come from the schema, never hand-typed.")
for n in names:
    body = ', '.join(f"{v}: '{v}'" for v in found.get(n, []))
    print(f"export const {n} = Object.freeze({{ {body} }});")
print("export class PrismaClient { constructor(){ throw new Error('PrismaClient shim: the probe runs without a DB'); } }")
print("export const Prisma = Object.freeze({});")
if missing:
    sys.stderr.write("WARNING: enums re-exported but absent from schema.prisma: %s\n" % ", ".join(missing))
PY

cp "$HERE/probe.mjs" "$OUT/probe.mjs"
echo "==> running (cwd stays $BACKEND so the real curriculum loader finds ../curriculum/cbse)"
node "$OUT/probe.mjs"
