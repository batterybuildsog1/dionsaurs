import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add.text(width / 2, 150, 'Dino Clash Adventure', {
      fontSize: '48px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    // Single Player / Local Co-op
    const playBtn = this.add.text(width / 2, 280, 'Play Local', {
      fontSize: '32px',
      color: '#ffff00',
      align: 'center',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => {
      this.scene.start('LevelSelectScene');
    });

    // Online Multiplayer (Placeholder for now)
    const onlineBtn = this.add.text(width / 2, 360, 'Play Online (Beta)', {
      fontSize: '32px',
      color: '#00ffff',
      align: 'center',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    onlineBtn.on('pointerdown', () => {
      // We'll create a NetworkMenuScene later
      this.scene.start('NetworkMenuScene'); 
    });
  }
}