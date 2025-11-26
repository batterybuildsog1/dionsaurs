import { EnemyType } from '../objects/Enemy';
import { PowerUpType } from '../objects/PowerUp';

export interface LevelData {
  id: number;
  name: string;
  theme: 'volcano' | 'ice' | 'space';
  width: number;
  height: number;
  platforms: { x: number; y: number; width?: number; type?: string }[];
  enemies: { x: number; y: number; range: number; enemyType?: EnemyType }[];
  eggs: { x: number; y: number }[];
  powerups: { x: number; y: number; type: PowerUpType }[];
  checkpoints?: { x: number; y: number }[];
  lives?: { x: number; y: number }[];
  pits?: { start: number; end: number }[];  // Fall zones - gaps in the floor
  exit: { x: number; y: number };
}

export const LEVELS: LevelData[] = [
  // ============================================
  // LEVEL 1: VOLCANIC VALLEY (Extended ~25%)
  // Intro level - teaches pits, basic platforming
  // ============================================
  {
    id: 1,
    name: 'Volcanic Valley',
    theme: 'volcano',
    width: 2000,  // Was 1600
    height: 600,
    platforms: [
      // Section 1: Tutorial area
      { x: 300, y: 480, type: 'platform' },
      { x: 500, y: 400, type: 'platform' },
      // Section 2: First pit crossing
      { x: 750, y: 480, type: 'platform' },   // Before pit 1
      { x: 950, y: 480, type: 'platform' },   // After pit 1
      // Section 3: Elevated section
      { x: 1150, y: 380, type: 'platform' },
      { x: 1350, y: 300, type: 'platform' },  // High platform with reward
      // Section 4: Second pit with stepping stone
      { x: 1500, y: 450, type: 'platform' },  // Before pit 2
      { x: 1620, y: 520, type: 'platform' },  // Stepping stone in pit
      { x: 1750, y: 450, type: 'platform' },  // After pit 2
    ],
    enemies: [
      { x: 400, y: 550, range: 150, enemyType: 'basic' },
      { x: 700, y: 550, range: 100, enemyType: 'basic' },
      { x: 1000, y: 430, range: 120, enemyType: 'fast' },
      { x: 1400, y: 250, range: 100, enemyType: 'basic' },
      { x: 1800, y: 400, range: 80, enemyType: 'fast' },
    ],
    eggs: [
      { x: 200, y: 550 },
      { x: 350, y: 430 },
      { x: 550, y: 350 },
      { x: 850, y: 430 },
      { x: 1200, y: 330 },
      { x: 1400, y: 250 },   // On high platform
      { x: 1620, y: 470 },   // On stepping stone (risky)
      { x: 1900, y: 550 },
    ],
    powerups: [
      { x: 500, y: 350, type: 'speed' },
      { x: 1350, y: 250, type: 'double_jump' },
    ],
    checkpoints: [
      { x: 600, y: 550 },
      { x: 1100, y: 430 },
      { x: 1600, y: 480 },
    ],
    lives: [
      { x: 1350, y: 250 },
    ],
    pits: [
      { start: 800, end: 900 },      // First small pit - teaches the mechanic
      { start: 1550, end: 1700 },    // Larger pit with stepping stone
    ],
    exit: { x: 1950, y: 550 }
  },

  // ============================================
  // LEVEL 2: ICY TUNDRA (Extended ~60%)
  // More challenging - multiple pits, varied terrain
  // ============================================
  {
    id: 2,
    name: 'Icy Tundra',
    theme: 'ice',
    width: 3200,  // Was 2000
    height: 600,
    platforms: [
      // Section 1: Opening
      { x: 250, y: 480, type: 'platform' },
      { x: 450, y: 380, type: 'platform' },
      // Section 2: First chasm
      { x: 650, y: 480, type: 'platform' },
      { x: 850, y: 400, type: 'platform' },   // Floating over pit 1
      { x: 1000, y: 480, type: 'platform' },
      // Section 3: Ice towers
      { x: 1200, y: 350, type: 'platform' },
      { x: 1200, y: 220, type: 'platform' },  // Top of tower
      { x: 1400, y: 280, type: 'platform' },
      // Section 4: Frozen canyon (wide pit)
      { x: 1550, y: 450, type: 'platform' },
      { x: 1700, y: 380, type: 'platform' },  // Mid canyon
      { x: 1850, y: 320, type: 'platform' },  // Mid canyon high
      { x: 2000, y: 400, type: 'platform' },
      { x: 2150, y: 480, type: 'platform' },
      // Section 5: Gauntlet
      { x: 2350, y: 400, type: 'platform' },
      { x: 2550, y: 350, type: 'platform' },
      { x: 2750, y: 420, type: 'platform' },
      // Section 6: Final stretch
      { x: 2950, y: 480, type: 'platform' },
    ],
    enemies: [
      { x: 300, y: 550, range: 100, enemyType: 'basic' },
      { x: 550, y: 430, range: 80, enemyType: 'fast' },
      { x: 950, y: 430, range: 120, enemyType: 'basic' },
      { x: 1250, y: 300, range: 80, enemyType: 'flying' },
      { x: 1500, y: 330, range: 100, enemyType: 'tank' },
      { x: 1850, y: 270, range: 120, enemyType: 'flying' },
      { x: 2200, y: 430, range: 150, enemyType: 'fast' },
      { x: 2450, y: 350, range: 100, enemyType: 'shooter' },
      { x: 2800, y: 370, range: 100, enemyType: 'tank' },
      { x: 3000, y: 550, range: 120, enemyType: 'basic' },
    ],
    eggs: [
      { x: 150, y: 550 },
      { x: 300, y: 430 },
      { x: 500, y: 330 },
      { x: 850, y: 350 },
      { x: 1050, y: 430 },
      { x: 1250, y: 170 },   // Top of tower
      { x: 1700, y: 330 },
      { x: 2000, y: 350 },
      { x: 2400, y: 350 },
      { x: 2600, y: 300 },
      { x: 2800, y: 370 },
      { x: 3100, y: 550 },
    ],
    powerups: [
      { x: 450, y: 330, type: 'speed' },
      { x: 1200, y: 170, type: 'shield' },      // Top of tower
      { x: 1850, y: 270, type: 'double_jump' }, // Canyon crossing helper
      { x: 2550, y: 300, type: 'invincible' },  // Gauntlet help
    ],
    checkpoints: [
      { x: 500, y: 550 },
      { x: 1050, y: 430 },
      { x: 1600, y: 400 },
      { x: 2200, y: 430 },
      { x: 2800, y: 420 },
    ],
    lives: [
      { x: 1400, y: 230 },
      { x: 2350, y: 350 },
      { x: 2950, y: 430 },
    ],
    pits: [
      { start: 700, end: 950 },      // First chasm
      { start: 1250, end: 1500 },    // Under ice towers
      { start: 1600, end: 2100 },    // Frozen canyon (big!)
      { start: 2400, end: 2500 },    // Gauntlet pit 1
      { start: 2600, end: 2700 },    // Gauntlet pit 2
    ],
    exit: { x: 3100, y: 550 }
  },

  // ============================================
  // LEVEL 3: COSMIC CLIFFS (Extended ~130%)
  // Epic level - massive chasms, multiple routes
  // ============================================
  {
    id: 3,
    name: 'Cosmic Cliffs',
    theme: 'space',
    width: 5600,  // Was 2400 - now epic!
    height: 900,
    platforms: [
      // ===== ZONE 1: Launch Pad (0-800) =====
      { x: 200, y: 780, type: 'platform' },
      { x: 400, y: 700, type: 'platform' },
      { x: 600, y: 620, type: 'platform' },

      // ===== ZONE 2: First Chasm (800-1400) =====
      { x: 850, y: 700, type: 'platform' },
      { x: 1000, y: 620, type: 'platform' },  // Floating
      { x: 1150, y: 540, type: 'platform' },  // Floating higher
      { x: 1300, y: 620, type: 'platform' },

      // ===== ZONE 3: The Ascent (1400-2200) =====
      { x: 1500, y: 700, type: 'platform' },
      { x: 1650, y: 600, type: 'platform' },
      { x: 1800, y: 500, type: 'platform' },
      { x: 1950, y: 400, type: 'platform' },  // Peak
      { x: 2100, y: 500, type: 'platform' },
      // High secret route
      { x: 1900, y: 280, type: 'platform' },
      { x: 2050, y: 200, type: 'platform' },  // Secret area!

      // ===== ZONE 4: The Great Void (2200-3200) =====
      { x: 2300, y: 600, type: 'platform' },
      { x: 2500, y: 520, type: 'platform' },
      { x: 2700, y: 600, type: 'platform' },  // Stepping stone
      { x: 2900, y: 520, type: 'platform' },
      { x: 3100, y: 600, type: 'platform' },

      // ===== ZONE 5: Asteroid Field (3200-4200) =====
      { x: 3300, y: 700, type: 'platform' },
      { x: 3450, y: 600, type: 'platform' },
      { x: 3600, y: 500, type: 'platform' },
      { x: 3800, y: 580, type: 'platform' },
      { x: 4000, y: 650, type: 'platform' },
      // Lower route through asteroids
      { x: 3500, y: 750, type: 'platform' },
      { x: 3700, y: 780, type: 'platform' },
      { x: 3900, y: 750, type: 'platform' },

      // ===== ZONE 6: The Gauntlet (4200-5000) =====
      { x: 4250, y: 700, type: 'platform' },
      { x: 4400, y: 600, type: 'platform' },
      { x: 4550, y: 520, type: 'platform' },
      { x: 4700, y: 600, type: 'platform' },
      { x: 4850, y: 700, type: 'platform' },

      // ===== ZONE 7: Final Approach (5000-5600) =====
      { x: 5050, y: 750, type: 'platform' },
      { x: 5200, y: 680, type: 'platform' },
      { x: 5350, y: 750, type: 'platform' },
    ],
    enemies: [
      // Zone 1
      { x: 300, y: 850, range: 120, enemyType: 'basic' },
      { x: 550, y: 570, range: 100, enemyType: 'fast' },
      // Zone 2
      { x: 1000, y: 570, range: 80, enemyType: 'flying' },
      { x: 1250, y: 570, range: 100, enemyType: 'basic' },
      // Zone 3
      { x: 1600, y: 550, range: 100, enemyType: 'fast' },
      { x: 1850, y: 450, range: 80, enemyType: 'flying' },
      { x: 2000, y: 350, range: 100, enemyType: 'tank' },
      { x: 2050, y: 150, range: 80, enemyType: 'shooter' },  // Secret area guard
      // Zone 4 - The Void
      { x: 2400, y: 550, range: 120, enemyType: 'shooter' },
      { x: 2700, y: 550, range: 100, enemyType: 'flying' },
      { x: 3000, y: 470, range: 150, enemyType: 'tank' },
      // Zone 5 - Asteroid Field
      { x: 3400, y: 550, range: 100, enemyType: 'fast' },
      { x: 3650, y: 450, range: 120, enemyType: 'flying' },
      { x: 3850, y: 530, range: 100, enemyType: 'shooter' },
      { x: 3700, y: 730, range: 80, enemyType: 'basic' },  // Lower route
      // Zone 6 - Gauntlet
      { x: 4300, y: 650, range: 100, enemyType: 'shooter' },
      { x: 4500, y: 470, range: 120, enemyType: 'tank' },
      { x: 4750, y: 550, range: 150, enemyType: 'fast' },
      // Zone 7
      { x: 5150, y: 630, range: 100, enemyType: 'basic' },
      { x: 5300, y: 700, range: 120, enemyType: 'fast' },
    ],
    eggs: [
      // Zone 1
      { x: 150, y: 850 },
      { x: 350, y: 650 },
      { x: 550, y: 570 },
      // Zone 2
      { x: 1050, y: 570 },
      { x: 1200, y: 490 },
      // Zone 3
      { x: 1700, y: 550 },
      { x: 1900, y: 350 },
      { x: 2050, y: 150 },  // Secret!
      // Zone 4
      { x: 2400, y: 550 },
      { x: 2800, y: 550 },
      { x: 3050, y: 550 },
      // Zone 5
      { x: 3500, y: 550 },
      { x: 3750, y: 450 },
      { x: 3600, y: 700 },  // Lower route
      { x: 3950, y: 600 },
      // Zone 6
      { x: 4450, y: 550 },
      { x: 4650, y: 550 },
      // Zone 7
      { x: 5100, y: 700 },
      { x: 5400, y: 700 },
    ],
    powerups: [
      { x: 600, y: 570, type: 'speed' },
      { x: 1150, y: 490, type: 'double_jump' },
      { x: 2050, y: 150, type: 'invincible' },  // Secret area reward!
      { x: 2700, y: 550, type: 'shield' },
      { x: 3600, y: 450, type: 'magnet' },
      { x: 4400, y: 550, type: 'invincible' },  // Gauntlet help
      { x: 5200, y: 630, type: 'speed' },
    ],
    checkpoints: [
      { x: 700, y: 780 },
      { x: 1350, y: 570 },
      { x: 2150, y: 450 },
      { x: 3150, y: 550 },
      { x: 4050, y: 600 },
      { x: 4900, y: 650 },
    ],
    lives: [
      { x: 1950, y: 230 },  // Near secret
      { x: 2900, y: 470 },
      { x: 3800, y: 530 },
      { x: 5050, y: 700 },
    ],
    pits: [
      // Zone 2: First chasm
      { start: 700, end: 1250 },
      // Zone 3: Under the ascent
      { start: 1450, end: 1600 },
      // Zone 4: THE GREAT VOID (massive!)
      { start: 2200, end: 3150 },
      // Zone 5: Asteroid gaps
      { start: 3250, end: 3400 },
      { start: 3650, end: 3750 },
      { start: 3950, end: 4050 },
      // Zone 6: Gauntlet pits
      { start: 4150, end: 4350 },
      { start: 4500, end: 4650 },
      { start: 4750, end: 4850 },
      // Zone 7: Final gaps
      { start: 4950, end: 5100 },
      { start: 5250, end: 5350 },
    ],
    exit: { x: 5500, y: 850 }
  },
  {
    id: 4,
    name: 'Lava Labyrinth',
    theme: 'volcano',
    width: 2800,
    height: 700,
    platforms: [
      // Starting area
      { x: 200, y: 580, type: 'platform' },
      { x: 400, y: 480, type: 'platform' },
      { x: 200, y: 400, type: 'platform' },
      // First junction
      { x: 600, y: 580, type: 'platform' },
      { x: 650, y: 380, type: 'platform' },
      // Middle labyrinth
      { x: 900, y: 560, type: 'platform' },
      { x: 1100, y: 450, type: 'platform' },
      { x: 900, y: 340, type: 'platform' },
      { x: 1150, y: 300, type: 'platform' },
      // Second section
      { x: 1400, y: 580, type: 'platform' },
      { x: 1600, y: 480, type: 'platform' },
      { x: 1850, y: 380, type: 'platform' },
      // Final gauntlet
      { x: 2100, y: 520, type: 'platform' },
      { x: 2350, y: 450, type: 'platform' },
      { x: 2550, y: 560, type: 'platform' },
    ],
    enemies: [
      { x: 220, y: 564, range: 80, enemyType: 'basic' },
      { x: 500, y: 564, range: 100, enemyType: 'fast' },
      { x: 680, y: 364, range: 120, enemyType: 'flying' },
      { x: 920, y: 544, range: 150, enemyType: 'tank' },
      { x: 1120, y: 434, range: 100, enemyType: 'shooter' },
      { x: 1450, y: 564, range: 180, enemyType: 'fast' },
      { x: 1870, y: 364, range: 200, enemyType: 'shooter' },
      { x: 2370, y: 434, range: 180, enemyType: 'tank' },
    ],
    eggs: [
      { x: 250, y: 370 },
      { x: 700, y: 350 },
      { x: 950, y: 310 },
      { x: 1180, y: 270 },
      { x: 1450, y: 550 },
      { x: 1900, y: 350 },
      { x: 2400, y: 420 },
    ],
    powerups: [
      { x: 450, y: 450, type: 'speed' },
      { x: 950, y: 310, type: 'shield' },
      { x: 1150, y: 270, type: 'invincible' },
      { x: 2150, y: 490, type: 'double_jump' },
    ],
    checkpoints: [
      { x: 650, y: 548 },
      { x: 1150, y: 418 },
      { x: 2120, y: 488 },
    ],
    lives: [
      { x: 930, y: 308 },
      { x: 2580, y: 528 },
    ],
    exit: { x: 2700, y: 652 }
  },
  {
    id: 5,
    name: 'Frozen Fortress',
    theme: 'ice',
    width: 3000,
    height: 750,
    platforms: [
      // Entry Tower
      { x: 100, y: 614, type: 'platform' },
      { x: 250, y: 494, type: 'platform' },
      { x: 100, y: 374, type: 'platform' },
      { x: 280, y: 274, type: 'platform' },
      // Bridge section
      { x: 480, y: 334, type: 'platform' },
      { x: 680, y: 394, type: 'platform' },
      { x: 880, y: 334, type: 'platform' },
      // Central fortress
      { x: 1080, y: 234, type: 'platform' },
      { x: 1280, y: 134, type: 'platform' },
      { x: 1480, y: 234, type: 'platform' },
      // Right descent
      { x: 1700, y: 334, type: 'platform' },
      { x: 1900, y: 454, type: 'platform' },
      { x: 2100, y: 354, type: 'platform' },
      { x: 2300, y: 474, type: 'platform' },
      // Exit approach
      { x: 2500, y: 594, type: 'platform' },
      { x: 2700, y: 654, type: 'platform' },
    ],
    enemies: [
      { x: 150, y: 582, range: 80, enemyType: 'fast' },
      { x: 150, y: 342, range: 60, enemyType: 'flying' },
      { x: 300, y: 242, range: 100, enemyType: 'shooter' },
      { x: 700, y: 362, range: 150, enemyType: 'tank' },
      { x: 1100, y: 202, range: 100, enemyType: 'flying' },
      { x: 1300, y: 102, range: 120, enemyType: 'shooter' },  // Summit boss
      { x: 1720, y: 302, range: 100, enemyType: 'fast' },
      { x: 1920, y: 422, range: 140, enemyType: 'tank' },
      { x: 2320, y: 442, range: 100, enemyType: 'shooter' },
      { x: 2720, y: 622, range: 120, enemyType: 'basic' },
    ],
    eggs: [
      { x: 130, y: 574 },
      { x: 130, y: 334 },
      { x: 320, y: 234 },
      { x: 900, y: 294 },
      { x: 1310, y: 94 },
      { x: 2130, y: 314 },
      { x: 2520, y: 554 },
      { x: 2850, y: 694 },
    ],
    powerups: [
      { x: 280, y: 244, type: 'double_jump' },  // Top of entry tower
      { x: 500, y: 294, type: 'speed' },
      { x: 1080, y: 194, type: 'shield' },      // Before summit
      { x: 1280, y: 94, type: 'invincible' },   // Summit reward
      { x: 2100, y: 314, type: 'magnet' },
      { x: 2400, y: 434, type: 'shield' },
    ],
    checkpoints: [
      { x: 280, y: 242 },
      { x: 880, y: 302 },
      { x: 1480, y: 202 },
      { x: 2500, y: 562 },
    ],
    lives: [
      { x: 680, y: 354 },
      { x: 1700, y: 294 },
      { x: 2700, y: 614 },
    ],
    exit: { x: 2900, y: 702 }
  },
  {
    id: 6,
    name: 'Nebula Nexus',
    theme: 'space',
    width: 3200,
    height: 850,
    platforms: [
      // Launch Zone
      { x: 100, y: 720, type: 'platform' },
      { x: 280, y: 620, type: 'platform' },
      { x: 320, y: 720, type: 'platform' },
      { x: 500, y: 520, type: 'platform' },
      { x: 540, y: 700, type: 'platform' },
      { x: 720, y: 600, type: 'platform' },
      // Asteroid Field
      { x: 900, y: 500, type: 'platform' },
      { x: 1050, y: 580, type: 'platform' },
      { x: 1200, y: 480, type: 'platform' },
      { x: 1100, y: 380, type: 'platform' },
      { x: 1380, y: 550, type: 'platform' },
      { x: 1550, y: 450, type: 'platform' },
      { x: 1720, y: 530, type: 'platform' },
      // Final Nebula
      { x: 1900, y: 430, type: 'platform' },
      { x: 2080, y: 520, type: 'platform' },
      { x: 2250, y: 420, type: 'platform' },
      { x: 2450, y: 500, type: 'platform' },
      { x: 2650, y: 400, type: 'platform' },
      { x: 2850, y: 480, type: 'platform' },
      { x: 3020, y: 380, type: 'platform' },
    ],
    enemies: [
      // Launch Zone
      { x: 320, y: 704, range: 140, enemyType: 'fast' },
      { x: 500, y: 504, range: 120, enemyType: 'flying' },
      // Asteroid Field - intense
      { x: 900, y: 484, range: 140, enemyType: 'tank' },
      { x: 1100, y: 364, range: 100, enemyType: 'shooter' },
      { x: 1200, y: 464, range: 160, enemyType: 'fast' },
      { x: 1380, y: 534, range: 120, enemyType: 'flying' },
      { x: 1550, y: 434, range: 140, enemyType: 'shooter' },
      // Final Nebula - the gauntlet
      { x: 1900, y: 414, range: 100, enemyType: 'tank' },
      { x: 2080, y: 504, range: 160, enemyType: 'shooter' },
      { x: 2250, y: 404, range: 120, enemyType: 'flying' },
      { x: 2450, y: 484, range: 200, enemyType: 'tank' },
      { x: 2650, y: 384, range: 140, enemyType: 'shooter' },
      { x: 2850, y: 464, range: 180, enemyType: 'fast' },
    ],
    eggs: [
      { x: 150, y: 700 },
      { x: 500, y: 500 },
      { x: 1050, y: 560 },
      { x: 1100, y: 360 },
      { x: 1720, y: 510 },
      { x: 2250, y: 400 },
      { x: 2650, y: 380 },
      { x: 3000, y: 360 },
    ],
    powerups: [
      { x: 280, y: 600, type: 'speed' },
      { x: 720, y: 580, type: 'double_jump' },
      { x: 1200, y: 460, type: 'shield' },
      { x: 1550, y: 430, type: 'invincible' },
      { x: 2080, y: 500, type: 'shield' },
      { x: 2450, y: 480, type: 'invincible' },
      { x: 2850, y: 460, type: 'speed' },
    ],
    checkpoints: [
      { x: 720, y: 584 },
      { x: 1380, y: 534 },
      { x: 1900, y: 414 },
      { x: 2650, y: 384 },
    ],
    lives: [
      { x: 540, y: 680 },
      { x: 1380, y: 530 },
      { x: 2250, y: 400 },
    ],
    exit: { x: 3080, y: 348 }
  }
];
