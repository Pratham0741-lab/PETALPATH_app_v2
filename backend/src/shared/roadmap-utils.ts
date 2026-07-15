export interface FlattenOptions {
  sectionType?: string;
  limit?: number;
  offset?: number;
  sortByOrder?: boolean;
}

export function flattenRoadmapItems(roadmapData: Record<string, unknown>, options?: FlattenOptions): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  const sections = (roadmapData.sections as Record<string, unknown>[]) || [];
  for (const section of sections) {
    if (options?.sectionType && section.type !== options.sectionType) continue;
    const sectionItems = (section.items as Record<string, unknown>[]) || [];
    for (const item of sectionItems) {
      items.push({ ...item, sectionType: section.type });
    }
  }
  let result = items;
  if (options?.sortByOrder) {
    result = result.sort((a, b) => (a.order as number) - (b.order as number));
  }
  if (options?.offset !== undefined || options?.limit !== undefined) {
    result = result.slice(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 50));
  }
  return result;
}
