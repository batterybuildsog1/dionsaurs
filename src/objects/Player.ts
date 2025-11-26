import Phaser from 'phaser';

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
  private hasSpeedBoost: boolean = false;
  private isRemote: boolean = false;

  public playerId: number;
  private nameText: Phaser.GameObjects.Text;
  
  constructor(scene: Phaser.Scene, x: number, y: number, playerId: number = 1) {
    super(scene, x, y, 'player');
    this.playerId = playerId;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false); 
    
    // Visual distinction
    if (this.playerId === 1) {
        this.setTint(0x88ff88); // Green (Default)
    } else {
        this.setTint(0xff8888); // Redish/Pink for P2
    }

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

  initInput() {
    if (this.scene.input.keyboard && !this.isRemote) {
      this.cursors = this.scene.input.keyboard.createCursorKeys(); // Default arrows

      // P1: WASD + Space + J
      if (this.playerId === 1) {
        this.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        }) as any;
        this.jumpKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      } 
      // P2: Arrows + Enter/Shift + K/L
      else {
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

  activatePowerUp(type: 'speed' | 'invincible') {
    if (type === 'speed') {
        this.hasSpeedBoost = true;
        this.moveSpeed = 350; // Boost speed
        this.setTint(0x0000ff); // Visual feedback

        // Reset after 5 seconds
        this.scene.time.delayedCall(5000, () => {
            this.hasSpeedBoost = false;
            this.moveSpeed = 200;
            // Restore original tint
            if (this.playerId === 1) {
                this.setTint(0x88ff88);
            } else {
                this.setTint(0xff8888);
            }
        });
    }
  }

  startAttack() {
    this.isAttacking = true;
    this.anims.play('dino-attack', true);
    
    // Enable hitbox
    // Offset more to the front (48 pixels)
    const offset = this.flipX ? -48 : 48;
    this.attackHitbox.setPosition(this.x + offset, this.y);
    this.attackHitbox.setVisible(true);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(true);

    // Disable hitbox after short duration
    this.scene.time.delayedCall(200, () => {
      this.attackHitbox.setVisible(false);
      (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(false);
    });

    // End attack state
    this.scene.time.delayedCall(400, () => {
      this.isAttacking = false;
      if (this.hasSpeedBoost) {
          this.setTint(0x0000ff);
      } else {
          // Restore original tint
          if (this.playerId === 1) {
              this.setTint(0x88ff88);
          } else {
              this.setTint(0xff8888);
          }
      }
    });
  }

  update() {
    // Ensure body exists
    if (!this.body) return;
    
    if (this.isRemote) {
        // Remote player is controlled via setPosition/play from GameScene networking
        // Just update nametag
        this.nameText.setPosition(this.x, this.y - 25);
        return;
    }

    // Initialize input if not done (hack if called before init)
    if (!this.cursors) this.initInput();

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Attack Input
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) && !this.isAttacking) {
      this.startAttack();
    }

    // Stop movement if attacking (optional, but common for melee)
    if (this.isAttacking) {
        this.setVelocityX(0);
    }

    const speed = this.moveSpeed;
    const jumpSpeed = -400;

    // Horizontal Movement
    // Only allow movement if NOT attacking
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

    // Jump
    // Only allow jump if NOT attacking (or allow it? typically no)
    if (!this.isAttacking && (Phaser.Input.Keyboard.JustDown(this.wasd.up) || Phaser.Input.Keyboard.JustDown(this.jumpKey)) && body.blocked.down) {
      this.setVelocityY(jumpSpeed);
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

    // Update Nametag position
    this.nameText.setPosition(this.x, this.y - 25);
  }
}