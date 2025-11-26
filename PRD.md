## Dino Clash Adventure – Product Requirements Document (PRD)

### 1. Overview

**Vision**: A kid-friendly, browser-based 2D dinosaur platformer/brawler where 1–2 players run, jump, and attack enemies across colorful prehistoric worlds, collecting eggs and power-ups. Future expansions add versus battle modes, online multiplayer, and a simple level editor.

**Target players**: Kids aged 6–9, playing on desktop/laptop in a modern browser.

**Core pillars**:
- **Simple, responsive controls**: Easy to learn (move, jump, attack, special).
- **Expressive, lively dinos**: Clearly animated run, jump, and attack states.
- **Bright, varied worlds**: Volcanic, icy, and cosmic/meteor themes.
- **Short, satisfying sessions**: 1–3 levels that can be finished in a few minutes.

### 2. Goals & Non-goals

#### 2.1 Goals
- **Playable v1** in the browser with:
  - One controllable dinosaur character with:
    - Move left/right
    - Jump
    - One main attack (tail swipe or claw slash)
    - Temporary power-up state (speed/fire breath or similar)
  - At least **1 complete level**, ideally 3, with increasing difficulty.
  - **Egg collection and scoring system**.
  - Basic **enemy types** and simple hazards.
- **Kid-friendly polish**:
  - Colorful parallax backgrounds.
  - Simple sound effects for actions and feedback.

#### 2.2 Non-goals (v1)
- Robust **online multiplayer netcode** (planned for later).
- Full **Smash Bros–style arena combat** (will be a separate game mode later).
- Full **in-game level editor UI** (future phase; early levels can be hand-authored via JSON/tilemaps).
- Deep RPG systems (stats, inventory, complex skill trees).

### 3. Platform & Tech Stack

- **Platform**: Web (modern desktop browsers).
- **Engine**: **Phaser 3** (2D).
- **Language**: **TypeScript** (preferred) or JavaScript if needed for simplicity.
- **Build tooling**:
  - Simple bundler setup (e.g., Vite or Webpack) or Phaser starter template.
  - NPM/Yarn for dependencies.
- **Art format**:
  - **Sprite sheets** (PNG) for characters and enemies.
  - **Tile-based** or layered images for backgrounds.
- **Audio format**:
  - Short **.ogg/.mp3** SFX and music loops.

### 4. Core Gameplay

#### 4.1 Game Loop

1. Player selects a level (for v1, Level 1 auto-start is fine).
2. Player controls a dinosaur to:
   - Run/jump across platforms.
   - Attack enemies.
   - Collect eggs and power-ups.
3. Reaches the level exit (goal).
4. End-of-level screen shows:
   - Total eggs collected.
   - Enemies defeated.
   - Time taken and final score.
5. Player can retry or go to next level (if unlocked).

#### 4.2 Player Abilities (v1)

- **Move**:
  - Left/right on ground and in air (with some air control).
  - Horizontal speed capped.
- **Jump**:
  - One main jump with configurable height.
  - Optional: coyote time (tiny grace period after leaving a ledge).
- **Attack 1**:
  - Tail swipe or claw slash.
  - Short-range melee hitbox in front of the dino.
  - Cancels idle/run state into attack animation, then returns to appropriate state.
- **Special (power-up state)**:
  - Triggered automatically when picking up certain items.
  - Examples (choose at least one for v1):
    - **Speed Boost**: temporarily increased move speed and shorter attack cooldown.
    - **Fire Breath**: short-range fire blast projectile.
    - **Glide**: after jumping, holding jump allows a slower fall.

#### 4.3 Controls (Keyboard, v1)

- **Player 1**:
  - **Left/Right**: `A` / `D` or arrow keys.
  - **Jump**: `W` or `Space`.
  - **Attack**: `J` or `K` (decide one primary key for simplicity).
- (Future) **Local Player 2**:
  - Define a separate set (e.g., arrows + `Enter` for attack).

Controls must be:
- Remappable at code level (not necessarily via UI in v1).
- Responsive, with minimal input lag.

### 5. Characters & Enemies

#### 5.1 Player Character – Dino

- **Visual style**: Cute but somewhat lifelike dinosaur.
- **Animations (sprite-based)**:
  - Idle (loop).
  - Run (loop).
  - Jump start.
  - Fall (optional, can reuse jump if needed).
  - Attack (tail/claw).
  - Hit/damage (short flinch).
  - Death (for completeness; may be reused rarely or replaced by “fall off screen”).

**State machine (simplified)**:
- `Idle`
- `Run`
- `Jump` (ascending)
- `Fall` (descending)
- `Attack` (temporary override)
- `Hit` (temporary, with brief invulnerability)

Transitions:
- Idle ↔ Run (based on horizontal input).
- Idle/Run → Jump (on jump input if grounded).
- Jump → Fall (when upward velocity ≤ 0).
- Any non-attack non-hit state → Attack (on attack input).
- Any state → Hit (on enemy collision if not invulnerable).

#### 5.2 Enemy Types (v1)

- **Ground Raptor**:
  - Patrols between two points.
  - Damages player on contact unless player is invulnerable.
  - Dies in 1 hit from player attack.
  - Behaviors:
    - Walk left/right.
    - Turn around at patrol bounds or on wall collision.
- **Flying Pterodactyl**:
  - Flies along a horizontal or slightly arced path.
  - Appears at set locations or spawns periodically.
  - Player must time jumps or attack to avoid/destroy.
- **Environmental Hazards**:
  - Lava pits (insta-death or health loss and respawn).
  - Falling rocks in meteor level.
  - Spikes or icy slippery patches.

### 6. Levels & Progression

#### 6.1 Level Themes (v1)

- **Level 1 – Volcanic Valley**:
  - Gentle hills, basic platforms.
  - Introduces: basic ground enemies and egg collection.
  - One or two simple gaps to jump.
- **Level 2 – Icy Tundra**:
  - Some lower friction surfaces.
  - Introduces: moving platforms and first flying enemy.
  - Adds first power-up type (e.g., speed boost).
- **Level 3 – Meteor Storm / Cosmic Cliffs**:
  - Meteors falling occasionally from the sky.
  - More complex platform layout (verticality, multiple routes).
  - Adds second power-up type (e.g., fire breath or glide).

#### 6.2 Level Structure

- Each level:
  - Has **start point** and **goal/exit point**.
  - Places eggs, enemies, power-ups, and hazards along the path.
  - Stores layout as:
    - Either **tilemap JSON** (Tiled) or custom JSON describing platforms and objects.
  - Defines:
    - **Parallax background layers**.
    - **Music track**.

#### 6.3 Progression & Difficulty

- Difficulty ramp:
  - Level 1: Mostly safe, teaches jump and attack, lower enemy counts.
  - Level 2: Introduces enemy combinations (ground + flying).
  - Level 3: Adds environmental hazards (meteors, moving platforms).
- Unlocks:
  - Completing Level 1 unlocks Level 2.
  - Completing Level 2 unlocks Level 3.

### 7. Scoring & UI

- **Score components**:
  - +10 per egg collected.
  - +20 per enemy defeated.
  - Level completion bonus (e.g., +100).
  - Time bonus/penalty (optional simple function).
- **UI elements (v1)**:
  - Top-left: lives or health (if using health).
  - Top-center: current score.
  - Top-right: collected eggs / total eggs.
  - On level completion:
    - Summary panel with:
      - Eggs: X / Y
      - Enemies defeated
      - Time
      - Total score

### 8. Art & Audio Direction

#### 8.1 Visual Style

- **Style**: Colorful, slightly cartoony, with readable silhouettes.
- **Resolution**:
  - Target sprite sizes: 64x64 or 96x96 for the main dino.
  - Backgrounds: multiple parallax layers of wide PNGs.
- **Color palettes**:
  - Volcanic: reds, oranges, dark rocks.
  - Icy: blues, whites, subtle purples.
  - Meteor/cosmic: deep purples, blacks, bright meteors/stars.

#### 8.2 Audio

- Simple, looping background music per level.
- SFX:
  - Jump, land, attack, hit enemy, take damage, egg pickup, power-up activation.

### 9. Technical Architecture

- **Scenes**:
  - `BootScene`: load core assets.
  - `MenuScene`: simple menu (Play, Level Select in future).
  - `GameScene`: core gameplay; configured per level.
  - `UIScene` (optional): overlay UI.
- **Systems**:
  - Input handling (keyboard, later gamepad).
  - Physics and collision (Phaser Arcade Physics).
  - Animation controller for player and enemies.
  - Level loader (tilemaps or JSON).
  - Score and progression manager.

### 10. Phased Implementation Plan

#### Phase 0 – Project Setup

- Initialize project with:
  - NPM, TypeScript config, bundler (e.g., Vite).
  - Phaser 3 dependency.
- Create basic folder structure:
  - `src/` (main game code)
  - `assets/` (sprites, backgrounds, audio)
  - `scenes/` (Boot, Menu, Game)
- Implement a **minimal Phaser game** that:
  - Boots up a single scene.
  - Displays a placeholder rectangle as the player.

**Exit criteria**:
- Game builds and runs in the browser.
- You see a placeholder “player box” on screen.

#### Phase 1 – Core Movement & Camera (Gray-box)

- Implement:
  - Keyboard input for move left/right and jump.
  - Basic physics (gravity, ground collision, jumping).
  - Simple platforms as rectangles (no final art).
  - Camera follow on player.
- Add a simple restart key if player falls off-screen.

**Exit criteria**:
- You can move and jump with a placeholder box across basic platforms.
- Camera follows smoothly.

#### Phase 2 – Combat & Enemies (Gray-box)

- Add:
  - Attack input and an attack hitbox in front of the player.
  - Basic enemy placeholder (rectangle) that patrols.
  - Collision logic:
    - Player takes damage on touching enemy.
    - Enemy is destroyed on player attack.
- Add basic health or lives system and respawn behavior.

**Exit criteria**:
- You can attack and destroy placeholder enemies.
- Player can take damage and respawn or lose a life.

#### Phase 3 – Level 1 with Real Art

- Integrate:
  - Final or near-final **player dino sprite sheet**.
  - Basic **ground enemy** sprite sheet.
  - Volcanic background with parallax layers.
- Implement:
  - Simple Level 1 layout (hand-coded or from tilemap).
  - Egg collectibles and score tracking.
  - End-of-level goal with basic summary screen.

**Exit criteria**:
- Level 1 is fully playable with real art and scoring.

#### Phase 4 – Additional Levels & Power-ups

- Build Level 2 (Icy Tundra) and Level 3 (Meteor/Cosmic).
- Implement at least one:
  - **Power-up** (speed or fire breath).
  - **Flying enemy**.
- Hook power-ups into player state and visuals (e.g., trail, glow).

**Exit criteria**:
- All 3 levels are playable and feel distinct.
- At least one power-up is functional and fun.

#### Phase 5 – Polish & Future Features (Post-v1)

- Add:
  - Simple main menu and level select.
  - Basic options (sound on/off).
- Plan (but not necessarily fully implement yet):
  - Local 2-player co-op.
  - Battle/arena mode reusing player/enemy logic.
  - Level editor tooling via JSON/tilemaps.

**Exit criteria**:
- V1 is “ship-ready” for your kids: robust enough to play repeatedly.

### 11. Sprite Sheet & Art Pipeline

This section defines how we will create and manage sprite sheets for the player, enemies, and key effects.

#### 11.1 Strategy: Use 2D Sprites (Not 3D Models)

To avoid past GLTF and rigging issues:
- We will **not** rely on 3D models or GLTF for v1.
- Instead, we will:
  - Either **license/buy high-quality 2D dino sprite packs**.
  - Or **create simple custom sprite sheets** using 2D art tools.

Sprite-based animation in Phaser is:
- Easy to load and manage.
- Well-documented with simple APIs (`anims.create`, `sprite.anims.play`).

#### 11.2 Recommended Sources for Dino Sprite Sheets

When possible, start with **existing, kid-friendly assets**:
- **Marketplaces** (paid, higher quality and speed):
  - itch.io game assets (search “dinosaur sprite sheet platformer”).
  - GraphicRiver / GameDev Market.
- **Free/CC sites** (check licenses):
  - OpenGameArt.org (search for “dinosaur platformer”).

Selection criteria:
- Clear run, jump, and attack animations.
- Consistent style and resolution (64x64 or 96x96 per frame).
- License allows use in personal and (future) non-commercial projects.

#### 11.3 Tools for Creating/Editing Sprite Sheets

If you or your kids want to customize or build your own:
- **Aseprite** (paid, popular):
  - Pixel-art focused.
  - Timeline and onion-skinning for smooth animations.
  - Built-in sprite sheet export.
- **Piskel** (free, web-based):
  - Great for quick, kid-friendly pixel art.
  - Can animate and export sprite sheets as PNG.
- **Krita / GIMP** (free, more general-purpose):
  - Good for non-pixel, painted styles.
  - Can be used to layout frames in a grid manually.

**Recommendation**: Start with downloaded sprite sheets, then use **Piskel** or **Aseprite** for light editing, recolors, or extra frames.

#### 11.4 Sprite Sheet Structure & Naming

For each character/enemy:
- Use a separate PNG sheet per animation set or one master sheet with consistent frame size.
- Define:
  - **Frame size**: e.g., 64x64 pixels.
  - **Animations** as named sequences:
    - `dino_idle` (e.g., 4–6 frames).
    - `dino_run` (6–8 frames).
    - `dino_jump` (1–2 frames).
    - `dino_attack` (4–6 frames).
    - `dino_hit` (2–3 frames).
- Maintain a small **JSON or TS config** describing:
  - Sprite sheet filenames.
  - Frame counts and frame rate per animation.

Example (conceptual):
- File: `assets/sprites/dino.png`
- Frame size: 64x64
- Animations:
  - `idle`: frames 0–3 @ 6 fps
  - `run`: frames 4–11 @ 10 fps
  - `jump`: frame 12 @ 1 fps
  - `attack`: frames 13–18 @ 12 fps

#### 11.5 Recommended Workflow to Create a Dino Sprite Sheet

1. **Decide resolution & style**:
   - Choose 64x64 or 96x96 per frame and whether to use pixel art or softer painted sprites.
2. **Sketch key poses** (in Aseprite/Piskel/Krita):
   - Idle pose.
   - Run cycle (contact, passing, up, down).
   - Jump start/top/fall if distinct.
   - Attack windup, strike, and recovery.
3. **Animate**:
   - Use onion-skinning (in Aseprite/Piskel) to align movement across frames.
   - Keep animations short and readable (4–8 frames is often enough).
4. **Export sprite sheet**:
   - Export as a single PNG sheet with a grid layout.
   - Also export a reference JSON or write down frame indices per animation.
5. **Integrate into Phaser**:
   - Load sheet with `this.load.spritesheet(...)` specifying frame width/height.
   - Create animations in a `createAnimations()` helper with consistent naming.
   - Test in-game with placeholder scenes before adding more polish.

#### 11.6 Backgrounds & Parallax

- **Backgrounds**:
  - Create (or source) wide images for each level theme.
  - Split into 2–4 layers (far mountains, mid-ground, foreground objects).
- **Parallax**:
  - In Phaser, move background layers at different speeds relative to camera.
  - No need for sprite sheets; single large images or repeated tiles are fine.

### 12. Acceptance Criteria for V1

- Game loads in a browser and runs smoothly on typical laptops.
- At least **one level** is fully playable with:
  - Animated dino character (run, jump, attack).
  - At least one enemy type and one hazard.
  - Egg collection and scoring.
  - Level completion screen.
- Kids (6 and 9) can:
  - Learn controls within a minute.
  - Complete Level 1 after a few attempts.
  - Express enjoyment (“this is fun”, want to replay).


