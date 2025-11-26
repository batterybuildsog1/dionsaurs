import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { networkManager } from '../services/NetworkManager';

export class LevelSelectScene extends Phaser.Scene {
  private isMultiplayer: boolean = false;
  private isHost: boolean = false;

  constructor() {
    super('LevelSelectScene');
  }

  init(data: { isMultiplayer?: boolean, isHost?: boolean }) {
    this.isMultiplayer = data.isMultiplayer || false;
    this.isHost = data.isHost || false;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, 50, this.isMultiplayer ? 'Select Level (Host)' : 'Select Level', {
      fontSize: '36px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // Load unlocked level from storage
    const unlockedLevel = parseInt(localStorage.getItem('dino_unlocked_level') || '1', 10);

    // Calculate layout to fit all levels - use 2 columns for 6 levels
    const cols = 2;
    const buttonWidth = 350;
    const buttonHeight = 55;
    const spacingX = 20;
    const spacingY = 15;
    const startY = 110;
    const totalWidth = cols * buttonWidth + (cols - 1) * spacingX;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    LEVELS.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (buttonWidth + spacingX);
      const y = startY + row * (buttonHeight + spacingY);
      const isLocked = level.id > unlockedLevel;

      const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, isLocked ? 0x555555 : 0x00aa00)
        .setInteractive({ useHandCursor: !isLocked });

      this.add.text(x, y, `${level.id}. ${level.name}`, {
        fontSize: '20px',
        color: isLocked ? '#aaaaaa' : '#ffffff'
      }).setOrigin(0.5);

      if (!isLocked) {
        bg.on('pointerdown', () => {
          if (this.isMultiplayer && this.isHost) {
             // Tell other player to start
             networkManager.sendGameEvent('START_LEVEL', { levelId: level.id });
          }
          // Start GameScene with specific level data
          this.scene.start('GameScene', {
              levelId: level.id,
              isMultiplayer: this.isMultiplayer,
              isHost: this.isHost
          });
        });

        bg.on('pointerover', () => bg.setFillStyle(0x00ff00));
        bg.on('pointerout', () => bg.setFillStyle(0x00aa00));
      } else {
        this.add.text(x + buttonWidth / 2 - 30, y, '🔒', { fontSize: '16px', color: '#ff6666' }).setOrigin(0.5);
      }
    });

    // Back Button - positioned at bottom with plenty of room
    const backBtn = this.add.text(width / 2, height - 50, '← Back to Menu', {
      fontSize: '22px',
      color: '#ffff00'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#ffff00'));
  }
}