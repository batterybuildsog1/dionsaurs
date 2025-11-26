import Phaser from 'phaser';

export class LifePickup extends Phaser.Physics.Arcade.Sprite {
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'life');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);

    // Pulsing animation - store reference for cleanup
    this.pulseTween = scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // CRITICAL: Clean up infinite tween when pickup is collected/destroyed
  destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween.remove();
      this.pulseTween = null;
    }
    super.destroy(fromScene);
  }
}
