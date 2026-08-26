/**
 * Analytics cards — the parent section's shared vocabulary.
 *
 * Every card here is built from `MetricCard` (heading + loading swap + a11y
 * grouping), `TrendPill` (direction → colour + glyph + word) and `MetricFigure`
 * (the centred hero stack), so a change to the way a reading is presented
 * happens in one place rather than eleven (§28).
 */

export { MetricCard, TrendPill, MetricFigure, trendVisual } from './MetricCard';
export type { MetricCardProps, TrendPillProps, TrendDirection, TrendVisual } from './MetricCard';

export { DataSection } from './DataSection';
export type { DataSectionProps } from './DataSection';

export { ActivityBucketsCard } from './ActivityBucketsCard';
export type { ActivityBucketsCardProps } from './ActivityBucketsCard';
export { ProgressSummaryCard } from './ProgressSummaryCard';
export { WeeklyLearningCard } from './WeeklyLearningCard';
export { MonthlyLearningCard } from './MonthlyLearningCard';
export { LearningTrendCard } from './LearningTrendCard';
export { LearningTimeCard } from './LearningTimeCard';
export { SkillDistributionCard } from './SkillDistributionCard';
export { SkillMasteryCard } from './SkillMasteryCard';
export { CurriculumProgressCard } from './CurriculumProgressCard';
export { CompletionRateCard } from './CompletionRateCard';
export { ConsistencyCard } from './ConsistencyCard';
export { LearningVelocityCard } from './LearningVelocityCard';
