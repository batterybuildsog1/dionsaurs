import Phaser from 'phaser';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public type: 'speed' | 'invincible';

  constructor(scene: Phaser.Scene, x: number, y: number, type: 'speed' | 'invincible') {
    super(scene, x, y, 'powerup'); // We'll need a 'powerup' texture
    this.type = type;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    
    // Visual distinction (placeholder)
    if (type === 'speed') {
        this.setTint(0x0000ff); // Blue for speed
    } else {
        this.setTint(0xffd700); // Gold for invincible
    }
  }
}
