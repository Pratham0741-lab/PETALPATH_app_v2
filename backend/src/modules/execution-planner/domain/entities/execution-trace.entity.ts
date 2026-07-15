export interface ExecutionTraceProps {
  step: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
}

export class ExecutionTrace {
  private readonly props: ExecutionTraceProps;

  constructor(props: ExecutionTraceProps) {
    this.props = Object.freeze({ ...props });
  }

  get step(): string { return this.props.step; }
  get input(): Record<string, unknown> { return this.props.input; }
  get output(): Record<string, unknown> { return this.props.output; }
  get durationMs(): number { return this.props.durationMs; }
}
