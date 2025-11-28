// TrainingProgress - Tracks star ratings and badges for training levels
// Persists progress to localStorage

import { TRAINING_LEVELS } from '../data/trainingLevels';

export interface LevelStats {
  time: number;           // Completion time in seconds
  eggsCollected: number;  // Number of eggs collected
  totalEggs: number;      // Total eggs in level
  deaths: number;         // Number of times player "failed" (bounced back)
  enemiesDefeated: number;
  comboMax: number;       // Highest combo achieved
  doubleJumpsUsed: number;
}

export interface TrainingLevelProgress {
  completed: boolean;
  stars: number;          // 0-3
  bestTime: number;       // Best completion time in seconds
  bestEggs: number;       // Most eggs collected
  badges: string[];       // Achievement badges earned
}

export type BadgeType =
  | 'first_try'      // No deaths
  | 'speed_runner'   // Under target time
  | 'collector'      // All eggs collected
  | 'combo_king'     // 5+ combo (combat levels)
  | 'air_master';    // 10+ double jumps (level 104)

const BADGE_DISPLAY_NAMES: Record<BadgeType, string> = {
  first_try: 'First Try!',
  speed_runner: 'Speed Runner',
  collector: 'Collector',
  combo_king: 'Combo King',
  air_master: 'Air Master',
};

class TrainingProgressService {
  private readonly STORAGE_KEY = 'training_progress';
  private progress: Map<number, TrainingLevelProgress>;

  constructor() {
    this.progress = new Map();
    this.load();
  }

  // Load progress from localStorage
  private load(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.progress = new Map(Object.entries(parsed).map(([k, v]) => [parseInt(k), v as TrainingLevelProgress]));
      }
    } catch (e) {
      console.warn('Could not load training progress:', e);
      this.progress = new Map();
    }
  }

  // Save progress to localStorage
  private save(): void {
    try {
      const obj: Record<number, TrainingLevelProgress> = {};
      this.progress.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Could not save training progress:', e);
    }
  }

  // Get progress for a specific level
  getProgress(levelId: number): TrainingLevelProgress {
    return this.progress.get(levelId) || {
      completed: false,
      stars: 0,
      bestTime: Infinity,
      bestEggs: 0,
      badges: [],
    };
  }

  // Calculate stars based on level stats
  calculateStars(levelId: number, stats: LevelStats): number {
    const level = TRAINING_LEVELS.find(l => l.id === levelId);
    if (!level) return 0;

    let stars = 0;

    // 1 Star: Complete the level
    stars = 1;

    // 2 Stars: Under target time OR collect 75%+ eggs
    const eggPercentage = stats.eggsCollected / stats.totalEggs;
    if (stats.time <= level.targetTime || eggPercentage >= 0.75) {
      stars = 2;
    }

    // 3 Stars: Under target time AND all eggs AND no deaths
    if (stats.time <= level.targetTime &&
        stats.eggsCollected >= stats.totalEggs &&
        stats.deaths === 0) {
      stars = 3;
    }

    return stars;
  }

  // Check which badges were earned
  checkBadges(levelId: number, stats: LevelStats): BadgeType[] {
    const level = TRAINING_LEVELS.find(l => l.id === levelId);
    if (!level) return [];

    const badges: BadgeType[] = [];

    // First Try - no deaths
    if (stats.deaths === 0) {
      badges.push('first_try');
    }

    // Speed Runner - under target time
    if (stats.time <= level.targetTime) {
      badges.push('speed_runner');
    }

    // Collector - all eggs
    if (stats.eggsCollected >= stats.totalEggs) {
      badges.push('collector');
    }

    // Combo King - 5+ combo (only for combat level 103)
    if (levelId === 103 && stats.comboMax >= 5) {
      badges.push('combo_king');
    }

    // Air Master - 10+ double jumps (only for level 104)
    if (levelId === 104 && stats.doubleJumpsUsed >= 10) {
      badges.push('air_master');
    }

    return badges;
  }

  // Record level completion and update progress
  recordCompletion(levelId: number, stats: LevelStats): {
    stars: number;
    newBadges: BadgeType[];
    isNewRecord: boolean;
  } {
    const current = this.getProgress(levelId);
    const stars = this.calculateStars(levelId, stats);
    const badges = this.checkBadges(levelId, stats);

    // Find new badges earned this run
    const newBadges = badges.filter(b => !current.badges.includes(b));

    // Check if this is a new best time
    const isNewRecord = stats.time < current.bestTime;

    // Update progress
    const updated: TrainingLevelProgress = {
      completed: true,
      stars: Math.max(current.stars, stars),
      bestTime: Math.min(current.bestTime, stats.time),
      bestEggs: Math.max(current.bestEggs, stats.eggsCollected),
      badges: [...new Set([...current.badges, ...badges])],  // Merge badges without duplicates
    };

    this.progress.set(levelId, updated);
    this.save();

    return { stars, newBadges, isNewRecord };
  }

  // Get total stars across all training levels
  getTotalStars(): number {
    let total = 0;
    this.progress.forEach(p => {
      total += p.stars;
    });
    return total;
  }

  // Get maximum possible stars
  getMaxStars(): number {
    return TRAINING_LEVELS.length * 3;
  }

  // Get all badges earned
  getAllBadges(): { levelId: number; badges: string[] }[] {
    const result: { levelId: number; badges: string[] }[] = [];
    this.progress.forEach((p, levelId) => {
      if (p.badges.length > 0) {
        result.push({ levelId, badges: p.badges });
      }
    });
    return result;
  }

  // Get display name for a badge
  getBadgeDisplayName(badge: BadgeType): string {
    return BADGE_DISPLAY_NAMES[badge] || badge;
  }

  // Check if all training levels are completed
  isAllCompleted(): boolean {
    return TRAINING_LEVELS.every(level => {
      const progress = this.progress.get(level.id);
      return progress?.completed === true;
    });
  }

  // Check if all 3 stars earned on all levels
  isPerfect(): boolean {
    return TRAINING_LEVELS.every(level => {
      const progress = this.progress.get(level.id);
      return progress?.stars === 3;
    });
  }

  // Reset all training progress
  reset(): void {
    this.progress.clear();
    this.save();
  }
}

// Singleton instance
export const TrainingProgress = new TrainingProgressService();
