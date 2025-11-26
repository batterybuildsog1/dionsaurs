import Phaser from 'phaser';
import { networkManager } from '../services/NetworkManager';

export class NetworkMenuScene extends Phaser.Scene {
  constructor() {
    super('NetworkMenuScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, 80, 'Online Multiplayer', {
      fontSize: '40px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // Host Button
    const hostBtn = this.add.text(width / 2, 200, 'Host Game', {
      fontSize: '32px',
      color: '#00ff00'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Join Button
    const joinBtn = this.add.text(width / 2, 300, 'Join Game', {
      fontSize: '32px',
      color: '#00ffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Status Text
    const statusText = this.add.text(width / 2, 450, '', {
      fontSize: '18px',
      color: '#aaaaaa',
      align: 'center'
    }).setOrigin(0.5);

    // Back Button
    const backBtn = this.add.text(width / 2, 550, 'Back', {
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    hostBtn.on('pointerdown', async () => {
        statusText.setText('Creating Room...');
        networkManager.hostGame();
        const id = await networkManager.getPeerId();
        statusText.setText(`Room Created!\nID: ${id}\nWaiting for player...`);
        
        networkManager.onConnected = () => {
            this.scene.start('LevelSelectScene', { isMultiplayer: true, isHost: true });
        };
    });

    joinBtn.on('pointerdown', () => {
        const roomId = prompt('Enter Host ID:');
        if (roomId) {
            statusText.setText('Connecting...');
            networkManager.joinGame(roomId);
            
            networkManager.onConnected = () => {
                 // Client waits for host to select level, but for simplicity now we just go to lobby or wait
                 statusText.setText('Connected! Waiting for Host to start...');
                 // Listen for "START_GAME" message?
                 // Or just jump to GameScene if we know the level.
                 // Let's assume host picks level 1 for now or sends message.
            };
            
            networkManager.onDataReceived = (data) => {
                if (data.type === 'START_LEVEL') {
                    this.scene.start('GameScene', { levelId: data.levelId, isMultiplayer: true, isHost: false });
                }
            };
        }
    });
  }
}
