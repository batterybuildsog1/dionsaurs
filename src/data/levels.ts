export interface LevelData {
  id: number;
  name: string;
  theme: 'volcano' | 'ice' | 'space';
  width: number;
  height: number;
  platforms: { x: number; y: number; width?: number; type?: string }[];
  enemies: { x: number; y: number; range: number }[];
  eggs: { x: number; y: number }[];
  powerups: { x: number; y: number; type: 'speed' | 'invincible' }[];
  exit: { x: number; y: number };
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: 'Volcanic Valley',
    theme: 'volcano',
    width: 1600,
    height: 600,
    platforms: [
      // Ground is handled procedurally for now, but we can add specific blocks
      { x: 400, y: 450, type: 'platform' },
      { x: 800, y: 350, type: 'platform' },
      { x: 1200, y: 250, type: 'platform' }
    ],
    enemies: [
      { x: 600, y: 500, range: 200 },
      { x: 900, y: 300, range: 150 }
    ],
    eggs: [
      { x: 300, y: 500 },
      { x: 500, y: 300 },
      { x: 800, y: 250 },
      { x: 1100, y: 400 },
      { x: 1300, y: 500 }
    ],
    powerups: [
      { x: 700, y: 450, type: 'speed' }
    ],
    exit: { x: 1550, y: 550 }
  },
  {
    id: 2,
    name: 'Icy Tundra',
    theme: 'ice',
    width: 2000,
    height: 600,
    platforms: [
      { x: 300, y: 400, type: 'platform' },
      { x: 600, y: 300, type: 'platform' },
      { x: 900, y: 400, type: 'platform' },
      { x: 1200, y: 200, type: 'platform' },
      { x: 1500, y: 350, type: 'platform' },
      { x: 1800, y: 450, type: 'platform' }
    ],
    enemies: [
      { x: 400, y: 500, range: 100 },
      { x: 700, y: 250, range: 100 },
      { x: 1300, y: 150, range: 100 },
      { x: 1600, y: 500, range: 200 }
    ],
    eggs: [
      { x: 300, y: 350 },
      { x: 600, y: 250 },
      { x: 900, y: 350 },
      { x: 1200, y: 150 },
      { x: 1500, y: 300 },
      { x: 1800, y: 400 }
    ],
    powerups: [
      { x: 900, y: 350, type: 'speed' }
    ],
    exit: { x: 1950, y: 550 }
  },
  {
    id: 3,
    name: 'Cosmic Cliffs',
    theme: 'space',
    width: 2400,
    height: 800,
    platforms: [
      { x: 400, y: 600, type: 'platform' },
      { x: 800, y: 500, type: 'platform' },
      { x: 1200, y: 400, type: 'platform' },
      { x: 1600, y: 500, type: 'platform' },
      { x: 2000, y: 600, type: 'platform' },
      { x: 1000, y: 250, type: 'platform' }, // High route
      { x: 1800, y: 350, type: 'platform' }
    ],
    enemies: [
      { x: 500, y: 550, range: 100 },
      { x: 1200, y: 350, range: 200 },
      { x: 1600, y: 450, range: 150 },
      { x: 2100, y: 550, range: 100 }
    ],
    eggs: [
      { x: 400, y: 550 },
      { x: 800, y: 450 },
      { x: 1000, y: 200 },
      { x: 1600, y: 450 },
      { x: 2000, y: 550 },
      { x: 2300, y: 700 }
    ],
    powerups: [
      { x: 1000, y: 200, type: 'speed' },
      { x: 1800, y: 300, type: 'speed' }
    ],
    exit: { x: 2350, y: 700 }
  }
];
