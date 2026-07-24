import { ActivityDefinition, CatalogHeader } from './activitySchema';
import { validateAndAuditCatalog, CatalogIntegrityReport } from './activityValidator';
import rawGeneratedData from './activities.generated.json';

export class ActivityCatalogManager {
  private activitiesMap: Map<string, ActivityDefinition> = new Map();
  private allActivities: ActivityDefinition[] = [];
  private report: CatalogIntegrityReport | null = null;
  private header: CatalogHeader | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    const rawData = rawGeneratedData as any;
    const rawActivities = Array.isArray(rawData) ? rawData : rawData.activities || [];

    if (!Array.isArray(rawData)) {
      this.header = {
        _notice: rawData._notice || '',
        schemaVersion: rawData.schemaVersion || 1,
        catalogVersion: rawData.catalogVersion || 1,
        generatedAt: rawData.generatedAt || '',
        checksum: rawData.checksum || '',
        stats: rawData.stats || {
          totalActivities: rawActivities.length,
          categoriesCount: 6,
          validatorsUsedCount: 8,
          unusedValidatorsCount: 0,
        },
      };
    }

    const { validActivities, report } = validateAndAuditCatalog(rawActivities);
    this.allActivities = validActivities;
    this.report = report;

    validActivities.forEach((act) => {
      this.activitiesMap.set(act.id, act);
    });

    this.isInitialized = true;
  }

  public getActivity(id: string): Readonly<ActivityDefinition> | undefined {
    return this.activitiesMap.get(id);
  }

  public getActivities(): ReadonlyArray<Readonly<ActivityDefinition>> {
    return this.allActivities;
  }

  public getActivitiesByCategory(category: string): ReadonlyArray<Readonly<ActivityDefinition>> {
    return this.allActivities.filter((a) => a.category === category);
  }

  public getActivitiesByValidator(validatorName: string): ReadonlyArray<Readonly<ActivityDefinition>> {
    return this.allActivities.filter((a) => a.validatorName === validatorName);
  }

  public getActivitiesByDifficulty(difficulty: string): ReadonlyArray<Readonly<ActivityDefinition>> {
    return this.allActivities.filter((a) => a.difficulty === difficulty);
  }

  public getActivitiesByAgeRange(ageGroup: string): ReadonlyArray<Readonly<ActivityDefinition>> {
    return this.allActivities.filter((a) => a.ageGroup === ageGroup);
  }

  public getRelatedActivities(id: string): ReadonlyArray<Readonly<ActivityDefinition>> {
    const current = this.getActivity(id);
    if (!current) return [];

    // Use precomputed relatedActivityIds from build generation
    if (current.relatedActivityIds && current.relatedActivityIds.length > 0) {
      return current.relatedActivityIds
        .map((relId) => this.getActivity(relId))
        .filter((act): act is ActivityDefinition => act !== undefined);
    }

    return this.allActivities
      .filter((a) => a.category === current.category && a.id !== id)
      .slice(0, 3);
  }

  public searchActivities(query: string): ReadonlyArray<Readonly<ActivityDefinition>> {
    const lower = query.toLowerCase().trim();
    if (!lower) return this.allActivities;
    return this.allActivities.filter(
      (a) => a.title.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower),
    );
  }

  public getHeader(): CatalogHeader | null {
    return this.header;
  }

  public getReport(): CatalogIntegrityReport | null {
    return this.report;
  }
}

export const ActivityCatalog = new ActivityCatalogManager();
