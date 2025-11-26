import Phaser from 'phaser';

export type EnemyType = 'basic' | 'fast' | 'tank' | 'flying' | 'shooter';

interface EnemyConfig {
  speed: number;
  health: number;
  color: number;
  scale: number;
  canFly: boolean;
  shootInterval?: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  basic: {
    speed: 100,
    health: 1,
    color: 0xff0000,  // Red
    scale: 1,
    canFly: false
  },
  fast: {
    speed: 200,       // 2x faster
    health: 1,
    color: 0xffff00,  // Yellow - fast and aggressive
    scale: 0.8,       // Smaller
    canFly: false
  },
  tank: {
    speed: 50,        // Slow
    health: 3,        // Takes 3 hits
    color: 0x8B4513,  // Brown - heavy armored
    scale: 1.4,       // Bigger
    canFly: false
  },
  flying: {
    speed: 120,
    health: 1,
    color: 0x9400D3,  // Purple - floats
    scale: 1,
    canFly: true
  },
  shooter: {
    speed: 60,
    health: 2,
    color: 0x00ff00,  // Green - ranged attacker
    scale: 1.1,
    canFly: false,
    shootInterval: 2000  // Shoots every 2 seconds
  }
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private startX: number;
  private endX: number;
  private startY: number;
  private direction: number = 1;
  private speed: number;
  public enemyType: EnemyType;
  public health: number;
  private canFly: boolean;
  private flyDirection: number = 1;
  private flyRange: number = 50;
  private shootTimer?: Phaser.Time.TimerEvent;
  public projectiles?: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolDistance: number,
    type: EnemyType = 'basic'
  ) {
    super(scene, x, y, 'enemy');

    this.enemyType = type;
    const config = ENEMY_CONFIGS[type];

    this.startX = x;
    this.endX = x + patrolDistance;
    this.startY = y;
    this.speed = config.speed;
    this.health = config.health;
    this.canFly = config.canFly;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setTint(config.color);
    this.setScale(config.scale);

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.canFly) {
      body.setAllowGravity(false);
    }

    // Setup shooter projectiles
    if (type === 'shooter' && config.shootInterval) {
      this.projectiles = scene.physics.add.group({
        defaultKey: 'projectile',
        maxSize: 10
      });

      this.shootTimer = scene.time.addEvent({
        delay: config.shootInterval,
        callback: this.shoot,
        callbackScope: this,
        loop: true
      });
    }
  }

  private shoot() {
    if (!this.active || !this.projectiles) return;

    const projectile = this.scene.add.circle(
      this.x + (this.direction * 20),
      this.y,
      6,
      0x00ff00
    );

    this.scene.physics.add.existing(projectile);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocityX(this.direction * 250);

    this.projectiles.add(projectile);

    // Destroy projectile after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }

  takeDamage(): boolean {
    this.health--;

    if (this.health > 0) {
      // Flash white to show damage
      this.setTint(0xffffff);
      this.scene.time.delayedCall(100, () => {
        if (this.active) {
          this.setTint(ENEMY_CONFIGS[this.enemyType].color);
        }
      });
      return false; // Not dead yet
    }

    return true; // Enemy died
  }

  update() {
    if (!this.body || !this.active) return;

    // Horizontal patrol
    if (this.x >= this.endX) {
      this.direction = -1;
      this.setFlipX(true);
    } else if (this.x <= this.startX) {
      this.direction = 1;
      this.setFlipX(false);
    }

    this.setVelocityX(this.speed * this.direction);

    // Flying enemies bob up and down
    if (this.canFly) {
      const body = this.body as Phaser.Physics.Arcade.Body;

      if (this.y >= this.startY + this.flyRange) {
        this.flyDirection = -1;
      } else if (this.y <= this.startY - this.flyRange) {
        this.flyDirection = 1;
      }

      body.setVelocityY(60 * this.flyDirection);
    }
  }

  destroy(fromScene?: boolean) {
    if (this.shootTimer) {
      this.shootTimer.destroy();
    }
    if (this.projectiles) {
      this.projectiles.clear(true, true);
    }
    super.destroy(fromScene);
  }
}
