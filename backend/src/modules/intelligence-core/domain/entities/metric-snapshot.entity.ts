import { MetricCategory } from '../value-objects/intelligence-types.js';

export { MetricCategory };

export interface MetricSnapshotProps {
  id: string;
  childId: string;
  category: MetricCategory;
  metrics: Record<string, unknown>;
  calculationVersion: string;
  windowStart: Date;
  windowEnd: Date;
  createdAt: Date;
}

export class MetricSnapshot {
  private readonly props: MetricSnapshotProps;

  constructor(props: MetricSnapshotProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<MetricSnapshotProps, 'id' | 'createdAt'> & { id?: string }): MetricSnapshot {
    return new MetricSnapshot({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get category(): MetricCategory { return this.props.category; }
  get metrics(): Record<string, unknown> { return this.props.metrics; }
  get calculationVersion(): string { return this.props.calculationVersion; }
  get windowStart(): Date { return this.props.windowStart; }
  get windowEnd(): Date { return this.props.windowEnd; }
  get createdAt(): Date { return this.props.createdAt; }

  toPrismaCreate(): Record<string, unknown> {
    return {
      id: this.props.id,
      childId: this.props.childId,
      category: this.props.category,
      metrics: JSON.stringify(this.props.metrics),
      calculationVersion: this.props.calculationVersion,
      windowStart: this.props.windowStart,
      windowEnd: this.props.windowEnd,
      createdAt: this.props.createdAt,
    };
  }
}