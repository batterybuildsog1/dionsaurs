import { DifficultyManager } from './DifficultyManager';

/**
 * GameState - Persistent game state that survives scene restarts
 * Lives and score persist across scene.restart() but reset when starting a new game
 * Now uses DifficultyManager for starting/max lives based on selected difficulty
 */
class GameState {
  private static lives: number = 5;  // Default medium, will be set by reset()
  private static score: number = 0;

  /**
   * Reset all game state to initial values
   * Call this when starting a new game from the menu
   * Uses DifficultyManager to set appropriate starting lives
   */
  static reset() {
    this.lives = DifficultyManager.getStartingLives();
    this.score = 0;
  }

  static getLives(): number {
    return this.lives;
  }

  static decrementLives(): number {
    if (this.lives > 0) this.lives--;
    return this.lives;
  }

  static addLife(): void {
    const maxLives = DifficultyManager.getMaxLives();
    if (this.lives < maxLives) this.lives++;
  }

  static getScore(): number {
    return this.score;
  }

  static addScore(points: number): void {
    this.score += points;
  }

  static setScore(points: number): void {
    this.score = points;
  }
}

export { GameState };
