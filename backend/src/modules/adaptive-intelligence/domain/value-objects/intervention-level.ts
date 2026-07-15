export enum InterventionLevelValue {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class InterventionLevel {
  readonly level: InterventionLevelValue;
  readonly reason: string;
  readonly trigger: string;

  constructor(props: {
    level: InterventionLevelValue;
    reason: string;
    trigger: string;
  }) {
    this.level = props.level;
    this.reason = props.reason;
    this.trigger = props.trigger;
  }
}
