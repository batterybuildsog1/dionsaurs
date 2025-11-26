import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private startX: number;
  private endX: number;
  private direction: number = 1; // 1 for right, -1 for left
  private speed: number = 100;

  constructor(scene: Phaser.Scene, x: number, y: number, patrolDistance: number) {
    super(scene, x, y, 'enemy'); // 'enemy' texture
    
    this.startX = x;
    this.endX = x + patrolDistance;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
  }

  update() {
    if (!this.body) return;

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
