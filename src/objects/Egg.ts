import Phaser from 'phaser';

export class Egg extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'egg');
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false); // Floating egg
    body.setImmovable(true);
  }
}
