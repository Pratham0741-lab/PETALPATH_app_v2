export type ActivityType =
  | 'video'
  | 'listen'
  | 'speak'
  | 'write'
  | 'story'
  | 'quiz'
  | 'game'
  | 'drag_drop'
  | 'ai_tutor'
  | 'reading';

export interface ActivityMeta {
  id: string;
  lessonId: string;
  title: string;
  activityType: ActivityType;
  contentUrl: string | null;
  displayOrder: number;
  video?: {
    id: string;
    filename: string;
    thumbnail: string | null;
    duration: number;
  } | null;
  audio?: {
    id: string;
    filename: string;
    duration: number;
  } | null;
}

export interface ActivityProgress {
  isCompleted: boolean;
  attemptCount: number;
  bestScore?: number;
  bestStars?: number;
}

export interface RewardData {
  xpGained: number;
  coinsEarned: number;
  starsEarned: number;
  newBadges: Array<{ id: string; name: string; icon: string }>;
  masteryIncrease: number;
  unlockedLessons: string[];
  levelUp: boolean;
  newLevel?: number;
}

export interface CompletionResult {
  activityId: string;
  lessonId: string;
  success: boolean;
  score?: number;
  stars?: number;
  reward?: RewardData;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  questionType: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'ordering' | 'matching';
  options?: Array<{ label: string; value: string }>;
  correctAnswer?: string;
  order: number;
  maxScore: number;
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
  totalQuestions: number;
  passingScore: number;
}

export interface GameData {
  id: string;
  title: string;
  gameType: string;
  config: Record<string, unknown>;
  contentUrl?: string;
}

export interface DragDropItem {
  id: string;
  content?: string | number | null;
  assetRef?: { imageAssetId?: string | null };
  style?: { backgroundColor?: string; borderRadius?: number };
  accessibility?: { screenReaderLabel?: string };
  sortOrder?: number;
}

export interface DragDropZone {
  id: string;
  acceptedDraggableIds: string[];
  capacity?: number;
  sortOrder?: number;
  accessibility?: { screenReaderLabel?: string };
}

export interface DragDropSpec {
  metadata?: { title?: string; description?: string; templateRef?: { templateId?: string } };
  draggables: DragDropItem[];
  dropZones: DragDropZone[];
  validation?: { allowRetries?: boolean };
}

export interface ReadingContent {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  vocabulary: Array<{ word: string; definition: string; highlight?: string }>;
  estimatedReadingTime: number;
}
