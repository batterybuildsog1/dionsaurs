import Phaser from 'phaser';
import { DifficultyManager } from '../services/DifficultyManager';

export type EnemyType = 'basic' | 'fast' | 'tank' | 'flying' | 'shooter' | 'raptor' | 'trex';

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
    shootInterval: 2000  // Base: 2 seconds (modified by difficulty)
  },
  raptor: {
    speed: 180,       // Fast and aggressive
    health: 2,
    color: 0x884422,  // Brown dinosaur
    scale: 1,         // Already 48x48, so scale 1
    canFly: false
  },
  trex: {
    speed: 90,        // Slower but relentless
    health: 5,        // Very tough
    color: 0x664422,  // Dark brown
    scale: 1,         // Already 80x80, so scale 1
    canFly: false
  }
};

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private startX: number;
  private endX: number;
  private startY: number;
  private direction: number = 1;
  private speed: number;
  private baseSpeed: number;
  public enemyType: EnemyType;
  public health: number;
  private canFly: boolean;
  private flyDirection: number = 1;
  private flyRange: number = 50;
  private shootTimer?: Phaser.Time.TimerEvent;
  public projectiles?: Phaser.Physics.Arcade.Group;

  // Unique identifier for multiplayer sync
  public readonly enemyId: string;

  // Player tracking for aimed shooting and chasing
  private targetPlayer: Phaser.Physics.Arcade.Sprite | null = null;
  public isChasing: boolean = false;  // Track chase state (public for potential visual indicators)
  private chaseSpeed: number = 0;
  public isDiving: boolean = false;  // For flying enemies in Hard mode (public for potential visual indicators)

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolDistance: number,
    type: EnemyType = 'basic',
    spawnIndex?: number  // Optional: for deterministic IDs across clients
  ) {
    // Choose texture based on enemy type
    const textureKey = type === 'basic' ? 'enemy' : `enemy-${type}`;
    super(scene, x, y, textureKey);

    // Generate deterministic enemy ID for multiplayer sync
    // Using spawn index ensures all clients have matching IDs
    this.enemyId = spawnIndex !== undefined ? `enemy_${spawnIndex}` : `enemy_${Math.round(x)}_${Math.round(y)}`;

    this.enemyType = type;
    const config = ENEMY_CONFIGS[type];

    // Apply difficulty settings
    const diffSettings = DifficultyManager.getSettings();

    this.startX = x;
    this.endX = x + patrolDistance;
    this.startY = y;

    // Apply speed multiplier from difficulty
    this.baseSpeed = config.speed * diffSettings.enemySpeedMultiplier;
    this.speed = this.baseSpeed;

    // Apply health multiplier from difficulty (round up for fairness)
    this.health = Math.ceil(config.health * diffSettings.enemyHealthMultiplier);

    this.canFly = config.canFly;

    // Calculate chase speed (faster than patrol)
    this.chaseSpeed = this.baseSpeed * 1.4;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    // Only tint basic enemies (others have unique textures)
    if (type === 'basic') {
      this.setTint(config.color);
    }
    this.setScale(config.scale);

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.canFly) {
      body.setAllowGravity(false);
    }

    // Setup shooter projectiles with difficulty-based fire rate
    if (type === 'shooter') {
      const fireRate = diffSettings.shooterFireRate;

      this.projectiles = scene.physics.add.group({
        defaultKey: 'projectile',
        maxSize: 10
      });

      this.shootTimer = scene.time.addEvent({
        delay: fireRate,
        callback: this.shoot,
        callbackScope: this,
        loop: true
      });
    }

    // Start the appropriate animation
    this.playAnimation();
  }

  // Set the target player for aiming and chasing
  setTargetPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.targetPlayer = player;
  }

  private playAnimation() {
    switch (this.enemyType) {
      case 'basic':
        this.play('enemy-walk', true);
        break;
      case 'fast':
        this.play('enemy-fast-fly', true);
        break;
      case 'tank':
        this.play('enemy-tank-walk', true);
        break;
      case 'flying':
        this.play('enemy-flying-float', true);
        break;
      case 'shooter':
        this.play('enemy-shooter-idle', true);
        break;
      case 'raptor':
        this.play('enemy-raptor-run', true);
        break;
      case 'trex':
        this.play('enemy-trex-walk', true);
        break;
    }
  }

  private shoot() {
    if (!this.active || !this.projectiles) return;

    // Play shooting animation
    this.play('enemy-shooter-shoot', true);
    this.once('animationcomplete', () => {
      if (this.active) {
        this.play('enemy-shooter-idle', true);
      }
    });

    // Get projectile speed from difficulty settings
    const projectileSpeed = DifficultyManager.getProjectileSpeed();

    // Create projectile using the projectile texture
    const projectile = this.scene.add.sprite(
      this.x + (this.direction * 20),
      this.y,
      'projectile'
    );

    this.scene.physics.add.existing(projectile);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);

    // Smart targeting: aim at player if we have a target
    if (this.targetPlayer && this.targetPlayer.active) {
      const dx = this.targetPlayer.x - this.x;
      const dy = this.targetPlayer.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        // Normalize and apply projectile speed
        const vx = (dx / distance) * projectileSpeed;
        const vy = (dy / distance) * projectileSpeed;

        body.setVelocity(vx, vy);

        // Rotate projectile to face direction of travel
        projectile.setRotation(Math.atan2(dy, dx));

        // Face the player when shooting
        this.setFlipX(dx < 0);
        this.direction = dx < 0 ? -1 : 1;
      } else {
        // Fallback: shoot horizontally
        body.setVelocityX(this.direction * projectileSpeed);
      }
    } else {
      // No target: shoot horizontally in facing direction
      body.setVelocityX(this.direction * projectileSpeed);
    }

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
          // Only restore tint for basic enemies (others have unique textures)
          if (this.enemyType === 'basic') {
            this.setTint(ENEMY_CONFIGS[this.enemyType].color);
          } else {
            this.clearTint();
          }
        }
      });
      return false; // Not dead yet
    }

    return true; // Enemy died
  }

  update() {
    if (!this.body || !this.active) return;

    const diffSettings = DifficultyManager.getSettings();
    const detectionRange = diffSettings.enemyDetectionRange;
    const shouldChase = diffSettings.enemyChaseEnabled;
    const flyingChase = diffSettings.flyingEnemiesChase;

    // Check if player is in detection range for chase behavior
    let playerInRange = false;
    let distanceToPlayer = Infinity;
    let dxToPlayer = 0;
    let dyToPlayer = 0;

    if (this.targetPlayer && this.targetPlayer.active && shouldChase) {
      dxToPlayer = this.targetPlayer.x - this.x;
      dyToPlayer = this.targetPlayer.y - this.y;
      distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
      playerInRange = distanceToPlayer <= detectionRange;
    }

    // Flying enemy behavior (Hard mode: dive at player)
    if (this.canFly) {
      const body = this.body as Phaser.Physics.Arcade.Body;

      if (flyingChase && playerInRange && this.targetPlayer) {
        // Hard mode: flying enemies dive toward player
        this.isDiving = true;

        // Move toward player position
        const moveSpeed = this.chaseSpeed;
        if (distanceToPlayer > 10) {
          const vx = (dxToPlayer / distanceToPlayer) * moveSpeed;
          const vy = (dyToPlayer / distanceToPlayer) * moveSpeed;
          body.setVelocity(vx, vy);

          // Face direction of movement
          this.setFlipX(dxToPlayer < 0);
          this.direction = dxToPlayer < 0 ? -1 : 1;
        }
      } else {
        // Normal flying behavior: horizontal patrol with vertical bob
        this.isDiving = false;

        // Horizontal patrol
        if (this.x >= this.endX) {
          this.direction = -1;
          this.setFlipX(true);
        } else if (this.x <= this.startX) {
          this.direction = 1;
          this.setFlipX(false);
        }

        this.setVelocityX(this.speed * this.direction);

        // Vertical bobbing
        if (this.y >= this.startY + this.flyRange) {
          this.flyDirection = -1;
        } else if (this.y <= this.startY - this.flyRange) {
          this.flyDirection = 1;
        }

        body.setVelocityY(60 * this.flyDirection);
      }
      return; // Flying enemy behavior complete
    }

    // Ground enemy behavior
    if (playerInRange && shouldChase) {
      // Chase mode: pursue the player
      this.isChasing = true;

      // Move toward player's X position
      if (Math.abs(dxToPlayer) > 20) {  // Don't jitter when close
        this.direction = dxToPlayer > 0 ? 1 : -1;
        this.setFlipX(this.direction < 0);
        this.setVelocityX(this.chaseSpeed * this.direction);
      } else {
        this.setVelocityX(0);
      }
    } else {
      // Normal patrol behavior
      this.isChasing = false;

      // Horizontal patrol
      if (this.x >= this.endX) {
        this.direction = -1;
        this.setFlipX(true);
      } else if (this.x <= this.startX) {
        this.direction = 1;
        this.setFlipX(false);
      }

      this.setVelocityX(this.speed * this.direction);
    }
  }

  destroy(fromScene?: boolean) {
    if (this.shootTimer) {
      this.shootTimer.destroy();
      this.shootTimer = undefined;
    }
    if (this.projectiles && this.projectiles.scene) {
      // Only clear if the group's scene still exists (not already destroyed)
      try {
        this.projectiles.clear(true, true);
      } catch {
        // Group already destroyed during scene shutdown
      }
      this.projectiles = undefined;
    }
    super.destroy(fromScene);
  }
}
