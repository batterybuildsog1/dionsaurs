import Phaser from 'phaser';
import { audioManager } from '../services/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Preload all game audio
    audioManager.preload(this);
  }

  create() {
    this.scene.start('MenuScene');
  }
}
