export enum AdjustmentDirection {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
  STAY = 'STAY',
}

export class DifficultyAdjustment {
  readonly delta: number;
  readonly direction: AdjustmentDirection;
  readonly reason: string;

  constructor(props: {
    delta: number;
    direction: AdjustmentDirection;
    reason: string;
  }) {
    this.delta = props.delta;
    this.direction = props.direction;
    this.reason = props.reason;
  }
}
