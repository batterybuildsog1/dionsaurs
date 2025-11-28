// LeaderboardManager - Tracks scores and times per difficulty and level
// Separate leaderboards for each difficulty mode to ensure fair competition

import { Difficulty, DifficultyManager } from './DifficultyManager';

export interface LeaderboardEntry {
  name: string;
  score: number;
  time: number;  // In seconds
  date: string;  // ISO date string
}

export interface LevelLeaderboard {
  scores: LeaderboardEntry[];  // Sorted by score descending
  times: LeaderboardEntry[];   // Sorted by time ascending (faster is better)
}

const MAX_ENTRIES = 10;  // Keep top 10 for each category
const STORAGE_PREFIX = 'dino_leaderboard_';

class LeaderboardManagerClass {
  // Get storage key for a specific difficulty + level + type
  private getStorageKey(difficulty: Difficulty, levelId: number, type: 'score' | 'time'): string {
    return `${STORAGE_PREFIX}${difficulty}_level${levelId}_${type}`;
  }

  // Load entries from localStorage
  private loadEntries(difficulty: Difficulty, levelId: number, type: 'score' | 'time'): LeaderboardEntry[] {
    try {
      const key = this.getStorageKey(difficulty, levelId, type);
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as LeaderboardEntry[];
      }
    } catch (e) {
      console.warn('Failed to load leaderboard:', e);
    }
    return [];
  }

  // Save entries to localStorage
  private saveEntries(difficulty: Difficulty, levelId: number, type: 'score' | 'time', entries: LeaderboardEntry[]): void {
    try {
      const key = this.getStorageKey(difficulty, levelId, type);
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save leaderboard:', e);
    }
  }

  // Get leaderboard for current difficulty and level
  getLeaderboard(levelId: number, difficulty?: Difficulty): LevelLeaderboard {
    const diff = difficulty || DifficultyManager.getDifficulty();
    return {
      scores: this.loadEntries(diff, levelId, 'score'),
      times: this.loadEntries(diff, levelId, 'time'),
    };
  }

  // Submit a score and return the rank (1-based, or -1 if not ranked)
  submitScore(levelId: number, name: string, score: number, timeSeconds: number, difficulty?: Difficulty): { scoreRank: number; timeRank: number } {
    const diff = difficulty || DifficultyManager.getDifficulty();
    const entry: LeaderboardEntry = {
      name,
      score,
      time: timeSeconds,
      date: new Date().toISOString(),
    };

    // Process score leaderboard
    const scoreRank = this.addToScoreLeaderboard(diff, levelId, entry);

    // Process time leaderboard
    const timeRank = this.addToTimeLeaderboard(diff, levelId, entry);

    return { scoreRank, timeRank };
  }

  // Add entry to score leaderboard (higher is better)
  private addToScoreLeaderboard(difficulty: Difficulty, levelId: number, entry: LeaderboardEntry): number {
    const entries = this.loadEntries(difficulty, levelId, 'score');

    // Find insertion point (sorted by score descending)
    let insertIndex = entries.findIndex(e => entry.score > e.score);
    if (insertIndex === -1) {
      insertIndex = entries.length;
    }

    // Only add if it would be in top MAX_ENTRIES
    if (insertIndex >= MAX_ENTRIES) {
      return -1;  // Not ranked
    }

    // Insert and trim
    entries.splice(insertIndex, 0, entry);
    if (entries.length > MAX_ENTRIES) {
      entries.length = MAX_ENTRIES;
    }

    this.saveEntries(difficulty, levelId, 'score', entries);
    return insertIndex + 1;  // 1-based rank
  }

  // Add entry to time leaderboard (lower is better)
  private addToTimeLeaderboard(difficulty: Difficulty, levelId: number, entry: LeaderboardEntry): number {
    const entries = this.loadEntries(difficulty, levelId, 'time');

    // Find insertion point (sorted by time ascending)
    let insertIndex = entries.findIndex(e => entry.time < e.time);
    if (insertIndex === -1) {
      insertIndex = entries.length;
    }

    // Only add if it would be in top MAX_ENTRIES
    if (insertIndex >= MAX_ENTRIES) {
      return -1;  // Not ranked
    }

    // Insert and trim
    entries.splice(insertIndex, 0, entry);
    if (entries.length > MAX_ENTRIES) {
      entries.length = MAX_ENTRIES;
    }

    this.saveEntries(difficulty, levelId, 'time', entries);
    return insertIndex + 1;  // 1-based rank
  }

  // Check if a score would rank (without saving)
  wouldRank(levelId: number, score: number, timeSeconds: number, difficulty?: Difficulty): { scoreWouldRank: boolean; timeWouldRank: boolean } {
    const diff = difficulty || DifficultyManager.getDifficulty();

    const scores = this.loadEntries(diff, levelId, 'score');
    const times = this.loadEntries(diff, levelId, 'time');

    const scoreWouldRank = scores.length < MAX_ENTRIES || score > scores[scores.length - 1].score;
    const timeWouldRank = times.length < MAX_ENTRIES || timeSeconds < times[times.length - 1].time;

    return { scoreWouldRank, timeWouldRank };
  }

  // Get player's best score for a level
  getPersonalBest(levelId: number, playerName: string, difficulty?: Difficulty): { bestScore: number | null; bestTime: number | null } {
    const diff = difficulty || DifficultyManager.getDifficulty();

    const scores = this.loadEntries(diff, levelId, 'score');
    const times = this.loadEntries(diff, levelId, 'time');

    const playerScores = scores.filter(e => e.name === playerName);
    const playerTimes = times.filter(e => e.name === playerName);

    return {
      bestScore: playerScores.length > 0 ? Math.max(...playerScores.map(e => e.score)) : null,
      bestTime: playerTimes.length > 0 ? Math.min(...playerTimes.map(e => e.time)) : null,
    };
  }

  // Format time for display (e.g., "2:35")
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Clear all leaderboards (for testing)
  clearAll(): void {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const levels = [1, 2, 3, 4, 5, 6];
    const types: ('score' | 'time')[] = ['score', 'time'];

    for (const diff of difficulties) {
      for (const level of levels) {
        for (const type of types) {
          try {
            localStorage.removeItem(this.getStorageKey(diff, level, type));
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  }
}

// Singleton export
export const LeaderboardManager = new LeaderboardManagerClass();
