import Phaser from 'phaser';
import { PowerUpType, POWERUP_CONFIGS } from './PowerUp';
import { audioManager } from '../services/AudioManager';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private attackKey!: Phaser.Input.Keyboard.Key;
  public isAttacking: boolean = false;
  public attackHitbox: Phaser.GameObjects.Rectangle;

  private moveSpeed: number = 200;
  private baseSpeed: number = 200;
  private boostedSpeed: number = 350;

  // Powerup states
  private hasSpeedBoost: boolean = false;
  public isInvincible: boolean = false;
  public hasShield: boolean = false;
  public hasDoubleJump: boolean = false;
  public hasMagnet: boolean = false;
  private canDoubleJump: boolean = false;
  public magnetRange: number = 150;

  // Visual effects
  private shieldGraphic?: Phaser.GameObjects.Arc;
  private powerupTimers: Map<PowerUpType, Phaser.Time.TimerEvent> = new Map();

  private isRemote: boolean = false;
  private isOnlineMultiplayer: boolean = false;
  private wasAirborne: boolean = false; // Track for land sound

  public playerId: number;
  private nameText: Phaser.GameObjects.Text;
  private playerColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, playerId: number = 1) {
    super(scene, x, y, 'player');
    this.playerId = playerId;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);

    // Visual distinction
    if (this.playerId === 1) {
      this.playerColor = 0x88ff88; // Green (Default)
    } else {
      this.playerColor = 0xff8888; // Redish/Pink for P2
    }
    this.setTint(this.playerColor);

    // Nametag
    this.nameText = scene.add.text(x, y - 20, `P${playerId}`, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088'
    }).setOrigin(0.5);

    // Width: 64 (extended range), Height: 32
    this.attackHitbox = scene.add.rectangle(x, y, 64, 32, 0xff0000, 0.5);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitbox.setVisible(false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(false);
  }

  public disableLocalInput() {
    this.isRemote = true;
  }

  public setOnlineMultiplayer(value: boolean) {
    this.isOnlineMultiplayer = value;
  }

  initInput() {
    if (this.scene.input.keyboard && !this.isRemote) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();

      const usePrimaryControls = this.isOnlineMultiplayer || this.playerId === 1;

      if (usePrimaryControls) {
        this.wasd = this.scene.input.keyboard.addKeys({
          up: Phaser.Input.Keyboard.KeyCodes.W,
          left: Phaser.Input.Keyboard.KeyCodes.A,
          down: Phaser.Input.Keyboard.KeyCodes.S,
          right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as any;
        this.jumpKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      } else {
        this.wasd = {
          up: this.cursors.up as any,
          left: this.cursors.left as any,
          down: this.cursors.down as any,
          right: this.cursors.right as any
        };
        this.jumpKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.attackKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      }
    }
  }

  activatePowerUp(type: PowerUpType) {
    const config = POWERUP_CONFIGS[type];
    const duration = config.duration;

    // Clear existing timer for this powerup type (refresh duration)
    const existingTimer = this.powerupTimers.get(type);
    if (existingTimer) {
      existingTimer.destroy();
    }

    switch (type) {
      case 'speed':
        this.hasSpeedBoost = true;
        this.moveSpeed = this.boostedSpeed;
        this.setTint(0x0000ff);
        break;

      case 'invincible':
        this.isInvincible = true;
        this.setTint(0xffd700);
        // Flashing effect
        this.scene.tweens.add({
          targets: this,
          alpha: 0.5,
          duration: 200,
          yoyo: true,
          repeat: Math.floor(duration / 400)
        });
        break;

      case 'shield':
        this.hasShield = true;
        // Create shield visual
        if (!this.shieldGraphic) {
          this.shieldGraphic = this.scene.add.circle(this.x, this.y, 30, 0x00ffff, 0.3);
          this.shieldGraphic.setStrokeStyle(2, 0x00ffff);
        }
        this.shieldGraphic.setVisible(true);
        break;

      case 'double_jump':
        this.hasDoubleJump = true;
        this.setTint(0xff00ff);
        break;

      case 'magnet':
        this.hasMagnet = true;
        this.setTint(0xff8c00);
        break;
    }

    // Set timer to deactivate
    const timer = this.scene.time.delayedCall(duration, () => {
      this.deactivatePowerUp(type);
    });
    this.powerupTimers.set(type, timer);
  }

  private deactivatePowerUp(type: PowerUpType) {
    switch (type) {
      case 'speed':
        this.hasSpeedBoost = false;
        this.moveSpeed = this.baseSpeed;
        break;

      case 'invincible':
        this.isInvincible = false;
        this.setAlpha(1);
        break;

      case 'shield':
        this.hasShield = false;
        if (this.shieldGraphic) {
          this.shieldGraphic.setVisible(false);
        }
        break;

      case 'double_jump':
        this.hasDoubleJump = false;
        break;

      case 'magnet':
        this.hasMagnet = false;
        break;
    }

    this.powerupTimers.delete(type);
    this.updateTint();
  }

  // Called when shield absorbs a hit
  public useShield(): boolean {
    if (this.hasShield) {
      this.hasShield = false;
      if (this.shieldGraphic) {
        // Shield break effect
        this.scene.tweens.add({
          targets: this.shieldGraphic,
          alpha: 0,
          scale: 2,
          duration: 300,
          onComplete: () => {
            if (this.shieldGraphic) {
              this.shieldGraphic.setVisible(false);
              this.shieldGraphic.setAlpha(0.3);
              this.shieldGraphic.setScale(1);
            }
          }
        });
      }
      // Clear the timer
      const timer = this.powerupTimers.get('shield');
      if (timer) {
        timer.destroy();
        this.powerupTimers.delete('shield');
      }
      return true; // Shield was used
    }
    return false;
  }

  private updateTint() {
    // Priority: invincible > speed > double_jump > magnet > default
    if (this.isInvincible) {
      this.setTint(0xffd700);
    } else if (this.hasSpeedBoost) {
      this.setTint(0x0000ff);
    } else if (this.hasDoubleJump) {
      this.setTint(0xff00ff);
    } else if (this.hasMagnet) {
      this.setTint(0xff8c00);
    } else {
      this.setTint(this.playerColor);
    }
  }

  startAttack() {
    this.isAttacking = true;
    this.anims.play('dino-attack', true);

    const offset = this.flipX ? -48 : 48;
    this.attackHitbox.setPosition(this.x + offset, this.y);
    this.attackHitbox.setVisible(true);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(true);

    this.scene.time.delayedCall(200, () => {
      this.attackHitbox.setVisible(false);
      (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(false);
    });

    this.scene.time.delayedCall(400, () => {
      this.isAttacking = false;
      this.updateTint();
    });
  }

  update() {
    if (!this.body) return;

    if (this.isRemote) {
      this.nameText.setPosition(this.x, this.y - 25);
      return;
    }

    if (!this.cursors) this.initInput();

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Attack Input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && !this.isAttacking) {
      this.startAttack();
    }

    if (this.isAttacking) {
      this.setVelocityX(0);
    }

    const speed = this.moveSpeed;
    const jumpSpeed = -400;

    // Horizontal Movement
    if (!this.isAttacking) {
      if (this.wasd.left.isDown) {
        this.setVelocityX(-speed);
        this.setFlipX(true);
      } else if (this.wasd.right.isDown) {
        this.setVelocityX(speed);
        this.setFlipX(false);
      } else {
        this.setVelocityX(0);
      }
    }

    // Jump with double jump support
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.wasd.up) || Phaser.Input.Keyboard.JustDown(this.jumpKey);

    if (!this.isAttacking && jumpPressed) {
      if (body.blocked.down) {
        // Ground jump
        this.setVelocityY(jumpSpeed);
        audioManager.play('jump');
        // Jump squash effect - stretch horizontally, squash vertically
        this.setScale(1.15, 0.85);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Back.out'
        });
        if (this.hasDoubleJump) {
          this.canDoubleJump = true; // Reset double jump on ground jump
        }
      } else if (this.hasDoubleJump && this.canDoubleJump) {
        // Double jump in mid-air
        this.setVelocityY(jumpSpeed * 0.85); // Slightly weaker
        this.canDoubleJump = false;
        audioManager.play('jump', 0.7); // Quieter for double jump
        // Visual feedback
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.2,
          scaleY: 0.8,
          duration: 100,
          yoyo: true
        });
      }
    }

    // Landing detection - play sound and stretch effect
    if (body.blocked.down && this.wasAirborne) {
      audioManager.play('land', 0.5);
      // Land stretch effect - squash horizontally, stretch vertically
      this.setScale(0.9, 1.1);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Sine.out'
      });
    }
    this.wasAirborne = !body.blocked.down;

    // Reset double jump when landing
    if (body.blocked.down && this.hasDoubleJump) {
      this.canDoubleJump = true;
    }

    // Animation control
    if (this.isAttacking) {
      // Handled in startAttack
    } else if (body.blocked.down) {
      if (this.body?.velocity.x !== 0) {
        this.anims.play('dino-run', true);
      } else {
        this.anims.play('dino-idle', true);
      }
    } else {
      this.anims.play('dino-jump', true);
    }

    // Update nametag position
    this.nameText.setPosition(this.x, this.y - 25);

    // Update shield position
    if (this.shieldGraphic && this.shieldGraphic.visible) {
      this.shieldGraphic.setPosition(this.x, this.y);
    }

    // Update attack hitbox position when attacking
    if (this.isAttacking) {
      const offset = this.flipX ? -48 : 48;
      this.attackHitbox.setPosition(this.x + offset, this.y);
    }
  }

  destroy(fromScene?: boolean) {
    // Clean up timers safely
    if (this.powerupTimers && this.powerupTimers.size > 0) {
      this.powerupTimers.forEach(timer => {
        try {
          timer.destroy();
        } catch {
          // Timer already destroyed
        }
      });
      this.powerupTimers.clear();
    }

    if (this.shieldGraphic) {
      try {
        this.shieldGraphic.destroy();
      } catch {
        // Already destroyed
      }
      this.shieldGraphic = undefined;
    }

    super.destroy(fromScene);
  }
}
