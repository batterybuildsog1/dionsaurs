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

    this.add.text(width / 2, 80, this.isMultiplayer ? 'Select Level (Host)' : 'Select Level', {
      fontSize: '40px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // Load unlocked level from storage
    const unlockedLevel = parseInt(localStorage.getItem('dino_unlocked_level') || '1', 10);

    LEVELS.forEach((level, index) => {
      const y = 180 + index * 80;
      const isLocked = level.id > unlockedLevel;
      
      const bg = this.add.rectangle(width / 2, y, 400, 60, isLocked ? 0x555555 : 0x00aa00)
        .setInteractive({ useHandCursor: !isLocked });

      const text = this.add.text(width / 2, y, `${level.id}. ${level.name}`, {
        fontSize: '24px',
        color: isLocked ? '#aaaaaa' : '#ffffff'
      }).setOrigin(0.5);

      if (!isLocked) {
        bg.on('pointerdown', () => {
          if (this.isMultiplayer && this.isHost) {
             // Tell other player to start
             networkManager.send({ type: 'START_LEVEL', levelId: level.id });
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
        this.add.text(width / 2 + 150, y, 'Locked', { fontSize: '16px', color: '#ff0000' }).setOrigin(0.5);
      }
    });

    // Back Button
    const backBtn = this.add.text(width / 2, height - 80, 'Back to Menu', {
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}