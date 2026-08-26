#!/usr/bin/env bash
#
# Runs the unified-engine harness against the REAL sources for the pure modules
# added in Stage 1-4 of the adaptive-engine work, with no database.
#
#   bash backend/scripts/engine-harness/run.sh
#
# Modules under test (unmodified, transpiled by tsc):
#   src/modules/progress/lesson-evidence.ts     — evidence from recorded work
#   src/modules/curriculum/unlock-policy.ts     — the single unlock predicate
#   src/shared/utils/calendar-day.ts            — calendar-day cadence maths
#   src/modules/mastery/mastery-scoring.ts      — the five scoring dimensions
#   src/modules/mastery/review-cadence.ts       — cadence, lazy decay, priority
#   src/modules/mastery/mastery.view.ts          — the one DTO four screens read
#   src/modules/mastery/mastery.service.ts      — the service that delegates to them
#   src/modules/roadmap/review-plan.ts          — which due reviews the child meets
#   src/modules/adaptive/modality-profile.ts    — preferred vs weakest modality
#
# Only the persistence + logging layer is stubbed, and none of the functions
# exercised here reach it — the stubs throw, so a stray query fails loudly
# instead of returning a plausible zero.
#
# `tsx` is deliberately not used: in a Windows-installed node_modules, esbuild
# cannot resolve its Linux platform binary.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$(cd "$HERE/../.." && pwd)"
OUT="${OUT:-/tmp/petalpath-engine-harness}"

cd "$BACKEND"
rm -rf "$OUT"; mkdir -p "$OUT"

echo "==> transpiling real sources"
./node_modules/.bin/tsc \
  src/modules/progress/lesson-evidence.ts \
  src/modules/curriculum/unlock-policy.ts \
  src/shared/utils/calendar-day.ts \
  src/modules/mastery/mastery-scoring.ts \
  src/modules/mastery/review-cadence.ts \
  src/modules/mastery/mastery.view.ts \
  src/modules/mastery/mastery.service.ts \
  src/modules/roadmap/review-plan.ts \
  src/modules/adaptive/modality-profile.ts \
  src/shared/config/engine.config.ts \
  src/config/mastery.constants.ts \
  src/shared/enums.ts \
  --outDir "$OUT" --rootDir src \
  --module nodenext --moduleResolution nodenext --target es2022 \
  --skipLibCheck --declaration false >/dev/null 2>&1 || true

echo '{"type":"module"}' > "$OUT/package.json"

echo "==> stubbing persistence + logging (NOT the logic under test)"
for f in skill-health skill-history regression-log review-schedule; do
  name=$(echo "$f" | sed -r 's/(^|-)(\w)/\U\2/g')
  cat > "$OUT/modules/mastery/repositories/$f.repository.js" <<EOF
const notUsed = () => { throw new Error('DB stub called: $f — the logic under test should never reach this'); };
export const ${name,}Repository = new Proxy({}, { get: () => notUsed });
EOF
done
cat > "$OUT/utils/logger.js" <<'EOF'
const noop = () => {};
export const logger = { info: noop, warn: noop, error: noop, debug: noop, fatal: noop, trace: noop };
export default logger;
EOF

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
print("export class PrismaClient { constructor(){ throw new Error('PrismaClient shim: harness runs without a DB'); } }")
print("export const Prisma = Object.freeze({});")
if missing:
    sys.stderr.write("WARNING: enums re-exported but absent from schema.prisma: %s\n" % ", ".join(missing))
PY

cp "$HERE/harness.mjs" "$OUT/harness.mjs"
echo "==> running"
cd "$OUT" && node harness.mjs
