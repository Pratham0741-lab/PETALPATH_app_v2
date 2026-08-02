#!/usr/bin/env tsx
/**
 * sync_activity_schema.ts — Synchronizes activity files to their latest spec.
 *
 * Pipeline:
 *   Load → Validate (pre) → Synchronize → Validate (post) → Diff →
 *   Write Modified Only → Reload → Validate Again → Report
 *
 * Usage:
 *   npx tsx scripts/sync_activity_schema.ts drag_drop
 *   npx tsx scripts/sync_activity_schema.ts drag_drop --dry-run
 *   npx tsx scripts/sync_activity_schema.ts drag_drop --json
 *   npx tsx scripts/sync_activity_schema.ts drag_drop --dry-run --json
 *
 * Exit codes:
 *   0 = success
 *   1 = validation errors (pre-sync or post-reload)
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSchema, listRegisteredTypes } from './schema/activity_registry';
import type {
  CurriculumGradeFile,
  CurriculumNode,
  MigrationReport,
  FileReport,
} from './schema/types';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const activityType = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const jsonOutput = args.includes('--json');

if (!activityType) {
  console.error(`Usage: npx tsx scripts/sync_activity_schema.ts <activity_type> [--dry-run] [--json]`);
  console.error(`Registered types: ${listRegisteredTypes().join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load curriculum data
// ---------------------------------------------------------------------------

const projectRoot = path.resolve(__dirname, '..');
const cbseDir = path.join(projectRoot, 'curriculum', 'cbse');
const gradeFiles = ['prenursery.json', 'nursery.json', 'lkg.json', 'ukg.json'];

function loadCurriculumNodes(): Map<string, CurriculumNode> {
  const nodes = new Map<string, CurriculumNode>();
  for (const gf of gradeFiles) {
    const filePath = path.join(cbseDir, gf);
    if (!fs.existsSync(filePath)) continue;
    const data: CurriculumGradeFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const theme of data.themes) {
      for (const node of theme.nodes) {
        nodes.set(node.id, node);
      }
    }
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

const schema = getSchema(activityType);
const curriculumNodes = loadCurriculumNodes();
const activitiesDir = path.join(projectRoot, schema.activitiesDir);

if (!fs.existsSync(activitiesDir)) {
  console.error(`Activities directory not found: ${activitiesDir}`);
  process.exit(1);
}

const files = fs.readdirSync(activitiesDir).filter((f) => f.endsWith('.json'));
const fileReports: FileReport[] = [];
let filesModified = 0;
let preSyncErrors = 0;
let postSyncErrors = 0;

if (!jsonOutput) {
  console.log(`\nPetalPath Schema Sync — ${activityType}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Spec version:   ${schema.specVersion}`);
  console.log(`  Files found:    ${files.length}`);
  console.log(`  Mode:           ${dryRun ? 'DRY RUN (no files written)' : 'LIVE'}`);
  console.log(`${'─'.repeat(60)}\n`);
}

for (const fileName of files) {
  const filePath = path.join(activitiesDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  const activity: Record<string, unknown> = JSON.parse(raw);

  // Step 1: Pre-sync validation
  const preResult = schema.validator.validate(activity, { fileName, curriculumNodes });
  const preErrors = preResult.issues.filter((i) => i.severity === 'error');
  preSyncErrors += preErrors.length;

  if (preErrors.length > 0 && !jsonOutput) {
    console.error(`❌ PRE-SYNC  ${fileName}: ${preErrors.length} error(s)`);
    for (const e of preErrors) {
      console.error(`   ${e.field}: ${e.message}`);
    }
  }

  // Step 2: Synchronize
  const syncResult = schema.synchronizer.synchronize(activity, { fileName });

  // Step 3: Post-sync validation
  const postResult = schema.validator.validate(syncResult.activity, { fileName, curriculumNodes });
  const postErrors = postResult.issues.filter((i) => i.severity === 'error');
  postSyncErrors += postErrors.length;

  if (postErrors.length > 0 && !jsonOutput) {
    console.error(`❌ POST-SYNC ${fileName}: ${postErrors.length} error(s)`);
    for (const e of postErrors) {
      console.error(`   ${e.field}: ${e.message}`);
    }
  }

  // Step 4: Determine if file actually changed
  const newJson = JSON.stringify(syncResult.activity, null, 2) + '\n';
  const fileChanged = newJson !== raw;

  if (fileChanged) {
    filesModified++;
  }

  // Step 5: Write only if changed and not dry-run
  if (fileChanged && !dryRun) {
    fs.writeFileSync(filePath, newJson, 'utf8');
  }

  // Step 6: Reload & re-validate (catches serialization bugs)
  if (fileChanged && !dryRun) {
    const reloaded: Record<string, unknown> = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const reloadResult = schema.validator.validate(reloaded, { fileName, curriculumNodes });
    const reloadErrors = reloadResult.issues.filter((i) => i.severity === 'error');

    if (reloadErrors.length > 0) {
      console.error(`❌ RELOAD    ${fileName}: ${reloadErrors.length} error(s) after write!`);
      for (const e of reloadErrors) {
        console.error(`   ${e.field}: ${e.message}`);
      }
      // Restore original file
      fs.writeFileSync(filePath, raw, 'utf8');
      console.error(`   ↩️  Restored original file.`);
    }
  }

  // Collect report
  const report: FileReport = {
    fileName,
    activityId: (activity.id as string) || 'unknown',
    modified: fileChanged,
    changes: syncResult.changes,
    validationIssues: [...preResult.issues, ...postResult.issues],
  };

  fileReports.push(report);

  if (!jsonOutput && !fileChanged) {
    console.log(`   ${fileName} — unchanged`);
  } else if (!jsonOutput && fileChanged) {
    const verb = dryRun ? 'would be modified' : 'modified';
    console.log(`📝 ${fileName} — ${verb} (${syncResult.changes.length} change(s))`);
    for (const c of syncResult.changes) {
      console.log(`   ${c.action.toUpperCase()}: ${c.field}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Update manifest only if files were modified
// ---------------------------------------------------------------------------

if (filesModified > 0 && !dryRun) {
  const manifestPath = path.join(projectRoot, schema.manifestFile);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.lastSyncTimestamp = new Date().toISOString();
    manifest.lastSyncSpecVersion = schema.specVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    if (!jsonOutput) {
      console.log(`\n📋 Manifest updated (${filesModified} file(s) modified)`);
    }
  }
} else if (filesModified === 0 && !jsonOutput) {
  console.log(`\n📋 Manifest NOT updated (no files changed)`);
}

// ---------------------------------------------------------------------------
// Machine-readable report
// ---------------------------------------------------------------------------

const migrationReport: MigrationReport = {
  activityType,
  timestamp: new Date().toISOString(),
  dryRun,
  processed: files.length,
  modified: filesModified,
  unchanged: files.length - filesModified,
  errors: fileReports.flatMap((f) => f.validationIssues.filter((i) => i.severity === 'error')),
  warnings: fileReports.flatMap((f) => f.validationIssues.filter((i) => i.severity === 'warning')),
  files: fileReports,
};

if (jsonOutput) {
  const reportsDir = path.join(projectRoot, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, `schema_sync_${activityType}_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));
  console.log(`Report written to ${reportPath}`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

if (!jsonOutput) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Sync Summary: ${activityType}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Files scanned:    ${files.length}`);
  console.log(`  Files modified:   ${filesModified}${dryRun ? ' (dry run — not written)' : ''}`);
  console.log(`  Files unchanged:  ${files.length - filesModified}`);
  console.log(`  Pre-sync errors:  ${preSyncErrors}`);
  console.log(`  Post-sync errors: ${postSyncErrors}`);
  console.log(`${'─'.repeat(60)}`);
}

process.exit(preSyncErrors > 0 || postSyncErrors > 0 ? 1 : 0);
