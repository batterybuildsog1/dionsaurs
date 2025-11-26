import Phaser from "phaser";
import { Player } from "../objects/Player";
import { Enemy } from "../objects/Enemy";
import { Egg } from "../objects/Egg";
import { PowerUp } from "../objects/PowerUp";
import { Checkpoint } from "../objects/Checkpoint";
import { LifePickup } from "../objects/LifePickup";
import { LEVELS, LevelData } from "../data/levels";
import { networkManager, PlayerState } from "../services/NetworkManager";
import { GameState } from "../services/GameState";

// Player colors for visual distinction
const PLAYER_COLORS = [0x88ff88, 0xff8888, 0x8888ff, 0xffff88];

export class GameScene extends Phaser.Scene {
  private localPlayer!: Player;
  private remotePlayers: Map<string, Player> = new Map();
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private eggs!: Phaser.GameObjects.Group;
  private powerups!: Phaser.GameObjects.Group;
  private _checkpoints!: Phaser.Physics.Arcade.Group;
  private lifePickups!: Phaser.GameObjects.Group;
  private _lastCheckpoint: { x: number; y: number } | null = null;

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private currentLevel: LevelData;

  private isMultiplayer: boolean = false;
  private isInvincible: boolean = false;

  // Network update throttling (prevents flooding - 60fps -> 10 updates/sec)
  private lastNetworkUpdateTime: number = 0;
  private networkUpdateInterval: number = 100; // milliseconds between updates

  // Multiplayer exit synchronization
  private playersAtExit: Set<string> = new Set();
  private levelCompleteShown: boolean = false;
  private waitingOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super("GameScene");
    this.currentLevel = LEVELS[0];
  }

  init(data: { levelId?: number; isMultiplayer?: boolean; players?: PlayerState[] }) {
    if (data.levelId) {
      this.currentLevel = LEVELS.find((l) => l.id === data.levelId) || LEVELS[0];
    }
    this.isMultiplayer = data.isMultiplayer || false;

    // Clear any previous remote players
    this.remotePlayers.clear();

    // Reset exit synchronization state
    this.playersAtExit.clear();
    this.levelCompleteShown = false;
    this.waitingOverlay = undefined;
  }

  preload() {
    this.load.spritesheet("player", "assets/dino.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("enemy", "assets/enemy.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("tiles", "assets/tiles.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    const eggGraphics = this.add.graphics();
    eggGraphics.fillStyle(0xffff00);
    eggGraphics.fillCircle(8, 8, 8);
    eggGraphics.generateTexture("egg", 16, 16);
    eggGraphics.destroy();

    const exitGraphics = this.add.graphics();
    exitGraphics.fillStyle(0x00ffff);
    exitGraphics.fillRect(0, 0, 32, 64);
    exitGraphics.generateTexture("exit", 32, 64);
    exitGraphics.destroy();

    const powerupGraphics = this.add.graphics();
    powerupGraphics.fillStyle(0xffffff);
    powerupGraphics.fillTriangle(0, 32, 16, 0, 32, 32);
    powerupGraphics.generateTexture("powerup", 32, 32);
    powerupGraphics.destroy();

    // Create checkpoint texture (flag shape)
    const checkpointGraphics = this.add.graphics();
    checkpointGraphics.fillStyle(0xffffff);
    checkpointGraphics.fillRect(0, 0, 8, 48); // Pole
    checkpointGraphics.fillRect(8, 0, 24, 20); // Flag
    checkpointGraphics.generateTexture("checkpoint", 32, 48);
    checkpointGraphics.destroy();

    // Create life pickup texture (heart shape)
    const lifeGraphics = this.add.graphics();
    lifeGraphics.fillStyle(0xff0066);
    // Simple heart using circles and triangle
    lifeGraphics.fillCircle(8, 8, 8);
    lifeGraphics.fillCircle(24, 8, 8);
    lifeGraphics.fillTriangle(0, 10, 32, 10, 16, 28);
    lifeGraphics.generateTexture("life", 32, 32);
    lifeGraphics.destroy();
  }

  create() {
    this.createAnimations();
    this.score = GameState.getScore();
    this._lastCheckpoint = null; // Reset checkpoint on level start

    // Setup World Bounds
    this.physics.world.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);

    // Create Platforms
    this.platforms = this.physics.add.staticGroup();

    this.currentLevel.platforms.forEach((p) => {
      if (p.type === "platform") {
        this.platforms.create(p.x, p.y, "tiles", 1).setScale(5, 1).refreshBody();
      } else {
        this.platforms.create(p.x, p.y, "tiles", 0).refreshBody();
      }
    });

    // Floor
    for (let x = 0; x < this.currentLevel.width; x += 32) {
      this.platforms.create(x + 16, this.currentLevel.height - 16, "tiles", 0).refreshBody();
    }

    // Create Players
    this.createPlayers();

    // Create Enemies
    this.enemies = this.add.group({
      classType: Enemy,
      runChildUpdate: true,
    });

    this.currentLevel.enemies.forEach((e) => {
      const enemy = new Enemy(this, e.x, e.y, e.range);
      this.enemies.add(enemy);
    });

    // Create Eggs
    this.eggs = this.add.group({
      classType: Egg,
      runChildUpdate: false,
    });

    this.currentLevel.eggs.forEach((egg) => {
      this.eggs.add(new Egg(this, egg.x, egg.y));
    });

    // Create PowerUps
    this.powerups = this.add.group({
      classType: PowerUp,
      runChildUpdate: false,
    });

    this.currentLevel.powerups.forEach((p) => {
      this.powerups.add(new PowerUp(this, p.x, p.y, p.type));
    });

    // Create Checkpoints
    this._checkpoints = this.physics.add.group();
    if (this.currentLevel.checkpoints) {
      this.currentLevel.checkpoints.forEach((cp) => {
        const checkpoint = new Checkpoint(this, cp.x, cp.y - 24); // Offset up so base is at ground
        this._checkpoints.add(checkpoint);
      });
    }

    // Create Life Pickups
    this.lifePickups = this.physics.add.group({
      classType: LifePickup,
      runChildUpdate: false,
    });

    if (this.currentLevel.lives) {
      this.currentLevel.lives.forEach((l) => {
        this.lifePickups.add(new LifePickup(this, l.x, l.y));
      });
    }

    // Setup Colliders
    this.setupColliders();

    // Exit
    const exit = this.physics.add.staticImage(
      this.currentLevel.exit.x,
      this.currentLevel.exit.y,
      "exit"
    );
    this.physics.add.overlap(this.localPlayer, exit, this.reachExit, undefined, this);

    // Camera
    this.cameras.main.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
    this.cameras.main.startFollow(this.localPlayer, true, 0.08, 0.08);

    // UI
    this.add
      .text(16, 16, `Level ${this.currentLevel.id}: ${this.currentLevel.name}`, {
        fontSize: "18px",
        color: "#ffff00",
        backgroundColor: "#000000",
      })
      .setScrollFactor(0);

    this.scoreText = this.add
      .text(16, 48, `Score: ${this.score}`, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setScrollFactor(0);

    this.livesText = this.add
      .text(16, 80, `Lives: ${GameState.getLives()}`, {
        fontSize: "24px",
        color: "#ff6666",
      })
      .setScrollFactor(0);

    // Theme adjustments
    this.applyTheme();

    // Setup network listeners for multiplayer
    if (this.isMultiplayer) {
      this.setupNetworkListeners();
    }
  }

  private createPlayers() {
    if (this.isMultiplayer) {
      // Find my player number
      const myPlayerNumber = networkManager.myPlayerNumber;

      // Create local player at appropriate spawn position
      const spawnX = 100 + (myPlayerNumber - 1) * 50;
      this.localPlayer = new Player(this, spawnX, this.currentLevel.height - 150, myPlayerNumber);
      this.localPlayer.setCollideWorldBounds(true);
      this.localPlayer.setTint(PLAYER_COLORS[myPlayerNumber - 1]);
      this.localPlayer.setOnlineMultiplayer(true); // Use primary controls (WASD) for all online players

      // Create remote players
      networkManager.getOtherPlayers().forEach((p) => {
        this.createRemotePlayer(p);
      });
    } else {
      // Single player or local co-op
      this.localPlayer = new Player(this, 100, this.currentLevel.height - 150, 1);
      this.localPlayer.setCollideWorldBounds(true);
    }
  }

  private createRemotePlayer(playerState: PlayerState): Player {
    const remotePlayer = new Player(
      this,
      playerState.x,
      playerState.y,
      playerState.playerNumber
    );
    remotePlayer.setCollideWorldBounds(true);
    remotePlayer.setTint(PLAYER_COLORS[playerState.playerNumber - 1]);
    remotePlayer.disableLocalInput();

    this.remotePlayers.set(playerState.id, remotePlayer);

    // Add colliders for remote player
    this.physics.add.collider(remotePlayer, this.platforms);
    this.physics.add.overlap(
      remotePlayer.attackHitbox,
      this.enemies,
      this.handleAttackEnemy,
      undefined,
      this
    );
    this.physics.add.overlap(
      remotePlayer,
      this.enemies,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );
    this.physics.add.overlap(remotePlayer, this.eggs, this.collectEgg, undefined, this);
    this.physics.add.overlap(
      remotePlayer,
      this.powerups,
      this.collectPowerUp,
      undefined,
      this
    );

    return remotePlayer;
  }

  private setupColliders() {
    // Local player colliders
    this.physics.add.collider(this.localPlayer, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(
      this.localPlayer.attackHitbox,
      this.enemies,
      this.handleAttackEnemy,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.localPlayer,
      this.enemies,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );
    this.physics.add.overlap(this.localPlayer, this.eggs, this.collectEgg, undefined, this);
    this.physics.add.overlap(
      this.localPlayer,
      this.powerups,
      this.collectPowerUp,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.localPlayer,
      this._checkpoints,
      this.activateCheckpoint,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.localPlayer,
      this.lifePickups,
      this.collectLife,
      undefined,
      this
    );
  }

  private setupNetworkListeners() {
    // Handle player position updates
    networkManager.on("playerUpdate", (data) => {
      let remotePlayer = this.remotePlayers.get(data.playerId);

      // Create player if they don't exist yet
      if (!remotePlayer) {
        const playerState: PlayerState = {
          id: data.playerId,
          playerNumber: data.playerNumber,
          playerName: `Player ${data.playerNumber}`,
          x: data.x,
          y: data.y,
          flipX: data.flipX,
          anim: data.anim,
          isReady: true,
        };
        remotePlayer = this.createRemotePlayer(playerState);
      }

      // Update remote player position with smooth interpolation
      // Use tween for smooth movement instead of instant position snap
      this.tweens.add({
        targets: remotePlayer,
        x: data.x,
        y: data.y,
        duration: 80, // Slightly less than update interval for smooth catch-up
        ease: 'Linear'
      });
      remotePlayer.setFlipX(data.flipX);
      if (data.anim) {
        remotePlayer.play(data.anim, true);
      }
    });

    // Handle player joining mid-game
    networkManager.on("playerJoined", (data) => {
      if (!this.remotePlayers.has(data.player.id)) {
        this.createRemotePlayer(data.player);
      }
    });

    // Handle player leaving
    networkManager.on("playerLeft", (data) => {
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.destroy();
        this.remotePlayers.delete(data.playerId);
      }
    });

    // Handle game events from other players
    networkManager.on("gameEvent", (data) => {
      switch (data.event) {
        case "ENEMY_KILLED":
          // Find and destroy the enemy (by position for now)
          break;
        case "EGG_COLLECTED":
          // Sync egg collection
          break;
        case "PLAYER_AT_EXIT":
          // Remote player reached the exit
          this.playersAtExit.add(data.data.playerId);
          this.checkAllPlayersAtExit();
          break;
        case "ALL_AT_EXIT":
          // All players reached exit - show completion UI
          if (!this.levelCompleteShown) {
            this.showLevelComplete();
          }
          break;
        case "NEXT_LEVEL":
          // Host is starting next level - follow them
          this.scene.start("GameScene", {
            levelId: data.data.levelId,
            isMultiplayer: true,
          });
          break;
      }
    });

    // Handle disconnection
    networkManager.on("disconnected", () => {
      // Show disconnection message and return to menu
      this.add
        .text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          "Disconnected!",
          {
            fontSize: "32px",
            color: "#ff0000",
            backgroundColor: "#000000",
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.time.delayedCall(2000, () => {
        this.scene.start("MenuScene");
      });
    });
  }

  private applyTheme() {
    if (this.currentLevel.theme === "ice") {
      this.cameras.main.setBackgroundColor("#e0f7fa");
    } else if (this.currentLevel.theme === "space") {
      this.cameras.main.setBackgroundColor("#0d001a");
      for (let i = 0; i < 100; i++) {
        this.add.circle(
          Math.random() * this.currentLevel.width,
          Math.random() * this.currentLevel.height,
          1,
          0xffffff
        );
      }
    } else {
      this.cameras.main.setBackgroundColor("#000000");
    }
  }

  private createAnimations() {
    if (this.anims.exists("dino-idle")) return;

    this.anims.create({
      key: "dino-idle",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "dino-run",
      frames: this.anims.generateFrameNumbers("player", { start: 1, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "dino-jump",
      frames: this.anims.generateFrameNumbers("player", { start: 3, end: 3 }),
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: "dino-attack",
      frames: this.anims.generateFrameNumbers("player", { start: 4, end: 4 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "enemy-walk",
      frames: this.anims.generateFrameNumbers("enemy", { start: 0, end: 1 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  update() {
    this.localPlayer.update();

    // Update remote players
    this.remotePlayers.forEach((player) => {
      player.update();
    });

    // Send position update in multiplayer (THROTTLED to prevent flooding)
    if (this.isMultiplayer && networkManager.isConnected) {
      const now = Date.now();
      if (now - this.lastNetworkUpdateTime >= this.networkUpdateInterval) {
        networkManager.sendPlayerUpdate(
          this.localPlayer.x,
          this.localPlayer.y,
          this.localPlayer.flipX,
          this.localPlayer.anims.currentAnim?.key || "dino-idle"
        );
        this.lastNetworkUpdateTime = now;
      }
    }

    // Check if fell out of world
    if (this.localPlayer.y > this.currentLevel.height && !this.isInvincible) {
      this.handleDeath();
    }
  }

  private handleAttackEnemy(_hitbox: any, enemy: any) {
    if ((enemy as Enemy).active) {
      const enemyX = enemy.x;
      const enemyY = enemy.y;

      (enemy as Enemy).destroy();
      this.score += 20;
      GameState.setScore(this.score);
      this.scoreText.setText("Score: " + this.score);

      // 20% chance to drop a life pickup
      if (Math.random() < 0.2) {
        const droppedLife = new LifePickup(this, enemyX, enemyY - 20);
        this.lifePickups.add(droppedLife);

        // Make dropped life fall with gravity briefly
        const body = droppedLife.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setVelocityY(-100); // Pop up first

        // Stop gravity after landing
        this.time.delayedCall(1000, () => {
          if (droppedLife.active) {
            body.setAllowGravity(false);
            body.setVelocityY(0);
          }
        });
      }

      // Broadcast event in multiplayer
      if (this.isMultiplayer) {
        networkManager.sendGameEvent("ENEMY_KILLED", {
          x: enemyX,
          y: enemyY,
        });
      }
    }
  }

  private handlePlayerEnemyCollision(_player: any, _enemy: any) {
    if (!this.isInvincible) {
      this.handleDeath();
    }
  }

  private handleDeath() {
    if (this.isInvincible) return; // Can't die during invincibility

    const remainingLives = GameState.decrementLives();
    this.livesText.setText(`Lives: ${remainingLives}`);

    // Pause player input during death
    this.localPlayer.setVelocity(0, 0);

    // Screen shake
    this.cameras.main.shake(300, 0.02);

    // Flash red and shrink
    this.tweens.add({
      targets: this.localPlayer,
      tint: { from: 0xffffff, to: 0xff0000 },
      scaleX: { from: 1, to: 0 },
      scaleY: { from: 1, to: 0 },
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: "Power2",
      onComplete: () => {
        if (remainingLives <= 0) {
          this.showGameOver();
        } else {
          this.respawnPlayer();
        }
      },
    });

    // Create death particles
    this.createDeathParticles(this.localPlayer.x, this.localPlayer.y);
  }

  private createDeathParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 100 + Math.random() * 50;

      const particle = this.add.circle(x, y, 4, 0xff4444);
      this.physics.add.existing(particle);
      const body = particle.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 50
      );
      body.setAllowGravity(true);

      this.tweens.add({
        targets: particle,
        alpha: 0,
        duration: 800,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private respawnPlayer() {
    let spawnX: number, spawnY: number;

    if (this._lastCheckpoint) {
      spawnX = this._lastCheckpoint.x;
      spawnY = this._lastCheckpoint.y;
    } else {
      spawnX = 100;
      spawnY = this.currentLevel.height - 150;
    }

    // Reset player state
    this.localPlayer.setPosition(spawnX, spawnY);
    this.localPlayer.setVelocity(0, 0);
    this.localPlayer.setScale(0);
    this.localPlayer.setAlpha(0);
    this.localPlayer.clearTint();

    // Spawn animation - scale up and fade in
    this.tweens.add({
      targets: this.localPlayer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: "Back.out",
      onComplete: () => {
        // Start invincibility period
        this.startInvincibility();
      },
    });
  }

  private startInvincibility() {
    this.isInvincible = true;

    // Flash effect during invincibility
    this.tweens.add({
      targets: this.localPlayer,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 9, // 10 flashes = 2 seconds
      onComplete: () => {
        this.isInvincible = false;
        this.localPlayer.setAlpha(1);
      },
    });
  }

  private activateCheckpoint(_player: any, checkpoint: any) {
    const cp = checkpoint as Checkpoint;
    if (!cp.isActivated) {
      cp.activate();
      this._lastCheckpoint = { x: cp.x, y: cp.y + 24 }; // Store ground position
    }
  }

  private showGameOver() {
    this.physics.pause();
    const cx = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add
      .rectangle(cx, cy, 400, 200, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(cx, cy - 30, "GAME OVER", {
        fontSize: "48px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.add
      .text(cx, cy + 30, `Final Score: ${this.score}`, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.time.delayedCall(3000, () => {
      if (this.isMultiplayer) {
        networkManager.disconnect();
      }
      GameState.reset();
      this.scene.start("MenuScene");
    });
  }

  private collectEgg(_player: any, egg: any) {
    (egg as Egg).destroy();
    this.score += 10;
    GameState.setScore(this.score);
    this.scoreText.setText("Score: " + this.score);

    if (this.isMultiplayer) {
      networkManager.sendGameEvent("EGG_COLLECTED", {
        x: egg.x,
        y: egg.y,
      });
    }
  }

  private collectPowerUp(player: any, powerup: any) {
    const p = powerup as PowerUp;
    const pl = player as Player;
    pl.activatePowerUp(p.type);
    p.destroy();
  }

  private collectLife(_player: any, life: any) {
    (life as LifePickup).destroy();
    GameState.addLife();
    this.livesText.setText(`Lives: ${GameState.getLives()}`);

    // Visual feedback - brief flash of UI
    this.tweens.add({
      targets: this.livesText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      yoyo: true,
    });

    if (this.isMultiplayer) {
      networkManager.sendGameEvent("LIFE_COLLECTED", {
        x: life.x,
        y: life.y,
      });
    }
  }

  private reachExit(_player: any, _exit: any) {
    // Prevent multiple triggers
    if (this.levelCompleteShown) return;

    // In multiplayer, we need all players to reach the exit
    if (this.isMultiplayer) {
      // Add ourselves to the players at exit
      const myId = networkManager.myPlayerId;
      if (!this.playersAtExit.has(myId)) {
        this.playersAtExit.add(myId);

        // Broadcast that we reached the exit
        networkManager.sendGameEvent("PLAYER_AT_EXIT", { playerId: myId });

        // Show waiting overlay
        this.showWaitingOverlay();

        // Check if all players are at exit
        this.checkAllPlayersAtExit();
      }
      return;
    }

    // Single player - show completion immediately
    this.showLevelComplete();
  }

  private showWaitingOverlay() {
    // Don't show if already showing or level complete
    if (this.waitingOverlay || this.levelCompleteShown) return;

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.waitingOverlay = this.add.container(cx, cy);
    this.waitingOverlay.setScrollFactor(0);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, 350, 120, 0x000000, 0.8);

    // "Waiting" text
    const waitText = this.add.text(0, -20, "At the Exit!", {
      fontSize: "28px",
      color: "#4CAF50",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const statusText = this.add.text(0, 20, "Waiting for other players...", {
      fontSize: "18px",
      color: "#ffffff",
    }).setOrigin(0.5);

    // Pulsing animation
    this.tweens.add({
      targets: statusText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.waitingOverlay.add([bg, waitText, statusText]);
  }

  private checkAllPlayersAtExit() {
    if (this.levelCompleteShown) return;

    // Get total player count
    const totalPlayers = networkManager.getAllPlayers().length;
    const playersAtExitCount = this.playersAtExit.size;

    // Check if all players have reached the exit
    if (playersAtExitCount >= totalPlayers) {
      // Host broadcasts that everyone made it
      if (networkManager.isHost) {
        networkManager.sendGameEvent("ALL_AT_EXIT", {});
      }
      // Show level complete for everyone
      this.showLevelComplete();
    }
  }

  private showLevelComplete() {
    if (this.levelCompleteShown) return;
    this.levelCompleteShown = true;

    // Remove waiting overlay if present
    if (this.waitingOverlay) {
      this.waitingOverlay.destroy();
      this.waitingOverlay = undefined;
    }

    this.physics.pause();

    const nextLevelId = this.currentLevel.id + 1;
    const hasNextLevel = nextLevelId <= LEVELS.length;
    const currentUnlocked = parseInt(
      localStorage.getItem("dino_unlocked_level") || "1",
      10
    );

    // Unlock next level
    if (nextLevelId > currentUnlocked) {
      localStorage.setItem("dino_unlocked_level", nextLevelId.toString());
    }

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, 500, 350, 0x000000, 0.85);
    overlay.setScrollFactor(0);
    overlay.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);

    // Level complete text
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 100,
      "LEVEL COMPLETE!",
      { fontSize: "42px", color: "#4CAF50", fontStyle: "bold" }
    ).setOrigin(0.5).setScrollFactor(0);

    // Score text
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 40,
      `Score: ${this.score}`,
      { fontSize: "28px", color: "#ffffff" }
    ).setOrigin(0.5).setScrollFactor(0);

    // Continue button (if there's a next level)
    if (hasNextLevel) {
      const nextLevelName = LEVELS[nextLevelId - 1]?.name || `Level ${nextLevelId}`;

      // In multiplayer, only host can continue
      if (this.isMultiplayer) {
        if (networkManager.isHost) {
          // Host sees the Continue button
          const continueBtn = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 30,
            280, 50, 0x4CAF50
          ).setScrollFactor(0).setInteractive({ useHandCursor: true });

          this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 30,
            `Continue to ${nextLevelName}`,
            { fontSize: "20px", color: "#ffffff", fontStyle: "bold" }
          ).setOrigin(0.5).setScrollFactor(0);

          continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x66BB6A));
          continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x4CAF50));
          continueBtn.on('pointerdown', () => {
            // Broadcast next level to all players
            networkManager.sendGameEvent("NEXT_LEVEL", { levelId: nextLevelId });
            this.scene.start("GameScene", {
              levelId: nextLevelId,
              isMultiplayer: true,
            });
          });
        } else {
          // Non-host sees waiting message
          this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 30,
            "Waiting for host to continue...",
            { fontSize: "18px", color: "#aaaaaa" }
          ).setOrigin(0.5).setScrollFactor(0);
        }
      } else {
        // Single player - normal Continue button
        const continueBtn = this.add.rectangle(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 30,
          280, 50, 0x4CAF50
        ).setScrollFactor(0).setInteractive({ useHandCursor: true });

        this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 30,
          `Continue to ${nextLevelName}`,
          { fontSize: "20px", color: "#ffffff", fontStyle: "bold" }
        ).setOrigin(0.5).setScrollFactor(0);

        continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x66BB6A));
        continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x4CAF50));
        continueBtn.on('pointerdown', () => {
          this.scene.start("GameScene", {
            levelId: nextLevelId,
            isMultiplayer: false,
          });
        });
      }
    }

    // Back to Menu button
    const menuBtnY = hasNextLevel
      ? this.cameras.main.height / 2 + 100
      : this.cameras.main.height / 2 + 30;

    const menuBtn = this.add.rectangle(
      this.cameras.main.width / 2,
      menuBtnY,
      200, 45, 0x666666
    ).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.add.text(
      this.cameras.main.width / 2,
      menuBtnY,
      "Back to Menu",
      { fontSize: "18px", color: "#ffffff" }
    ).setOrigin(0.5).setScrollFactor(0);

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x888888));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x666666));
    menuBtn.on('pointerdown', () => {
      if (this.isMultiplayer) {
        networkManager.disconnect();
      }
      this.scene.start("MenuScene");
    });
  }
}
