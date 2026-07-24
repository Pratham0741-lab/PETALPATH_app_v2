import { ActivityCatalog } from '../catalog/ActivityCatalog';
import { validatorRegistry } from '../catalog/ValidatorRegistry';

export function runCatalogIntegrationVerification(): boolean {
  // 1. Verify Catalog loaded
  const allActs = ActivityCatalog.getActivities();
  if (!allActs || allActs.length < 90) return false;

  // 2. Verify Header & Checksum
  const header = ActivityCatalog.getHeader();
  if (!header || !header.checksum) return false;

  // 3. Verify Query APIs
  const raiseHandsAct = ActivityCatalog.getActivity('raise_both_hands');
  if (!raiseHandsAct) return false;
  if (raiseHandsAct.category !== 'body_movements') return false;

  // 4. Verify Validator Registry resolution
  const hasValidator = validatorRegistry.hasValidator(raiseHandsAct.validatorName);
  if (!hasValidator) return false;

  // 5. Verify Precomputed Related Activities
  const related = ActivityCatalog.getRelatedActivities('raise_both_hands');
  if (!related || related.length === 0) return false;

  // 6. Verify Category Filtering
  const bodyActs = ActivityCatalog.getActivitiesByCategory('body_movements');
  if (bodyActs.length !== 15) return false;

  // 7. Verify Search API
  const searchResults = ActivityCatalog.searchActivities('jump');
  if (searchResults.length === 0) return false;

  return true;
}
