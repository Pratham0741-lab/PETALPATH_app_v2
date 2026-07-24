import { ActivityDefinition } from './activitySchema';
import { validatorRegistry } from './ValidatorRegistry';

export interface CatalogIntegrityReport {
  totalLoaded: number;
  availableCount: number;
  skippedCount: number;
  duplicateCount: number;
  unknownValidatorCount: number;
  categories: Record<string, number>;
}

export function validateAndAuditCatalog(rawActivities: any[]): {
  validActivities: ActivityDefinition[];
  report: CatalogIntegrityReport;
} {
  const seenIds = new Set<string>();
  const validActivities: ActivityDefinition[] = [];
  const categories: Record<string, number> = {};

  let availableCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let unknownValidatorCount = 0;

  for (const item of rawActivities) {
    if (!item.id || !item.title || !item.validatorName) {
      skippedCount += 1;
      continue;
    }

    if (seenIds.has(item.id)) {
      duplicateCount += 1;
      continue;
    }

    seenIds.add(item.id);

    // Check validator registry
    const hasValidator = validatorRegistry.hasValidator(item.validatorName);
    const isAvailable = item.isAvailable !== false && hasValidator;

    if (!hasValidator) {
      unknownValidatorCount += 1;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[ActivityCatalog] Warning: Unknown validator '${item.validatorName}' for activity '${item.id}'`);
      }
    }

    const activity: ActivityDefinition = {
      ...item,
      isAvailable,
    };

    validActivities.push(activity);
    if (isAvailable) availableCount += 1;

    categories[item.category] = (categories[item.category] || 0) + 1;
  }

  const report: CatalogIntegrityReport = {
    totalLoaded: rawActivities.length,
    availableCount,
    skippedCount,
    duplicateCount,
    unknownValidatorCount,
    categories,
  };

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(
      `[ActivityCatalog] Integrity Report: Loaded ${report.totalLoaded} | Available ${report.availableCount} | Skipped ${report.skippedCount} | Duplicates ${report.duplicateCount} | Unknown Validators ${report.unknownValidatorCount}`,
    );
  }

  return { validActivities, report };
}
