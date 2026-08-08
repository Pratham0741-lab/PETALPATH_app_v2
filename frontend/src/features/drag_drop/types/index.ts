/**
 * PetalPath Drag & Drop Activity Specification v2.1.0 Types
 * Strongly-typed data contract matching drag_drop_activity.json v2.1.0.
 */

export interface Position {
  x: number;
  y: number;
  randomizePosition?: boolean;
  sourceRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ElementStyle {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  elevation?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  padding?: number;
}

export interface DraggableBehavior {
  draggable: boolean;
  returnToOriginOnFailure: boolean;
  lockAfterCorrectDrop: boolean;
  allowMultipleDrops?: boolean;
  snapBackSpeed?: number;
}

export interface AssetRef {
  imageAssetId?: string | null;
  audioAssetId?: string | null;
  svgAssetId?: string | null;
  lottieAssetId?: string | null;
}

export interface DraggableAccessibility {
  screenReaderLabel: string;
  hintText?: string;
}

export interface DraggableItem {
  id: string;
  contentType: 'image' | 'text' | 'audio' | 'combined' | 'svg' | 'lottie';
  content?: string | null;
  contentLocalizationKey?: string | null;
  assetRef?: AssetRef;
  position: Position;
  dimensions: Dimensions;
  style?: ElementStyle;
  behavior: DraggableBehavior;
  accessibility: DraggableAccessibility;
  sortOrder: number;
}

export type ShapeType = 'rectangle' | 'circle' | 'polygon' | 'path' | 'image-outline';

export interface DropZoneShape {
  type: ShapeType;
  position: Position;
  dimensions: Dimensions;
  radius?: number;
  points?: Array<{ x: number; y: number }>;
  pathData?: string;
  outlineAssetId?: string;
}

export interface DropZoneVisualState {
  defaultAppearance?: 'visible' | 'hidden' | 'transparent';
  hoverHighlight?: 'glow' | 'border-pulse' | 'scale' | 'none';
  correctHighlight?: 'glow-green' | 'fill-green' | 'checkmark' | 'none';
  incorrectHighlight?: 'glow-red' | 'shake' | 'x-mark' | 'none';
  labelText?: string;
  labelLocalizationKey?: string;
  targetContent?: string;
}

export interface DropZoneSnapping {
  enabled: boolean;
  snapPoint?: Position;
  snapRadius?: number;
  snapAlignment?: 'center' | 'top-left' | 'grid';
}

export interface DropZoneAccessibility {
  screenReaderLabel: string;
  dropHintText?: string;
}

export interface DropZone {
  id: string;
  shape: DropZoneShape;
  acceptedDraggableIds: string[];
  capacity: number;
  visualState?: DropZoneVisualState;
  snapping?: DropZoneSnapping;
  sortOrder: number;
  accessibility: DropZoneAccessibility;
}

export type ValidationStrategy =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'ordered-sequence'
  | 'unordered'
  | 'custom';

export interface StarThresholds {
  oneStar: number;
  twoStars: number;
  threeStars: number;
}

export interface ScoringModel {
  type: 'per-item' | 'all-or-nothing' | 'partial-credit' | 'time-weighted';
  basePointsPerItem?: number;
  maxScore?: number;
  starThresholds: StarThresholds;
}

export interface ValidationConfig {
  strategy: ValidationStrategy;
  evaluationTiming: 'on-drop' | 'on-submit' | 'manual';
  allowRetries: boolean;
  maxAttempts: number;
  customValidatorId?: string;
  orderedSequence?: string[];
  scoringModel: ScoringModel;
}

export interface InteractionSnapping {
  preset?: 'tight' | 'easy' | 'sticky';
  snapRadius: number;
  magneticAttraction: number;
  snapAnimationDurationMs?: number;
  returnAnimationDurationMs?: number;
}

export interface DragBehaviorConfig {
  touchMode?: 'center' | 'offset';
  dragFeedback?: 'shadow' | 'scale' | 'opacity' | 'both' | 'none';
  dragScaleFactor?: number;
  multiTouch?: boolean;
  boundToCanvas?: boolean;
}

export interface InteractionConfig {
  snapping: InteractionSnapping;
  dragBehavior?: DragBehaviorConfig;
  inputModes?: {
    touch?: boolean;
    mouse?: boolean;
    keyboard?: boolean;
  };
}

export interface EffectConfig {
  type: string;
  durationMs?: number;
  delay?: number;
  lottieAssetId?: string;
  soundAssetId?: string;
}

export interface AnimationConfig {
  onActivityStart?: {
    itemRevealStyle?: 'none' | 'fade' | 'cascade' | 'pop-in' | 'slide-in';
    revealDelayMs?: number;
  };
  onCorrectDrop?: {
    effects: EffectConfig[];
  };
  onIncorrectDrop?: {
    effects: EffectConfig[];
  };
  onActivityComplete?: {
    effects: EffectConfig[];
  };
}

export interface ProgressiveHint {
  level: number;
  triggerAfterAttempts: number;
  hintType: 'highlight-target' | 'pulse-target' | 'show-arrow' | 'ghost-drag' | 'audio-cue' | 'auto-solve';
  durationMs: number;
  repeatable?: boolean;
}

export interface IdleHint {
  enabled: boolean;
  idleTimeoutMs: number;
  hintType: string;
}

export interface HintConfig {
  enabled: boolean;
  progressiveHints?: ProgressiveHint[];
  idleHint?: IdleHint;
}

export interface AccessibilityConfig {
  screenReader?: {
    enabled: boolean;
    activityInstructionKey?: string;
    announceDrops?: boolean;
    announceErrors?: boolean;
  };
  narration?: {
    enabled: boolean;
    autoPlayOnLoad?: boolean;
    instructionAudioAssetId?: string;
  };
  visual?: {
    highContrast?: boolean;
    colorBlindSafe?: boolean;
    fontScale?: number;
  };
  motor?: {
    reducedPrecision?: {
      enabled: boolean;
      expandedDropZones?: boolean;
      paddingPixels?: number;
    };
    switchAccess?: {
      enabled: boolean;
      scanSpeedMs?: number;
    };
  };
  reducedMotion?: {
    respectSystemSetting: boolean;
  };
}

export interface LocalizationConfig {
  keyNamespace: string;
  fallbackLanguage: string;
  stringKeys: Record<string, string>;
  textDirection?: 'ltr' | 'rtl';
}

export interface AssetDescriptor {
  assetId: string;
  assetType: 'image' | 'audio' | 'lottie' | 'svg';
  purpose: string;
}

export interface AssetConfig {
  required: AssetDescriptor[];
  optional?: AssetDescriptor[];
  preloadStrategy?: 'immediate' | 'progressive' | 'lazy';
}

export interface CompletionSignal {
  signalId: string;
  condition: string;
  description: string;
}

export interface CompletionSignalsConfig {
  signals: CompletionSignal[];
}

export interface CanvasConfig {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export interface CurriculumRef {
  nodeId: string;
  activityIndex: number;
  activityType: string;
}

export interface EngineRef {
  engineId: string;
  targetEngineVersion?: string;
  minimumEngineVersion: string;
  requiredCapabilities?: string[];
}

export interface DragDropActivitySpec {
  id: string;
  schemaVersion: string;
  engine: EngineRef;
  curriculumRef: CurriculumRef;
  metadata: {
    title: string;
    description: string;
    templateRef: {
      templateId: string;
      templateVersion: string;
    };
    primaryLanguage: string;
    supportedLanguages: string[];
    tags: string[];
    status: string;
  };
  canvas: CanvasConfig;
  draggables: DraggableItem[];
  dropZones: DropZone[];
  validation: ValidationConfig;
  interaction: InteractionConfig;
  animations?: AnimationConfig;
  hints?: HintConfig;
  accessibility?: AccessibilityConfig;
  localization?: LocalizationConfig;
  assets?: AssetConfig;
  analytics?: any;
  completionSignals?: CompletionSignalsConfig;
}
