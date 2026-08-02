#!/usr/bin/env tsx
/**
 * validate_activity_schema.ts — ONLY validates. Does not modify files.
 *
 * Usage:
 *   npx tsx scripts/validate_activity_schema.ts drag_drop
 *   npx tsx scripts/validate_activity_schema.ts drag_drop --json
 *
 * Exit codes:
 *   0 = all files valid
 *   1 = validation errors found
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSchema, listRegisteredTypes } from './schema/activity_registry';
import type {
  CurriculumGradeFile,
  CurriculumNode,
  MigrationReport,
  ValidationIssue,
  FileReport,
} from './schema/types';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const activityType = args[0];
const jsonOutput = args.includes('--json');

if (!activityType) {
  console.error(`Usage: npx tsx scripts/validate_activity_schema.ts <activity_type> [--json]`);
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
// Main
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
let totalErrors = 0;
let totalWarnings = 0;

for (const fileName of files) {
  const filePath = path.join(activitiesDir, fileName);
  const activity: Record<string, unknown> = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const result = schema.validator.validate(activity, { fileName, curriculumNodes });

  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  totalErrors += errors.length;
  totalWarnings += warnings.length;

  fileReports.push({
    fileName,
    activityId: (activity.id as string) || 'unknown',
    modified: false,
    changes: [],
    validationIssues: result.issues,
  });

  if (!jsonOutput) {
    if (errors.length > 0) {
      console.error(`❌ ${fileName}`);
      for (const e of errors) {
        console.error(`   ERROR  ${e.field}: ${e.message}`);
      }
    } else if (warnings.length > 0) {
      console.warn(`⚠️  ${fileName}`);
      for (const w of warnings) {
        console.warn(`   WARN   ${w.field}: ${w.message}`);
      }
    } else {
      console.log(`✅ ${fileName}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const report: MigrationReport = {
  activityType,
  timestamp: new Date().toISOString(),
  dryRun: true,
  processed: files.length,
  modified: 0,
  unchanged: files.length,
  errors: fileReports.flatMap((f) => f.validationIssues.filter((i) => i.severity === 'error')),
  warnings: fileReports.flatMap((f) => f.validationIssues.filter((i) => i.severity === 'warning')),
  files: fileReports,
};

if (jsonOutput) {
  // Write machine-readable report
  const reportsDir = path.join(projectRoot, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, `schema_validate_${activityType}_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${reportPath}`);
} else {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Validation Summary: ${activityType}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Files scanned:  ${files.length}`);
  console.log(`  Errors:         ${totalErrors}`);
  console.log(`  Warnings:       ${totalWarnings}`);
  console.log(`${'─'.repeat(60)}`);
}

process.exit(totalErrors > 0 ? 1 : 0);
