/**
 * PlayerStats - Comprehensive player performance tracking
 * Tracks individual stats during gameplay for scoring and ranking
 */

export interface PlayerStatsData {
  // Identity
  playerId: string;
  playerNumber: number;
  playerName: string;

  // Collection stats
  eggsCollected: number;
  enemiesKilled: Record<string, number>;  // By enemy type: { basic: 2, tank: 1 }
  powerupsCollected: number;

  // Survival stats
  deaths: number;
  livesRemaining: number;
  damageBlocked: number;  // Shield blocks

  // Time stats (milliseconds)
  levelStartTime: number;
  levelEndTime: number;
  timeAlive: number;  // Total time not dead

  // Achievement tracking
  checkpointsReached: number;
  firstToCheckpoint: number;  // How many checkpoints reached first
  firstToExit: boolean;
  reachedExit: boolean;

  // Calculated (filled in by ScoreManager)
  totalScore: number;
  rank: number;
  mvpAwards: string[];  // e.g., ['eggs', 'kills', 'survivor']
}

export class PlayerStats {
  private data: PlayerStatsData;
  private deathStartTime: number = 0;
  private totalDeathTime: number = 0;

  constructor(playerId: string, playerNumber: number, playerName?: string) {
    this.data = {
      playerId,
      playerNumber,
      playerName: playerName || `Player ${playerNumber}`,
      eggsCollected: 0,
      enemiesKilled: {},
      powerupsCollected: 0,
      deaths: 0,
      livesRemaining: 3,
      damageBlocked: 0,
      levelStartTime: Date.now(),
      levelEndTime: 0,
      timeAlive: 0,
      checkpointsReached: 0,
      firstToCheckpoint: 0,
      firstToExit: false,
      reachedExit: false,
      totalScore: 0,
      rank: 0,
      mvpAwards: []
    };
  }

  // === Event Tracking Methods ===

  collectEgg(): void {
    this.data.eggsCollected++;
  }

  killEnemy(enemyType: string): void {
    this.data.enemiesKilled[enemyType] = (this.data.enemiesKilled[enemyType] || 0) + 1;
  }

  collectPowerup(): void {
    this.data.powerupsCollected++;
  }

  die(): void {
    this.data.deaths++;
    this.deathStartTime = Date.now();
  }

  respawn(): void {
    if (this.deathStartTime > 0) {
      this.totalDeathTime += Date.now() - this.deathStartTime;
      this.deathStartTime = 0;
    }
  }

  blockDamage(): void {
    this.data.damageBlocked++;
  }

  reachCheckpoint(isFirst: boolean): void {
    this.data.checkpointsReached++;
    if (isFirst) {
      this.data.firstToCheckpoint++;
    }
  }

  reachExit(isFirst: boolean): void {
    this.data.reachedExit = true;
    this.data.firstToExit = isFirst;
    this.data.levelEndTime = Date.now();
    this.updateTimeAlive();
  }

  setLivesRemaining(lives: number): void {
    this.data.livesRemaining = lives;
  }

  // === Time Calculations ===

  private updateTimeAlive(): void {
    const totalTime = this.data.levelEndTime - this.data.levelStartTime;
    this.data.timeAlive = totalTime - this.totalDeathTime;
  }

  getTimeToComplete(): number {
    if (this.data.levelEndTime === 0) return 0;
    return this.data.levelEndTime - this.data.levelStartTime;
  }

  // === Getters ===

  getTotalEnemyKills(): number {
    return Object.values(this.data.enemiesKilled).reduce((sum, count) => sum + count, 0);
  }

  getData(): PlayerStatsData {
    return { ...this.data };
  }

  getPlayerId(): string {
    return this.data.playerId;
  }

  getPlayerNumber(): number {
    return this.data.playerNumber;
  }

  // === Setters for sync ===

  updateFromData(data: Partial<PlayerStatsData>): void {
    Object.assign(this.data, data);
  }

  setScore(score: number): void {
    this.data.totalScore = score;
  }

  setRank(rank: number): void {
    this.data.rank = rank;
  }

  setMvpAwards(awards: string[]): void {
    this.data.mvpAwards = awards;
  }

  // === Serialization ===

  toJSON(): PlayerStatsData {
    return this.getData();
  }

  static fromJSON(json: PlayerStatsData): PlayerStats {
    const stats = new PlayerStats(json.playerId, json.playerNumber, json.playerName);
    stats.updateFromData(json);
    return stats;
  }
}
