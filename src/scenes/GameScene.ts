import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { Egg } from '../objects/Egg';
import { PowerUp } from '../objects/PowerUp';
import { LEVELS, LevelData } from '../data/levels';
import { networkManager } from '../services/NetworkManager';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private player2?: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.GameObjects.Group;
  private eggs!: Phaser.GameObjects.Group;
  private powerups!: Phaser.GameObjects.Group;
  
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private currentLevel: LevelData;
  
  private isMultiplayer: boolean = false;
  private isHost: boolean = false;

  constructor() {
    super('GameScene');
    this.currentLevel = LEVELS[0]; // Default to level 1
  }

  init(data: { levelId?: number, isMultiplayer?: boolean, isHost?: boolean }) {
    if (data.levelId) {
      this.currentLevel = LEVELS.find(l => l.id === data.levelId) || LEVELS[0];
    }
    this.isMultiplayer = data.isMultiplayer || false;
    this.isHost = data.isHost || false;
  }

  preload() {
    // Assets are preloaded in BootScene or here if needed
    // We assume common assets are loaded. 
    // If levels need specific assets, load them here based on theme.
    this.load.spritesheet('player', 'assets/dino.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy', 'assets/enemy.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('tiles', 'assets/tiles.png', { frameWidth: 32, frameHeight: 32 });

    // Keep programmatically generated textures for simple objects if not replaced
    this.make.graphics({ x: 0, y: 0, add: false })
      .fillStyle(0xffff00)
      .fillCircle(8, 8, 8)
      .generateTexture('egg', 16, 16);
      
    this.make.graphics({ x: 0, y: 0, add: false })
      .fillStyle(0x00ffff)
      .fillRect(0, 0, 32, 64)
      .generateTexture('exit', 32, 64);
      
    this.make.graphics({ x: 0, y: 0, add: false })
      .fillStyle(0xffffff)
      .fillTriangle(0, 32, 16, 0, 32, 32)
      .generateTexture('powerup', 32, 32);
  }

  create() {
    this.createAnimations();
    this.score = 0;

    // 1. Setup World Bounds
    this.physics.world.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);

    // 2. Create Platforms
    this.platforms = this.physics.add.staticGroup();

    // Create Level Platforms
    this.currentLevel.platforms.forEach(p => {
       if (p.type === 'platform') {
           // Simple platform (using tile frame 1)
           this.platforms.create(p.x, p.y, 'tiles', 1).setScale(5, 1).refreshBody();
       } else {
           // Ground or default
           this.platforms.create(p.x, p.y, 'tiles', 0).refreshBody();
       }
    });

    // Fill floor for safety if not defined in level
    for (let x = 0; x < this.currentLevel.width; x += 32) {
        this.platforms.create(x + 16, this.currentLevel.height - 16, 'tiles', 0).refreshBody();
    }

    // 3. Create Players
    // In Multiplayer:
    // - If Host: Player 1 is ME (controlled), Player 2 is PEER (networked).
    // - If Client: Player 2 is ME (controlled), Player 1 is PEER (networked).
    // - If Local Co-op (Single Browser): Player 1 and 2 are both local.
    
    let p1Controlled = true;
    let p2Controlled = true; // Default local co-op
    
    if (this.isMultiplayer) {
        if (this.isHost) {
            p1Controlled = true; // Host controls P1
            p2Controlled = false; // P2 is remote
        } else {
            p1Controlled = false; // P1 is remote
            p2Controlled = true; // Client controls P2
        }
    }

    this.player = new Player(this, 100, this.currentLevel.height - 150, 1); // P1
    this.player.setCollideWorldBounds(true);
    // We need to disable local input if remote
    if (!p1Controlled) {
        this.player.disableLocalInput(); // Need to add this method
    }
    
    // Always create P2 if multiplayer or local co-op
    if (this.isMultiplayer || true) { // Assuming default local co-op enabled if not online
        this.player2 = new Player(this, 150, this.currentLevel.height - 150, 2); // P2
        this.player2.setCollideWorldBounds(true);
        this.player2.setTint(0xaaffaa);
        
        if (!p2Controlled && this.isMultiplayer) {
            this.player2.disableLocalInput();
        }
    }

    // 4. Create Enemies
    this.enemies = this.add.group({
        classType: Enemy,
        runChildUpdate: true
    });

    this.currentLevel.enemies.forEach(e => {
        const enemy = new Enemy(this, e.x, e.y, e.range);
        this.enemies.add(enemy);
    });

    // 5. Create Collectibles (Eggs)
    this.eggs = this.add.group({
        classType: Egg,
        runChildUpdate: false
    });
    
    this.currentLevel.eggs.forEach(egg => {
        this.eggs.add(new Egg(this, egg.x, egg.y));
    });
    
    // 6. Create PowerUps
    this.powerups = this.add.group({
        classType: PowerUp,
        runChildUpdate: false
    });
    
    this.currentLevel.powerups.forEach(p => {
        this.powerups.add(new PowerUp(this, p.x, p.y, p.type));
    });

    // 7. Colliders
    this.physics.add.collider(this.player, this.platforms);
    if (this.player2) this.physics.add.collider(this.player2, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    
    // Overlaps
    this.physics.add.overlap(this.player.attackHitbox, this.enemies, this.handleAttackEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.eggs, this.collectEgg, undefined, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerUp, undefined, this);

    if (this.player2) {
        this.physics.add.overlap(this.player2.attackHitbox, this.enemies, this.handleAttackEnemy, undefined, this);
        this.physics.add.overlap(this.player2, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.overlap(this.player2, this.eggs, this.collectEgg, undefined, this);
        this.physics.add.overlap(this.player2, this.powerups, this.collectPowerUp, undefined, this);
    }
    
    // Exit
    const exit = this.physics.add.staticImage(this.currentLevel.exit.x, this.currentLevel.exit.y, 'exit');
    this.physics.add.overlap(this.player, exit, this.reachExit, undefined, this);
    if (this.player2) this.physics.add.overlap(this.player2, exit, this.reachExit, undefined, this);
    
    // 8. Camera
    this.cameras.main.setBounds(0, 0, this.currentLevel.width, this.currentLevel.height);
    // Follow the "local" player
    if (this.isMultiplayer && !this.isHost && this.player2) {
        this.cameras.main.startFollow(this.player2, true, 0.08, 0.08);
    } else {
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    }

    // UI
    this.scoreText = this.add.text(16, 48, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff'
    }).setScrollFactor(0);

    this.add.text(16, 16, `Level ${this.currentLevel.id}: ${this.currentLevel.name}`, {
      fontSize: '18px',
      color: '#ffff00',
      backgroundColor: '#000000'
    }).setScrollFactor(0);
    
    // Theme adjustments
    if (this.currentLevel.theme === 'ice') {
        this.cameras.main.setBackgroundColor('#e0f7fa'); // Light blue
    } else if (this.currentLevel.theme === 'space') {
        this.cameras.main.setBackgroundColor('#0d001a'); // Dark purple
        // Add simple stars
        for(let i=0; i<100; i++) {
            this.add.circle(Math.random() * this.currentLevel.width, Math.random() * this.currentLevel.height, 1, 0xffffff);
        }
    } else {
        this.cameras.main.setBackgroundColor('#000000');
    }

    // Network Events
    if (this.isMultiplayer) {
        networkManager.onDataReceived = (data) => {
            if (data.type === 'PLAYER_UPDATE') {
                const targetPlayer = this.isHost ? this.player2 : this.player;
                if (targetPlayer) {
                    targetPlayer.setPosition(data.x, data.y);
                    targetPlayer.setFlipX(data.flipX);
                    if (data.anim) {
                        targetPlayer.play(data.anim, true);
                    }
                }
            }
        };
    }
  }

  private createAnimations() {
    if (this.anims.exists('dino-idle')) return; // Already created

    // Dino Anims
    this.anims.create({
        key: 'dino-idle',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'dino-run',
        frames: this.anims.generateFrameNumbers('player', { start: 1, end: 2 }),
        frameRate: 8,
        repeat: -1
    });
    this.anims.create({
        key: 'dino-jump',
        frames: this.anims.generateFrameNumbers('player', { start: 3, end: 3 }),
        frameRate: 1,
        repeat: -1
    });
    this.anims.create({
        key: 'dino-attack',
        frames: this.anims.generateFrameNumbers('player', { start: 4, end: 4 }),
        frameRate: 10,
        repeat: 0
    });
    
    // Enemy Anims
    this.anims.create({
        key: 'enemy-walk',
        frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1
    });
  }

  update() {
    this.player.update();
    if (this.player2) this.player2.update();
    
    // Multiplayer Sync (Send my position)
    if (this.isMultiplayer) {
        const myPlayer = this.isHost ? this.player : this.player2;
        if (myPlayer) {
            networkManager.send({
                type: 'PLAYER_UPDATE',
                x: myPlayer.x,
                y: myPlayer.y,
                flipX: myPlayer.flipX,
                anim: myPlayer.anims.currentAnim?.key
            });
        }
    }

    // Simple restart if falls out of world
    const floorY = this.currentLevel.height;
    if (this.player.y > floorY || (this.player2 && this.player2.y > floorY)) {
        this.scene.restart();
    }
  }

  private handleAttackEnemy(hitbox: any, enemy: any) {
    if ((enemy as Enemy).active) {
        (enemy as Enemy).destroy();
        this.score += 20;
        this.scoreText.setText('Score: ' + this.score);
    }
  }

  private handlePlayerEnemyCollision(player: any, enemy: any) {
    // console.log('Player hit!');
    this.scene.restart();
  }
  
  private collectEgg(player: any, egg: any) {
    (egg as Egg).destroy();
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
  }
  
  private collectPowerUp(player: any, powerup: any) {
    const p = powerup as PowerUp;
    const pl = player as Player;
    pl.activatePowerUp(p.type);
    p.destroy();
  }
  
  private reachExit(player: any, exit: any) {
      this.physics.pause();
      
      // Unlock next level
      const nextLevel = this.currentLevel.id + 1;
      const currentUnlocked = parseInt(localStorage.getItem('dino_unlocked_level') || '1', 10);
      if (nextLevel > currentUnlocked) {
          localStorage.setItem('dino_unlocked_level', nextLevel.toString());
      }

      this.add.text(this.cameras.main.width / 2 + this.cameras.main.scrollX, this.cameras.main.height / 2, 'LEVEL COMPLETE\nScore: ' + this.score, {
          fontSize: '48px',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#000000'
      }).setOrigin(0.5);
      
      this.time.delayedCall(3000, () => {
          this.scene.start('LevelSelectScene', { isMultiplayer: this.isMultiplayer, isHost: this.isHost });
      });
  }
}