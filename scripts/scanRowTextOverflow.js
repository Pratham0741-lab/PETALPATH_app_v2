/*
 * Finds <Text> elements that sit inside a flexDirection:'row' container but can
 * neither shrink nor clamp — the RN 0.85 trap where flexShrink defaults to 0, so
 * the text pushes itself past its parent's edge instead of wrapping.
 *
 * Works on real JSX ancestry rather than line proximity: it keeps a tag stack and
 * resolves each element's `styles.NAME` references against the file's own
 * StyleSheet.create block. Line-based heuristics were tried first and were
 * useless here, because many <Text ...> opening tags span several lines.
 */
const fs = require('fs');
const path = require('path');

const ROOT = '/sessions/epic-hopeful-shannon/mnt/PETALPATH_app_v2.0/frontend/src';
const ENTRY = '/sessions/epic-hopeful-shannon/mnt/PETALPATH_app_v2.0/frontend/App.tsx';

/*
 * Only files actually reachable from the app entry are worth reporting. Without
 * this the output is dominated by the unreachable assessment / gamification /
 * ai-tutor / dashboard clusters — 265 hits, of which the overwhelming majority
 * are in components nothing imports.
 */
function liveFiles() {
  const EXTS = ['', '.tsx', '.ts', '/index.tsx', '/index.ts'];
  const seen = new Set();
  const queue = [ENTRY];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const dir = path.dirname(file);
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
      const base = path.resolve(dir, m[1]);
      for (const ext of EXTS) {
        const cand = base + ext;
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) { queue.push(cand); break; }
      }
    }
  }
  return seen;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/* Extract the StyleSheet.create({...}) body and split it into top-level entries. */
function parseStyles(src) {
  const map = new Map();
  const start = src.indexOf('StyleSheet.create(');
  if (start === -1) return map;
  let i = src.indexOf('{', start);
  if (i === -1) return map;
  let depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end === -1) return map;
  const body = src.slice(i + 1, end);

  // Split on top-level `name: {` ... `}` pairs.
  const re = /([A-Za-z_$][\w$]*)\s*:\s*\{/g;
  let m;
  while ((m = re.exec(body))) {
    let d = 1, k = m.index + m[0].length;
    for (; k < body.length; k++) {
      if (body[k] === '{') d++;
      else if (body[k] === '}') { d--; if (d === 0) break; }
    }
    map.set(m[1], body.slice(m.index + m[0].length, k));
    re.lastIndex = k;
  }
  return map;
}

/* Read the full text of an opening tag starting at `<`, tracking braces/strings
   so a `style={({ pressed }) => ...}` arrow doesn't truncate us at its `>`. */
function readTag(src, start) {
  let i = start, depth = 0, q = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === q && src[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/* Case matters: `width` alone would miss `minWidth`/`maxWidth`, which are the
   two most common ways a wrapper in this codebase constrains its text. */
const SHRINKABLE = /flexShrink|flex\s*:|[Ww]idth|flexBasis|flexWrap/;

const findings = [];
const live = liveFiles();
const all = walk(ROOT);
const scanned = all.filter((f) => live.has(f));

for (const file of scanned) {
  const src = fs.readFileSync(file, 'utf8');
  const styles = parseStyles(src);

  const resolve = (tagText) => {
    const names = [...tagText.matchAll(/styles\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
    let css = names.map((n) => styles.get(n) || '').join(';');
    // Inline style objects in the tag count too.
    css += ';' + tagText;
    return css;
  };

  const stack = [];
  const tagRe = /<\/?([A-Z][\w.]*)/g;
  let m;
  while ((m = tagRe.exec(src))) {
    const isClose = src[m.index + 1] === '/';
    const name = m[1];
    if (isClose) {
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].name === name) { stack.length = k; break; }
      }
      continue;
    }
    const tag = readTag(src, m.index);
    if (!tag) continue;
    const selfClosing = tag.endsWith('/>');
    const css = resolve(tag);

    if (name === 'Text') {
      const hasClamp = /numberOfLines/.test(tag);
      /*
       * Find the nearest row ancestor, and check every element between it and the
       * Text — not just the Text itself. The prevailing fix in this codebase is an
       * intermediate `flex: 1, minWidth: 0` column wrapper (see ParentSection),
       * which lets the text wrap perfectly well; scoring only the Text's own style
       * reported all of those as broken and buried the real defects.
       */
      let rowIdx = -1;
      for (let k = stack.length - 1; k >= 0; k--) {
        if (/flexDirection:\s*'row'/.test(stack[k].css)) { rowIdx = k; break; }
      }
      const chain = rowIdx === -1 ? [] : stack.slice(rowIdx + 1).map((a) => a.css).concat(css);
      const canShrink = chain.some((c) => SHRINKABLE.test(c));

      if (rowIdx !== -1 && !hasClamp && !canShrink) {
        const close = src.indexOf('</Text>', m.index);
        const inner = close === -1 ? '' : src.slice(m.index + tag.length, close);
        /*
         * Bounded content can't overflow no matter what: percentages, counts,
         * "3/8", durations. Only free text — names, titles, labels, descriptions,
         * anything a user or the curriculum supplies — is worth hardening, and
         * separating the two is the difference between 112 sites to review and a
         * shortlist.
         */
        const unbounded = /\.(name|title|label|description|subtitle|message|text|word|species|funFact)\b/.test(
          inner
        );
        findings.push({
          file: path.relative(ROOT, file),
          line: src.slice(0, m.index).split('\n').length,
          row: stack[rowIdx].name,
          dynamic: /\{/.test(inner),
          unbounded,
          snippet: inner.replace(/\s+/g, ' ').trim().slice(0, 68),
          depth: stack.length - rowIdx - 1,
        });
      }
    }
    if (!selfClosing) stack.push({ name, css });
  }
}

const dyn = findings.filter((f) => f.dynamic);
const bad = findings.filter((f) => f.unbounded);
console.log(`${all.length} .tsx files on disk, ${scanned.length} reachable from App.tsx`);
console.log(
  `unguarded <Text> in a row: ${findings.length} total, ${dyn.length} interpolated, ${bad.length} interpolating free text\n`
);
for (const f of bad) console.log(`  ${f.file}:${f.line}  ${f.snippet}`);
