import { engineConfig } from '../../../../shared/config/engine.config.js';

const STRONG = engineConfig.mastery.stateThresholds.strong;
const CONFIDENT = engineConfig.analytics.baselines.confidence;

export class PerformanceSnapshot {
  readonly mastery: number;
  readonly confidence: number;
  readonly difficulty: string;
  readonly currentModality: string | null;

  constructor(props: {
    mastery: number;
    confidence: number;
    difficulty: string;
    currentModality: string | null;
  }) {
    this.mastery = props.mastery;
    this.confidence = props.confidence;
    this.difficulty = props.difficulty;
    this.currentModality = props.currentModality;
  }

  get isMastered(): boolean {
    return this.mastery >= STRONG;
  }

  get isConfident(): boolean {
    return this.confidence >= CONFIDENT;
  }
}
