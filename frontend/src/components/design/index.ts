/**
 * PetalPath design system (spec §28).
 *
 * Every redesigned screen imports its building blocks from here, which is what
 * keeps one design language across the app instead of a different one per page.
 * Nothing in this folder knows about routes, stores or queries — screens keep
 * owning their data, these components only own how it looks.
 */

// Layout
export { AppShell } from './AppShell';
export type { AppShellProps } from './AppShell';
export { PetalBackground } from './PetalBackground';
export type { PetalBackgroundProps, PetalDensity } from './PetalBackground';
export { SceneBand } from './SceneBand';
export type { SceneBandProps } from './SceneBand';

// Headers
export { AppHeader, PageHeader, ActivityHeader } from './Headers';
export type {
  AppHeaderProps,
  PageHeaderProps,
  ActivityHeaderProps,
  ActivityKind,
} from './Headers';

// Actions
export { PrimaryButton, SecondaryButton, IconButton, BUTTON_TONES } from './Buttons';
export type {
  PrimaryButtonProps,
  SecondaryButtonProps,
  IconButtonProps,
  ButtonTone,
} from './Buttons';

// Surfaces
export { Card } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

// Activity answering
export { AnswerOption, AnswerGrid } from './AnswerOption';
export type { AnswerOptionProps, AnswerOptionState, AnswerGridProps } from './AnswerOption';
export { MediaOrb } from './MediaOrb';
export type { MediaOrbProps } from './MediaOrb';
export { FeedbackBanner } from './FeedbackBanner';
export type { FeedbackBannerProps, FeedbackTone } from './FeedbackBanner';
export { StarRating } from './StarRating';
export type { StarRatingProps } from './StarRating';
export { StatePanel } from './StatePanel';
export type { StatePanelProps } from './StatePanel';
export { SoundWave } from './SoundWave';
export type { SoundWaveProps } from './SoundWave';

// Indicators
export { ProgressIndicator, ProgressRing } from './ProgressIndicator';
export type { ProgressIndicatorProps, ProgressRingProps } from './ProgressIndicator';
export { StatusBadge, RewardBadge, LivesIndicator } from './Badges';
export type {
  StatusBadgeProps,
  RewardBadgeProps,
  LivesIndicatorProps,
  LessonStatus,
  RewardKind,
} from './Badges';
export { StatGrid } from './StatGrid';
export type { StatGridProps, Stat } from './StatGrid';

// In-page switching
export { SegmentedTabs } from './SegmentedTabs';
export type { SegmentedTabsProps, SegmentedTabItem } from './SegmentedTabs';

// Content cards
export {
  SubjectCard,
  LessonCard,
  ActivityCard,
  RewardCard,
  MentorCard,
  ProfileCard,
  ContinueLearningCard,
  IconWell,
} from './Cards';
export type {
  SubjectCardProps,
  LessonCardProps,
  ActivityCardProps,
  ActivityCardKind,
  RewardCardProps,
  MentorCardProps,
  ProfileCardProps,
  ContinueLearningCardProps,
} from './Cards';
export { GardenPatch } from './GardenPatch';
export type { GardenPatchProps } from './GardenPatch';

// Illustration
export { AvatarGlyph, resolveSpecies, speciesBackground } from './AvatarGlyph';
export type { AvatarGlyphProps, AvatarSpecies } from './AvatarGlyph';
export { SkillBloom, BLOOM_STAGE_ORDER, bloomStagePhrase, bloomStageLabel } from './SkillBloom';
export type { SkillBloomProps } from './SkillBloom';
export { ImageSlot } from './ImageSlot';
export type { ImageSlotProps } from './ImageSlot';
export { Illustration, ILLUSTRATIONS, hasIllustration } from './Illustration';
export type { IllustrationProps, IllustrationName, IllustrationSize } from './Illustration';

// Journey
export { Roadmap, LessonNode } from './Roadmap';
export type {
  RoadmapProps,
  RoadmapSectionData,
  RoadmapNodeData,
  RoadmapNodeStatus,
  RoadmapNodeKind,
  RoadmapFrame,
  LessonNodeProps,
} from './Roadmap';

// Parent-facing
export { GrownUpGate } from './GrownUpGate';
export type { GrownUpGateProps } from './GrownUpGate';
export { ParentSection, ParentRow, ParentStatGrid, DestructiveAction } from './ParentSection';
export type {
  ParentSectionProps,
  ParentRowProps,
  ParentStat,
  DestructiveActionProps,
} from './ParentSection';

// Subject identity
export { getSubjectVisual } from './subjectVisuals';
export type { SubjectVisual } from './subjectVisuals';

// Icons live one folder up but belong to the same system.
export { PetalIcon, PETAL_ICON_NAMES } from '../icons';
export type { PetalIconName, PetalIconProps } from '../icons';
