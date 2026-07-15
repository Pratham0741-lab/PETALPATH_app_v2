export class ExecutionConfidence {
  readonly confidence: number;
  readonly weightedConfidence: number;

  constructor(confidence: number, weight: number = 1) {
    this.confidence = Math.max(0, Math.min(100, confidence));
    this.weightedConfidence = Math.round(this.confidence * weight);
  }
}
