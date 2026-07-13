import { LearningEventRepository } from './infrastructure/repositories/learning-event.repository.js';
import { LearningEvidenceRepository } from './infrastructure/repositories/learning-evidence.repository.js';
import { LearningEventApplicationService } from './application/services/learning-event.service.js';
import { LearningEvidenceApplicationService } from './application/services/learning-evidence.service.js';
import { LearningEventController } from './api/controllers/learning-event.controller.js';
import { createLearningEventRoutes } from './api/routes/learning-event.routes.js';

let eventService: LearningEventApplicationService | null = null;
let evidenceService: LearningEvidenceApplicationService | null = null;
let eventController: LearningEventController | null = null;
let eventRoutes: ReturnType<typeof createLearningEventRoutes> | null = null;

export function getLearningEventService(): LearningEventApplicationService {
  if (!eventService) {
    const eventRepo = new LearningEventRepository();
    eventService = new LearningEventApplicationService(eventRepo);
  }
  return eventService;
}

export function getLearningEvidenceService(): LearningEvidenceApplicationService {
  if (!evidenceService) {
    const evidenceRepo = new LearningEvidenceRepository();
    evidenceService = new LearningEvidenceApplicationService(evidenceRepo);
  }
  return evidenceService;
}

export function getLearningEventController(): LearningEventController {
  if (!eventController) {
    eventController = new LearningEventController(
      getLearningEventService(),
      getLearningEvidenceService()
    );
  }
  return eventController;
}

export function getLearningEventRoutes(): ReturnType<typeof createLearningEventRoutes> {
  if (!eventRoutes) {
    eventRoutes = createLearningEventRoutes(getLearningEventController());
  }
  return eventRoutes;
}