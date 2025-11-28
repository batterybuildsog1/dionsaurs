import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { TRAINING_LEVELS } from '../data/trainingLevels';
import { networkManager } from '../services/NetworkManager';
import { DifficultyManager } from '../services/DifficultyManager';
import { TrainingProgress } from '../services/TrainingProgress';

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

    // Check if we're in training mode
    const isTraining = DifficultyManager.isTrainingMode();
    const levels = isTraining ? TRAINING_LEVELS : LEVELS;

    // Title
    let titleText = this.isMultiplayer ? 'Select Level (Host)' : 'Select Level';
    let titleColor = '#ffffff';
    if (isTraining) {
      titleText = 'Training Levels';
      titleColor = '#9C27B0';  // Purple for training
    }

    this.add.text(width / 2, 50, titleText, {
      fontSize: '36px',
      color: titleColor,
      align: 'center'
    }).setOrigin(0.5);

    // Training: show total stars
    if (isTraining) {
      const totalStars = TrainingProgress.getTotalStars();
      const maxStars = TrainingProgress.getMaxStars();
      this.add.text(width / 2, 85, `Total Stars: ${totalStars}/${maxStars}`, {
        fontSize: '18px',
        color: '#FFD700'
      }).setOrigin(0.5);
    }

    // Load unlocked level from storage (only for regular levels)
    const unlockedLevel = isTraining ? 999 : parseInt(localStorage.getItem('dino_unlocked_level') || '1', 10);

    // Calculate layout to fit all levels - use 2 columns for 6 levels
    const cols = 2;
    const buttonWidth = 350;
    const buttonHeight = 55;
    const spacingX = 20;
    const spacingY = 15;
    const startY = 110;
    const totalWidth = cols * buttonWidth + (cols - 1) * spacingX;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    // Adjust startY for training mode (has extra stars line)
    const adjustedStartY = isTraining ? startY + 20 : startY;

    levels.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (buttonWidth + spacingX);
      const y = adjustedStartY + row * (buttonHeight + spacingY);
      const isLocked = level.id > unlockedLevel;

      // Training levels are purple, regular levels are green
      const bgColor = isTraining ? 0x9C27B0 : 0x00aa00;
      const hoverColor = isTraining ? 0xAB47BC : 0x00ff00;

      const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, isLocked ? 0x555555 : bgColor)
        .setInteractive({ useHandCursor: !isLocked });

      // For training levels, show skill focus
      let levelText = `${level.id}. ${level.name}`;
      if (isTraining) {
        const trainingLevel = level as typeof TRAINING_LEVELS[0];
        levelText = `${trainingLevel.name}`;
      }

      this.add.text(x - 50, y, levelText, {
        fontSize: '18px',
        color: isLocked ? '#aaaaaa' : '#ffffff'
      }).setOrigin(0, 0.5);

      // For training levels, show stars on the right
      if (isTraining) {
        const progress = TrainingProgress.getProgress(level.id);
        let starsText = '';
        for (let i = 0; i < 3; i++) {
          starsText += i < progress.stars ? '★' : '☆';
        }
        this.add.text(x + buttonWidth / 2 - 40, y, starsText, {
          fontSize: '20px',
          color: '#FFD700'
        }).setOrigin(0.5);
      }

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

        bg.on('pointerover', () => bg.setFillStyle(hoverColor));
        bg.on('pointerout', () => bg.setFillStyle(bgColor));
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