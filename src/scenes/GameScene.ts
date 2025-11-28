import Phaser from "phaser";
import { Player } from "../objects/Player";
import { Enemy } from "../objects/Enemy";
import { Egg } from "../objects/Egg";
import { PowerUp, POWERUP_CONFIGS } from "../objects/PowerUp";
import { Checkpoint } from "../objects/Checkpoint";
import { LifePickup } from "../objects/LifePickup";
import { LEVELS, LevelData } from "../data/levels";
import { TRAINING_LEVELS, isTrainingLevelId, TrainingLevelData } from "../data/trainingLevels";
import { TrainingProgress, LevelStats } from "../services/TrainingProgress";
import { networkManager, PlayerState } from "../services/NetworkManager";
import { GameState } from "../services/GameState";
import { audioManager } from "../services/AudioManager";
import { ProceduralAssets } from "../utils/ProceduralAssets";
import { scoreManager, ScoreManager } from "../services/ScoreManager";
import { PlayerStats } from "../services/PlayerStats";
import { DifficultyManager } from "../services/DifficultyManager";
import { LeaderboardManager } from "../services/LeaderboardManager";

// Player colors for visual distinction
const PLAYER_COLORS = [0x88ff88, 0xff8888, 0x8888ff, 0xffff88];

export class GameScene extends Phaser.Scene {
  private localPlayer!: Player;
  private remotePlayers: Map<string, Player> = new Map();
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private enemyRegistry: Map<string, Enemy> = new Map();
  private killedEnemyIds: Set<string> = new Set();
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

  // Network update throttling - adaptive sync rate
  private lastNetworkUpdateTime: number = 0;
  private networkUpdateInterval: number = 33;
  private readonly SYNC_RATE_GROUND: number = 33;   // 30Hz on ground
  private readonly SYNC_RATE_AIRBORNE: number = 22; // 45Hz when jumping
  private lastAirborneState: boolean = false;

  // Tween management - CRITICAL: prevents tween accumulation memory leak
  private remotePlayerTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  private remotePlayerLastPos: Map<string, { x: number; y: number }> = new Map();
  private readonly POSITION_THRESHOLD: number = 0.5; // Only tween if moved more than 0.5 pixels

  // Multiplayer exit synchronization
  private playersAtExit: Set<string> = new Set();
  private levelCompleteShown: boolean = false;
  private waitingOverlay?: Phaser.GameObjects.Container;
  private sceneShuttingDown: boolean = false;
  private exitTriggered: boolean = false; // Debounce exit overlap

  // Player stats tracking
  private localPlayerStats!: PlayerStats;
  private firstToExitClaimed: boolean = false;
  private levelTimer!: Phaser.GameObjects.Text;

  // Training mode tracking
  private trainingDeaths: number = 0;  // Track "soft failures" in training
  private trainingStartTime: number = 0;

  constructor() {
    super("GameScene");
    this.currentLevel = LEVELS[0];
  }

  init(data: { levelId?: number; isMultiplayer?: boolean; players?: PlayerState[] }) {
    // Always reset to level 1 first, then update if levelId is provided
    // This ensures clean state on scene restart
    this.currentLevel = LEVELS[0];

    // Reset training tracking
    this.trainingDeaths = 0;
    this.trainingStartTime = Date.now();

    if (data && data.levelId) {
      // Check if this is a training level (ID >= 100)
      if (isTrainingLevelId(data.levelId)) {
        const foundLevel = TRAINING_LEVELS.find((l) => l.id === data.levelId);
        if (foundLevel) {
          this.currentLevel = foundLevel;
          console.log(`[TRAINING] Loading training level ${data.levelId}: ${foundLevel.name}`);
        } else {
          console.warn(`[TRAINING] Training level ${data.levelId} not found, defaulting to first training level`);
          this.currentLevel = TRAINING_LEVELS[0];
        }
      } else {
        const foundLevel = LEVELS.find((l) => l.id === data.levelId);
        if (foundLevel) {
          this.currentLevel = foundLevel;
          console.log(`[LEVEL] Loading level ${data.levelId}: ${foundLevel.name}`);
        } else {
          console.warn(`[LEVEL] Level ${data.levelId} not found in LEVELS array (length: ${LEVELS.length}), defaulting to level 1`);
        }
      }
    } else {
      console.log(`[LEVEL] No levelId provided, starting at level 1`);
    }

    this.isMultiplayer = data?.isMultiplayer || false;

    // Clear any previous remote players and their tweens
    this.remotePlayers.clear();
    this.remotePlayerTweens.clear();
    this.remotePlayerLastPos.clear();

    // Reset exit synchronization state
    this.playersAtExit.clear();
    this.levelCompleteShown = false;

    // Reset enemy tracking for multiplayer sync
    this.enemyRegistry.clear();
    this.killedEnemyIds.clear();
    this.waitingOverlay = undefined;
    this.sceneShuttingDown = false;
    this.exitTriggered = false;

    // Reset invincibility state
    this.isInvincible = false;

    // Reset score manager for new level
    scoreManager.reset();
    scoreManager.setLevel(this.currentLevel.id);
    this.firstToExitClaimed = false;
  }

  preload() {
    // Preload audio (backup in case BootScene didn't load them)
    audioManager.preload(this);

    // Generate all procedural game assets (enhanced pixel art style)
    const proceduralAssets = new ProceduralAssets(this);
    proceduralAssets.generateAll();
  }

  create() {
    // Ensure physics is active (may have been paused from previous level)
    this.physics.resume();

    // Initialize audio system for this scene
    audioManager.init(this);

    this.createAnimations();
    this.score = GameState.getScore();
    this._lastCheckpoint = null; // Reset checkpoint on level start

    // Setup World Bounds - extend downward to allow falling into pits
    const pitFallBuffer = 200; // Extra space below floor for pit deaths
    this.physics.world.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height + pitFallBuffer);

    // Create Platforms
    this.platforms = this.physics.add.staticGroup();

    // Determine tile frame based on theme
    // Tile frames: 0=dirt, 1=platform, 2=ice, 3=space, 4=lava, 5=grass
    const getFloorTile = () => {
      switch (this.currentLevel.theme) {
        case 'ice': return 2;
        case 'space': return 3;
        case 'volcano': return 4;
        default: return 0;
      }
    };
    const floorTileFrame = getFloorTile();

    this.currentLevel.platforms.forEach((p) => {
      if (p.type === "platform") {
        this.platforms.create(p.x, p.y, "tiles", 1).setScale(5, 1).refreshBody();
      } else {
        this.platforms.create(p.x, p.y, "tiles", floorTileFrame).refreshBody();
      }
    });

    // Floor - with pit/gap support (Easy mode: invisible bridges over pits)
    const pits = this.currentLevel.pits || [];
    const pitsAreDeadly = DifficultyManager.doPitsKill();
    for (let x = 0; x < this.currentLevel.width; x += 32) {
      const tileX = x + 16;
      // Check if this tile falls within any pit
      const inPit = pits.some(pit => tileX >= pit.start && tileX <= pit.end);
      if (!inPit) {
        this.platforms.create(tileX, this.currentLevel.height - 16, "tiles", floorTileFrame).refreshBody();
      } else if (!pitsAreDeadly) {
        // Easy mode: create invisible collision bridge over pits
        const invisibleBridge = this.platforms.create(tileX, this.currentLevel.height - 16, "tiles", floorTileFrame);
        invisibleBridge.setAlpha(0); // Invisible but collidable
        invisibleBridge.refreshBody();
      }
    }

    // Add lava glow at bottom of pits for volcano theme
    if (this.currentLevel.theme === 'volcano' && pits.length > 0) {
      pits.forEach(pit => {
        const pitWidth = pit.end - pit.start;
        const pitCenterX = pit.start + pitWidth / 2;

        // Lava pool glow at bottom of pit
        const lavaGlow = this.add.ellipse(
          pitCenterX,
          this.currentLevel.height + 50,
          pitWidth,
          80,
          0xff4400,
          0.4
        );
        lavaGlow.setScrollFactor(1);

        // Brighter center
        const lavaBright = this.add.ellipse(
          pitCenterX,
          this.currentLevel.height + 30,
          pitWidth * 0.6,
          40,
          0xff6600,
          0.6
        );
        lavaBright.setScrollFactor(1);

        // Pulsing animation
        this.tweens.add({
          targets: [lavaGlow, lavaBright],
          alpha: { from: 0.3, to: 0.7 },
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
      });
    }

    // IMPORTANT: Create game object groups FIRST, before players
    // This ensures groups exist when createRemotePlayer() sets up overlaps

    // Create Enemies group (populate after local player exists for targeting)
    this.enemies = this.add.group({
      classType: Enemy,
      runChildUpdate: true,
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

    // NOW create players (groups must exist first for remote player overlaps)
    this.createPlayers();

    // Populate enemies AFTER local player exists (for targeting)
    this.currentLevel.enemies.forEach((e, index) => {
      const enemy = new Enemy(this, e.x, e.y, e.range, e.enemyType || 'basic', index);
      // Set target player for enemy aiming and chase behavior
      enemy.setTargetPlayer(this.localPlayer);
      this.enemies.add(enemy);
      this.enemyRegistry.set(enemy.enemyId, enemy);
    });

    // Setup Colliders (after all objects exist)
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

    // Timer display (top right)
    this.levelTimer = this.add
      .text(this.cameras.main.width - 16, 16, "0:00", {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#00000088",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    // Initialize local player stats
    const playerId = this.isMultiplayer ? networkManager.myPlayerId : 'local';
    const playerNumber = this.isMultiplayer ? networkManager.myPlayerNumber : 1;
    this.localPlayerStats = scoreManager.addPlayer(playerId, playerNumber, `P${playerNumber}`);
    this.localPlayerStats.setLivesRemaining(GameState.getLives());

    // Theme adjustments
    this.applyTheme();

    // Setup network listeners for multiplayer
    if (this.isMultiplayer) {
      this.setupNetworkListeners();
    }

    // CRITICAL: Clean up event handlers when scene shuts down
    // This prevents handler accumulation causing memory leaks and duplicate events
    this.events.on('shutdown', this.cleanupScene, this);
    this.events.on('destroy', this.cleanupScene, this);
  }

  private cleanupScene() {
    // Stop and REMOVE all remote player tweens (stop alone doesn't free memory)
    this.remotePlayerTweens.forEach((tween) => {
      if (tween) {
        if (tween.isPlaying()) {
          tween.stop();
        }
        tween.remove(); // CRITICAL: Actually remove from tween manager
      }
    });
    this.remotePlayerTweens.clear();
    this.remotePlayerLastPos.clear();

    // Clear network event handlers to prevent accumulation
    if (this.isMultiplayer) {
      networkManager.clearHandlers();
    }

    // Clear enemy tracking
    this.enemyRegistry.clear();
    this.killedEnemyIds.clear();
  }

  private findEnemyByPosition(x: number, y: number, tolerance: number): Enemy | null {
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      if (!enemy.active) continue;
      if (Math.abs(enemy.x - x) < tolerance && Math.abs(enemy.y - y) < tolerance) {
        return enemy;
      }
    }
    return null;
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

    // FIX: Disable physics for remote players - they are purely network-driven
    // This prevents gravity from fighting against tween interpolation
    const body = remotePlayer.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setVelocity(0, 0);

    this.remotePlayers.set(playerState.id, remotePlayer);

    // NOTE: Platform collider removed - remote players are network-driven puppets
    // Keep overlap detectors for game interactions
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

    // Setup projectile colliders for shooter enemies
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Enemy;
      if (e.projectiles) {
        this.physics.add.overlap(
          this.localPlayer,
          e.projectiles,
          this.handleProjectileCollision,
          undefined,
          this
        );
      }
    });
  }

  // Get interpolation config based on movement state (physics-aware easing)
  private getInterpolationConfig(isAirborne: boolean, velocityY: number): { duration: number; ease: string } {
    if (!isAirborne) {
      return { duration: 40, ease: 'Sine.out' };  // Ground: smooth
    }
    // Airborne: use physics-appropriate easing
    return velocityY < 0
      ? { duration: 25, ease: 'Quad.out' }   // Rising: deceleration
      : { duration: 25, ease: 'Quad.in' };   // Falling: acceleration
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

      // Check if position changed enough to warrant a tween (avoid micro-movements)
      const lastPos = this.remotePlayerLastPos.get(data.playerId);
      const dx = lastPos ? Math.abs(data.x - lastPos.x) : Infinity;
      const dy = lastPos ? Math.abs(data.y - lastPos.y) : Infinity;

      if (dx > this.POSITION_THRESHOLD || dy > this.POSITION_THRESHOLD) {
        // CRITICAL FIX: Stop existing tween before creating new one
        // This prevents tween accumulation which causes lag and freezing
        const existingTween = this.remotePlayerTweens.get(data.playerId);
        if (existingTween && existingTween.isPlaying()) {
          existingTween.stop();
        }

        // Create new tween with state-based interpolation
        const config = this.getInterpolationConfig(data.isAirborne ?? false, data.velocityY ?? 0);
        const newTween = this.tweens.add({
          targets: remotePlayer,
          x: data.x,
          y: data.y,
          duration: config.duration,
          ease: config.ease
        });
        this.remotePlayerTweens.set(data.playerId, newTween);
        this.remotePlayerLastPos.set(data.playerId, { x: data.x, y: data.y });
      }

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
        // Clean up tween for this player (stop AND remove)
        const tween = this.remotePlayerTweens.get(data.playerId);
        if (tween) {
          if (tween.isPlaying()) {
            tween.stop();
          }
          tween.remove(); // CRITICAL: Free tween memory
        }
        this.remotePlayerTweens.delete(data.playerId);
        this.remotePlayerLastPos.delete(data.playerId);

        remotePlayer.destroy();
        this.remotePlayers.delete(data.playerId);
      }
    });

    // Handle game events from other players
    networkManager.on("gameEvent", (data) => {
      // Guard: ignore events if scene is shutting down
      if (this.sceneShuttingDown) {
        console.log(`[EXIT-SYNC] Ignoring ${data.event} - scene shutting down`);
        return;
      }

      switch (data.event) {
        case "ENEMY_KILLED": {
          const { enemyId, x, y } = data.data;

          // Deduplication - prevent double kills
          if (this.killedEnemyIds.has(enemyId)) break;
          this.killedEnemyIds.add(enemyId);

          // Find enemy by ID first, fallback to position matching
          let enemy = this.enemyRegistry.get(enemyId);
          if (!enemy || !enemy.active) {
            enemy = this.findEnemyByPosition(x, y, 50) as Enemy;
          }

          if (enemy && enemy.active) {
            this.enemyRegistry.delete(enemy.enemyId);
            this.killedEnemyIds.add(enemy.enemyId);

            // Clean up shooter projectiles
            if (enemy.projectiles && enemy.projectiles.scene) {
              try {
                enemy.projectiles.clear(true, true);
              } catch {
                // Already destroyed
              }
            }

            // Disable enemy immediately
            enemy.setActive(false);
            const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
            if (enemyBody) {
              enemyBody.setEnable(false);
            }

            // Death animation
            this.tweens.add({
              targets: enemy,
              alpha: 0,
              scaleY: 0.2,
              duration: 200,
              onComplete: () => enemy.destroy()
            });
          }
          break;
        }
        case "EGG_COLLECTED":
          // Sync egg collection
          break;
        case "PLAYER_AT_EXIT":
          // Remote player reached the exit - import their stats
          console.log(`[EXIT-SYNC] Received PLAYER_AT_EXIT from ${data.data.playerId}`);
          console.log(`[EXIT-SYNC] Players at exit before: ${Array.from(this.playersAtExit).join(", ")}`);
          this.playersAtExit.add(data.data.playerId);
          console.log(`[EXIT-SYNC] Players at exit after: ${Array.from(this.playersAtExit).join(", ")}`);

          // Import remote player's stats into scoreManager
          if (data.data.stats) {
            const remoteStats = data.data.stats;
            let playerStats = scoreManager.getPlayer(remoteStats.playerId);
            if (!playerStats) {
              playerStats = scoreManager.addPlayer(
                remoteStats.playerId,
                remoteStats.playerNumber,
                remoteStats.playerName
              );
            }
            playerStats.updateFromData(remoteStats);
            console.log(`[STATS] Imported stats for ${remoteStats.playerName}`);
          }

          this.checkAllPlayersAtExit();
          break;
        case "PLAYER_DIED":
          // Remote player died - show death animation on their sprite
          console.log(`[DEATH] Player ${data.data.playerId} died, lives remaining: ${data.data.livesRemaining}`);
          const deadRemotePlayer = this.remotePlayers.get(data.data.playerId);
          if (deadRemotePlayer) {
            // Visual feedback - flash red and fade
            this.tweens.add({
              targets: deadRemotePlayer,
              alpha: 0,
              duration: 500,
              onComplete: () => {
                // Player will reappear when they respawn (via position updates)
                // or stay invisible if they're eliminated
                if (data.data.livesRemaining > 0) {
                  deadRemotePlayer.setAlpha(1);
                }
              }
            });
          }
          break;
        case "ALL_PLAYERS_ELIMINATED":
          // Server says everyone is out - show game over
          console.log(`[DEATH] All players eliminated - game over`);
          this.showMultiplayerGameOver();
          break;
        case "ALL_AT_EXIT":
          // All players reached exit - show completion UI
          console.log(`[EXIT-SYNC] Received ALL_AT_EXIT from host`);
          if (!this.levelCompleteShown && !this.sceneShuttingDown) {
            this.showLevelComplete();
          }
          break;
        case "NEXT_LEVEL":
          // Host is starting next level - follow them
          console.log(`[EXIT-SYNC] Received NEXT_LEVEL: ${data.data.levelId}`);
          if (!this.sceneShuttingDown) {
            this.sceneShuttingDown = true;
            this.scene.start("GameScene", {
              levelId: data.data.levelId,
              isMultiplayer: true,
            });
          }
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

      // Snowfall particles
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * this.currentLevel.width;
        const y = Math.random() * this.currentLevel.height;
        const size = 1 + Math.random() * 2;

        const snowflake = this.add.circle(x, y, size, 0xffffff, 0.5 + Math.random() * 0.3);
        snowflake.setScrollFactor(0.3 + Math.random() * 0.2);

        this.tweens.add({
          targets: snowflake,
          y: this.currentLevel.height + 20,
          x: x + (Math.random() - 0.5) * 100,
          duration: 8000 + Math.random() * 6000,
          repeat: -1,
          onRepeat: () => {
            snowflake.y = -10;
            snowflake.x = Math.random() * this.currentLevel.width;
          }
        });
      }
    } else if (this.currentLevel.theme === "volcano") {
      this.cameras.main.setBackgroundColor("#1a0a00");

      // Rising ember particles
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * this.currentLevel.width;
        const y = this.currentLevel.height + Math.random() * 100;
        const size = 1 + Math.random() * 2;
        const colors = [0xff4400, 0xff6600, 0xff2200, 0xffaa00];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const ember = this.add.circle(x, y, size, color, 0.7);
        ember.setScrollFactor(0.2 + Math.random() * 0.3);

        this.tweens.add({
          targets: ember,
          y: -50,
          x: x + (Math.random() - 0.5) * 80,
          alpha: 0,
          duration: 6000 + Math.random() * 4000,
          repeat: -1,
          onRepeat: () => {
            ember.y = this.currentLevel.height + Math.random() * 100;
            ember.x = Math.random() * this.currentLevel.width;
            ember.alpha = 0.7;
          }
        });
      }
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

    // Player animations - JP T-Rex with smooth 6-frame run cycle
    this.anims.create({
      key: "dino-idle",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "dino-run",
      frames: this.anims.generateFrameNumbers("player", { start: 1, end: 6 }),
      frameRate: 12, // Faster for smooth motion
      repeat: -1,
    });
    this.anims.create({
      key: "dino-jump",
      frames: this.anims.generateFrameNumbers("player", { start: 7, end: 7 }),
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: "dino-fall",
      frames: this.anims.generateFrameNumbers("player", { start: 8, end: 8 }),
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: "dino-attack",
      frames: this.anims.generateFrameNumbers("player", { start: 9, end: 10 }),
      frameRate: 10,
      repeat: 0,
    });

    // Basic enemy (red slime)
    this.anims.create({
      key: "enemy-walk",
      frames: this.anims.generateFrameNumbers("enemy", { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });

    // Fast enemy (yellow bat)
    this.anims.create({
      key: "enemy-fast-fly",
      frames: this.anims.generateFrameNumbers("enemy-fast", { start: 0, end: 1 }),
      frameRate: 12,
      repeat: -1,
    });

    // Tank enemy (armored beetle)
    this.anims.create({
      key: "enemy-tank-walk",
      frames: this.anims.generateFrameNumbers("enemy-tank", { start: 0, end: 2 }),
      frameRate: 4,
      repeat: -1,
    });

    // Flying enemy (purple ghost)
    this.anims.create({
      key: "enemy-flying-float",
      frames: this.anims.generateFrameNumbers("enemy-flying", { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });

    // Shooter enemy (green plant)
    this.anims.create({
      key: "enemy-shooter-idle",
      frames: this.anims.generateFrameNumbers("enemy-shooter", { start: 0, end: 0 }),
      frameRate: 1,
      repeat: -1,
    });
    this.anims.create({
      key: "enemy-shooter-shoot",
      frames: this.anims.generateFrameNumbers("enemy-shooter", { start: 1, end: 2 }),
      frameRate: 4,
      repeat: 0,
    });

    // Raptor enemy (fast dinosaur)
    this.anims.create({
      key: "enemy-raptor-run",
      frames: this.anims.generateFrameNumbers("enemy-raptor", { start: 0, end: 2 }),
      frameRate: 12,
      repeat: -1,
    });

    // T-Rex enemy (massive dinosaur)
    this.anims.create({
      key: "enemy-trex-walk",
      frames: this.anims.generateFrameNumbers("enemy-trex", { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });
  }

  update() {
    this.localPlayer.update();

    // Update timer display
    if (this.localPlayerStats && this.levelTimer) {
      const elapsed = Date.now() - this.localPlayerStats.getData().levelStartTime;
      this.levelTimer.setText(ScoreManager.formatTime(elapsed));
    }

    // Update remote players
    this.remotePlayers.forEach((player) => {
      player.update();
    });

    // Magnet effect - attract nearby eggs to player
    if (this.localPlayer.hasMagnet) {
      const magnetRange = this.localPlayer.magnetRange;
      this.eggs.getChildren().forEach((egg) => {
        const e = egg as Egg;
        if (!e.active) return;

        const dx = this.localPlayer.x - e.x;
        const dy = this.localPlayer.y - e.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < magnetRange && distance > 10) {
          // Move egg toward player - faster when closer
          const speed = 200 * (1 - distance / magnetRange);
          const angle = Math.atan2(dy, dx);
          e.x += Math.cos(angle) * speed * 0.016;
          e.y += Math.sin(angle) * speed * 0.016;
        }
      });
    }

    // Send position update in multiplayer (ADAPTIVE SYNC - faster during jumps)
    if (this.isMultiplayer && networkManager.isConnected) {
      const now = Date.now();
      const body = this.localPlayer.body as Phaser.Physics.Arcade.Body;
      const velocityY = body.velocity.y;
      const isAirborne = !body.blocked.down;

      // Adaptive interval: faster sync when airborne for smoother jumps
      this.networkUpdateInterval = isAirborne ? this.SYNC_RATE_AIRBORNE : this.SYNC_RATE_GROUND;

      // Force immediate sync on state transition (jump start/landing)
      const stateChanged = isAirborne !== this.lastAirborneState;
      this.lastAirborneState = isAirborne;

      if (stateChanged || (now - this.lastNetworkUpdateTime >= this.networkUpdateInterval)) {
        networkManager.sendPlayerUpdate(
          this.localPlayer.x,
          this.localPlayer.y,
          this.localPlayer.flipX,
          this.localPlayer.anims.currentAnim?.key || "dino-idle",
          velocityY,
          isAirborne
        );
        this.lastNetworkUpdateTime = now;
      }
    }

    // Check for death - pit fall or fell off world
    if (!this.isInvincible) {
      const playerX = this.localPlayer.x;
      const playerY = this.localPlayer.y;
      const floorY = this.currentLevel.height - 16;

      // Check if in a pit zone (Easy mode: pits don't kill due to invisible bridges)
      const pits = this.currentLevel.pits || [];
      const inPitZone = pits.some(pit => playerX >= pit.start && playerX <= pit.end);
      const pitsAreDeadly = DifficultyManager.doPitsKill();

      if (inPitZone && pitsAreDeadly) {
        // In pit zone - die if fallen below floor level + buffer
        if (playerY > floorY + 32) {
          this.handleDeath();
        }
      } else if (!inPitZone) {
        // Not in pit - fallback for world edge
        if (playerY > this.currentLevel.height + 100) {
          this.handleDeath();
        }
      }
    }
  }

  private handleAttackEnemy(_hitbox: any, enemy: any) {
    const e = enemy as Enemy;
    if (!e.active) return;

    const enemyX = e.x;
    const enemyY = e.y;

    // Play hit sound
    audioManager.play('hit');

    // Apply damage - returns true if enemy died
    const died = e.takeDamage();

    if (died) {
      // Score bonus based on enemy type
      const scoreBonus = e.enemyType === 'tank' ? 50 : e.enemyType === 'shooter' ? 40 : 20;
      this.score += scoreBonus;
      GameState.setScore(this.score);
      this.scoreText.setText("Score: " + this.score);

      // Track stat - record kill by enemy type
      if (this.localPlayerStats) {
        this.localPlayerStats.killEnemy(e.enemyType);
      }

      // Show floating score with red color for enemy kills
      this.showFloatingScore(enemyX, enemyY, scoreBonus, '#ff4444');

      // Clean up shooter projectiles before destroying
      if (e.projectiles && e.projectiles.scene) {
        try {
          e.projectiles.clear(true, true);
        } catch {
          // Already destroyed
        }
        e.projectiles = undefined;
      }

      // Enemy death animation - squash, spin, and fade before destroy
      e.setActive(false); // Stop enemy AI immediately
      const enemyBody = e.body as Phaser.Physics.Arcade.Body;
      if (enemyBody) {
        enemyBody.setVelocity(0, 0);
        enemyBody.setEnable(false);
      }

      this.tweens.add({
        targets: e,
        scaleX: 1.5,
        scaleY: 0.2,
        alpha: 0,
        angle: 20,
        y: enemyY + 10,
        duration: 250,
        ease: 'Cubic.out',
        onComplete: () => e.destroy()
      });

      // 25% chance to drop a life pickup (higher for tougher enemies)
      const dropChance = e.enemyType === 'tank' ? 0.4 : e.enemyType === 'shooter' ? 0.3 : 0.2;
      if (Math.random() < dropChance) {
        const droppedLife = new LifePickup(this, enemyX, enemyY - 20);
        this.lifePickups.add(droppedLife);

        const body = droppedLife.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(true);
        body.setVelocityY(-100);

        this.time.delayedCall(1000, () => {
          if (droppedLife.active) {
            body.setAllowGravity(false);
            body.setVelocityY(0);
          }
        });
      }

      // Broadcast event in multiplayer
      if (this.isMultiplayer) {
        // Remove from registry on local kill
        this.enemyRegistry.delete(e.enemyId);
        this.killedEnemyIds.add(e.enemyId);

        networkManager.sendGameEvent("ENEMY_KILLED", {
          enemyId: e.enemyId,
          x: enemyX,
          y: enemyY,
        });
      }
    } else {
      // Enemy took damage but didn't die - give partial score
      this.score += 5;
      GameState.setScore(this.score);
      this.scoreText.setText("Score: " + this.score);
    }
  }

  private handlePlayerEnemyCollision(player: any, _enemy: any) {
    const p = player as Player;

    // Check player invincibility powerup first
    if (p.isInvincible) return;

    // Check for shield - absorbs one hit
    if (p.hasShield && p.useShield()) {
      // Track shield block stat
      if (this.localPlayerStats) {
        this.localPlayerStats.blockDamage();
      }
      // Shield absorbed the hit, grant brief invincibility
      this.isInvincible = true;
      this.time.delayedCall(1000, () => {
        this.isInvincible = false;
      });
      return;
    }

    // Check scene-level invincibility (post-respawn)
    if (!this.isInvincible) {
      this.handleDeath();
    }
  }

  private handleProjectileCollision(player: any, projectile: any) {
    const p = player as Player;

    // Destroy the projectile
    projectile.destroy();

    // Check player invincibility powerup first
    if (p.isInvincible) return;

    // Check for shield - absorbs one hit
    if (p.hasShield && p.useShield()) {
      // Track shield block stat
      if (this.localPlayerStats) {
        this.localPlayerStats.blockDamage();
      }
      this.isInvincible = true;
      this.time.delayedCall(1000, () => {
        this.isInvincible = false;
      });
      return;
    }

    if (!this.isInvincible) {
      this.handleDeath();
    }
  }

  private handleDeath() {
    if (this.isInvincible) return; // Can't die during invincibility

    // Training mode: Show encouraging feedback instead of dying
    if (DifficultyManager.isTrainingMode()) {
      this.handleTrainingFail();
      return;
    }

    // Play hurt sound
    audioManager.play('hurt');

    const remainingLives = GameState.decrementLives();
    this.livesText.setText(`Lives: ${remainingLives}`);

    // Track death stat
    if (this.localPlayerStats) {
      this.localPlayerStats.die();
      this.localPlayerStats.setLivesRemaining(remainingLives);
    }

    // Stop this player only (don't affect global physics in multiplayer)
    this.localPlayer.setVelocity(0, 0);
    const playerBody = this.localPlayer.body as Phaser.Physics.Arcade.Body;
    playerBody.enable = false; // Disable physics for this player only

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
        if (this.isMultiplayer) {
          // Broadcast death event to other players
          networkManager.sendGameEvent("PLAYER_DIED", {
            playerId: networkManager.myPlayerId,
            livesRemaining: remainingLives
          });

          if (remainingLives <= 0) {
            // This player is eliminated - show spectator overlay
            this.showPlayerEliminated();
          } else {
            // Respawn this player (others continue unaffected)
            this.respawnPlayer();
          }
        } else {
          // Single player - existing logic
          if (remainingLives <= 0) {
            this.showGameOver();
          } else {
            this.respawnPlayer();
          }
        }
      },
    });

    // Create death particles
    this.createDeathParticles(this.localPlayer.x, this.localPlayer.y);
  }

  // Training mode: Encouraging feedback instead of death
  private handleTrainingFail() {
    // Track this "soft failure"
    this.trainingDeaths++;

    // Set brief invincibility
    this.isInvincible = true;

    // Choose encouraging message
    const messages = [
      'Almost!',
      'Try again!',
      'You got this!',
      'Keep going!',
      'Nice try!',
      'So close!'
    ];
    const msg = Phaser.Math.RND.pick(messages);

    // Show floating encouraging text
    const text = this.add.text(this.localPlayer.x, this.localPlayer.y - 50, msg, {
      fontSize: '28px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(1);

    // Animate text floating up and fading
    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });

    // Flash player yellow briefly
    this.localPlayer.setTint(0xffff00);

    // Bounce player back to safe position
    const respawnX = this._lastCheckpoint?.x ?? 100;
    const respawnY = this._lastCheckpoint?.y ?? (this.currentLevel.height - 150);

    // Brief knockback animation then teleport
    this.tweens.add({
      targets: this.localPlayer,
      alpha: 0.5,
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Teleport to safe position
        this.localPlayer.setPosition(respawnX, respawnY);
        this.localPlayer.setVelocity(0, 0);
        this.localPlayer.clearTint();
        this.localPlayer.setAlpha(1);

        // Clear invincibility after brief period
        this.time.delayedCall(500, () => {
          this.isInvincible = false;
        });
      }
    });
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

    // Track respawn stat (for time-alive calculation)
    if (this.localPlayerStats) {
      this.localPlayerStats.respawn();
    }

    // Reset player state
    this.localPlayer.setPosition(spawnX, spawnY);
    this.localPlayer.setVelocity(0, 0);
    this.localPlayer.setScale(0);
    this.localPlayer.setAlpha(0);
    this.localPlayer.clearTint();

    // Re-enable physics body (was disabled in handleDeath)
    const playerBody = this.localPlayer.body as Phaser.Physics.Arcade.Body;
    playerBody.enable = true;

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

      // Track checkpoint stat - check if first to reach
      if (this.localPlayerStats) {
        const playerId = this.isMultiplayer ? networkManager.myPlayerId : 'local';
        const isFirst = scoreManager.claimCheckpoint(playerId, cp.x, cp.y);
        this.localPlayerStats.reachCheckpoint(isFirst);

        if (isFirst) {
          this.showFloatingText(cp.x, cp.y - 40, 'FIRST!', '#ffff00');
        }
      }
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

  private showPlayerEliminated() {
    // Player is out of lives in multiplayer - show spectator overlay
    // Don't pause physics - other players continue playing
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const overlay = this.add.container(cx, cy);
    overlay.setScrollFactor(0);
    overlay.setDepth(100);

    const bg = this.add.rectangle(0, 0, 400, 150, 0x000000, 0.8);
    const titleText = this.add.text(0, -30, "YOU'RE OUT!", {
      fontSize: "36px",
      color: "#ff6666",
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

    overlay.add([bg, titleText, statusText]);

    // Listen for ALL_PLAYERS_ELIMINATED from server
    // (will be handled in gameEvent handler)
  }

  private showMultiplayerGameOver() {
    // All players eliminated in multiplayer - show game over for everyone
    // Don't pause physics (already paused for eliminated players)
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add
      .rectangle(cx, cy, 400, 200, 0x000000, 0.9)
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
      .text(cx, cy + 30, `Team Score: ${this.score}`, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.time.delayedCall(3000, () => {
      networkManager.disconnect();
      GameState.reset();
      this.scene.start("MenuScene");
    });
  }

  // Floating score popup - rises and fades out for satisfying feedback
  private showFloatingScore(x: number, y: number, points: number, color: string = '#ffff00') {
    const text = points > 0 ? `+${points}` : points.toString();
    this.showFloatingText(x, y, text, color);
  }

  // Generic floating text popup
  private showFloatingText(x: number, y: number, text: string, color: string = '#ffffff') {
    const popup = this.add.text(x, y - 20, text, {
      fontSize: '20px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.out',
      onComplete: () => popup.destroy()
    });
  }

  private collectEgg(_player: any, egg: any) {
    const eggX = egg.x;
    const eggY = egg.y;
    (egg as Egg).destroy();
    this.score += 10;
    GameState.setScore(this.score);
    this.scoreText.setText("Score: " + this.score);

    // Track stat
    if (this.localPlayerStats) {
      this.localPlayerStats.collectEgg();
    }

    // Play collect sound and show floating score
    audioManager.play('collect');
    this.showFloatingScore(eggX, eggY, 10);

    if (this.isMultiplayer) {
      networkManager.sendGameEvent("EGG_COLLECTED", {
        x: eggX,
        y: eggY,
      });
    }
  }

  private collectPowerUp(player: any, powerup: any) {
    const p = powerup as PowerUp;
    const pl = player as Player;
    const powerupX = p.x;
    const powerupY = p.y;
    const config = POWERUP_CONFIGS[p.type];

    pl.activatePowerUp(p.type);
    p.destroy();

    // Track stat
    if (this.localPlayerStats) {
      this.localPlayerStats.collectPowerup();
    }

    // Play powerup sound and show floating text with powerup name
    audioManager.play('powerup');

    // Convert hex color to CSS color string
    const colorHex = '#' + config.color.toString(16).padStart(6, '0');
    this.showFloatingText(powerupX, powerupY, config.description.toUpperCase() + '!', colorHex);
  }

  private collectLife(_player: any, life: any) {
    const lifeX = life.x;
    const lifeY = life.y;
    (life as LifePickup).destroy();
    GameState.addLife();
    this.livesText.setText(`Lives: ${GameState.getLives()}`);

    // Play collect sound and show floating "+1 UP"
    audioManager.play('collect');
    this.showFloatingText(lifeX, lifeY, '+1 UP', '#ff66ff');

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
        x: lifeX,
        y: lifeY,
      });
    }
  }

  private reachExit(_player: any, _exit: any) {
    // Debounce: prevent multiple triggers from continuous overlap
    if (this.exitTriggered || this.levelCompleteShown || this.sceneShuttingDown) {
      return;
    }
    this.exitTriggered = true;

    console.log(`[EXIT-SYNC] reachExit() called, isMultiplayer: ${this.isMultiplayer}`);

    // Track exit stat - check if first to reach
    if (this.localPlayerStats) {
      const isFirst = !this.firstToExitClaimed;
      this.firstToExitClaimed = true;
      this.localPlayerStats.reachExit(isFirst);

      if (isFirst) {
        this.showFloatingText(this.localPlayer.x, this.localPlayer.y - 60, 'FIRST TO FINISH!', '#00ff00');
      }
    }

    // In multiplayer, tell server we're at exit with our stats
    if (this.isMultiplayer) {
      const myId = networkManager.myPlayerId;
      console.log(`[EXIT-SYNC] Sending PLAYER_AT_EXIT to server with stats`);

      // Send stats along with exit event
      const statsData = this.localPlayerStats ? this.localPlayerStats.getData() : null;
      networkManager.sendGameEvent("PLAYER_AT_EXIT", { playerId: myId, stats: statsData });

      // Show waiting overlay
      this.showWaitingOverlay();
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
    // Server now handles ALL_AT_EXIT logic - this is just for logging
    if (this.levelCompleteShown || this.sceneShuttingDown) {
      console.log(`[EXIT-SYNC] checkAllPlayersAtExit() skipped - levelComplete: ${this.levelCompleteShown}, shuttingDown: ${this.sceneShuttingDown}`);
      return;
    }

    console.log(`[EXIT-SYNC] checkAllPlayersAtExit() - local tracking: ${this.playersAtExit.size} players at exit`);
    // Server will broadcast ALL_AT_EXIT when appropriate
  }

  private showLevelComplete() {
    if (this.levelCompleteShown || this.sceneShuttingDown) {
      console.log(`[EXIT-SYNC] showLevelComplete() skipped - already shown or shutting down`);
      return;
    }
    this.levelCompleteShown = true;

    console.log(`[EXIT-SYNC] showLevelComplete() - displaying completion UI`);

    // Remove waiting overlay if present
    if (this.waitingOverlay) {
      this.waitingOverlay.destroy();
      this.waitingOverlay = undefined;
    }

    this.physics.pause();

    // Play level complete sound
    audioManager.play('levelcomplete');

    // Training mode has its own completion screen
    if (DifficultyManager.isTrainingMode()) {
      this.showTrainingComplete();
      return;
    }

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

    // Calculate rankings
    const rankingResult = scoreManager.calculateRankings();
    const rankings = rankingResult.rankings;
    const teamStats = rankingResult.teamStats;
    const isMultiplayerGame = rankings.length > 1;

    // Determine overlay height based on content (single player needs more for leaderboard)
    const overlayHeight = isMultiplayerGame ? 500 : 450;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, 550, overlayHeight, 0x000000, 0.92);
    overlay.setScrollFactor(0);
    overlay.setPosition(cx, cy);

    let yOffset = cy - overlayHeight / 2 + 30;

    // Level complete text
    this.add.text(cx, yOffset, "LEVEL COMPLETE!", {
      fontSize: "36px",
      color: "#4CAF50",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0);
    yOffset += 45;

    // Show rankings for multiplayer, or single player stats
    if (isMultiplayerGame) {
      // Multiplayer leaderboard
      this.add.text(cx, yOffset, "RANKINGS", {
        fontSize: "20px",
        color: "#ffff00",
        fontStyle: "bold"
      }).setOrigin(0.5).setScrollFactor(0);
      yOffset += 30;

      // Player rankings
      rankings.forEach((player, index) => {
        const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#ffffff']; // Gold, Silver, Bronze, White
        const rankColor = rankColors[Math.min(index, 3)];
        const totalKills = Object.values(player.enemiesKilled).reduce((s, c) => s + c, 0);
        const timeStr = player.reachedExit ? ScoreManager.formatTime(player.levelEndTime - player.levelStartTime) : '--:--';

        // MVP badges
        const mvpBadges = player.mvpAwards.map(a => ScoreManager.getMvpEmoji(a)).join(' ');

        const rankText = `#${player.rank} ${player.playerName}: ${player.totalScore} pts`;
        const statsText = `${player.eggsCollected} eggs | ${totalKills} kills | ${player.deaths} deaths | ${timeStr}`;

        this.add.text(cx, yOffset, rankText + (mvpBadges ? ' ' + mvpBadges : ''), {
          fontSize: "18px",
          color: rankColor,
          fontStyle: index === 0 ? "bold" : "normal"
        }).setOrigin(0.5).setScrollFactor(0);
        yOffset += 22;

        this.add.text(cx, yOffset, statsText, {
          fontSize: "14px",
          color: "#aaaaaa"
        }).setOrigin(0.5).setScrollFactor(0);
        yOffset += 28;
      });

      // Team totals
      yOffset += 10;
      this.add.text(cx, yOffset, `Team: ${teamStats.totalEggs} eggs | ${teamStats.totalKills} kills | ${ScoreManager.formatTime(teamStats.totalTime)}`, {
        fontSize: "16px",
        color: "#88ff88"
      }).setOrigin(0.5).setScrollFactor(0);
      yOffset += 35;
    } else {
      // Single player stats with difficulty badge and leaderboard
      const player = rankings[0];
      if (player) {
        const totalKills = Object.values(player.enemiesKilled).reduce((s, c) => s + c, 0);
        const timeSeconds = (player.levelEndTime - player.levelStartTime) / 1000;
        const timeStr = ScoreManager.formatTime(player.levelEndTime - player.levelStartTime);

        // Difficulty badge
        const diffSettings = DifficultyManager.getSettings();
        const diffColors: Record<string, string> = {
          easy: '#4CAF50',
          medium: '#FF9800',
          hard: '#f44336'
        };
        const diffColor = diffColors[DifficultyManager.getDifficulty()] || '#888888';

        this.add.text(cx, yOffset, diffSettings.name.toUpperCase(), {
          fontSize: "16px",
          color: diffColor,
          fontStyle: "bold",
          backgroundColor: "#222222",
          padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setScrollFactor(0);
        yOffset += 35;

        this.add.text(cx, yOffset, `Score: ${player.totalScore}`, {
          fontSize: "28px",
          color: "#ffffff"
        }).setOrigin(0.5).setScrollFactor(0);
        yOffset += 40;

        this.add.text(cx, yOffset, `Time: ${timeStr}  |  Eggs: ${player.eggsCollected}  |  Kills: ${totalKills}`, {
          fontSize: "18px",
          color: "#aaaaaa"
        }).setOrigin(0.5).setScrollFactor(0);
        yOffset += 25;

        this.add.text(cx, yOffset, `Deaths: ${player.deaths}  |  Lives: ${player.livesRemaining}`, {
          fontSize: "18px",
          color: "#aaaaaa"
        }).setOrigin(0.5).setScrollFactor(0);
        yOffset += 30;

        // Submit to leaderboard and check ranking
        const playerName = "Player";  // Could add name input later
        const { scoreRank, timeRank } = LeaderboardManager.submitScore(
          this.currentLevel.id,
          playerName,
          player.totalScore,
          timeSeconds
        );

        // Show achievement messages
        if (scoreRank === 1) {
          this.add.text(cx, yOffset, "NEW HIGH SCORE!", {
            fontSize: "20px",
            color: "#ffd700",
            fontStyle: "bold"
          }).setOrigin(0.5).setScrollFactor(0);
          yOffset += 28;
        } else if (scoreRank > 0 && scoreRank <= 3) {
          this.add.text(cx, yOffset, `Top ${scoreRank} Score!`, {
            fontSize: "18px",
            color: "#ffff00"
          }).setOrigin(0.5).setScrollFactor(0);
          yOffset += 28;
        }

        if (timeRank === 1) {
          this.add.text(cx, yOffset, "NEW BEST TIME!", {
            fontSize: "20px",
            color: "#00ffff",
            fontStyle: "bold"
          }).setOrigin(0.5).setScrollFactor(0);
          yOffset += 28;
        } else if (timeRank > 0 && timeRank <= 3) {
          this.add.text(cx, yOffset, `Top ${timeRank} Time!`, {
            fontSize: "18px",
            color: "#88ffff"
          }).setOrigin(0.5).setScrollFactor(0);
          yOffset += 28;
        }

        yOffset += 10;
      }
    }

    // Continue button (if there's a next level)
    if (hasNextLevel) {
      const nextLevelName = LEVELS[nextLevelId - 1]?.name || `Level ${nextLevelId}`;

      // In multiplayer, only host can continue
      if (this.isMultiplayer) {
        if (networkManager.isHost) {
          // Host sees the Continue button
          const continueBtn = this.add.rectangle(cx, yOffset, 280, 50, 0x4CAF50)
            .setScrollFactor(0).setInteractive({ useHandCursor: true });

          this.add.text(cx, yOffset, `Continue to ${nextLevelName}`, {
            fontSize: "20px",
            color: "#ffffff",
            fontStyle: "bold"
          }).setOrigin(0.5).setScrollFactor(0);

          continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x66BB6A));
          continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x4CAF50));
          continueBtn.on('pointerdown', () => {
            if (this.sceneShuttingDown) return;
            this.sceneShuttingDown = true;
            console.log(`[EXIT-SYNC] Host clicked Continue - broadcasting NEXT_LEVEL: ${nextLevelId}`);
            networkManager.sendGameEvent("NEXT_LEVEL", { levelId: nextLevelId });
            this.scene.start("GameScene", {
              levelId: nextLevelId,
              isMultiplayer: true,
            });
          });
          yOffset += 60;
        } else {
          // Non-host sees waiting message
          this.add.text(cx, yOffset, "Waiting for host to continue...", {
            fontSize: "18px",
            color: "#aaaaaa"
          }).setOrigin(0.5).setScrollFactor(0);
          yOffset += 40;
        }
      } else {
        // Single player - normal Continue button
        const continueBtn = this.add.rectangle(cx, yOffset, 280, 50, 0x4CAF50)
          .setScrollFactor(0).setInteractive({ useHandCursor: true });

        this.add.text(cx, yOffset, `Continue to ${nextLevelName}`, {
          fontSize: "20px",
          color: "#ffffff",
          fontStyle: "bold"
        }).setOrigin(0.5).setScrollFactor(0);

        continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x66BB6A));
        continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x4CAF50));
        continueBtn.on('pointerdown', () => {
          if (this.sceneShuttingDown) return;
          this.sceneShuttingDown = true;
          console.log(`[EXIT-SYNC] Single player continue to level ${nextLevelId}`);
          this.scene.start("GameScene", {
            levelId: nextLevelId,
            isMultiplayer: false,
          });
        });
        yOffset += 60;
      }
    }

    // Back to Menu button
    const menuBtn = this.add.rectangle(cx, yOffset, 200, 45, 0x666666)
      .setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.add.text(cx, yOffset, "Back to Menu", {
      fontSize: "18px",
      color: "#ffffff"
    }).setOrigin(0.5).setScrollFactor(0);

    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x888888));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x666666));
    menuBtn.on('pointerdown', () => {
      if (this.sceneShuttingDown) return;
      this.sceneShuttingDown = true;
      console.log(`[EXIT-SYNC] Back to menu clicked`);
      if (this.isMultiplayer) {
        networkManager.disconnect();
      }
      this.scene.start("MenuScene");
    });
  }

  // Training mode completion screen with stars and badges
  private showTrainingComplete() {
    const trainingLevel = this.currentLevel as TrainingLevelData;
    const timeSeconds = (Date.now() - this.trainingStartTime) / 1000;

    // Gather stats for this completion
    const playerData = this.localPlayerStats?.getData();
    const stats: LevelStats = {
      time: timeSeconds,
      eggsCollected: playerData?.eggsCollected ?? 0,
      totalEggs: trainingLevel.totalEggs,
      deaths: this.trainingDeaths,
      enemiesDefeated: this.localPlayerStats?.getTotalEnemyKills() ?? 0,
      comboMax: 0,  // TODO: track combo in future
      doubleJumpsUsed: 0,  // TODO: track double jumps in future
    };

    // Record completion and get results
    const result = TrainingProgress.recordCompletion(this.currentLevel.id, stats);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, 500, 450, 0x000000, 0.92);
    overlay.setScrollFactor(0);
    overlay.setPosition(cx, cy);

    let yOffset = cy - 200;

    // Great Job! header
    this.add.text(cx, yOffset, 'Great Job!', {
      fontSize: '42px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0);
    yOffset += 50;

    // Level name
    this.add.text(cx, yOffset, `${trainingLevel.name} Complete!`, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);
    yOffset += 40;

    // Stars display
    const starsFilled = result.stars;
    let starsText = '';
    for (let i = 0; i < 3; i++) {
      starsText += i < starsFilled ? '★' : '☆';
    }
    this.add.text(cx, yOffset, starsText, {
      fontSize: '48px',
      color: '#FFD700'
    }).setOrigin(0.5).setScrollFactor(0);
    yOffset += 55;

    // Stats
    const timeStr = `${Math.floor(timeSeconds / 60)}:${Math.floor(timeSeconds % 60).toString().padStart(2, '0')}`;
    this.add.text(cx, yOffset, `Time: ${timeStr}  |  Eggs: ${stats.eggsCollected}/${stats.totalEggs}`, {
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setScrollFactor(0);
    yOffset += 25;

    this.add.text(cx, yOffset, `Attempts: ${this.trainingDeaths + 1}`, {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setScrollFactor(0);
    yOffset += 35;

    // Badges earned
    if (result.newBadges.length > 0) {
      this.add.text(cx, yOffset, 'Badges Earned:', {
        fontSize: '18px',
        color: '#88ff88'
      }).setOrigin(0.5).setScrollFactor(0);
      yOffset += 25;

      const badgeText = result.newBadges.map(b => TrainingProgress.getBadgeDisplayName(b)).join('  |  ');
      this.add.text(cx, yOffset, badgeText, {
        fontSize: '16px',
        color: '#ffff88',
        fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0);
      yOffset += 35;
    } else {
      yOffset += 20;
    }

    // Buttons
    const currentIndex = TRAINING_LEVELS.findIndex(l => l.id === this.currentLevel.id);
    const hasNextTraining = currentIndex < TRAINING_LEVELS.length - 1;

    // Next Level button (if there's another training level)
    if (hasNextTraining) {
      const nextLevel = TRAINING_LEVELS[currentIndex + 1];
      const nextBtn = this.add.rectangle(cx, yOffset, 250, 45, 0x9C27B0)
        .setScrollFactor(0).setInteractive({ useHandCursor: true });

      this.add.text(cx, yOffset, `Next: ${nextLevel.name}`, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setScrollFactor(0);

      nextBtn.on('pointerover', () => nextBtn.setFillStyle(0xAB47BC));
      nextBtn.on('pointerout', () => nextBtn.setFillStyle(0x9C27B0));
      nextBtn.on('pointerdown', () => {
        if (this.sceneShuttingDown) return;
        this.sceneShuttingDown = true;
        this.scene.start('GameScene', { levelId: nextLevel.id, isMultiplayer: false });
      });
      yOffset += 55;
    }

    // Replay button
    const replayBtn = this.add.rectangle(cx - 70, yOffset, 120, 40, 0x4CAF50)
      .setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.add.text(cx - 70, yOffset, 'Replay', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);

    replayBtn.on('pointerover', () => replayBtn.setFillStyle(0x66BB6A));
    replayBtn.on('pointerout', () => replayBtn.setFillStyle(0x4CAF50));
    replayBtn.on('pointerdown', () => {
      if (this.sceneShuttingDown) return;
      this.sceneShuttingDown = true;
      this.scene.start('GameScene', { levelId: this.currentLevel.id, isMultiplayer: false });
    });

    // Back button
    const backBtn = this.add.rectangle(cx + 70, yOffset, 120, 40, 0x666666)
      .setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.add.text(cx + 70, yOffset, 'Back', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0);

    backBtn.on('pointerover', () => backBtn.setFillStyle(0x888888));
    backBtn.on('pointerout', () => backBtn.setFillStyle(0x666666));
    backBtn.on('pointerdown', () => {
      if (this.sceneShuttingDown) return;
      this.sceneShuttingDown = true;
      this.scene.start('LevelSelectScene', { isMultiplayer: false });
    });
  }
}
