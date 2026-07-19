import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ParsedTheme {
  id: string;
  title: string;
}

export interface ParsedNode {
  id: string;
  title: string;
  themeId: string;
  prerequisite?: string | null;
  unlockType?: 'sequential' | 'mastery';
  masteryThreshold?: number;
  reward?: string;
  activities?: string[];
  skills?: string[];
  difficulty?: number;
}

export interface ParsedRoadmap {
  gradeId: string;
  title: string;
  unlockNextGrade: string | null;
  estimatedNodes: string | null;
  themes: ParsedTheme[];
  nodes: ParsedNode[];
}

export function getCurriculumPath(): string {
  const lookups = [
    path.resolve(process.cwd(), '../curriculum'),
    path.resolve(process.cwd(), 'curriculum'),
    path.resolve(__dirname, '../../../../curriculum'),
  ];
  for (const p of lookups) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error('Curriculum directory not found');
}

/**
 * Clean title to remove emoji, numbers, section prefixes, and dividers
 */
function cleanSectionTitle(title: string): string {
  return title
    .replace(/^#\s*/, '')
    .replace(/[─\-_]+/g, '')
    .trim();
}

/**
 * Parse mappings file to extract metadata for overrides
 */
export function parseMappingsFile(gradeId: string): Record<string, Partial<ParsedNode>> {
  const curriculumDir = getCurriculumPath();
  const filePath = path.join(curriculumDir, `mappings/${gradeId}_mapping.md`);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = content.split(/(?=##\s+)/g);
  const mappings: Record<string, Partial<ParsedNode>> = {};

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    const matchHeader = firstLine.match(/^##\s+([A-Za-z0-9_]+)/);
    if (!matchHeader) continue;

    const nodeId = matchHeader[1];
    const meta: Partial<ParsedNode> = { id: nodeId };

    // Try YAML parsing inside block
    let isYaml = false;
    for (const line of lines) {
      if (line.includes(':')) {
        const parts = line.split(':');
        const key = parts[0].trim().toLowerCase();
        let val = parts.slice(1).join(':').trim();
        // strip quotes
        val = val.replace(/^["']|["']$/g, '');

        if (key === 'roadmap_title' || key === 'title') {
          meta.title = val;
          isYaml = true;
        } else if (key === 'theme') {
          meta.themeId = val;
          isYaml = true;
        } else if (key === 'difficulty') {
          meta.difficulty = parseInt(val, 10);
          isYaml = true;
        } else if (key === 'prerequisite') {
          meta.prerequisite = val === 'null' || val === 'None' ? null : val;
          isYaml = true;
        } else if (key === 'mastery') {
          meta.masteryThreshold = parseFloat(val);
          isYaml = true;
        } else if (key === 'reward') {
          meta.reward = val;
          isYaml = true;
        } else if (key === 'unlock') {
          meta.prerequisite = val;
          isYaml = true;
        }
      }
    }

    // If not YAML, parse line-by-line using key headings (like in prenursery_mapping.md)
    if (!isYaml) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === 'Roadmap Title' && i + 1 < lines.length) {
          meta.title = lines[i + 1];
        } else if (line === 'Theme' && i + 1 < lines.length) {
          meta.themeId = lines[i + 1];
        } else if (line === 'Difficulty' && i + 1 < lines.length) {
          meta.difficulty = parseInt(lines[i + 1], 10);
        } else if (line === 'Prerequisite' && i + 1 < lines.length) {
          meta.prerequisite = lines[i + 1] === 'None' ? null : lines[i + 1];
        } else if (line === 'Unlock' && i + 1 < lines.length) {
          meta.prerequisite = lines[i + 1];
        } else if (line === 'Reward' && i + 1 < lines.length) {
          meta.reward = lines[i + 1];
        } else if (line === 'Activities') {
          const acts: string[] = [];
          let j = i + 1;
          while (j < lines.length && lines[j].startsWith('-')) {
            acts.push(lines[j].substring(1).trim());
            j++;
          }
          if (acts.length > 0) meta.activities = acts;
        } else if (line === 'Skills') {
          const sks: string[] = [];
          let j = i + 1;
          while (j < lines.length && lines[j].startsWith('-')) {
            sks.push(lines[j].substring(1).trim());
            j++;
          }
          if (sks.length > 0) meta.skills = sks;
        }
      }
    }

    mappings[nodeId] = meta;
  }

  return mappings;
}

/**
 * Parse the visual roadmap file to extract nodes and sections/themes
 */
export function parseRoadmapFile(gradeId: string): ParsedRoadmap {
  const curriculumDir = getCurriculumPath();
  const filePath = path.join(curriculumDir, `roadmap/${gradeId}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Roadmap file not found for grade: ${gradeId}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const contentLines: string[] = [];
  const metadata: Record<string, string> = {
    grade_id: gradeId,
    title: gradeId.toUpperCase(),
    unlock_next_grade: '',
    estimated_nodes: '',
  };

  const metadataKeys = ['grade_id', 'title', 'unlock_next_grade', 'estimated_nodes', 'roadmap_style'];

  // Two-pass approach:
  // Pass 1: Find the boundary where actual roadmap content begins
  //         (first SECTION keyword, first node block `id:`, or first inline node `N001 - Title`)
  // Everything before that boundary is metadata/document headers.
  let contentStartIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip blank lines, `---` dividers, and document-level headings
    if (trimmed === '' || trimmed === '---') continue;
    if (trimmed.startsWith('# PetalPath') || trimmed.startsWith('# Grade:')) continue;

    // Check for metadata key lines (e.g. `grade_id: prenursery`)
    let isMetaKey = false;
    for (const key of metadataKeys) {
      if (trimmed.startsWith(key + ':')) {
        isMetaKey = true;
        break;
      }
    }
    if (isMetaKey) continue;

    // If we get here, this is the first real content line
    contentStartIdx = i;
    break;
  }

  // Pass 2: Extract metadata from lines before content start
  for (let i = 0; i < contentStartIdx; i++) {
    const trimmed = lines[i].trim();
    for (const key of metadataKeys) {
      if (trimmed.startsWith(key + ':')) {
        const val = trimmed.substring(key.length + 1).trim();
        if (val) {
          metadata[key] = val;
        }
      }
    }
  }

  // Collect content lines (everything from contentStartIdx onward, skip blank and `---`)
  for (let i = contentStartIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '---') continue;
    if (trimmed.length > 0) {
      contentLines.push(lines[i]);
    }
  }

  const result: ParsedRoadmap = {
    gradeId: metadata.grade_id || gradeId,
    title: metadata.title || gradeId.toUpperCase(),
    unlockNextGrade: metadata.unlock_next_grade || null,
    estimatedNodes: metadata.estimated_nodes || null,
    themes: [],
    nodes: [],
  };

  let currentThemeId = 'theme_default';
  let currentThemeTitle = 'Default';
  let bareNodeCounter = 0; // counter for generating IDs for bare word nodes

  const inlineRegex = /([A-Za-z0-9_]+)\s*-\s*([^-\n]+?)(?=\s*[A-Za-z0-9_]+\s*-|\r?\n|$)/g;

  // Helper to check if a line looks like a proper node ID (e.g. PN001, N042, L001)
  const isNodeIdPattern = (s: string) => /^[A-Z]+\d{2,}$/.test(s);

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i].trim();
    if (line.length === 0) continue;

    // Skip `## Module N` headers — they're just content separators in block-style format
    if (line.startsWith('## ')) {
      continue;
    }

    // Check for Section Heading (e.g. # 🌟 Welcome Back, # SECTION 1 — Welcome)
    if (line.startsWith('# ')) {
      let rawTitle = cleanSectionTitle(line);
      // Strip "SECTION N — " or "SECTION N ─ " prefixes
      rawTitle = rawTitle.replace(/^SECTION\s+\d+\s*[—─\-]\s*/i, '');
      currentThemeTitle = rawTitle;
      currentThemeId = `theme_${currentThemeTitle.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;

      // Avoid duplicates
      if (!result.themes.some(t => t.id === currentThemeId)) {
        result.themes.push({ id: currentThemeId, title: currentThemeTitle });
      }
      continue;
    }

    // Check for SECTION delimiter (bare `SECTION` keyword followed by a title)
    if (line === 'SECTION' && i + 1 < contentLines.length) {
      const nextLine = contentLines[i + 1].trim();
      // Skip divider lines between SECTION and the title
      if (nextLine.startsWith('─') || nextLine.startsWith('-')) {
        i++;
        // The title is now the line after the divider
        if (i + 1 < contentLines.length) {
          currentThemeTitle = cleanSectionTitle(contentLines[i + 1].trim());
          i++;
        }
      } else {
        currentThemeTitle = cleanSectionTitle(nextLine);
        i++;
      }
      currentThemeId = `theme_${currentThemeTitle.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;
      if (!result.themes.some(t => t.id === currentThemeId)) {
        result.themes.push({ id: currentThemeId, title: currentThemeTitle });
      }
      continue;
    }

    // Ignore divider lines
    if (line.startsWith('─') || (line.startsWith('-') && !line.includes(' - '))) {
      continue;
    }

    // Skip ellipsis lines (e.g., "...")
    if (line === '...') {
      continue;
    }

    // Check for inline nodes (e.g. N001 - Welcome N002 - Rules)
    if (line.includes(' - ')) {
      let match;
      inlineRegex.lastIndex = 0; // reset regex index
      while ((match = inlineRegex.exec(line)) !== null) {
        const id = match[1].trim();
        const title = match[2].trim();
        result.nodes.push({
          id,
          title,
          themeId: currentThemeId,
        });
      }
      continue;
    }

    // Check for block-style metadata (e.g. id: PN001)
    if (line.startsWith('id:')) {
      const id = line.split(':')[1].trim();
      let title = `Node ${id}`;
      let theme = currentThemeId;

      // Scan subsequent lines for details
      let j = i + 1;
      while (j < contentLines.length && !contentLines[j].startsWith('##') && !contentLines[j].startsWith('---') && contentLines[j].trim() !== 'SECTION') {
        const nextL = contentLines[j].trim();
        if (nextL.startsWith('title:')) {
          title = nextL.split(':').slice(1).join(':').trim();
        } else if (nextL.startsWith('theme:')) {
          const themeName = nextL.split(':').slice(1).join(':').trim();
          theme = `theme_${themeName.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;
          if (!result.themes.some(t => t.id === theme)) {
            result.themes.push({ id: theme, title: themeName });
          }
        }
        j++;
      }
      result.nodes.push({
        id,
        title,
        themeId: theme,
      });
      i = j - 1; // Move pointer
      continue;
    }

    // Check for raw node ID followed by title (e.g. PN021 \n Dog)
    // Only match proper node ID patterns (uppercase letters + digits)
    if (isNodeIdPattern(line) && i + 1 < contentLines.length) {
      const nextL = contentLines[i + 1].trim();
      if (nextL.length > 0 && !nextL.includes(':') && !nextL.startsWith('#') && !nextL.startsWith('─') && nextL !== 'SECTION' && nextL !== '...') {
        result.nodes.push({
          id: line,
          title: nextL,
          themeId: currentThemeId,
        });
        i++; // skip next line
        continue;
      }
    }

    // Bare word node (e.g. "Red", "Apple", "Head") — generate a stable ID
    // These are single-line topic titles in sections like Colours, Body Parts, etc.
    if (line.length > 0 && !line.includes(':') && !line.startsWith('#')) {
      bareNodeCounter++;
      const stableId = `${gradeId.toUpperCase()}_${currentThemeId.replace('theme_', '').toUpperCase()}_${String(bareNodeCounter).padStart(3, '0')}`;
      result.nodes.push({
        id: stableId,
        title: line,
        themeId: currentThemeId,
      });
      continue;
    }
  }

  // Remove the default theme if it is empty
  if (result.themes.length > 1 && result.themes[0].id === 'theme_default') {
    const hasDefaultNodes = result.nodes.some(n => n.themeId === 'theme_default');
    if (!hasDefaultNodes) {
      result.themes.shift();
    }
  }

  // Enrich with mapping overrides
  const mappings = parseMappingsFile(gradeId);
  result.nodes = result.nodes.map(node => {
    const override = mappings[node.id];
    if (override) {
      // If the mapping specifies a themeId, ensure it exists in the themes list
      let overrideThemeId = node.themeId;
      if (override.themeId) {
        overrideThemeId = `theme_${override.themeId.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`;
        if (!result.themes.some(t => t.id === overrideThemeId)) {
          result.themes.push({ id: overrideThemeId, title: override.themeId });
        }
      }
      return {
        ...node,
        ...override,
        // Preserve visual roadmap title unless mapping explicitly overrides it
        title: override.title || node.title,
        themeId: overrideThemeId,
      };
    }
    return node;
  });

  return result;
}
