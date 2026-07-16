import { spawnSync } from 'child_process';
import { logger } from '../utils/logger.js';

export function exportDatabase(outputPath: string): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error('DATABASE_URL not set, cannot export.');
    return;
  }

  const result = spawnSync('pg_dump', [
    databaseUrl,
    '--no-owner',
    '--no-acl',
    '-f', outputPath,
  ], {
    timeout: 120000,
  });

  if (result.error) {
    logger.error(result.error, 'Database export failed');
    throw result.error;
  }

  if (result.status !== 0) {
    const msg = result.stderr?.toString() || `exit code ${result.status}`;
    logger.error({ status: result.status, stderr: msg }, 'Database export failed');
    throw new Error(`pg_dump failed: ${msg}`);
  }

  logger.info({ outputPath }, 'Database export completed.');
}

export function importDatabase(inputPath: string): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error('DATABASE_URL not set, cannot import.');
    return;
  }

  const result = spawnSync('psql', [
    databaseUrl,
    '-f', inputPath,
  ], {
    timeout: 300000,
  });

  if (result.error) {
    logger.error(result.error, 'Database import failed');
    throw result.error;
  }

  if (result.status !== 0) {
    const msg = result.stderr?.toString() || `exit code ${result.status}`;
    logger.error({ status: result.status, stderr: msg }, 'Database import failed');
    throw new Error(`psql failed: ${msg}`);
  }

  logger.info({ inputPath }, 'Database import completed.');
}
