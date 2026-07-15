export class AdaptiveConstraints {
  readonly maxDifficultyLevel: string;
  readonly preferredModalities: string[];
  readonly minSessionMinutes: number;
  readonly maxSessionMinutes: number;
  readonly maxRetriesAllowed: number;
  readonly recoveryModeActive: boolean;

  constructor(props: {
    maxDifficultyLevel?: string;
    preferredModalities?: string[];
    minSessionMinutes?: number;
    maxSessionMinutes?: number;
    maxRetriesAllowed?: number;
    recoveryModeActive?: boolean;
  }) {
    this.maxDifficultyLevel = props.maxDifficultyLevel ?? 'VERY_HARD';
    this.preferredModalities = props.preferredModalities ?? [];
    this.minSessionMinutes = props.minSessionMinutes ?? 10;
    this.maxSessionMinutes = props.maxSessionMinutes ?? 45;
    this.maxRetriesAllowed = props.maxRetriesAllowed ?? 3;
    this.recoveryModeActive = props.recoveryModeActive ?? false;
  }
}
