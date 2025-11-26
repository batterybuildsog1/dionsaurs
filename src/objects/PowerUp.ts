import Phaser from 'phaser';

export type PowerUpType = 'speed' | 'invincible' | 'shield' | 'double_jump' | 'magnet';

interface PowerUpConfig {
  color: number;
  duration: number;  // in milliseconds
  description: string;
}

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  speed: {
    color: 0x0000ff,    // Blue
    duration: 10000,    // 10 seconds (doubled from 5)
    description: 'Speed Boost'
  },
  invincible: {
    color: 0xffd700,    // Gold
    duration: 8000,     // 8 seconds
    description: 'Invincibility'
  },
  shield: {
    color: 0x00ffff,    // Cyan
    duration: 15000,    // 15 seconds - absorbs one hit
    description: 'Shield'
  },
  double_jump: {
    color: 0xff00ff,    // Magenta
    duration: 20000,    // 20 seconds
    description: 'Double Jump'
  },
  magnet: {
    color: 0xff8c00,    // Dark Orange
    duration: 12000,    // 12 seconds - attracts eggs
    description: 'Egg Magnet'
  }
};

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public type: PowerUpType;
  private floatTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
    super(scene, x, y, 'powerup');
    this.type = type;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    const config = POWERUP_CONFIGS[type];
    this.setTint(config.color);

    // Add floating animation
    this.floatTween = scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add glow effect for special powerups
    if (type === 'invincible' || type === 'shield') {
      scene.tweens.add({
        targets: this,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }
  }

  destroy(fromScene?: boolean) {
    if (this.floatTween) {
      this.floatTween.stop();
    }
    super.destroy(fromScene);
  }
}
