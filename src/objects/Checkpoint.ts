import Phaser from 'phaser';

export class Checkpoint extends Phaser.Physics.Arcade.Sprite {
  public isActivated: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'checkpoint');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    // Start with inactive (grey) appearance
    this.setTint(0x888888);
  }

  activate(): void {
    if (!this.isActivated) {
      this.isActivated = true;
      this.setTint(0x00ff00); // Green when active
      this.setScale(1.2);

      // Brief pulse animation
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }
  }
}
