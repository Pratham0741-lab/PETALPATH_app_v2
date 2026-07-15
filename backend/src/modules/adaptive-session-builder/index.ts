import { AdaptiveSessionBuilderService } from './application/services/adaptive-session-builder.service.js';
import { getSessionExecutionPlanner } from '../execution-planner/index.js';
import { getSessionPlanRepository, getSessionBlockRepository } from '../adaptive-planning/index.js';

let builder: AdaptiveSessionBuilderService | null = null;

export function getAdaptiveSessionBuilder(): AdaptiveSessionBuilderService {
  if (!builder) {
    builder = new AdaptiveSessionBuilderService(
      getSessionExecutionPlanner(),
      getSessionPlanRepository(),
      getSessionBlockRepository(),
    );
  }
  return builder;
}
