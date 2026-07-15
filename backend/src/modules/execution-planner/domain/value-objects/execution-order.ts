export enum ExecutionOrderPhase {
  WARMUP = 'WARMUP',
  REVIEW = 'REVIEW',
  REINFORCEMENT = 'REINFORCEMENT',
  NEW_LEARNING = 'NEW_LEARNING',
  PRACTICE = 'PRACTICE',
  RECOVERY = 'RECOVERY',
  REFLECTION = 'REFLECTION',
}

export class ExecutionOrder {
  readonly phase: ExecutionOrderPhase;
  readonly sequence: number;

  constructor(phase: ExecutionOrderPhase, sequence: number) {
    this.phase = phase;
    this.sequence = sequence;
  }

  static get defaultSequence(): ExecutionOrderPhase[] {
    return [
      ExecutionOrderPhase.WARMUP,
      ExecutionOrderPhase.REVIEW,
      ExecutionOrderPhase.REINFORCEMENT,
      ExecutionOrderPhase.NEW_LEARNING,
      ExecutionOrderPhase.PRACTICE,
      ExecutionOrderPhase.RECOVERY,
      ExecutionOrderPhase.REFLECTION,
    ];
  }
}
