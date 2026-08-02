import { Router } from 'express';
import { ObservationEngine } from './application/services/observation-engine.service.js';
import { EvidenceProcessor } from './application/services/evidence-processor.service.js';
import { ClassificationEngine } from './application/services/classification-engine.service.js';
import { TopicStateRepository } from './infrastructure/repositories/topic-state.repository.js';
import { KnowledgeStateRepository } from './infrastructure/repositories/knowledge-state.repository.js';
import { ObservationEngineController } from './api/controllers/observation-engine.controller.js';
import { EvidenceProcessorController } from './api/controllers/evidence-processor.controller.js';
import { ClassificationEngineController } from './api/controllers/classification-engine.controller.js';
import { createObservationEngineRoutes } from './api/routes/observation-engine.routes.js';
import { createEvidenceProcessorRoutes } from './api/routes/evidence-processor.routes.js';
import { createClassificationEngineRoutes } from './api/routes/classification-engine.routes.js';

let observationEngine: ObservationEngine | null = null;
let evidenceProcessor: EvidenceProcessor | null = null;
let classificationEngine: ClassificationEngine | null = null;
let observationEngineController: ObservationEngineController | null = null;
let evidenceProcessorController: EvidenceProcessorController | null = null;
let classificationEngineController: ClassificationEngineController | null = null;
const observationEngineRoutes: ReturnType<typeof createObservationEngineRoutes> | null = null;
const evidenceProcessorRoutes: ReturnType<typeof createEvidenceProcessorRoutes> | null = null;
const classificationEngineRoutes: ReturnType<typeof createClassificationEngineRoutes> | null = null;

function getObservationEngine(): ObservationEngine {
  if (!observationEngine) {
    const topicStateRepo = new TopicStateRepository();
    observationEngine = new ObservationEngine(topicStateRepo);
  }
  return observationEngine;
}

function getEvidenceProcessor(): EvidenceProcessor {
  if (!evidenceProcessor) {
    evidenceProcessor = new EvidenceProcessor();
  }
  return evidenceProcessor;
}

function getClassificationEngine(): ClassificationEngine {
  if (!classificationEngine) {
    const topicStateRepo = new TopicStateRepository();
    const knowledgeStateRepo = new KnowledgeStateRepository();
    
    classificationEngine = new ClassificationEngine(
      topicStateRepo,
      knowledgeStateRepo
    );
  }
  return classificationEngine;
}

function getObservationEngineController(): ObservationEngineController {
  if (!observationEngineController) {
    observationEngineController = new ObservationEngineController(
      getObservationEngine(),
      getEvidenceProcessor()
    );
  }
  return observationEngineController;
}

function getEvidenceProcessorController(): EvidenceProcessorController {
  if (!evidenceProcessorController) {
    evidenceProcessorController = new EvidenceProcessorController(
      getEvidenceProcessor()
    );
  }
  return evidenceProcessorController;
}

function getClassificationEngineController(): ClassificationEngineController {
  if (!classificationEngineController) {
    classificationEngineController = new ClassificationEngineController(
      getClassificationEngine()
    );
  }
  return classificationEngineController;
}

export function getIntelligenceCoreRoutes(): Router {
  const router = Router();
  
  router.use('/observation', createObservationEngineRoutes(getObservationEngineController()));
  router.use('/evidence', createEvidenceProcessorRoutes(getEvidenceProcessorController()));
  router.use('/classification', createClassificationEngineRoutes(getClassificationEngineController()));
  
  return router;
}