/**
 * Drag & Drop Engine — PetalPath Orchestrator
 * Lightweight lifecycle & event coordinator delegating to specialized services.
 */

import { DragDropActivitySpec } from '../types';
import { Point2D } from '../../../core/collision/CollisionStrategy';
import { ActivityLifecycle } from '../../../core/activity-lifecycle/ActivityLifecycle';
import { ActivityEventBus } from '../../../core/event-bus/eventBus';
import { ActivityLoader } from './ActivityLoader';
import { PlacementState } from './PlacementState';
import { GestureController } from './GestureController';
import { PlacementManager } from './PlacementManager';
import { ValidationSystem } from './ValidationSystem';
import { ScoringSystem } from './ScoringSystem';
import { StarRatingEvaluator } from './StarRatingEvaluator';
import { HintController } from './HintController';
import { AnalyticsObserver } from '../../../core/analytics/analyticsObserver';
import { CompletionEmitter } from './CompletionEmitter';
import { useActivityRuntimeStore } from '../../../core/activity-runtime/activityRuntimeStore';

export class DragDropEngine {
  readonly lifecycle = new ActivityLifecycle();
  readonly eventBus = new ActivityEventBus();
  readonly placementState = new PlacementState();

  private loader: ActivityLoader;
  private gestureController: GestureController;
  private placementManager: PlacementManager;
  private validationSystem: ValidationSystem;
  private scoringSystem: ScoringSystem;
  private hintController?: HintController;
  private analyticsObserver = new AnalyticsObserver();
  private completionEmitter?: CompletionEmitter;

  spec: DragDropActivitySpec | null = null;

  constructor(loader?: ActivityLoader) {
    this.loader = loader || new ActivityLoader();
    this.gestureController = new GestureController(this.eventBus);
    this.placementManager = new PlacementManager();
    this.validationSystem = new ValidationSystem();
    this.scoringSystem = new ScoringSystem();

    // Attach analytics observer
    this.analyticsObserver.attach(this.eventBus);
  }

  setSpec(spec: DragDropActivitySpec): void {
    this.spec = spec;
    if (spec.hints) {
      this.hintController = new HintController(spec.hints, this.eventBus);
      this.hintController.attach();
    }
    if (spec.completionSignals) {
      this.completionEmitter = new CompletionEmitter(spec.completionSignals);
    }
    useActivityRuntimeStore.getState().startSession(spec.id);
  }

  async loadAndPrepare(activityId: string): Promise<DragDropActivitySpec> {
    this.lifecycle.transitionTo('Loading');
    try {
      const readyActivity = await this.loader.loadRuntimeReadyActivity(activityId);
      this.setSpec(readyActivity.spec);

      this.lifecycle.transitionTo('Ready');
      return this.spec!;
    } catch (err) {
      this.lifecycle.dispose();
      throw err;
    }
  }

  startActivity(): void {
    const state = this.lifecycle.getState();
    if (state === 'Initializing' || state === 'Loading') {
      this.lifecycle.transitionTo('Ready');
    }
    if (this.lifecycle.getState() === 'Ready') {
      this.lifecycle.transitionTo('Running');
      this.eventBus.emit('ACTIVITY_STARTED', { activityId: this.spec?.id });
    }
  }

  handleDragStart(draggableId: string, x: number, y: number): void {
    if (this.lifecycle.getState() !== 'Running') return;
    if (this.placementState.isItemLocked(draggableId)) return;

    this.gestureController.onDragStart(draggableId, x, y);
    this.eventBus.emit('ITEM_SELECTED', { draggableId });
  }

  handleDragMove(draggableId: string, x: number, y: number): void {
    if (this.lifecycle.getState() !== 'Running') return;
    this.gestureController.onDragMove(draggableId, x, y);
  }

  handleDragEnd(draggableId: string, dropPoint: Point2D): boolean {
    if (this.lifecycle.getState() !== 'Running' || !this.spec) return false;

    this.gestureController.onDragEnd(draggableId, dropPoint.x, dropPoint.y);

    // 1. Determine placement candidate via PlacementManager
    const placementTarget = this.placementManager.findPlacementTarget(
      dropPoint,
      this.spec.dropZones,
      this.spec.interaction.snapping
    );

    if (!placementTarget.dropZoneId) {
      // Missed drop target -> return to origin
      useActivityRuntimeStore.getState().recordAttempt(false);
      this.eventBus.emit('VALIDATION_FAILED', { draggableId, reason: 'Missed target' });
      return false;
    }

    const dropZoneId = placementTarget.dropZoneId;

    // 2. Evaluate drop correctness via ValidationSystem
    const validationResult = this.validationSystem.evaluateDrop(
      draggableId,
      dropZoneId,
      this.spec.validation,
      this.spec.dropZones,
      this.placementState.getAllPlacements()
    );

    if (validationResult.isValid) {
      const lockOnDrop =
        this.spec.draggables.find((d) => d.id === draggableId)?.behavior.lockAfterCorrectDrop ?? true;

      this.placementState.placeItem(draggableId, dropZoneId, lockOnDrop);
      useActivityRuntimeStore.getState().recordAttempt(true);
      this.eventBus.emit('ITEM_PLACED', { draggableId, dropZoneId });
      this.eventBus.emit('VALIDATION_PASSED', { draggableId, dropZoneId });

      // 3. Check overall activity completion
      const isComplete = this.validationSystem.evaluateOverallCompletion(
        this.spec.draggables.length,
        this.placementState.getAllPlacements(),
        this.spec.dropZones,
        this.spec.validation
      );

      if (isComplete) {
        this.finishActivity();
      }

      return true;
    } else {
      useActivityRuntimeStore.getState().recordAttempt(false);
      this.eventBus.emit('VALIDATION_FAILED', { draggableId, dropZoneId });

      if (this.spec.draggables.find((d) => d.id === draggableId)?.behavior.returnToOriginOnFailure) {
        this.placementState.removeItem(draggableId);
      }

      return false;
    }
  }

  finishActivity(): void {
    if (!this.spec || this.lifecycle.getState() === 'Completed') return;

    this.lifecycle.transitionTo('Completed');
    useActivityRuntimeStore.getState().completeSession();

    const runtimeState = useActivityRuntimeStore.getState();
    const elapsedTime = runtimeState.session.elapsedMs;
    const correctCount = runtimeState.interaction.correctCount;
    const incorrectCount = runtimeState.interaction.incorrectCount;
    const attempts = runtimeState.interaction.attempts;

    // 1. Calculate numeric score
    const scoreResult = this.scoringSystem.calculateScore(
      this.spec.draggables.length,
      correctCount,
      incorrectCount,
      elapsedTime,
      this.spec.validation.scoringModel
    );

    // 2. Evaluate star rating
    const stars = StarRatingEvaluator.evaluateStars(
      scoreResult.percentageScore,
      this.spec.validation.scoringModel.starThresholds
    );

    // 3. Emit completion signals via CompletionEmitter
    const emittedSignals = this.completionEmitter?.evaluateAndEmit({
      activityId: this.spec.id,
      score: Math.round(scoreResult.percentageScore * 100),
      percentageScore: scoreResult.percentageScore,
      stars,
      attempts,
      totalDraggables: this.spec.draggables.length,
    });

    this.eventBus.emit('ACTIVITY_COMPLETED', {
      score: scoreResult.numericScore,
      percentageScore: scoreResult.percentageScore,
      stars,
      metrics: this.analyticsObserver.getMetrics(),
      signals: emittedSignals,
    });
  }

  dispose(): void {
    this.eventBus.emit('DISPOSED', {});
    this.hintController?.detach();
    this.analyticsObserver.detach();
    this.eventBus.removeAllListeners();
    this.placementState.clear();
    this.lifecycle.dispose();
  }
}
