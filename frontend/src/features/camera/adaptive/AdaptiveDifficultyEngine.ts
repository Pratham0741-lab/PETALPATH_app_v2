import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DifficultyProfileMode,
  DIFFICULTY_CONFIG,
  DIFFICULTY_GUARDRAILS,
} from '../config/difficulty';

export interface CompletionHistoryEntry {
  activityId: string;
  success: boolean;
  durationMs: number;
  attempts: number;
  timestamp: number;
}

export class AdaptiveDifficultyEngine {
  private currentMode: DifficultyProfileMode = 'adaptive';
  private consecutiveSuccesses = 0;
  private currentLevelIndex = 1; // 0=easy, 1=normal, 2=advanced

  private readonly levels: DifficultyProfileMode[] = ['easy', 'normal', 'advanced'];

  public async loadHistory(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(DIFFICULTY_GUARDRAILS.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.consecutiveSuccesses = parsed.consecutiveSuccesses || 0;
        this.currentLevelIndex = parsed.currentLevelIndex ?? 1;
      }
    } catch {
      this.consecutiveSuccesses = 0;
      this.currentLevelIndex = 1;
    }
    return this.consecutiveSuccesses;
  }

  public recordAttempt(success: boolean): DifficultyProfileMode {
    if (success) {
      this.consecutiveSuccesses += 1;
      // Check guardrails for level bump
      if (
        this.consecutiveSuccesses >= DIFFICULTY_GUARDRAILS.MIN_SUCCESSES_TO_RANK_UP &&
        this.currentLevelIndex < this.levels.length - 1
      ) {
        this.currentLevelIndex += DIFFICULTY_GUARDRAILS.MAX_LEVEL_BUMP_PER_SESSION;
        this.consecutiveSuccesses = 0;
      }
    } else {
      this.consecutiveSuccesses = 0;
      // Step down safely without going below easy
      if (this.currentLevelIndex > 0) {
        this.currentLevelIndex -= 1;
      }
    }

    this.saveState();
    return this.getResolvedProfileMode();
  }

  public setMode(mode: DifficultyProfileMode): void {
    this.currentMode = mode;
  }

  public getResolvedProfileMode(): DifficultyProfileMode {
    if (this.currentMode !== 'adaptive') {
      return this.currentMode;
    }
    return this.levels[this.currentLevelIndex] || 'normal';
  }

  public getSettings(mode: DifficultyProfileMode = this.getResolvedProfileMode()) {
    return DIFFICULTY_CONFIG[mode] || DIFFICULTY_CONFIG.normal;
  }

  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        DIFFICULTY_GUARDRAILS.STORAGE_KEY,
        JSON.stringify({
          consecutiveSuccesses: this.consecutiveSuccesses,
          currentLevelIndex: this.currentLevelIndex,
        }),
      );
    } catch {
      // Ignore storage errors
    }
  }
}

export const adaptiveDifficultyEngine = new AdaptiveDifficultyEngine();
