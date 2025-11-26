import Phaser from "phaser";
import { Player } from "../objects/Player";
import { Enemy } from "../objects/Enemy";
import { Egg } from "../objects/Egg";
import { PowerUp } from "../objects/PowerUp";
import { LEVELS, LevelData } from "../data/levels";
import { networkManager, PlayerState } from "../services/NetworkManager";

// Player colors for visual distinction
const PLAYER_COLORS = [0x88ff88, 0xff8888, 0x8888ff, 0xffff88];

export class GameScene extends Phaser.Scene {
  private localPlayer!: Player;
  private remotePlayers: Map<string, Player> = new Map();
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private eggs!: Phaser.GameObjects.Group;
  private powerups!: Phaser.GameObjects.Group;

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private currentLevel: LevelData;

  private isMultiplayer: boolean = false;

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
  }

  create() {
    this.createAnimations();
    this.score = 0;

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
    this.scoreText = this.add
      .text(16, 48, "Score: 0", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setScrollFactor(0);

    this.add
      .text(16, 16, `Level ${this.currentLevel.id}: ${this.currentLevel.name}`, {
        fontSize: "18px",
        color: "#ffff00",
        backgroundColor: "#000000",
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

      // Update remote player position
      remotePlayer.setPosition(data.x, data.y);
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

    // Send position update in multiplayer
    if (this.isMultiplayer && networkManager.isConnected) {
      networkManager.sendPlayerUpdate(
        this.localPlayer.x,
        this.localPlayer.y,
        this.localPlayer.flipX,
        this.localPlayer.anims.currentAnim?.key || "dino-idle"
      );
    }

    // Check if fell out of world
    if (this.localPlayer.y > this.currentLevel.height) {
      this.scene.restart();
    }
  }

  private handleAttackEnemy(_hitbox: any, enemy: any) {
    if ((enemy as Enemy).active) {
      (enemy as Enemy).destroy();
      this.score += 20;
      this.scoreText.setText("Score: " + this.score);

      // Broadcast event in multiplayer
      if (this.isMultiplayer) {
        networkManager.sendGameEvent("ENEMY_KILLED", {
          x: enemy.x,
          y: enemy.y,
        });
      }
    }
  }

  private handlePlayerEnemyCollision(_player: any, _enemy: any) {
    this.scene.restart();
  }

  private collectEgg(_player: any, egg: any) {
    (egg as Egg).destroy();
    this.score += 10;
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

  private reachExit(_player: any, _exit: any) {
    this.physics.pause();

    const nextLevel = this.currentLevel.id + 1;
    const currentUnlocked = parseInt(
      localStorage.getItem("dino_unlocked_level") || "1",
      10
    );
    if (nextLevel > currentUnlocked) {
      localStorage.setItem("dino_unlocked_level", nextLevel.toString());
    }

    this.add
      .text(
        this.cameras.main.width / 2 + this.cameras.main.scrollX,
        this.cameras.main.height / 2,
        "LEVEL COMPLETE\nScore: " + this.score,
        {
          fontSize: "48px",
          color: "#ffffff",
          align: "center",
          backgroundColor: "#000000",
        }
      )
      .setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      if (this.isMultiplayer) {
        networkManager.disconnect();
      }
      this.scene.start("MenuScene");
    });
  }
}
