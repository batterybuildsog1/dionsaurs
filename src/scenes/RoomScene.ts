import Phaser from 'phaser';
import { networkManager, PlayerState } from '../services/NetworkManager';
import { GameState } from '../services/GameState';
import { LEVELS } from '../data/levels';

export class RoomScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private roomInfoText!: Phaser.GameObjects.Text;
  private playerListContainer!: Phaser.GameObjects.Container;
  private startBtn!: Phaser.GameObjects.Container;
  private readyBtn!: Phaser.GameObjects.Container;
  private myReadyState: boolean = false;
  private selectedLevelId: number = 1;
  private levelButtons: Phaser.GameObjects.Rectangle[] = [];
  private levelTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('RoomScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(width / 2, 25, 'Game Room', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Room info (name and code)
    this.roomInfoText = this.add.text(width / 2, 60, '', {
      fontSize: '16px',
      color: '#4CAF50',
      align: 'center',
    }).setOrigin(0.5);

    // Copy code button
    const copyBtn = this.add.text(width / 2, 90, '[ Copy Code ]', {
      fontSize: '14px',
      color: '#2196F3',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    copyBtn.on('pointerdown', () => {
      const code = networkManager.roomId;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.setText('Copied!');
          this.time.delayedCall(1500, () => {
            copyBtn.setText('[ Copy Code ]');
          });
        }).catch(() => {
          // Fallback: show code in prompt for manual copy
          prompt('Room code:', code);
        });
      }
    });

    copyBtn.on('pointerover', () => copyBtn.setColor('#64B5F6'));
    copyBtn.on('pointerout', () => copyBtn.setColor('#2196F3'));

    // Status text
    this.statusText = this.add.text(width / 2, 115, '', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    // Player list header
    this.add.text(width / 2, 150, 'Players', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Player list container
    this.playerListContainer = this.add.container(0, 175);

    // Level selector (will be shown only to host in updateUI)
    this.createLevelSelector();

    // Ready button (for all players)
    this.readyBtn = this.createButton(width / 2, height - 140, 'Click to Ready', '#FF9800', 220, 55);
    this.readyBtn.on('pointerdown', () => this.toggleReady());

    // Start game button (for host only)
    this.startBtn = this.createButton(width / 2, height - 70, 'Start Game', '#4CAF50', 220, 55);
    this.startBtn.on('pointerdown', () => this.startGame());
    this.startBtn.setVisible(false);

    // Back button
    const backBtn = this.add.text(50, height - 35, '< Leave Room', {
      fontSize: '18px',
      color: '#ff6666',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      networkManager.disconnectFromGame();
      this.scene.start('LobbyScene');
    });

    // Setup network listeners
    this.setupNetworkListeners();

    // Initial UI update
    this.updateUI();
  }

  private createButton(x: number, y: number, text: string, color: string, btnWidth: number = 200, btnHeight: number = 50): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, Phaser.Display.Color.HexStringToColor(color).color);
    bg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, text, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, btnText]);

    bg.on('pointerover', () => {
      if ((container as any).enabled !== false) {
        bg.setAlpha(0.8);
      }
    });

    bg.on('pointerout', () => {
      if ((container as any).enabled !== false) {
        bg.setAlpha(1);
      }
    });

    (container as any).on = bg.on.bind(bg);
    (container as any).bg = bg;
    (container as any).text = btnText;
    (container as any).enabled = true;

    return container;
  }

  private setButtonEnabled(container: Phaser.GameObjects.Container, enabled: boolean) {
    const bg = (container as any).bg as Phaser.GameObjects.Rectangle;
    (container as any).enabled = enabled;

    if (enabled) {
      bg.setAlpha(1);
      bg.setInteractive({ useHandCursor: true });
    } else {
      bg.setAlpha(0.4);
      bg.disableInteractive();
    }
  }

  private setupNetworkListeners() {
    networkManager.on('playerJoined', () => {
      this.updateUI();
    });

    networkManager.on('playerLeft', () => {
      this.updateUI();
    });

    networkManager.on('playerReadyChanged', () => {
      this.updateUI();
    });

    networkManager.on('becameHost', () => {
      this.statusText.setText('You are now the host!');
      this.updateUI();
    });

    networkManager.on('roomNameChanged', () => {
      this.updateUI();
    });

    networkManager.on('playerNameChanged', () => {
      this.updateUI();
    });

    networkManager.on('cannotStart', (data: { reason: string; readyCount: number; totalPlayers: number }) => {
      this.statusText.setText(`Cannot start: ${data.readyCount}/${data.totalPlayers} players ready`);
    });

    networkManager.on('gameStart', (data: { levelId: number; players: PlayerState[] }) => {
      networkManager.clearHandlers();
      GameState.reset();
      this.scene.start('GameScene', {
        levelId: data.levelId,
        isMultiplayer: true,
        players: data.players,
      });
    });

    networkManager.on('roomFull', () => {
      this.statusText.setText('Room is full!');
    });

    networkManager.on('gameInProgress', () => {
      this.statusText.setText('Game already in progress!');
      this.time.delayedCall(2000, () => {
        this.scene.start('LobbyScene');
      });
    });

    networkManager.on('disconnected', () => {
      this.statusText.setText('Disconnected from server');
      this.time.delayedCall(2000, () => {
        this.scene.start('LobbyScene');
      });
    });
  }

  private updateUI() {
    const players = networkManager.getAllPlayers();
    const width = this.cameras.main.width;

    // Update room info
    this.roomInfoText.setText(`${networkManager.roomName}\nRoom Code: ${networkManager.roomId}`);

    // Update status text
    const readyCount = networkManager.readyCount;
    const totalPlayers = players.length;

    if (networkManager.isHost) {
      if (totalPlayers === 1) {
        this.statusText.setText('Waiting for players to join... (or start solo)');
      } else if (networkManager.allReady) {
        this.statusText.setText('All players ready! Start the game!');
      } else {
        this.statusText.setText(`Waiting for players to ready up (${readyCount}/${totalPlayers})`);
      }
    } else {
      if (networkManager.allReady) {
        this.statusText.setText('All ready! Waiting for host to start...');
      } else {
        this.statusText.setText(`Players ready: ${readyCount}/${totalPlayers}`);
      }
    }

    // Update player list
    this.playerListContainer.removeAll(true);

    players.forEach((player, index) => {
      const y = index * 55;
      const isMe = player.id === networkManager.myPlayerId;
      const isPlayerHost = player.id === networkManager.myPlayerId ? networkManager.isHost :
                           (index === 0 || player.playerName === networkManager.hostName);

      // Player entry background
      const entryBg = this.add.rectangle(width / 2, y + 22, 500, 48, isMe ? 0x2a4a3e : 0x2a2a3e);
      entryBg.setStrokeStyle(2, isMe ? 0x4CAF50 : 0x3a3a5e);

      // Player color indicator
      const colors = [0xff6666, 0x66ff66, 0x6666ff, 0xffff66];
      const colorIndicator = this.add.rectangle(width / 2 - 220, y + 22, 8, 40, colors[player.playerNumber - 1] || 0xffffff);

      // Player name
      let displayName = player.playerName || `Player ${player.playerNumber}`;
      if (isMe) displayName += ' (You)';
      if (isPlayerHost) displayName += ' ★';

      const playerText = this.add.text(width / 2 - 200, y + 22, displayName, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: isMe ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);

      // Ready status
      const readyStatus = player.isReady ? '✓ READY' : 'Not Ready';
      const readyColor = player.isReady ? '#4CAF50' : '#888888';
      const readyText = this.add.text(width / 2 + 180, y + 22, readyStatus, {
        fontSize: '16px',
        color: readyColor,
        fontStyle: player.isReady ? 'bold' : 'normal',
      }).setOrigin(1, 0.5);

      this.playerListContainer.add([entryBg, colorIndicator, playerText, readyText]);
    });

    // Update my ready state from the player list
    const myPlayer = players.find(p => p.id === networkManager.myPlayerId);
    if (myPlayer) {
      this.myReadyState = myPlayer.isReady;
    }

    // Update ready button appearance
    const readyBtnText = (this.readyBtn as any).text as Phaser.GameObjects.Text;
    const readyBtnBg = (this.readyBtn as any).bg as Phaser.GameObjects.Rectangle;

    if (this.myReadyState) {
      readyBtnText.setText('✓ Ready!');
      readyBtnBg.setFillStyle(0x4CAF50);
    } else {
      readyBtnText.setText('Click to Ready');
      readyBtnBg.setFillStyle(0xFF9800);
    }

    // Update start button visibility (host only)
    if (networkManager.isHost) {
      this.startBtn.setVisible(true);

      // Can start if solo or all ready
      const canStart = totalPlayers === 1 || networkManager.allReady;
      this.setButtonEnabled(this.startBtn, canStart);

      // Update button text
      const startBtnText = (this.startBtn as any).text as Phaser.GameObjects.Text;
      if (totalPlayers === 1) {
        startBtnText.setText('Start Solo');
      } else {
        startBtnText.setText('Start Game');
      }
    } else {
      this.startBtn.setVisible(false);
    }

    // Update level selector visibility (host only)
    this.updateLevelSelector();
  }

  private toggleReady() {
    this.myReadyState = !this.myReadyState;
    networkManager.setReady(this.myReadyState);
    this.updateUI();
  }

  private startGame() {
    if (networkManager.isHost) {
      networkManager.startGame(this.selectedLevelId);
    }
  }

  private createLevelSelector() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const unlockedLevel = parseInt(localStorage.getItem('dino_unlocked_level') || '1', 10);

    // Level selector label
    const label = this.add.text(width / 2, height - 210, 'Select Level:', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    label.setData('isLevelSelector', true);

    // Create level buttons
    const buttonWidth = 55;
    const spacing = 10;
    const totalWidth = LEVELS.length * buttonWidth + (LEVELS.length - 1) * spacing;
    const startX = width / 2 - totalWidth / 2 + buttonWidth / 2;

    LEVELS.forEach((level, index) => {
      const x = startX + index * (buttonWidth + spacing);
      const y = height - 175;
      const isUnlocked = level.id <= unlockedLevel;
      const isSelected = level.id === this.selectedLevelId;

      const btn = this.add.rectangle(
        x, y, buttonWidth, 40,
        isSelected ? 0x4CAF50 : (isUnlocked ? 0x444466 : 0x333333)
      );
      btn.setData('isLevelSelector', true);
      btn.setData('levelId', level.id);

      if (isUnlocked) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => {
          if (level.id !== this.selectedLevelId) {
            btn.setFillStyle(0x555588);
          }
        });
        btn.on('pointerout', () => {
          btn.setFillStyle(level.id === this.selectedLevelId ? 0x4CAF50 : 0x444466);
        });
        btn.on('pointerdown', () => {
          this.selectedLevelId = level.id;
          this.updateLevelSelector();
        });
      }

      const text = this.add.text(x, y, `${level.id}`, {
        fontSize: '18px',
        color: isUnlocked ? '#ffffff' : '#666666',
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5);
      text.setData('isLevelSelector', true);
      text.setData('levelId', level.id);

      this.levelButtons.push(btn);
      this.levelTexts.push(text);
    });

    // Level name display
    const levelName = LEVELS[this.selectedLevelId - 1]?.name || '';
    const nameText = this.add.text(width / 2, height - 140, levelName, {
      fontSize: '14px',
      color: '#4CAF50',
    }).setOrigin(0.5);
    nameText.setData('isLevelSelector', true);
    nameText.setData('isLevelName', true);
  }

  private updateLevelSelector() {
    const unlockedLevel = parseInt(localStorage.getItem('dino_unlocked_level') || '1', 10);

    // Update button colors
    this.levelButtons.forEach((btn, index) => {
      const levelId = index + 1;
      const isSelected = levelId === this.selectedLevelId;
      const isUnlocked = levelId <= unlockedLevel;
      btn.setFillStyle(isSelected ? 0x4CAF50 : (isUnlocked ? 0x444466 : 0x333333));
    });

    // Update text styles
    this.levelTexts.forEach((text, index) => {
      const levelId = index + 1;
      const isSelected = levelId === this.selectedLevelId;
      text.setFontStyle(isSelected ? 'bold' : 'normal');
    });

    // Update level name
    const levelName = LEVELS[this.selectedLevelId - 1]?.name || '';
    this.children.list.forEach((child: any) => {
      if (child.getData && child.getData('isLevelName')) {
        child.setText(levelName);
      }
    });

    // Show/hide based on host status
    const isHost = networkManager.isHost;
    this.children.list.forEach((child: any) => {
      if (child.getData && child.getData('isLevelSelector')) {
        child.setVisible(isHost);
      }
    });
  }

  shutdown() {
    networkManager.clearHandlers();
  }
}
