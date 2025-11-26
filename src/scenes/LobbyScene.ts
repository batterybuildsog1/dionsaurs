import Phaser from 'phaser';
import { networkManager, RoomInfo } from '../services/NetworkManager';

export class LobbyScene extends Phaser.Scene {
  private roomListContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private rooms: RoomInfo[] = [];
  private playerNameInput!: Phaser.GameObjects.Text;
  private playerName: string = 'Player';

  constructor() {
    super('LobbyScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(width / 2, 30, 'Online Lobby', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player name label and input
    this.add.text(width / 2 - 180, 75, 'Your Name:', {
      fontSize: '16px',
      color: '#aaaaaa',
    });

    // Player name display (editable)
    this.playerNameInput = this.add.text(width / 2 - 80, 70, this.playerName, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#2a2a3e',
      padding: { x: 15, y: 8 },
      fixedWidth: 200,
    }).setInteractive({ useHandCursor: true });

    this.playerNameInput.on('pointerdown', () => {
      const newName = prompt('Enter your name:', this.playerName);
      if (newName && newName.trim()) {
        this.playerName = newName.trim().substring(0, 20);
        this.playerNameInput.setText(this.playerName);
      }
    });

    // Status text
    this.statusText = this.add.text(width / 2, 120, 'Connecting to lobby...', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    // Create Room Button
    const createBtn = this.createButton(width / 2 - 100, 160, 'Create Room', '#4CAF50', 180, 45);
    createBtn.on('pointerdown', () => this.createRoom());

    // Refresh Button
    const refreshBtn = this.createButton(width / 2 + 100, 160, 'Refresh', '#607D8B', 120, 45);
    refreshBtn.on('pointerdown', () => this.refreshRooms());

    // Room list header
    this.add.text(50, 210, 'Available Rooms', {
      fontSize: '20px',
      color: '#ffffff',
    });

    // Room list container
    this.roomListContainer = this.add.container(0, 250);

    // Back button
    const backBtn = this.add.text(50, height - 40, '< Back to Menu', {
      fontSize: '18px',
      color: '#ff6666',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      networkManager.disconnectFromLobby();
      this.scene.start('MenuScene');
    });

    // Setup network listeners
    this.setupNetworkListeners();

    // Connect to lobby
    this.connectToLobby();
  }

  private createButton(x: number, y: number, text: string, color: string, btnWidth: number = 200, btnHeight: number = 50): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, Phaser.Display.Color.HexStringToColor(color).color);
    bg.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, text, {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, btnText]);

    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout', () => bg.setAlpha(1));

    (container as any).on = bg.on.bind(bg);
    return container;
  }

  private setupNetworkListeners() {
    networkManager.on('roomListUpdated', (data: { rooms: RoomInfo[] }) => {
      this.rooms = data.rooms;
      this.displayRooms();

      if (this.rooms.length === 0) {
        this.statusText.setText('No rooms available. Create one!');
      } else {
        this.statusText.setText(`${this.rooms.length} room(s) available`);
      }
    });

    networkManager.on('lobbyDisconnected', () => {
      this.statusText.setText('Lost connection to lobby. Reconnecting...');
      this.connectToLobby();
    });
  }

  private async connectToLobby() {
    try {
      await networkManager.connectToLobby();
      this.statusText.setText('Connected! Finding rooms...');
      networkManager.refreshRoomList();
    } catch (error) {
      console.error('Failed to connect to lobby:', error);
      this.statusText.setText('Failed to connect. Click Refresh to retry.');
    }
  }

  private refreshRooms() {
    if (networkManager.isLobbyConnected) {
      this.statusText.setText('Refreshing...');
      networkManager.refreshRoomList();
    } else {
      this.connectToLobby();
    }
  }

  private displayRooms() {
    this.roomListContainer.removeAll(true);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Filter to only show waiting rooms that aren't full
    const availableRooms = this.rooms.filter(
      room => room.gameStatus === 'waiting' && room.playerCount < room.maxPlayers
    );

    if (availableRooms.length === 0) {
      const noRoomsText = this.add.text(width / 2, 60, 'No rooms available\nCreate a new room to play!', {
        fontSize: '18px',
        color: '#888888',
        align: 'center',
      }).setOrigin(0.5);
      this.roomListContainer.add(noRoomsText);
      return;
    }

    // Calculate max rooms that fit
    const maxVisible = Math.floor((height - 320) / 70);

    availableRooms.slice(0, maxVisible).forEach((room, index) => {
      const y = index * 70;

      // Room entry background
      const entryBg = this.add.rectangle(width / 2, y + 25, width - 80, 60, 0x2a2a3e);
      entryBg.setStrokeStyle(2, 0x3a3a5e);

      // Room name
      const roomNameText = this.add.text(60, y + 10, room.roomName || `Room ${room.roomId}`, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      });

      // Host and player info
      const infoText = this.add.text(60, y + 35, `Host: ${room.hostName} | Players: ${room.playerCount}/${room.maxPlayers}`, {
        fontSize: '14px',
        color: '#aaaaaa',
      });

      // Room code badge
      const codeBadge = this.add.text(width - 220, y + 15, room.roomId, {
        fontSize: '12px',
        color: '#88ff88',
        backgroundColor: '#003300',
        padding: { x: 8, y: 4 },
      });

      // Join button
      const joinBtn = this.add.rectangle(width - 90, y + 25, 100, 40, 0x2196F3);
      joinBtn.setInteractive({ useHandCursor: true });

      const joinText = this.add.text(width - 90, y + 25, 'Join', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      joinBtn.on('pointerover', () => joinBtn.setFillStyle(0x1976D2));
      joinBtn.on('pointerout', () => joinBtn.setFillStyle(0x2196F3));
      joinBtn.on('pointerdown', () => this.joinRoom(room.roomId));

      this.roomListContainer.add([entryBg, roomNameText, infoText, codeBadge, joinBtn, joinText]);
    });
  }

  private async createRoom() {
    this.statusText.setText('Creating room...');

    try {
      networkManager.disconnectFromLobby();
      await networkManager.createRoom(this.playerName);
      this.scene.start('RoomScene');
    } catch (error) {
      console.error('Failed to create room:', error);
      this.statusText.setText('Failed to create room. Try again.');
      this.connectToLobby();
    }
  }

  private async joinRoom(roomId: string) {
    this.statusText.setText(`Joining room ${roomId}...`);

    try {
      networkManager.disconnectFromLobby();
      await networkManager.joinRoom(roomId, this.playerName);
      this.scene.start('RoomScene');
    } catch (error: any) {
      console.error('Failed to join room:', error);
      this.statusText.setText(error.message || 'Failed to join room.');
      this.connectToLobby();
    }
  }

  shutdown() {
    networkManager.clearHandlers();
  }
}
