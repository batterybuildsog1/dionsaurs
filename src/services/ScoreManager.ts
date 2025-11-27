/**
 * ScoreManager - Scoring calculations, rankings, and MVP determination
 * Handles both single-player and multiplayer scoring
 */

import { PlayerStats, PlayerStatsData } from './PlayerStats';

// Points configuration - easy to tune
export const SCORE_CONFIG = {
  // Collection points
  egg: 10,
  powerup: 15,

  // Enemy kill points by type
  enemyKills: {
    basic: 20,
    fast: 30,
    tank: 50,
    flying: 35,
    shooter: 40
  } as Record<string, number>,

  // Survival
  lifeRemaining: 100,
  deathPenalty: -50,
  shieldBlock: 10,

  // Speed bonuses
  underParBonus: 500,
  perSecondUnderPar: 5,
  perSecondOverPar: -2,

  // Achievement bonuses
  firstToCheckpoint: 25,
  firstToExit: 100,
  reachedExit: 50,  // Just for finishing

  // Par times per level (milliseconds) - can be tuned per level
  defaultParTime: 120000,  // 2 minutes default
};

// Level-specific par times (in milliseconds)
export const LEVEL_PAR_TIMES: Record<number, number> = {
  1: 90000,   // 1:30 - intro level
  2: 150000,  // 2:30 - longer ice level
  3: 240000,  // 4:00 - very long cosmic level
  4: 180000,  // 3:00
  5: 200000,  // 3:20
  6: 220000,  // 3:40
};

export interface RankingResult {
  rankings: PlayerStatsData[];
  mvpAwards: {
    eggs: string | null;       // playerId with most eggs
    kills: string | null;      // playerId with most kills
    survivor: string | null;   // playerId with fewest deaths (0 = perfect)
    speedster: string | null;  // playerId first to exit
  };
  teamStats: {
    totalEggs: number;
    totalKills: number;
    totalDeaths: number;
    totalTime: number;  // Time when last player finished
    teamScore: number;
  };
}

export class ScoreManager {
  private playerStats: Map<string, PlayerStats> = new Map();
  private levelId: number = 1;
  private levelStartTime: number = 0;
  private checkpointClaims: Set<string> = new Set();  // "checkpoint_x_y" -> first claimer

  constructor() {
    this.reset();
  }

  reset(): void {
    this.playerStats.clear();
    this.checkpointClaims.clear();
    this.levelStartTime = Date.now();
  }

  setLevel(levelId: number): void {
    this.levelId = levelId;
  }

  // === Player Management ===

  addPlayer(playerId: string, playerNumber: number, playerName?: string): PlayerStats {
    const stats = new PlayerStats(playerId, playerNumber, playerName);
    this.playerStats.set(playerId, stats);
    return stats;
  }

  getPlayer(playerId: string): PlayerStats | undefined {
    return this.playerStats.get(playerId);
  }

  removePlayer(playerId: string): void {
    this.playerStats.delete(playerId);
  }

  // === Checkpoint Tracking ===

  claimCheckpoint(_playerId: string, x: number, y: number): boolean {
    const key = `cp_${Math.round(x)}_${Math.round(y)}`;
    if (this.checkpointClaims.has(key)) {
      return false;  // Already claimed
    }
    this.checkpointClaims.add(key);
    return true;  // First to reach
  }

  // === Score Calculation ===

  calculatePlayerScore(stats: PlayerStatsData): number {
    let score = 0;

    // Egg collection
    score += stats.eggsCollected * SCORE_CONFIG.egg;

    // Enemy kills (by type)
    for (const [type, count] of Object.entries(stats.enemiesKilled)) {
      const pointsPerKill = SCORE_CONFIG.enemyKills[type] || 20;
      score += count * pointsPerKill;
    }

    // Powerups
    score += stats.powerupsCollected * SCORE_CONFIG.powerup;

    // Survival
    score += stats.livesRemaining * SCORE_CONFIG.lifeRemaining;
    score += stats.deaths * SCORE_CONFIG.deathPenalty;
    score += stats.damageBlocked * SCORE_CONFIG.shieldBlock;

    // Time bonus (only if they finished)
    if (stats.reachedExit && stats.levelEndTime > 0) {
      const completionTime = stats.levelEndTime - stats.levelStartTime;
      const parTime = LEVEL_PAR_TIMES[this.levelId] || SCORE_CONFIG.defaultParTime;

      if (completionTime < parTime) {
        score += SCORE_CONFIG.underParBonus;
        const secondsUnder = Math.floor((parTime - completionTime) / 1000);
        score += secondsUnder * SCORE_CONFIG.perSecondUnderPar;
      } else {
        const secondsOver = Math.floor((completionTime - parTime) / 1000);
        score += secondsOver * SCORE_CONFIG.perSecondOverPar;
      }
    }

    // Achievement bonuses
    score += stats.firstToCheckpoint * SCORE_CONFIG.firstToCheckpoint;
    if (stats.firstToExit) score += SCORE_CONFIG.firstToExit;
    if (stats.reachedExit) score += SCORE_CONFIG.reachedExit;

    return Math.max(0, score);  // No negative scores
  }

  // === Ranking Calculation ===

  calculateRankings(): RankingResult {
    const allStats: PlayerStatsData[] = [];

    // Calculate scores for all players
    this.playerStats.forEach((stats) => {
      const data = stats.getData();
      data.totalScore = this.calculatePlayerScore(data);
      allStats.push(data);
    });

    // Sort by score (descending)
    allStats.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks (handle ties)
    let currentRank = 1;
    for (let i = 0; i < allStats.length; i++) {
      if (i > 0 && allStats[i].totalScore < allStats[i - 1].totalScore) {
        currentRank = i + 1;
      }
      allStats[i].rank = currentRank;
    }

    // Determine MVP awards
    const mvpAwards = this.determineMvpAwards(allStats);

    // Apply MVP awards to player data
    allStats.forEach(data => {
      data.mvpAwards = [];
      if (mvpAwards.eggs === data.playerId) data.mvpAwards.push('eggs');
      if (mvpAwards.kills === data.playerId) data.mvpAwards.push('kills');
      if (mvpAwards.survivor === data.playerId) data.mvpAwards.push('survivor');
      if (mvpAwards.speedster === data.playerId) data.mvpAwards.push('speedster');
    });

    // Calculate team stats
    const teamStats = this.calculateTeamStats(allStats);

    return { rankings: allStats, mvpAwards, teamStats };
  }

  private determineMvpAwards(allStats: PlayerStatsData[]): RankingResult['mvpAwards'] {
    if (allStats.length === 0) {
      return { eggs: null, kills: null, survivor: null, speedster: null };
    }

    // Most eggs
    const eggLeader = allStats.reduce((best, curr) =>
      curr.eggsCollected > best.eggsCollected ? curr : best
    );

    // Most kills
    const killLeader = allStats.reduce((best, curr) => {
      const currKills = Object.values(curr.enemiesKilled).reduce((s, c) => s + c, 0);
      const bestKills = Object.values(best.enemiesKilled).reduce((s, c) => s + c, 0);
      return currKills > bestKills ? curr : best;
    });

    // Survivor (fewest deaths, must have reached exit)
    const finishers = allStats.filter(s => s.reachedExit);
    const survivor = finishers.length > 0
      ? finishers.reduce((best, curr) => curr.deaths < best.deaths ? curr : best)
      : null;

    // Speedster (first to exit)
    const speedster = allStats.find(s => s.firstToExit) || null;

    return {
      eggs: eggLeader.eggsCollected > 0 ? eggLeader.playerId : null,
      kills: Object.values(killLeader.enemiesKilled).reduce((s, c) => s + c, 0) > 0
        ? killLeader.playerId : null,
      survivor: survivor ? survivor.playerId : null,
      speedster: speedster ? speedster.playerId : null
    };
  }

  private calculateTeamStats(allStats: PlayerStatsData[]): RankingResult['teamStats'] {
    let totalEggs = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let latestFinish = 0;
    let teamScore = 0;

    allStats.forEach(data => {
      totalEggs += data.eggsCollected;
      totalKills += Object.values(data.enemiesKilled).reduce((s, c) => s + c, 0);
      totalDeaths += data.deaths;
      teamScore += data.totalScore;

      if (data.levelEndTime > latestFinish) {
        latestFinish = data.levelEndTime;
      }
    });

    const totalTime = latestFinish > 0 ? latestFinish - this.levelStartTime : 0;

    return { totalEggs, totalKills, totalDeaths, totalTime, teamScore };
  }

  // === Formatting Helpers ===

  static formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static getMvpEmoji(award: string): string {
    switch (award) {
      case 'eggs': return '🥚';
      case 'kills': return '⚔️';
      case 'survivor': return '🛡️';
      case 'speedster': return '⚡';
      default: return '🏆';
    }
  }

  static getMvpLabel(award: string): string {
    switch (award) {
      case 'eggs': return 'Egg Hunter';
      case 'kills': return 'Slayer';
      case 'survivor': return 'Survivor';
      case 'speedster': return 'Speedster';
      default: return 'MVP';
    }
  }

  // === Serialization for network sync ===

  getAllStatsData(): PlayerStatsData[] {
    return Array.from(this.playerStats.values()).map(s => s.getData());
  }

  importStatsData(dataArray: PlayerStatsData[]): void {
    this.playerStats.clear();
    dataArray.forEach(data => {
      const stats = PlayerStats.fromJSON(data);
      this.playerStats.set(data.playerId, stats);
    });
  }
}

// Singleton instance for easy access
export const scoreManager = new ScoreManager();
