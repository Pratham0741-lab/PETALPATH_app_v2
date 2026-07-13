export interface DynamicRoadmapProps {
  id: string;
  childId: string;
  roadmapJson: any;
  version: number;
  generatedAt: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DynamicRoadmap {
  private readonly props: DynamicRoadmapProps;

  constructor(props: DynamicRoadmapProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: Omit<DynamicRoadmapProps, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }): DynamicRoadmap {
    const now = new Date();
    return new DynamicRoadmap({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  get id(): string { return this.props.id; }
  get childId(): string { return this.props.childId; }
  get roadmapJson(): any { return this.props.roadmapJson; }
  get version(): number { return this.props.version; }
  get generatedAt(): Date { return this.props.generatedAt; }
  get validUntil(): Date | undefined { return this.props.validUntil; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateRoadmap(roadmapJson: any, validUntil?: Date): DynamicRoadmap {
    return new DynamicRoadmap({
      ...this.props,
      roadmapJson,
      version: this.props.version + 1,
      validUntil,
      updatedAt: new Date(),
    });
  }

  isValid(): boolean {
    if (!this.props.validUntil) return true;
    return new Date() < this.props.validUntil;
  }

  toPrismaCreate(): any {
    return {
      id: this.props.id,
      childId: this.props.childId,
      roadmapJson: JSON.stringify(this.props.roadmapJson),
      version: this.props.version,
      generatedAt: this.props.generatedAt,
      validUntil: this.props.validUntil ?? null,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}