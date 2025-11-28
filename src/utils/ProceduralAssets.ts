/**
 * ProceduralAssets - Enhanced procedural sprite generation
 * Creates pixel-art style game graphics using Phaser's graphics API
 */

export class ProceduralAssets {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Generate all game assets
   */
  generateAll() {
    this.generatePlayer();
    this.generateEnemy();
    this.generateEnemyFast();
    this.generateEnemyTank();
    this.generateEnemyFlying();
    this.generateEnemyShooter();
    this.generateEnemyRaptor();
    this.generateEnemyTrex();
    this.generateTiles();
    this.generateEgg();
    this.generateExit();
    this.generatePowerUp();
    this.generateCheckpoint();
    this.generateLife();
    this.generateProjectile();
  }

  /**
   * Player sprite sheet - Jurassic Park T-Rex
   * 12 frames: idle(0), run1-6(1-6), jump(7), fall(8), attack1-2(9-10), hurt(11)
   */
  private generatePlayer() {
    const frameWidth = 32;
    const frameHeight = 32;
    const numFrames = 12;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawDino(g, offsetX, 0, frame);
    }

    g.generateTexture('player', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames to the texture
    const texture = this.scene.textures.get('player');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawDino(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    // === JURASSIC PARK STYLE T-REX ===
    // Color palette: Dark browns and olive greens with mottled texture

    // JP T-Rex Color Palette
    const colors = {
      // Primary body colors
      darkBrown: 0x3a2a1a,      // Deepest shadows
      baseBrown: 0x4a3828,      // Main body color
      midBrown: 0x5a4838,       // Mid-tones
      lightBrown: 0x6a5848,     // Highlights

      // Olive/green undertones (JP signature)
      darkOlive: 0x3a4030,      // Shadow areas with green
      baseOlive: 0x4a5040,      // Body undertone

      // Belly/underside (lighter, slightly tan)
      bellyDark: 0x6a5a48,      // Belly shadow
      bellyLight: 0x8a7a68,     // Belly highlight
      bellyTan: 0x9a8a78,       // Lightest belly

      // Details
      clawColor: 0x2a2018,      // Dark claws
      eyeYellow: 0xffcc44,      // Reptilian eye
      eyePupil: 0x1a1008,       // Slit pupil
      mouthRed: 0x8a2020,       // Mouth interior
      teethWhite: 0xf0e8d8,     // Slightly off-white teeth
    };

    // Animation variables for smooth movement
    let bodyY = 0;        // Vertical body bounce
    let legOffset = 0;    // Front/back leg phase (-3 to +3)
    let mouthOpen = false;
    let tailWag = 0;      // Tail counter-balance
    let headBob = 0;      // Head vertical movement

    // Frame layout: 0=idle, 1-6=run cycle, 7=jump, 8=fall, 9-10=attack, 11=hurt
    switch (frame) {
      case 0: // Idle - relaxed stance
        break;

      // === 6-FRAME RUN CYCLE (realistic dinosaur gait) ===
      // Bipedal dinosaur run: alternating leg phases with body bounce
      case 1: // Run frame 1 - Right leg contact, body down
        legOffset = 4;     // Right leg forward
        bodyY = 1;         // Body drops on contact
        tailWag = -2;      // Tail counters momentum
        headBob = 1;       // Head drops slightly
        break;
      case 2: // Run frame 2 - Right leg push, body rising
        legOffset = 2;     // Right leg pushing back
        bodyY = 0;         // Body neutral
        tailWag = -1;      // Tail transitioning
        headBob = 0;
        break;
      case 3: // Run frame 3 - Flight phase (both legs off ground briefly)
        legOffset = 0;     // Legs passing
        bodyY = -1;        // Body at highest point
        tailWag = 0;       // Tail straight
        headBob = -1;      // Head lifts
        break;
      case 4: // Run frame 4 - Left leg contact, body down
        legOffset = -4;    // Left leg forward
        bodyY = 1;         // Body drops on contact
        tailWag = 2;       // Tail counters other direction
        headBob = 1;       // Head drops
        break;
      case 5: // Run frame 5 - Left leg push, body rising
        legOffset = -2;    // Left leg pushing back
        bodyY = 0;         // Body neutral
        tailWag = 1;       // Tail transitioning
        headBob = 0;
        break;
      case 6: // Run frame 6 - Flight phase (completing cycle)
        legOffset = 0;     // Legs passing
        bodyY = -1;        // Body at highest point
        tailWag = 0;       // Tail straight
        headBob = -1;      // Head lifts
        break;

      case 7: // Jump - ascending, legs tucked
        bodyY = -2;
        legOffset = -3;    // Legs pulled up
        tailWag = -2;      // Tail trails behind
        headBob = -1;      // Looking up
        break;

      case 8: // Fall - descending, legs extended for landing
        bodyY = 0;
        legOffset = 2;     // Legs extending down
        tailWag = 2;       // Tail up for balance
        headBob = 1;       // Looking down at landing
        break;

      case 9: // Attack 1 - mouth opens, lunging
        mouthOpen = true;
        bodyY = -1;
        headBob = -1;      // Head thrust forward
        tailWag = -2;      // Tail back for balance
        break;

      case 10: // Attack 2 - full bite
        mouthOpen = true;
        legOffset = 2;
        bodyY = 1;         // Body committed to bite
        headBob = 1;       // Head snapping down
        tailWag = 2;       // Tail swings
        break;

      case 11: // Hurt - recoiling
        bodyY = 2;
        legOffset = -1;
        tailWag = 3;       // Tail whips from impact
        headBob = 2;       // Head knocked back
        break;
    }

    // === TAIL (drawn first, behind everything) ===
    // Thick, powerful tail for balance - JP T-Rex signature
    // Tail shadow/base
    g.fillStyle(colors.darkBrown);
    g.beginPath();
    g.moveTo(x + 0, y + 16 + bodyY + tailWag);
    g.lineTo(x + 12, y + 10 + bodyY);
    g.lineTo(x + 14, y + 18 + bodyY);
    g.lineTo(x + 2, y + 22 + bodyY + tailWag);
    g.closePath();
    g.fillPath();

    // Tail main
    g.fillStyle(colors.baseBrown);
    g.beginPath();
    g.moveTo(x + 1, y + 15 + bodyY + tailWag);
    g.lineTo(x + 12, y + 11 + bodyY);
    g.lineTo(x + 13, y + 16 + bodyY);
    g.lineTo(x + 2, y + 20 + bodyY + tailWag);
    g.closePath();
    g.fillPath();

    // Tail highlight stripe (JP mottled look)
    g.fillStyle(colors.midBrown);
    g.beginPath();
    g.moveTo(x + 3, y + 14 + bodyY + tailWag);
    g.lineTo(x + 10, y + 12 + bodyY);
    g.lineTo(x + 10, y + 14 + bodyY);
    g.lineTo(x + 4, y + 16 + bodyY + tailWag);
    g.closePath();
    g.fillPath();

    // === BACK LEG (powerful, muscular) ===
    // Thigh shadow
    g.fillStyle(colors.darkBrown);
    g.fillEllipse(x + 13, y + 18 + bodyY, 6, 5);

    // Thigh main
    g.fillStyle(colors.baseBrown);
    g.fillEllipse(x + 13, y + 17 + bodyY, 5, 4);

    // Lower leg (shin)
    g.fillStyle(colors.darkBrown);
    g.fillRect(x + 10, y + 20 + bodyY, 5, 8 - legOffset);

    g.fillStyle(colors.baseBrown);
    g.fillRect(x + 11, y + 20 + bodyY, 3, 7 - legOffset);

    // Back foot with claws
    g.fillStyle(colors.darkBrown);
    g.beginPath();
    g.moveTo(x + 8, y + 27 + bodyY - legOffset);
    g.lineTo(x + 18, y + 27 + bodyY - legOffset);
    g.lineTo(x + 19, y + 30 + bodyY - legOffset);
    g.lineTo(x + 15, y + 29 + bodyY - legOffset);
    g.lineTo(x + 12, y + 31 + bodyY - legOffset);
    g.lineTo(x + 9, y + 29 + bodyY - legOffset);
    g.lineTo(x + 7, y + 30 + bodyY - legOffset);
    g.closePath();
    g.fillPath();

    // Claws
    g.fillStyle(colors.clawColor);
    g.fillTriangle(x + 7, y + 29 + bodyY - legOffset, x + 5, y + 31 + bodyY - legOffset, x + 9, y + 30 + bodyY - legOffset);
    g.fillTriangle(x + 12, y + 29 + bodyY - legOffset, x + 12, y + 32 + bodyY - legOffset, x + 14, y + 30 + bodyY - legOffset);
    g.fillTriangle(x + 17, y + 29 + bodyY - legOffset, x + 19, y + 31 + bodyY - legOffset, x + 18, y + 30 + bodyY - legOffset);

    // === BODY (massive, barrel-shaped) ===
    // Body shadow layer
    g.fillStyle(colors.darkBrown);
    g.fillEllipse(x + 16, y + 14 + bodyY, 11, 10);

    // Main body
    g.fillStyle(colors.baseBrown);
    g.fillEllipse(x + 16, y + 13 + bodyY, 10, 9);

    // Body highlight (top)
    g.fillStyle(colors.midBrown);
    g.fillEllipse(x + 15, y + 11 + bodyY, 7, 5);

    // Belly area (lighter underside - JP characteristic)
    g.fillStyle(colors.bellyDark);
    g.fillEllipse(x + 17, y + 16 + bodyY, 7, 5);

    g.fillStyle(colors.bellyLight);
    g.fillEllipse(x + 17, y + 16 + bodyY, 5, 3);

    // Mottled texture spots (JP skin pattern)
    g.fillStyle(colors.darkOlive);
    g.fillCircle(x + 12, y + 12 + bodyY, 1.5);
    g.fillCircle(x + 18, y + 10 + bodyY, 1);
    g.fillCircle(x + 14, y + 15 + bodyY, 1);

    // === FRONT LEG ===
    // Thigh
    g.fillStyle(colors.darkBrown);
    g.fillEllipse(x + 19, y + 18 + bodyY, 5, 4);

    g.fillStyle(colors.baseBrown);
    g.fillEllipse(x + 19, y + 17 + bodyY, 4, 3);

    // Lower leg
    g.fillStyle(colors.darkBrown);
    g.fillRect(x + 17, y + 20 + bodyY, 5, 8 + legOffset);

    g.fillStyle(colors.baseBrown);
    g.fillRect(x + 18, y + 20 + bodyY, 3, 7 + legOffset);

    // Front foot with claws
    g.fillStyle(colors.darkBrown);
    g.beginPath();
    g.moveTo(x + 15, y + 27 + bodyY + legOffset);
    g.lineTo(x + 25, y + 27 + bodyY + legOffset);
    g.lineTo(x + 26, y + 30 + bodyY + legOffset);
    g.lineTo(x + 22, y + 29 + bodyY + legOffset);
    g.lineTo(x + 19, y + 31 + bodyY + legOffset);
    g.lineTo(x + 16, y + 29 + bodyY + legOffset);
    g.lineTo(x + 14, y + 30 + bodyY + legOffset);
    g.closePath();
    g.fillPath();

    // Front claws
    g.fillStyle(colors.clawColor);
    g.fillTriangle(x + 14, y + 29 + bodyY + legOffset, x + 12, y + 31 + bodyY + legOffset, x + 16, y + 30 + bodyY + legOffset);
    g.fillTriangle(x + 19, y + 29 + bodyY + legOffset, x + 19, y + 32 + bodyY + legOffset, x + 21, y + 30 + bodyY + legOffset);
    g.fillTriangle(x + 24, y + 29 + bodyY + legOffset, x + 26, y + 31 + bodyY + legOffset, x + 25, y + 30 + bodyY + legOffset);

    // === HEAD (massive JP T-Rex head - the iconic feature) ===
    // Head Y includes both body bounce and head bob for secondary motion
    const headY = bodyY + headBob;

    // Skull base/shadow
    g.fillStyle(colors.darkBrown);
    g.fillEllipse(x + 25, y + 8 + headY, 9, 8);

    // Main skull
    g.fillStyle(colors.baseBrown);
    g.fillEllipse(x + 25, y + 7 + headY, 8, 7);

    // Brow ridge (JP T-Rex has prominent brow)
    g.fillStyle(colors.midBrown);
    g.fillEllipse(x + 24, y + 5 + headY, 5, 3);

    // Snout - long and powerful
    g.fillStyle(colors.darkBrown);
    g.fillEllipse(x + 29, y + 10 + headY, 5, 4);

    g.fillStyle(colors.baseBrown);
    g.fillEllipse(x + 29, y + 9 + headY, 4, 3);

    // Lower jaw (massive)
    g.fillStyle(colors.darkBrown);
    g.fillEllipse(x + 28, y + 13 + headY, 4, 2);

    g.fillStyle(colors.midBrown);
    g.fillEllipse(x + 28, y + 12 + headY, 3, 1.5);

    // Mouth and teeth
    if (mouthOpen) {
      // Open mouth interior
      g.fillStyle(colors.mouthRed);
      g.fillEllipse(x + 29, y + 11 + headY, 3, 3);

      // Iconic T-Rex teeth
      g.fillStyle(colors.teethWhite);
      // Top teeth
      g.fillTriangle(x + 27, y + 9 + headY, x + 27.5, y + 12 + headY, x + 28, y + 9 + headY);
      g.fillTriangle(x + 29, y + 9 + headY, x + 29.5, y + 13 + headY, x + 30, y + 9 + headY);
      g.fillTriangle(x + 31, y + 9 + headY, x + 31.5, y + 12 + headY, x + 32, y + 9 + headY);
      // Bottom teeth
      g.fillTriangle(x + 28, y + 14 + headY, x + 28.5, y + 11 + headY, x + 29, y + 14 + headY);
      g.fillTriangle(x + 30, y + 14 + headY, x + 30.5, y + 12 + headY, x + 31, y + 14 + headY);
    } else {
      // Closed mouth with visible teeth line (JP style - always looks menacing)
      g.lineStyle(1, colors.darkBrown);
      g.lineBetween(x + 25, y + 11 + headY, x + 32, y + 11 + headY);
      // Hint of teeth even when closed
      g.fillStyle(colors.teethWhite);
      g.fillTriangle(x + 29, y + 10 + headY, x + 29.5, y + 12 + headY, x + 30, y + 10 + headY);
    }

    // Eye - reptilian yellow with slit pupil (JP signature)
    // Eye socket shadow
    g.fillStyle(colors.darkBrown);
    g.fillCircle(x + 24, y + 6 + headY, 3);

    // Eye
    g.fillStyle(colors.eyeYellow);
    g.fillCircle(x + 24, y + 6 + headY, 2.5);

    // Vertical slit pupil (reptilian)
    g.fillStyle(colors.eyePupil);
    g.fillEllipse(x + 24.5, y + 6 + headY, 1, 2);

    // Eye highlight
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(x + 23, y + 5 + headY, 0.8);

    // Nostril
    g.fillStyle(colors.darkBrown);
    g.fillCircle(x + 31, y + 8 + headY, 0.8);

    // === TINY T-REX ARMS (comically small - JP accurate) ===
    // Upper arm
    g.fillStyle(colors.darkBrown);
    g.fillRect(x + 21, y + 10 + bodyY, 3, 4);

    g.fillStyle(colors.baseBrown);
    g.fillRect(x + 21, y + 10 + bodyY, 2, 3);

    // Lower arm with tiny claws
    g.fillStyle(colors.darkBrown);
    g.fillRect(x + 21, y + 13 + bodyY, 2, 3);

    // Tiny claws
    g.fillStyle(colors.clawColor);
    g.fillCircle(x + 21, y + 16 + bodyY, 0.8);
    g.fillCircle(x + 22.5, y + 16 + bodyY, 0.8);

    // === BACK RIDGE (subtle bumps, not spikes - JP style) ===
    g.fillStyle(colors.darkOlive);
    g.fillCircle(x + 10, y + 9 + bodyY, 1.5);
    g.fillCircle(x + 13, y + 7 + bodyY, 2);
    g.fillCircle(x + 17, y + 6 + bodyY, 2);
    g.fillCircle(x + 21, y + 5 + bodyY, 1.5);
  }

  /**
   * Enemy sprite sheet - 4 frames per type (idle, walk1, walk2, hurt)
   */
  private generateEnemy() {
    const frameWidth = 32;
    const frameHeight = 32;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    // Draw 4 walking frames
    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawSlime(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames to the texture
    const texture = this.scene.textures.get('enemy');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawSlime(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let squash = 0;
    let eyeY = 0;

    switch (frame) {
      case 0: // Idle
        break;
      case 1: // Walk 1
        squash = 2;
        eyeY = 1;
        break;
      case 2: // Walk 2
        squash = -1;
        eyeY = -1;
        break;
      case 3: // Hurt
        squash = 3;
        break;
    }

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 16, y + 28, 18 + squash, 4);

    // Body outline
    g.fillStyle(0x991b1b);
    g.fillEllipse(x + 16, y + 18 + squash, 22 - squash, 20 - squash);

    // Main body - red slime
    g.fillStyle(0xef4444);
    g.fillEllipse(x + 16, y + 17 + squash, 20 - squash, 18 - squash);

    // Body highlight
    g.fillStyle(0xfca5a5);
    g.fillEllipse(x + 12, y + 14 + squash, 8, 6);

    // Angry eyes - white base
    g.fillStyle(0xffffff);
    g.fillEllipse(x + 11, y + 14 + eyeY, 5, 6);
    g.fillEllipse(x + 21, y + 14 + eyeY, 5, 6);

    // Angry eyebrows
    g.fillStyle(0x7f1d1d);
    g.lineStyle(2, 0x7f1d1d);
    g.lineBetween(x + 7, y + 10 + eyeY, x + 14, y + 12 + eyeY);
    g.lineBetween(x + 18, y + 12 + eyeY, x + 25, y + 10 + eyeY);

    // Pupils
    g.fillStyle(0x000000);
    g.fillCircle(x + 12, y + 15 + eyeY, 2);
    g.fillCircle(x + 22, y + 15 + eyeY, 2);

    // Mouth - angry
    g.lineStyle(2, 0x7f1d1d);
    if (frame === 3) {
      // Hurt expression
      g.lineBetween(x + 12, y + 24, x + 20, y + 22);
    } else {
      g.lineBetween(x + 12, y + 22, x + 20, y + 22);
    }
  }

  /**
   * Fast enemy - yellow bat/wasp creature
   */
  private generateEnemyFast() {
    const frameWidth = 32;
    const frameHeight = 32;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawBat(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy-fast', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames
    const texture = this.scene.textures.get('enemy-fast');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawBat(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let wingUp = frame % 2 === 0;
    let eyeY = frame === 3 ? 2 : 0;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 16, y + 28, 12, 3);

    // Body outline
    g.fillStyle(0xb8860b);
    g.fillEllipse(x + 16, y + 16, 10, 8);

    // Body - yellow
    g.fillStyle(0xffd700);
    g.fillEllipse(x + 16, y + 16, 8, 7);

    // Wings
    g.fillStyle(0xffec8b);
    if (wingUp) {
      g.fillTriangle(x + 8, y + 14, x + 2, y + 4, x + 14, y + 14);
      g.fillTriangle(x + 18, y + 14, x + 30, y + 4, x + 24, y + 14);
    } else {
      g.fillTriangle(x + 8, y + 14, x + 2, y + 20, x + 14, y + 14);
      g.fillTriangle(x + 18, y + 14, x + 30, y + 20, x + 24, y + 14);
    }

    // Wing detail
    g.lineStyle(1, 0xb8860b);
    if (wingUp) {
      g.lineBetween(x + 4, y + 6, x + 10, y + 14);
      g.lineBetween(x + 28, y + 6, x + 22, y + 14);
    }

    // Angry eyes
    g.fillStyle(0xffffff);
    g.fillCircle(x + 13, y + 14 + eyeY, 3);
    g.fillCircle(x + 19, y + 14 + eyeY, 3);

    // Pupils
    g.fillStyle(0x000000);
    g.fillCircle(x + 14, y + 14 + eyeY, 1.5);
    g.fillCircle(x + 20, y + 14 + eyeY, 1.5);

    // Angry eyebrows
    g.lineStyle(1.5, 0x8b4513);
    g.lineBetween(x + 10, y + 10 + eyeY, x + 15, y + 12 + eyeY);
    g.lineBetween(x + 17, y + 12 + eyeY, x + 22, y + 10 + eyeY);

    // Stinger
    g.fillStyle(0x8b4513);
    g.fillTriangle(x + 16, y + 20, x + 14, y + 24, x + 18, y + 24);
  }

  /**
   * Tank enemy - armored beetle/turtle
   */
  private generateEnemyTank() {
    const frameWidth = 32;
    const frameHeight = 32;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawTank(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy-tank', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames
    const texture = this.scene.textures.get('enemy-tank');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawTank(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let legOffset = frame === 1 ? 2 : frame === 2 ? -2 : 0;
    let cracked = frame === 3;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 16, y + 30, 22, 4);

    // Shell back (darker brown)
    g.fillStyle(0x5c4033);
    g.fillEllipse(x + 16, y + 14, 14, 12);

    // Main shell - brown
    g.fillStyle(0x8b4513);
    g.fillEllipse(x + 16, y + 12, 13, 11);

    // Shell pattern
    g.fillStyle(0xa0522d);
    g.fillEllipse(x + 16, y + 10, 8, 6);
    g.fillEllipse(x + 10, y + 14, 4, 4);
    g.fillEllipse(x + 22, y + 14, 4, 4);

    // Shell highlight
    g.fillStyle(0xcd853f);
    g.fillEllipse(x + 14, y + 8, 4, 3);

    // Crack effect when hurt
    if (cracked) {
      g.lineStyle(2, 0x3d2817);
      g.lineBetween(x + 12, y + 6, x + 18, y + 14);
      g.lineBetween(x + 16, y + 10, x + 20, y + 8);
    }

    // Head
    g.fillStyle(0x654321);
    g.fillCircle(x + 24, y + 16, 5);

    // Eyes
    g.fillStyle(0xffffff);
    g.fillCircle(x + 26, y + 14, 2);
    g.fillStyle(0x000000);
    g.fillCircle(x + 27, y + 14, 1);

    // Legs
    g.fillStyle(0x654321);
    g.fillRect(x + 8, y + 20, 4, 8 + legOffset);
    g.fillRect(x + 14, y + 20, 4, 8 - legOffset);
    g.fillRect(x + 20, y + 20, 4, 8 + legOffset);

    // Feet
    g.fillStyle(0x3d2817);
    g.fillCircle(x + 10, y + 28 + legOffset, 3);
    g.fillCircle(x + 16, y + 28 - legOffset, 3);
    g.fillCircle(x + 22, y + 28 + legOffset, 3);
  }

  /**
   * Flying enemy - purple ghost/phantom
   */
  private generateEnemyFlying() {
    const frameWidth = 32;
    const frameHeight = 32;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawGhost(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy-flying', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames
    const texture = this.scene.textures.get('enemy-flying');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawGhost(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let floatY = frame === 1 ? -2 : frame === 2 ? 2 : 0;
    let tailWave = frame % 2 === 0 ? -2 : 2;
    let alpha = frame === 3 ? 0.5 : 0.8;

    // Glow
    g.fillStyle(0x9400D3, 0.2);
    g.fillCircle(x + 16, y + 14 + floatY, 14);

    // Main body
    g.fillStyle(0x9400D3, alpha);
    g.fillCircle(x + 16, y + 12 + floatY, 10);

    // Lower body/tail
    g.fillStyle(0x9400D3, alpha);
    g.beginPath();
    g.moveTo(x + 6, y + 14 + floatY);
    g.lineTo(x + 8 + tailWave, y + 28 + floatY);
    g.lineTo(x + 12, y + 24 + floatY);
    g.lineTo(x + 16, y + 30 + floatY);
    g.lineTo(x + 20, y + 24 + floatY);
    g.lineTo(x + 24 - tailWave, y + 28 + floatY);
    g.lineTo(x + 26, y + 14 + floatY);
    g.closePath();
    g.fillPath();

    // Lighter inner
    g.fillStyle(0xba55d3, alpha);
    g.fillCircle(x + 16, y + 10 + floatY, 6);

    // Glowing eyes
    g.fillStyle(0xffffff);
    g.fillCircle(x + 12, y + 10 + floatY, 4);
    g.fillCircle(x + 20, y + 10 + floatY, 4);

    // Eye glow
    g.fillStyle(0x00ffff);
    g.fillCircle(x + 12, y + 10 + floatY, 2.5);
    g.fillCircle(x + 20, y + 10 + floatY, 2.5);

    // Pupils
    g.fillStyle(0x000000);
    g.fillCircle(x + 13, y + 10 + floatY, 1);
    g.fillCircle(x + 21, y + 10 + floatY, 1);
  }

  /**
   * Shooter enemy - green plant/cactus creature
   */
  private generateEnemyShooter() {
    const frameWidth = 32;
    const frameHeight = 32;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawShooter(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy-shooter', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames
    const texture = this.scene.textures.get('enemy-shooter');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawShooter(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let mouthOpen = frame === 1 || frame === 2;
    let charging = frame === 1;
    let shooting = frame === 2;
    let hurt = frame === 3;
    let bodyY = hurt ? 2 : 0;

    // Pot/base shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 16, y + 30, 14, 4);

    // Pot
    g.fillStyle(0x8b4513);
    g.fillRect(x + 8, y + 22 + bodyY, 16, 10);
    g.fillStyle(0xa0522d);
    g.fillRect(x + 6, y + 20 + bodyY, 20, 4);

    // Pot rim highlight
    g.fillStyle(0xcd853f);
    g.fillRect(x + 6, y + 20 + bodyY, 20, 2);

    // Main plant body
    g.fillStyle(0x228b22);
    g.fillEllipse(x + 16, y + 14 + bodyY, 10, 10);

    // Lighter body center
    g.fillStyle(0x32cd32);
    g.fillEllipse(x + 16, y + 12 + bodyY, 6, 6);

    // Mouth (trap opening)
    if (mouthOpen) {
      g.fillStyle(0x006400);
      g.fillEllipse(x + 16, y + 8 + bodyY, 8, 5);

      // Inner mouth
      g.fillStyle(0xff1744);
      g.fillEllipse(x + 16, y + 8 + bodyY, 5, 3);

      // Charging glow
      if (charging) {
        g.fillStyle(0x00ff00, 0.5);
        g.fillCircle(x + 16, y + 8 + bodyY, 4);
      }

      // Shooting projectile leaving
      if (shooting) {
        g.fillStyle(0x00ff00);
        g.fillCircle(x + 24, y + 8 + bodyY, 4);
        g.fillStyle(0x88ff88);
        g.fillCircle(x + 24, y + 8 + bodyY, 2);
      }
    } else {
      // Closed mouth line
      g.lineStyle(2, 0x006400);
      g.lineBetween(x + 10, y + 8 + bodyY, x + 22, y + 8 + bodyY);
    }

    // Eyes
    g.fillStyle(0xffffff);
    g.fillCircle(x + 12, y + 12 + bodyY, 3);
    g.fillCircle(x + 20, y + 12 + bodyY, 3);

    // Pupils (looking in shoot direction)
    g.fillStyle(0x000000);
    const pupilOffset = shooting ? 1 : 0;
    g.fillCircle(x + 13 + pupilOffset, y + 12 + bodyY, 1.5);
    g.fillCircle(x + 21 + pupilOffset, y + 12 + bodyY, 1.5);

    // Leaf decorations
    g.fillStyle(0x228b22);
    g.fillTriangle(x + 6, y + 14 + bodyY, x + 2, y + 10 + bodyY, x + 10, y + 16 + bodyY);
    g.fillTriangle(x + 26, y + 14 + bodyY, x + 30, y + 10 + bodyY, x + 22, y + 16 + bodyY);
  }

  /**
   * Raptor enemy - fast dinosaur (48x48 - 1.5x bigger)
   */
  private generateEnemyRaptor() {
    const frameWidth = 48;
    const frameHeight = 48;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawRaptor(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy-raptor', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames
    const texture = this.scene.textures.get('enemy-raptor');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawRaptor(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let legOffset = 0;
    let tailWag = 0;
    let bodyY = 0;
    let mouthOpen = false;

    switch (frame) {
      case 0: // Idle
        break;
      case 1: // Run 1
        legOffset = 4;
        tailWag = 3;
        break;
      case 2: // Run 2
        legOffset = -4;
        tailWag = -3;
        break;
      case 3: // Hurt
        bodyY = 2;
        mouthOpen = true;
        break;
    }

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 24, y + 44, 28, 6);

    // === TAIL (long raptor tail for balance) ===
    g.fillStyle(0x994422);
    g.beginPath();
    g.moveTo(x + 2, y + 20 + tailWag);
    g.lineTo(x + 16, y + 16 + bodyY);
    g.lineTo(x + 18, y + 24 + bodyY);
    g.lineTo(x + 4, y + 28 + tailWag);
    g.closePath();
    g.fillPath();

    // Tail stripes
    g.fillStyle(0x663311);
    g.fillRect(x + 4, y + 21 + tailWag, 4, 3);
    g.fillRect(x + 10, y + 19 + tailWag, 3, 4);

    // === BACK LEG ===
    g.fillStyle(0x885522);
    g.fillRect(x + 18, y + 28 + bodyY, 6, 14 - legOffset);
    // Raptor claw (sickle claw!)
    g.fillStyle(0x553311);
    g.beginPath();
    g.moveTo(x + 16, y + 40 + bodyY - legOffset);
    g.lineTo(x + 26, y + 40 + bodyY - legOffset);
    g.lineTo(x + 28, y + 45 + bodyY - legOffset);
    g.lineTo(x + 22, y + 44 + bodyY - legOffset);
    g.lineTo(x + 18, y + 46 + bodyY - legOffset);
    g.lineTo(x + 14, y + 44 + bodyY - legOffset);
    g.closePath();
    g.fillPath();
    // Sickle claw highlight
    g.fillStyle(0xcccccc);
    g.fillTriangle(x + 14, y + 42 + bodyY - legOffset, x + 12, y + 38 + bodyY - legOffset, x + 17, y + 43 + bodyY - legOffset);

    // === BODY (sleek raptor body) ===
    g.fillStyle(0x553311);
    g.fillEllipse(x + 26, y + 22 + bodyY, 14, 12);

    g.fillStyle(0x884422);
    g.fillEllipse(x + 26, y + 20 + bodyY, 13, 11);

    // Belly
    g.fillStyle(0xccaa88);
    g.fillEllipse(x + 28, y + 24 + bodyY, 8, 7);

    // Stripes on body
    g.fillStyle(0x663311);
    g.fillRect(x + 20, y + 16 + bodyY, 3, 6);
    g.fillRect(x + 26, y + 14 + bodyY, 3, 6);
    g.fillRect(x + 32, y + 16 + bodyY, 3, 6);

    // === FRONT LEG ===
    g.fillStyle(0x885522);
    g.fillRect(x + 28, y + 28 + bodyY, 6, 14 + legOffset);
    // Front foot with claws
    g.fillStyle(0x553311);
    g.beginPath();
    g.moveTo(x + 26, y + 40 + bodyY + legOffset);
    g.lineTo(x + 36, y + 40 + bodyY + legOffset);
    g.lineTo(x + 38, y + 45 + bodyY + legOffset);
    g.lineTo(x + 32, y + 44 + bodyY + legOffset);
    g.lineTo(x + 28, y + 46 + bodyY + legOffset);
    g.lineTo(x + 24, y + 44 + bodyY + legOffset);
    g.closePath();
    g.fillPath();

    // === HEAD (long raptor snout) ===
    g.fillStyle(0x553311);
    g.fillEllipse(x + 38, y + 12 + bodyY, 10, 9);

    g.fillStyle(0x884422);
    g.fillEllipse(x + 38, y + 11 + bodyY, 9, 8);

    // Long snout
    g.fillStyle(0x884422);
    g.fillEllipse(x + 44, y + 14 + bodyY, 6, 5);

    // Jaw
    g.fillStyle(0x774433);
    g.fillEllipse(x + 43, y + 17 + bodyY, 5, 3);

    // Mouth/teeth
    if (mouthOpen) {
      g.fillStyle(0xff4444);
      g.fillEllipse(x + 46, y + 16 + bodyY, 3, 3);
      // Teeth
      g.fillStyle(0xffffff);
      g.fillTriangle(x + 44, y + 15 + bodyY, x + 45, y + 18 + bodyY, x + 46, y + 15 + bodyY);
      g.fillTriangle(x + 46, y + 15 + bodyY, x + 47, y + 18 + bodyY, x + 48, y + 15 + bodyY);
    } else {
      g.lineStyle(1, 0x553311);
      g.lineBetween(x + 40, y + 16 + bodyY, x + 48, y + 16 + bodyY);
    }

    // Eye (fierce)
    g.fillStyle(0xffff00);
    g.fillCircle(x + 38, y + 10 + bodyY, 3);
    g.fillStyle(0x000000);
    g.fillCircle(x + 39, y + 10 + bodyY, 1.5);
    // Red around eye (menacing)
    g.lineStyle(1, 0xff4444);
    g.lineBetween(x + 35, y + 8 + bodyY, x + 40, y + 9 + bodyY);

    // Nostril
    g.fillStyle(0x553311);
    g.fillCircle(x + 47, y + 12 + bodyY, 1);

    // === SMALL ARMS (raptor grabbing arms) ===
    g.fillStyle(0x885522);
    g.fillRect(x + 34, y + 16 + bodyY, 4, 6);
    // Clawed hands
    g.fillStyle(0x553311);
    g.fillTriangle(x + 34, y + 22 + bodyY, x + 36, y + 26 + bodyY, x + 38, y + 22 + bodyY);
  }

  /**
   * T-Rex enemy - massive dinosaur (80x80 - 2.5x bigger)
   */
  private generateEnemyTrex() {
    const frameWidth = 80;
    const frameHeight = 80;
    const numFrames = 4;
    const g = this.scene.add.graphics();

    for (let frame = 0; frame < numFrames; frame++) {
      const offsetX = frame * frameWidth;
      this.drawTrex(g, offsetX, 0, frame);
    }

    g.generateTexture('enemy-trex', frameWidth * numFrames, frameHeight);
    g.destroy();

    // Add spritesheet frames
    const texture = this.scene.textures.get('enemy-trex');
    for (let i = 0; i < numFrames; i++) {
      texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
    }
  }

  private drawTrex(g: Phaser.GameObjects.Graphics, x: number, y: number, frame: number) {
    let legOffset = 0;
    let tailWag = 0;
    let bodyY = 0;
    let mouthOpen = false;

    switch (frame) {
      case 0: // Idle - slightly open mouth (intimidating)
        mouthOpen = true;
        break;
      case 1: // Walk 1
        legOffset = 5;
        tailWag = 4;
        break;
      case 2: // Walk 2
        legOffset = -5;
        tailWag = -4;
        break;
      case 3: // Hurt/Roar
        bodyY = 3;
        mouthOpen = true;
        break;
    }

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 40, y + 74, 50, 8);

    // === MASSIVE TAIL ===
    g.fillStyle(0x664422);
    g.beginPath();
    g.moveTo(x + 2, y + 32 + tailWag);
    g.lineTo(x + 24, y + 26 + bodyY);
    g.lineTo(x + 28, y + 40 + bodyY);
    g.lineTo(x + 6, y + 46 + tailWag);
    g.closePath();
    g.fillPath();

    // Tail detail
    g.fillStyle(0x553311);
    g.fillRect(x + 6, y + 36 + tailWag, 6, 5);
    g.fillRect(x + 14, y + 32 + tailWag, 5, 6);

    // === BACK LEG (massive) ===
    g.fillStyle(0x775533);
    g.fillRect(x + 26, y + 44 + bodyY, 12, 24 - legOffset);
    // Huge foot
    g.fillStyle(0x553311);
    g.beginPath();
    g.moveTo(x + 22, y + 66 + bodyY - legOffset);
    g.lineTo(x + 42, y + 66 + bodyY - legOffset);
    g.lineTo(x + 46, y + 76 + bodyY - legOffset);
    g.lineTo(x + 36, y + 74 + bodyY - legOffset);
    g.lineTo(x + 28, y + 78 + bodyY - legOffset);
    g.lineTo(x + 20, y + 74 + bodyY - legOffset);
    g.closePath();
    g.fillPath();

    // === MASSIVE BODY ===
    g.fillStyle(0x443322);
    g.fillEllipse(x + 40, y + 36 + bodyY, 24, 20);

    g.fillStyle(0x664422);
    g.fillEllipse(x + 40, y + 34 + bodyY, 22, 18);

    // Belly
    g.fillStyle(0xccaa77);
    g.fillEllipse(x + 44, y + 40 + bodyY, 14, 12);

    // Body texture/scales
    g.fillStyle(0x553311);
    g.fillCircle(x + 30, y + 28 + bodyY, 3);
    g.fillCircle(x + 38, y + 24 + bodyY, 3);
    g.fillCircle(x + 46, y + 26 + bodyY, 3);
    g.fillCircle(x + 34, y + 34 + bodyY, 2);
    g.fillCircle(x + 44, y + 32 + bodyY, 2);

    // === FRONT LEG ===
    g.fillStyle(0x775533);
    g.fillRect(x + 44, y + 44 + bodyY, 12, 24 + legOffset);
    // Front foot
    g.fillStyle(0x553311);
    g.beginPath();
    g.moveTo(x + 40, y + 66 + bodyY + legOffset);
    g.lineTo(x + 60, y + 66 + bodyY + legOffset);
    g.lineTo(x + 64, y + 76 + bodyY + legOffset);
    g.lineTo(x + 54, y + 74 + bodyY + legOffset);
    g.lineTo(x + 46, y + 78 + bodyY + legOffset);
    g.lineTo(x + 38, y + 74 + bodyY + legOffset);
    g.closePath();
    g.fillPath();

    // === MASSIVE HEAD ===
    // Skull
    g.fillStyle(0x443322);
    g.fillEllipse(x + 58, y + 18 + bodyY, 18, 16);

    g.fillStyle(0x664422);
    g.fillEllipse(x + 58, y + 16 + bodyY, 17, 15);

    // Massive jaw/snout
    g.fillStyle(0x664422);
    g.fillEllipse(x + 68, y + 22 + bodyY, 12, 10);

    // Lower jaw
    g.fillStyle(0x553311);
    g.fillEllipse(x + 66, y + 28 + bodyY, 10, 6);

    // Mouth with TEETH
    if (mouthOpen) {
      // Open mouth
      g.fillStyle(0x880000);
      g.fillEllipse(x + 70, y + 26 + bodyY, 8, 6);
      // Big teeth (top)
      g.fillStyle(0xffffff);
      g.fillTriangle(x + 64, y + 22 + bodyY, x + 66, y + 28 + bodyY, x + 68, y + 22 + bodyY);
      g.fillTriangle(x + 68, y + 22 + bodyY, x + 70, y + 28 + bodyY, x + 72, y + 22 + bodyY);
      g.fillTriangle(x + 72, y + 22 + bodyY, x + 74, y + 28 + bodyY, x + 76, y + 22 + bodyY);
      // Bottom teeth
      g.fillTriangle(x + 66, y + 30 + bodyY, x + 68, y + 26 + bodyY, x + 70, y + 30 + bodyY);
      g.fillTriangle(x + 70, y + 30 + bodyY, x + 72, y + 26 + bodyY, x + 74, y + 30 + bodyY);
    } else {
      g.lineStyle(2, 0x443322);
      g.lineBetween(x + 58, y + 24 + bodyY, x + 76, y + 24 + bodyY);
      // Visible teeth even closed
      g.fillStyle(0xffffff);
      g.fillTriangle(x + 68, y + 22 + bodyY, x + 69, y + 26 + bodyY, x + 70, y + 22 + bodyY);
      g.fillTriangle(x + 72, y + 22 + bodyY, x + 73, y + 26 + bodyY, x + 74, y + 22 + bodyY);
    }

    // Angry eye
    g.fillStyle(0xff6600);
    g.fillCircle(x + 56, y + 12 + bodyY, 5);
    g.fillStyle(0x000000);
    g.fillCircle(x + 57, y + 12 + bodyY, 2.5);
    // Brow ridge (angry)
    g.fillStyle(0x443322);
    g.beginPath();
    g.moveTo(x + 50, y + 8 + bodyY);
    g.lineTo(x + 62, y + 6 + bodyY);
    g.lineTo(x + 60, y + 10 + bodyY);
    g.lineTo(x + 52, y + 12 + bodyY);
    g.closePath();
    g.fillPath();

    // Nostril
    g.fillStyle(0x443322);
    g.fillCircle(x + 74, y + 18 + bodyY, 2);

    // === TINY T-REX ARMS (comically small) ===
    g.fillStyle(0x775533);
    g.fillRect(x + 52, y + 26 + bodyY, 5, 8);
    // Tiny claws
    g.fillStyle(0x553311);
    g.fillCircle(x + 54, y + 35 + bodyY, 2);
    g.fillCircle(x + 56, y + 34 + bodyY, 2);

    // === BACK SPIKES ===
    g.fillStyle(0x443322);
    g.fillTriangle(x + 24, y + 20 + bodyY, x + 28, y + 12 + bodyY, x + 32, y + 20 + bodyY);
    g.fillTriangle(x + 32, y + 18 + bodyY, x + 36, y + 8 + bodyY, x + 40, y + 18 + bodyY);
    g.fillTriangle(x + 40, y + 16 + bodyY, x + 44, y + 6 + bodyY, x + 48, y + 16 + bodyY);
    g.fillTriangle(x + 48, y + 14 + bodyY, x + 52, y + 4 + bodyY, x + 56, y + 16 + bodyY);
  }

  /**
   * Tile sprites - 6 different tile types (as spritesheet)
   */
  private generateTiles() {
    const tileSize = 32;
    const numTiles = 6;
    const g = this.scene.add.graphics();

    // Tile 0: Ground/dirt
    this.drawGroundTile(g, 0, 0);

    // Tile 1: Platform
    this.drawPlatformTile(g, tileSize, 0);

    // Tile 2: Ice
    this.drawIceTile(g, tileSize * 2, 0);

    // Tile 3: Space/metal
    this.drawSpaceTile(g, tileSize * 3, 0);

    // Tile 4: Lava rock
    this.drawLavaTile(g, tileSize * 4, 0);

    // Tile 5: Grass
    this.drawGrassTile(g, tileSize * 5, 0);

    g.generateTexture('tiles', tileSize * numTiles, tileSize);
    g.destroy();

    // Add spritesheet frames to the texture
    const texture = this.scene.textures.get('tiles');
    texture.add('__BASE', 0, 0, 0, tileSize * numTiles, tileSize);
    for (let i = 0; i < numTiles; i++) {
      texture.add(i, 0, i * tileSize, 0, tileSize, tileSize);
    }
  }

  private drawGroundTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Dark base
    g.fillStyle(0x5c4033);
    g.fillRect(x, y, 32, 32);

    // Lighter dirt
    g.fillStyle(0x8b6914);
    g.fillRect(x, y, 32, 8);

    // Top grass edge
    g.fillStyle(0x228b22);
    g.fillRect(x, y, 32, 4);

    // Texture dots
    g.fillStyle(0x654321);
    for (let i = 0; i < 8; i++) {
      g.fillCircle(x + 4 + (i % 4) * 8, y + 12 + Math.floor(i / 4) * 10, 2);
    }

    // Highlight
    g.fillStyle(0x7a5c2e);
    g.fillRect(x + 2, y + 6, 4, 2);
    g.fillRect(x + 14, y + 10, 4, 2);
    g.fillRect(x + 24, y + 18, 4, 2);
  }

  private drawPlatformTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Main wood color
    g.fillStyle(0xa0522d);
    g.fillRect(x, y + 4, 32, 24);

    // Top highlight
    g.fillStyle(0xcd853f);
    g.fillRect(x, y, 32, 6);

    // Wood grain lines
    g.lineStyle(1, 0x8b4513);
    g.lineBetween(x, y + 12, x + 32, y + 12);
    g.lineBetween(x, y + 20, x + 32, y + 20);

    // Nail dots
    g.fillStyle(0x696969);
    g.fillCircle(x + 4, y + 8, 2);
    g.fillCircle(x + 28, y + 8, 2);
    g.fillCircle(x + 4, y + 24, 2);
    g.fillCircle(x + 28, y + 24, 2);

    // Bottom shadow
    g.fillStyle(0x654321);
    g.fillRect(x, y + 28, 32, 4);
  }

  private drawIceTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Ice base
    g.fillStyle(0x87ceeb);
    g.fillRect(x, y, 32, 32);

    // Lighter top
    g.fillStyle(0xb0e0e6);
    g.fillRect(x, y, 32, 8);

    // Crystal highlights
    g.fillStyle(0xffffff, 0.7);
    g.fillTriangle(x + 4, y + 16, x + 10, y + 4, x + 16, y + 16);
    g.fillTriangle(x + 18, y + 24, x + 24, y + 10, x + 30, y + 24);

    // Sparkle dots
    g.fillStyle(0xffffff);
    g.fillCircle(x + 8, y + 8, 2);
    g.fillCircle(x + 24, y + 6, 1.5);
    g.fillCircle(x + 16, y + 20, 1);
    g.fillCircle(x + 28, y + 16, 1.5);

    // Shadow edge
    g.fillStyle(0x4682b4);
    g.fillRect(x, y + 28, 32, 4);
  }

  private drawSpaceTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Metal base
    g.fillStyle(0x2f3542);
    g.fillRect(x, y, 32, 32);

    // Metallic shine
    g.fillStyle(0x57606f);
    g.fillRect(x, y, 32, 4);
    g.fillRect(x, y + 14, 32, 4);

    // Purple accent lines
    g.fillStyle(0x9b59b6);
    g.fillRect(x + 2, y + 6, 2, 20);
    g.fillRect(x + 28, y + 6, 2, 20);

    // Tech panel
    g.fillStyle(0x3d3d3d);
    g.fillRect(x + 8, y + 8, 16, 16);

    // Panel lights
    g.fillStyle(0x00ff88);
    g.fillCircle(x + 12, y + 12, 2);
    g.fillStyle(0xff4444);
    g.fillCircle(x + 20, y + 12, 2);

    // Bolts
    g.fillStyle(0x636e72);
    g.fillCircle(x + 4, y + 4, 2);
    g.fillCircle(x + 28, y + 4, 2);
    g.fillCircle(x + 4, y + 28, 2);
    g.fillCircle(x + 28, y + 28, 2);
  }

  private drawLavaTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Dark rock base
    g.fillStyle(0x2d2d2d);
    g.fillRect(x, y, 32, 32);

    // Volcanic rock texture
    g.fillStyle(0x434343);
    g.fillRect(x + 4, y + 4, 8, 8);
    g.fillRect(x + 20, y + 12, 8, 8);
    g.fillRect(x + 8, y + 20, 10, 8);

    // Lava cracks (orange glow)
    g.lineStyle(2, 0xff6600);
    g.lineBetween(x + 8, y + 2, x + 24, y + 14);
    g.lineBetween(x + 4, y + 18, x + 20, y + 28);
    g.lineBetween(x + 26, y + 4, x + 30, y + 20);

    // Glow spots
    g.fillStyle(0xff9900);
    g.fillCircle(x + 16, y + 8, 2);
    g.fillCircle(x + 8, y + 24, 2);
    g.fillCircle(x + 26, y + 18, 1.5);

    // Bright center
    g.fillStyle(0xffcc00);
    g.fillCircle(x + 16, y + 8, 1);
    g.fillCircle(x + 8, y + 24, 1);
  }

  private drawGrassTile(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    // Dirt base
    g.fillStyle(0x8b6914);
    g.fillRect(x, y, 32, 32);

    // Darker dirt bottom
    g.fillStyle(0x5c4033);
    g.fillRect(x, y + 20, 32, 12);

    // Grass top layer
    g.fillStyle(0x228b22);
    g.fillRect(x, y, 32, 10);

    // Grass blades
    g.fillStyle(0x32cd32);
    g.fillTriangle(x + 4, y + 10, x + 6, y - 2, x + 8, y + 10);
    g.fillTriangle(x + 12, y + 10, x + 14, y, x + 16, y + 10);
    g.fillTriangle(x + 20, y + 10, x + 22, y - 1, x + 24, y + 10);
    g.fillTriangle(x + 26, y + 10, x + 28, y + 2, x + 30, y + 10);

    // Grass detail
    g.fillStyle(0x006400);
    g.fillCircle(x + 8, y + 6, 2);
    g.fillCircle(x + 24, y + 4, 2);

    // Dirt pebbles
    g.fillStyle(0x654321);
    g.fillCircle(x + 6, y + 24, 2);
    g.fillCircle(x + 20, y + 26, 1.5);
    g.fillCircle(x + 28, y + 22, 2);
  }

  /**
   * Egg collectible - golden egg with shine
   */
  private generateEgg() {
    const g = this.scene.add.graphics();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 14, 10, 4);

    // Egg outline
    g.fillStyle(0xb8860b);
    g.fillEllipse(8, 8, 11, 13);

    // Main egg - golden
    g.fillStyle(0xffd700);
    g.fillEllipse(8, 8, 10, 12);

    // Highlight
    g.fillStyle(0xffed4a);
    g.fillEllipse(6, 5, 4, 5);

    // Sparkle
    g.fillStyle(0xffffff);
    g.fillCircle(5, 4, 1.5);

    // Speckles
    g.fillStyle(0xdaa520);
    g.fillCircle(10, 8, 1);
    g.fillCircle(8, 11, 0.8);
    g.fillCircle(6, 10, 0.8);

    g.generateTexture('egg', 16, 16);
    g.destroy();
  }

  /**
   * Exit portal - swirling cyan doorway
   */
  private generateExit() {
    const g = this.scene.add.graphics();

    // Portal frame - darker
    g.fillStyle(0x1a5c5c);
    g.fillRoundedRect(0, 0, 32, 64, 4);

    // Inner portal glow
    g.fillStyle(0x00ffff);
    g.fillRoundedRect(4, 4, 24, 56, 4);

    // Swirl effect - lighter
    g.fillStyle(0x7fdbdb);
    g.fillEllipse(16, 20, 14, 18);
    g.fillEllipse(16, 44, 14, 18);

    // Center bright
    g.fillStyle(0xccffff);
    g.fillEllipse(16, 32, 8, 20);

    // Sparkles
    g.fillStyle(0xffffff);
    g.fillCircle(10, 16, 2);
    g.fillCircle(22, 48, 2);
    g.fillCircle(12, 36, 1.5);
    g.fillCircle(20, 24, 1.5);

    // Top glow
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(8, 0, 16, -8, 24, 0);

    g.generateTexture('exit', 32, 64);
    g.destroy();
  }

  /**
   * PowerUp - glowing star/diamond shape
   */
  private generatePowerUp() {
    const g = this.scene.add.graphics();

    // Outer glow
    g.fillStyle(0xffffff, 0.3);
    this.drawStar(g, 16, 16, 6, 16, 8);

    // Main shape - star
    g.fillStyle(0xffffff);
    this.drawStar(g, 16, 16, 6, 12, 6);

    // Inner bright
    g.fillStyle(0xffffff);
    g.fillCircle(16, 16, 5);

    // Center sparkle
    g.fillStyle(0xffff88);
    g.fillCircle(16, 16, 3);

    g.generateTexture('powerup', 32, 32);
    g.destroy();
  }

  /**
   * Helper to draw a star shape
   */
  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, outerRadius: number, innerRadius: number) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
      }
    }
    g.closePath();
    g.fillPath();
  }

  /**
   * Checkpoint flag - pole with waving flag
   */
  private generateCheckpoint() {
    const g = this.scene.add.graphics();

    // Pole shadow
    g.fillStyle(0x333333);
    g.fillRect(5, 2, 5, 46);

    // Pole
    g.fillStyle(0x888888);
    g.fillRect(4, 0, 4, 48);

    // Pole highlight
    g.fillStyle(0xaaaaaa);
    g.fillRect(4, 0, 2, 48);

    // Flag background
    g.fillStyle(0xcccccc);
    // Waving flag shape
    g.beginPath();
    g.moveTo(8, 2);
    g.lineTo(30, 4);
    g.lineTo(28, 12);
    g.lineTo(30, 20);
    g.lineTo(8, 18);
    g.closePath();
    g.fillPath();

    // Flag highlight
    g.fillStyle(0xeeeeee);
    g.fillTriangle(8, 2, 20, 6, 8, 10);

    // Pole top ball
    g.fillStyle(0xdddddd);
    g.fillCircle(6, 2, 4);
    g.fillStyle(0xffffff);
    g.fillCircle(5, 1, 1.5);

    g.generateTexture('checkpoint', 32, 48);
    g.destroy();
  }

  /**
   * Life/Heart pickup - pixel art heart
   */
  private generateLife() {
    const g = this.scene.add.graphics();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(16, 28, 20, 6);

    // Heart outline
    g.fillStyle(0x8b0000);
    // Left bump
    g.fillCircle(10, 10, 9);
    // Right bump
    g.fillCircle(22, 10, 9);
    // Bottom point
    g.fillTriangle(1, 12, 31, 12, 16, 30);

    // Main heart color
    g.fillStyle(0xff1744);
    g.fillCircle(10, 10, 7);
    g.fillCircle(22, 10, 7);
    g.fillTriangle(3, 11, 29, 11, 16, 28);

    // Highlight
    g.fillStyle(0xff6b6b);
    g.fillCircle(8, 8, 4);
    g.fillCircle(20, 8, 3);

    // Sparkle
    g.fillStyle(0xffffff);
    g.fillCircle(7, 7, 2);

    g.generateTexture('life', 32, 32);
    g.destroy();
  }

  /**
   * Enemy projectile - glowing green energy ball
   */
  private generateProjectile() {
    const g = this.scene.add.graphics();

    // Outer glow
    g.fillStyle(0x00ff00, 0.3);
    g.fillCircle(6, 6, 6);

    // Main projectile
    g.fillStyle(0x00ff00);
    g.fillCircle(6, 6, 4);

    // Inner bright
    g.fillStyle(0x88ff88);
    g.fillCircle(5, 5, 2);

    // Center
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 1);

    g.generateTexture('projectile', 12, 12);
    g.destroy();
  }
}
