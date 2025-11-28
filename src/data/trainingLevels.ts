// Training Levels - Practice levels where players cannot die
// Each level focuses on teaching a specific skill

import { LevelData } from './levels';

// Extended interface for training levels with additional metadata
export interface TrainingLevelData extends LevelData {
  primarySkill: string;       // What skill this level teaches
  controlHint: string;        // Control hint to show players
  targetTime: number;         // Target time in seconds for 3-star rating
  totalEggs: number;          // Total eggs in level (for completion tracking)
}

export const TRAINING_LEVELS: TrainingLevelData[] = [
  // ============================================
  // TRAINING 1: JUMP SCHOOL
  // Learn basic jumping (W key)
  // ============================================
  {
    id: 101,
    name: 'Jump School',
    theme: 'volcano',
    primarySkill: 'Jumping',
    controlHint: 'Press W to Jump!',
    targetTime: 45,
    totalEggs: 8,
    width: 1400,
    height: 600,
    platforms: [
      // Ascending staircase - teaches basic jumping
      { x: 200, y: 500, type: 'platform' },
      { x: 350, y: 450, type: 'platform' },
      { x: 500, y: 400, type: 'platform' },
      { x: 650, y: 350, type: 'platform' },
      { x: 800, y: 300, type: 'platform' },
      // Descending section
      { x: 950, y: 350, type: 'platform' },
      { x: 1100, y: 400, type: 'platform' },
      // Final platform to exit
      { x: 1250, y: 500, type: 'platform' },
    ],
    enemies: [],  // No enemies - pure jumping practice
    eggs: [
      // Eggs on each platform to guide players
      { x: 200, y: 450 },
      { x: 350, y: 400 },
      { x: 500, y: 350 },
      { x: 650, y: 300 },
      { x: 800, y: 250 },
      { x: 950, y: 300 },
      { x: 1100, y: 350 },
      { x: 1250, y: 450 },
    ],
    powerups: [],  // No powerups in basic jump training
    checkpoints: [
      { x: 500, y: 360 },
      { x: 950, y: 310 },
    ],
    lives: [],
    pits: [],  // No pits - completely safe
    exit: { x: 1350, y: 550 }
  },

  // ============================================
  // TRAINING 2: MOVEMENT MASTERY
  // Learn horizontal movement (A/D keys)
  // ============================================
  {
    id: 102,
    name: 'Movement Mastery',
    theme: 'ice',
    primarySkill: 'Movement',
    controlHint: 'Use A and D to move!',
    targetTime: 60,
    totalEggs: 10,
    width: 1600,
    height: 600,
    platforms: [
      // Zig-zag path requiring direction changes
      { x: 200, y: 450, type: 'platform' },
      { x: 400, y: 350, type: 'platform' },
      { x: 200, y: 250, type: 'platform' },
      { x: 400, y: 150, type: 'platform' },
      // Middle section - wider platforms
      { x: 600, y: 450, type: 'platform' },
      { x: 800, y: 450, type: 'platform' },
      { x: 1000, y: 450, type: 'platform' },
      // Final climb
      { x: 1200, y: 350, type: 'platform' },
      { x: 1400, y: 250, type: 'platform' },
    ],
    enemies: [],  // No enemies - pure movement practice
    eggs: [
      // Eggs along the path
      { x: 300, y: 400 },
      { x: 300, y: 300 },
      { x: 300, y: 200 },
      { x: 500, y: 100 },
      { x: 700, y: 400 },
      { x: 900, y: 400 },
      { x: 1100, y: 400 },
      { x: 1200, y: 300 },
      { x: 1300, y: 200 },
      { x: 1500, y: 200 },
    ],
    powerups: [
      { x: 800, y: 400, type: 'speed' },  // Speed powerup to show movement speed
    ],
    checkpoints: [
      { x: 400, y: 110 },
      { x: 1000, y: 410 },
    ],
    lives: [],
    pits: [],  // No pits
    exit: { x: 1550, y: 550 }
  },

  // ============================================
  // TRAINING 3: COMBAT DOJO
  // Learn attacking (J key)
  // ============================================
  {
    id: 103,
    name: 'Combat Dojo',
    theme: 'volcano',
    primarySkill: 'Combat',
    controlHint: 'Press J to Attack!',
    targetTime: 90,
    totalEggs: 8,
    width: 1800,
    height: 600,
    platforms: [
      // Arena-style platforms with enemies
      { x: 300, y: 480, type: 'platform' },
      { x: 550, y: 480, type: 'platform' },
      { x: 800, y: 400, type: 'platform' },
      { x: 1050, y: 480, type: 'platform' },
      { x: 1300, y: 400, type: 'platform' },
      { x: 1550, y: 480, type: 'platform' },
    ],
    enemies: [
      // Stationary/slow enemies for practice - no patrol range
      { x: 350, y: 450, range: 0, enemyType: 'basic' },
      { x: 600, y: 450, range: 50, enemyType: 'basic' },
      { x: 850, y: 370, range: 30, enemyType: 'basic' },
      { x: 1100, y: 450, range: 80, enemyType: 'basic' },
      { x: 1350, y: 370, range: 50, enemyType: 'tank' },  // Tank to show different enemies
    ],
    eggs: [
      { x: 250, y: 430 },
      { x: 450, y: 430 },
      { x: 700, y: 430 },
      { x: 900, y: 350 },
      { x: 1150, y: 430 },
      { x: 1400, y: 350 },
      { x: 1600, y: 430 },
      { x: 1700, y: 550 },
    ],
    powerups: [
      { x: 800, y: 350, type: 'shield' },  // Shield to show protection
    ],
    checkpoints: [
      { x: 550, y: 440 },
      { x: 1050, y: 440 },
    ],
    lives: [],
    pits: [],  // No pits
    exit: { x: 1750, y: 550 }
  },

  // ============================================
  // TRAINING 4: DOUBLE JUMP ACADEMY
  // Learn double jumping (W + W in air)
  // ============================================
  {
    id: 104,
    name: 'Double Jump Academy',
    theme: 'space',
    primarySkill: 'Double Jump',
    controlHint: 'Press W twice to Double Jump!',
    targetTime: 75,
    totalEggs: 10,
    width: 2000,
    height: 700,
    platforms: [
      // Vertical climbing with wide gaps requiring double jump
      { x: 200, y: 600, type: 'platform' },
      { x: 450, y: 500, type: 'platform' },  // Needs double jump
      { x: 200, y: 400, type: 'platform' },
      { x: 500, y: 300, type: 'platform' },  // Needs double jump
      { x: 250, y: 200, type: 'platform' },
      // Horizontal section with gaps
      { x: 600, y: 550, type: 'platform' },
      { x: 900, y: 550, type: 'platform' },  // Wide gap - needs double jump
      { x: 1200, y: 500, type: 'platform' },
      { x: 1500, y: 450, type: 'platform' },
      { x: 1800, y: 500, type: 'platform' },
    ],
    enemies: [],  // No enemies
    eggs: [
      // Eggs in the air to encourage double jumping
      { x: 325, y: 500 },  // Between platforms - mid-air
      { x: 325, y: 350 },
      { x: 375, y: 250 },
      { x: 375, y: 150 },  // High up
      { x: 750, y: 500 },  // In the gaps
      { x: 1050, y: 480 },
      { x: 1350, y: 430 },
      { x: 1650, y: 400 },
      { x: 1900, y: 450 },
      { x: 1950, y: 550 },
    ],
    powerups: [
      { x: 200, y: 550, type: 'double_jump' },  // Gives double jump at start!
    ],
    checkpoints: [
      { x: 250, y: 160 },
      { x: 900, y: 510 },
      { x: 1500, y: 410 },
    ],
    lives: [],
    pits: [],  // No lethal pits
    exit: { x: 1950, y: 600 }
  },

  // ============================================
  // TRAINING 5: OBSTACLE COURSE
  // Combined skills - all mechanics together
  // ============================================
  {
    id: 105,
    name: 'Obstacle Course',
    theme: 'ice',
    primarySkill: 'All Skills',
    controlHint: 'Use all your skills!',
    targetTime: 120,
    totalEggs: 15,
    width: 2800,
    height: 700,
    platforms: [
      // Section 1: Jump warmup
      { x: 200, y: 550, type: 'platform' },
      { x: 400, y: 480, type: 'platform' },
      { x: 600, y: 420, type: 'platform' },

      // Section 2: Movement challenge
      { x: 800, y: 500, type: 'platform' },
      { x: 1000, y: 400, type: 'platform' },
      { x: 800, y: 300, type: 'platform' },
      { x: 1000, y: 200, type: 'platform' },

      // Section 3: Combat zone
      { x: 1200, y: 550, type: 'platform' },
      { x: 1400, y: 550, type: 'platform' },
      { x: 1600, y: 550, type: 'platform' },

      // Section 4: Double jump finale
      { x: 1850, y: 500, type: 'platform' },
      { x: 2150, y: 450, type: 'platform' },  // Wide gap
      { x: 2450, y: 400, type: 'platform' },  // Wide gap
      { x: 2650, y: 500, type: 'platform' },
    ],
    enemies: [
      // Combat section enemies
      { x: 1300, y: 520, range: 80, enemyType: 'basic' },
      { x: 1500, y: 520, range: 80, enemyType: 'basic' },
      { x: 1700, y: 520, range: 60, enemyType: 'fast' },
    ],
    eggs: [
      // Section 1
      { x: 200, y: 500 },
      { x: 400, y: 430 },
      { x: 600, y: 370 },
      // Section 2
      { x: 900, y: 350 },
      { x: 900, y: 250 },
      { x: 1100, y: 150 },
      // Section 3
      { x: 1250, y: 500 },
      { x: 1450, y: 500 },
      { x: 1650, y: 500 },
      { x: 1750, y: 600 },
      // Section 4
      { x: 2000, y: 430 },  // In the air - double jump
      { x: 2300, y: 380 },
      { x: 2550, y: 350 },
      { x: 2700, y: 450 },
      { x: 2750, y: 600 },
    ],
    powerups: [
      { x: 600, y: 370, type: 'speed' },
      { x: 1200, y: 500, type: 'shield' },
      { x: 1850, y: 450, type: 'double_jump' },
    ],
    checkpoints: [
      { x: 600, y: 380 },
      { x: 1000, y: 160 },
      { x: 1600, y: 510 },
      { x: 2450, y: 360 },
    ],
    lives: [],
    pits: [],  // No lethal pits in training
    exit: { x: 2750, y: 600 }
  },
];

// Helper function to get a training level by ID
export function getTrainingLevel(id: number): TrainingLevelData | undefined {
  return TRAINING_LEVELS.find(level => level.id === id);
}

// Check if a level ID is a training level
export function isTrainingLevelId(id: number): boolean {
  return id >= 100 && id < 200;
}
