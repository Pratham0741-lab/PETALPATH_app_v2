export interface DecisionTraceProps {
  step: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  timestamp: Date;
  durationMs: number;
}

export class DecisionTrace {
  private readonly props: DecisionTraceProps;

  constructor(props: DecisionTraceProps) {
    this.props = Object.freeze({ ...props });
  }

  get step(): string { return this.props.step; }
  get input(): Record<string, unknown> { return this.props.input; }
  get output(): Record<string, unknown> { return this.props.output; }
  get timestamp(): Date { return this.props.timestamp; }
  get durationMs(): number { return this.props.durationMs; }
}
