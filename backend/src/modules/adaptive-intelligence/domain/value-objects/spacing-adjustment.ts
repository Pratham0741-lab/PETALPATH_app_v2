export class SpacingAdjustment {
  readonly deltaDays: number;
  readonly reason: string;

  constructor(deltaDays: number, reason: string) {
    this.deltaDays = deltaDays;
    this.reason = reason;
  }

  get expands(): boolean {
    return this.deltaDays > 0;
  }

  get contracts(): boolean {
    return this.deltaDays < 0;
  }
}
