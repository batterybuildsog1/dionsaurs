import Phaser from 'phaser';

// Sound keys and their file paths
const SOUNDS = {
  jump: 'assets/sounds/jump.ogg',
  land: 'assets/sounds/land.ogg',
  collect: 'assets/sounds/collect.ogg',
  hit: 'assets/sounds/hit.ogg',
  hurt: 'assets/sounds/hurt.ogg',
  powerup: 'assets/sounds/powerup.ogg',
  levelcomplete: 'assets/sounds/levelcomplete.ogg',
} as const;

export type SoundKey = keyof typeof SOUNDS;

class AudioManager {
  private scene: Phaser.Scene | null = null;
  private sounds: Map<SoundKey, Phaser.Sound.BaseSound> = new Map();
  private _enabled: boolean = true;
  private _volume: number = 0.5;
  private initialized: boolean = false;

  /**
   * Preload all game sounds - call this in BootScene.preload()
   */
  preload(scene: Phaser.Scene): void {
    Object.entries(SOUNDS).forEach(([key, path]) => {
      scene.load.audio(key, path);
    });
  }

  /**
   * Initialize sounds after preload - call this in any scene's create()
   */
  init(scene: Phaser.Scene): void {
    console.log('[Audio] Initializing AudioManager for scene:', scene.scene.key);

    // Only initialize once per scene type, but allow reinit on scene change
    this.scene = scene;
    this.sounds.clear();

    let loadedCount = 0;
    Object.keys(SOUNDS).forEach((key) => {
      try {
        // Check if sound exists in cache
        if (scene.cache.audio.exists(key)) {
          const sound = scene.sound.add(key, { volume: this._volume });
          this.sounds.set(key as SoundKey, sound);
          loadedCount++;
        } else {
          console.warn(`[Audio] Sound not in cache: ${key}`);
        }
      } catch (e) {
        console.warn(`[Audio] Failed to initialize sound: ${key}`, e);
      }
    });

    console.log(`[Audio] Initialized ${loadedCount}/${Object.keys(SOUNDS).length} sounds`);
    this.initialized = true;
  }

  /**
   * Play a sound effect
   */
  play(key: SoundKey, volumeMultiplier: number = 1): void {
    if (!this._enabled) {
      console.log(`[Audio] Sound disabled, skipping: ${key}`);
      return;
    }

    if (!this.initialized || !this.scene) {
      console.warn(`[Audio] Not initialized yet, skipping: ${key}`);
      return;
    }

    try {
      const sound = this.sounds.get(key);
      if (sound) {
        // For sounds that might overlap (like collect), allow multiple instances
        if (sound.isPlaying && (key === 'collect' || key === 'hit')) {
          this.scene.sound.play(key, { volume: this._volume * volumeMultiplier });
        } else {
          (sound as Phaser.Sound.WebAudioSound).setVolume(this._volume * volumeMultiplier);
          sound.play();
        }
      } else {
        // Fallback: try to play directly from scene (sound might be in cache)
        console.log(`[Audio] Sound not in map, trying direct play: ${key}`);
        this.scene.sound.play(key, { volume: this._volume * volumeMultiplier });
      }
    } catch (e) {
      console.error(`[Audio] Error playing sound ${key}:`, e);
    }
  }

  /**
   * Stop a specific sound
   */
  stop(key: SoundKey): void {
    const sound = this.sounds.get(key);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.sounds.forEach((sound) => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this._enabled = !this._enabled;
    if (!this._enabled) {
      this.stopAll();
    }
    return this._enabled;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current enabled state
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Get current volume
   */
  get volume(): number {
    return this._volume;
  }
}

// Singleton instance
export const audioManager = new AudioManager();
