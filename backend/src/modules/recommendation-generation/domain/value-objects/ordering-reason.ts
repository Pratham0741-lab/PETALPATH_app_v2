export class OrderingReason {
  readonly type: string;
  readonly description: string;

  constructor(type: string, description: string) {
    this.type = type;
    this.description = description;
  }
}
