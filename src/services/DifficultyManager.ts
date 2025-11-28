// DifficultyManager - Centralized difficulty settings for the game
// Controls lives, enemy behavior, pit mechanics, and provides difficulty-aware configurations

export type Difficulty = 'training' | 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
  name: string;
  description: string;
  startingLives: number;
  maxLives: number;
  pitsKill: boolean;  // false = invisible bridges over pits
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;  // Multiplies base enemy health
  enemyDetectionRange: number;  // Range at which enemies detect and chase player
  enemyChaseEnabled: boolean;  // Whether enemies actively chase player
  shooterFireRate: number;  // Milliseconds between shots
  projectileSpeed: number;
  flyingEnemiesChase: boolean;  // Whether flying enemies dive toward player
}

// Difficulty configurations
const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultySettings> = {
  training: {
    name: 'Training',
    description: 'Practice mode - cannot die!',
    startingLives: 999,
    maxLives: 999,
    pitsKill: false,  // Invisible bridges over pits
    enemySpeedMultiplier: 0.5,  // Slower enemies for practice
    enemyHealthMultiplier: 0.5,  // Easier to defeat
    enemyDetectionRange: 0,  // No detection/chase
    enemyChaseEnabled: false,
    shooterFireRate: 5000,  // Very slow - 5 seconds
    projectileSpeed: 100,  // Slow projectiles
    flyingEnemiesChase: false,
  },
  easy: {
    name: 'Easy',
    description: '10 lives, pits are safe to walk over',
    startingLives: 10,
    maxLives: 15,
    pitsKill: false,
    enemySpeedMultiplier: 0.8,
    enemyHealthMultiplier: 1.0,
    enemyDetectionRange: 0,  // No detection/chase in easy
    enemyChaseEnabled: false,
    shooterFireRate: 3000,  // 3 seconds
    projectileSpeed: 200,
    flyingEnemiesChase: false,
  },
  medium: {
    name: 'Medium',
    description: '5 lives, standard challenge',
    startingLives: 5,
    maxLives: 9,
    pitsKill: true,
    enemySpeedMultiplier: 1.0,
    enemyHealthMultiplier: 1.0,
    enemyDetectionRange: 150,
    enemyChaseEnabled: false,  // Standard patrol behavior
    shooterFireRate: 2000,  // 2 seconds
    projectileSpeed: 250,
    flyingEnemiesChase: false,
  },
  hard: {
    name: 'Hard',
    description: '3 lives, aggressive enemies',
    startingLives: 3,
    maxLives: 5,
    pitsKill: true,
    enemySpeedMultiplier: 1.3,
    enemyHealthMultiplier: 2.0,  // Enemies take twice as many hits
    enemyDetectionRange: 300,  // Detect player from further away
    enemyChaseEnabled: true,  // Enemies actively chase
    shooterFireRate: 1200,  // 1.2 seconds
    projectileSpeed: 320,
    flyingEnemiesChase: true,  // Flying enemies dive at player
  },
};

class DifficultyManagerClass {
  private currentDifficulty: Difficulty = 'medium';
  private readonly STORAGE_KEY = 'dinosaur_game_difficulty';

  constructor() {
    this.loadFromStorage();
  }

  // Load saved difficulty from localStorage
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && this.isValidDifficulty(saved)) {
        this.currentDifficulty = saved as Difficulty;
      }
    } catch (e) {
      // localStorage not available, use default
      console.warn('Could not load difficulty from storage:', e);
    }
  }

  // Save difficulty to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, this.currentDifficulty);
    } catch (e) {
      console.warn('Could not save difficulty to storage:', e);
    }
  }

  // Validate difficulty string
  private isValidDifficulty(value: string): value is Difficulty {
    return value === 'training' || value === 'easy' || value === 'medium' || value === 'hard';
  }

  // Get current difficulty
  getDifficulty(): Difficulty {
    return this.currentDifficulty;
  }

  // Set difficulty
  setDifficulty(difficulty: Difficulty): void {
    this.currentDifficulty = difficulty;
    this.saveToStorage();
  }

  // Get current settings
  getSettings(): DifficultySettings {
    return { ...DIFFICULTY_CONFIGS[this.currentDifficulty] };
  }

  // Get settings for a specific difficulty
  getSettingsFor(difficulty: Difficulty): DifficultySettings {
    return { ...DIFFICULTY_CONFIGS[difficulty] };
  }

  // Get all difficulty options (for UI)
  getAllDifficulties(): { key: Difficulty; settings: DifficultySettings }[] {
    return [
      { key: 'training', settings: DIFFICULTY_CONFIGS.training },
      { key: 'easy', settings: DIFFICULTY_CONFIGS.easy },
      { key: 'medium', settings: DIFFICULTY_CONFIGS.medium },
      { key: 'hard', settings: DIFFICULTY_CONFIGS.hard },
    ];
  }

  // Check if currently in training mode
  isTrainingMode(): boolean {
    return this.currentDifficulty === 'training';
  }

  // Convenience methods for common checks
  doPitsKill(): boolean {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].pitsKill;
  }

  getStartingLives(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].startingLives;
  }

  getMaxLives(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].maxLives;
  }

  getEnemySpeedMultiplier(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].enemySpeedMultiplier;
  }

  getEnemyHealthMultiplier(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].enemyHealthMultiplier;
  }

  shouldEnemiesChase(): boolean {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].enemyChaseEnabled;
  }

  getEnemyDetectionRange(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].enemyDetectionRange;
  }

  getShooterFireRate(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].shooterFireRate;
  }

  getProjectileSpeed(): number {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].projectileSpeed;
  }

  doFlyingEnemiesChase(): boolean {
    return DIFFICULTY_CONFIGS[this.currentDifficulty].flyingEnemiesChase;
  }

  // Get leaderboard key for current difficulty + level
  getLeaderboardKey(levelId: number): string {
    return `leaderboard_${this.currentDifficulty}_level_${levelId}`;
  }

  // Get time leaderboard key for current difficulty + level
  getTimeLeaderboardKey(levelId: number): string {
    return `time_leaderboard_${this.currentDifficulty}_level_${levelId}`;
  }
}

// Singleton instance
export const DifficultyManager = new DifficultyManagerClass();
