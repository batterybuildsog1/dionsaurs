import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LobbyScene } from './scenes/LobbyScene';
import { RoomScene } from './scenes/RoomScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 500 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, LobbyScene, RoomScene, LevelSelectScene, GameScene],
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true // Needed for inputs if we used DOM elements
  }
};

new Phaser.Game(config);