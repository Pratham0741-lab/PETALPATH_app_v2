export class EvidenceSummary {
  readonly totalRecords: number;
  readonly successfulRecords: number;
  readonly failedRecords: number;
  readonly masteryDelta: number;
  readonly confidenceDelta: number;
  readonly debtsCreated: number;
  readonly debtsResolved: number;
  readonly queueEnqueued: number;
  readonly queueUpdated: number;

  constructor(props: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    masteryDelta: number;
    confidenceDelta: number;
    debtsCreated: number;
    debtsResolved: number;
    queueEnqueued: number;
    queueUpdated: number;
  }) {
    this.totalRecords = props.totalRecords;
    this.successfulRecords = props.successfulRecords;
    this.failedRecords = props.failedRecords;
    this.masteryDelta = props.masteryDelta;
    this.confidenceDelta = props.confidenceDelta;
    this.debtsCreated = props.debtsCreated;
    this.debtsResolved = props.debtsResolved;
    this.queueEnqueued = props.queueEnqueued;
    this.queueUpdated = props.queueUpdated;
  }

  get allProcessed(): boolean {
    return this.failedRecords === 0;
  }
}
