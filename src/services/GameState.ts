/**
 * GameState - Persistent game state that survives scene restarts
 * Lives and score persist across scene.restart() but reset when starting a new game
 */
class GameState {
  private static lives: number = 3;
  private static score: number = 0;

  /**
   * Reset all game state to initial values
   * Call this when starting a new game from the menu
   */
  static reset() {
    this.lives = 3;
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
    if (this.lives < 9) this.lives++;
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
