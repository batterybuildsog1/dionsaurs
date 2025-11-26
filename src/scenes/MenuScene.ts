import Phaser from 'phaser';
import { GameState } from '../services/GameState';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(width / 2, 120, 'Dino Clash Adventure', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 180, 'Multiplayer Dinosaur Platformer', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);

    // Play Solo Button - goes to level select for single player
    const soloBtn = this.createButton(width / 2, 300, 'Play Solo', '#4CAF50');
    soloBtn.on('pointerdown', () => {
      GameState.reset();
      this.scene.start('LevelSelectScene', { isMultiplayer: false, isHost: false });
    });

    // Play Online Button
    const onlineBtn = this.createButton(width / 2, 400, 'Play Online', '#2196F3');
    onlineBtn.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });

    // Version/Credits
    this.add.text(width / 2, height - 40, 'v1.0 - Made with Phaser 3', {
      fontSize: '14px',
      color: '#555555',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, text: string, color: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, 280, 60, Phaser.Display.Color.HexStringToColor(color).color);
    bg.setInteractive({ useHandCursor: true });

    // Button text
    const btnText = this.add.text(0, 0, text, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, btnText]);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setScale(1.05);
      btnText.setScale(1.05);
    });

    bg.on('pointerout', () => {
      bg.setScale(1);
      btnText.setScale(1);
    });

    // Bind bg's event handler to container so container.on() works
    (container as any).on = bg.on.bind(bg);

    return container;
  }
}
