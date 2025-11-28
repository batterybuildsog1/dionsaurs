import Phaser from 'phaser';
import { GameState } from '../services/GameState';
import { DifficultyManager, Difficulty } from '../services/DifficultyManager';

export class MenuScene extends Phaser.Scene {
  private difficultyOverlay: Phaser.GameObjects.Container | null = null;
  private mainMenuElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('MenuScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    const title = this.add.text(width / 2, 120, 'Dino Clash Adventure', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.mainMenuElements.push(title);

    // Subtitle
    const subtitle = this.add.text(width / 2, 180, 'Multiplayer Dinosaur Platformer', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);
    this.mainMenuElements.push(subtitle);

    // Play Solo Button - shows difficulty selection
    const soloBtn = this.createButton(width / 2, 300, 'Play Solo', '#4CAF50');
    soloBtn.on('pointerdown', () => {
      this.showDifficultySelection();
    });
    this.mainMenuElements.push(soloBtn);

    // Play Online Button
    const onlineBtn = this.createButton(width / 2, 400, 'Play Online', '#2196F3');
    onlineBtn.on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });
    this.mainMenuElements.push(onlineBtn);

    // Version/Credits
    const version = this.add.text(width / 2, height - 40, 'v1.0 - Made with Phaser 3', {
      fontSize: '14px',
      color: '#555555',
    }).setOrigin(0.5);
    this.mainMenuElements.push(version);
  }

  private showDifficultySelection(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Hide main menu elements
    this.mainMenuElements.forEach(el => {
      if (el && 'setVisible' in el) {
        (el as unknown as { setVisible: (value: boolean) => void }).setVisible(false);
      }
    });

    // Create difficulty selection overlay
    this.difficultyOverlay = this.add.container(0, 0);

    // Background overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e, 1);
    this.difficultyOverlay.add(overlay);

    // Title
    const title = this.add.text(width / 2, 80, 'Select Difficulty', {
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.difficultyOverlay.add(title);

    // Current difficulty indicator
    const currentDiff = DifficultyManager.getDifficulty();
    const currentText = this.add.text(width / 2, 130, `Current: ${DifficultyManager.getSettings().name}`, {
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5);
    this.difficultyOverlay.add(currentText);

    // Difficulty buttons
    const difficulties = DifficultyManager.getAllDifficulties();
    const colors: Record<Difficulty, string> = {
      training: '#9C27B0', // Purple - Practice mode
      easy: '#4CAF50',     // Green
      medium: '#FF9800',   // Orange
      hard: '#f44336',     // Red
    };

    let yPos = 200;
    difficulties.forEach(({ key, settings }) => {
      const isSelected = key === currentDiff;

      // Button container
      const btnContainer = this.add.container(width / 2, yPos);

      // Button background
      const btnBg = this.add.rectangle(0, 0, 320, 80,
        Phaser.Display.Color.HexStringToColor(colors[key]).color,
        isSelected ? 1 : 0.7
      );
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.setStrokeStyle(isSelected ? 4 : 0, 0xffffff);

      // Difficulty name
      const nameText = this.add.text(0, -15, settings.name, {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Description
      const descText = this.add.text(0, 15, settings.description, {
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5);

      btnContainer.add([btnBg, nameText, descText]);
      this.difficultyOverlay!.add(btnContainer);

      // Hover effects
      btnBg.on('pointerover', () => {
        btnBg.setScale(1.05);
        nameText.setScale(1.05);
        descText.setScale(1.05);
      });

      btnBg.on('pointerout', () => {
        btnBg.setScale(1);
        nameText.setScale(1);
        descText.setScale(1);
      });

      // Click handler - select difficulty and start game
      btnBg.on('pointerdown', () => {
        DifficultyManager.setDifficulty(key);
        GameState.reset();
        this.scene.start('LevelSelectScene', { isMultiplayer: false, isHost: false });
      });

      yPos += 100;
    });

    // Back button
    const backBtn = this.createButton(width / 2, height - 80, 'Back', '#666666');
    backBtn.on('pointerdown', () => {
      this.hideDifficultySelection();
    });
    this.difficultyOverlay.add(backBtn);
  }

  private hideDifficultySelection(): void {
    // Remove difficulty overlay
    if (this.difficultyOverlay) {
      this.difficultyOverlay.destroy();
      this.difficultyOverlay = null;
    }

    // Show main menu elements
    this.mainMenuElements.forEach(el => {
      if (el && 'setVisible' in el) {
        (el as unknown as { setVisible: (value: boolean) => void }).setVisible(true);
      }
    });
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
