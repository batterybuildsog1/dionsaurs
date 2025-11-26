# Dino Clash Adventure

A kid-friendly, browser-based 2D dinosaur platformer/brawler built with Phaser 3 and TypeScript.

## Project Status

### Completed
- **Phase 0: Project Setup**
  - [x] Project initialized with Vite + TypeScript + Phaser 3.
  - [x] Directory structure created (`src/`, `assets/`).
  - [x] Minimal game loop implemented.
- **Phase 1: Core Movement & Camera**
  - [x] Player controller (Left/Right/Jump).
  - [x] Platform physics and collisions.
  - [x] Camera follow.
- **Phase 2: Combat & Enemies**
  - [x] Melee attack implementation (Key: `J`).
  - [x] Enemy class with patrol logic.
  - [x] Combat collisions (Player hits enemy, Player attacks enemy).
- **Phase 3: Core Loop & Art**
  - [x] Collectibles (Eggs) implementation.
  - [x] Scoring system and UI.
  - [x] Level exit and win state.
  - [x] **Art Integrated**: Custom sprite sheets generated and animations defined.
- **Phase 4: Additional Levels & Power-ups**
  - [x] Implement "Speed Boost" power-up logic.
  - [x] **Level Selection**: Created LevelSelectScene with unlocking progression.
  - [x] **New Levels**: Level 2 (Icy Tundra) and Level 3 (Cosmic Cliffs) added.
- **Phase 5: Online Multiplayer (Beta)**
  - [x] **PeerJS Integration**: Serverless P2P networking.
  - [x] Host/Join UI in Main Menu.
  - [x] Real-time position and animation syncing.
  - [x] **Vercel Ready**: Configuration added for easy deployment.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Vercel will automatically detect **Vite**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy! The `vercel.json` handles SPA routing.

## How to Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:8000` (or the port shown in terminal).

## Controls

### Single Player / P1
- **Move**: WASD
- **Jump**: Space
- **Attack**: J

### Player 2 (Local Co-op)
- **Move**: Arrow Keys
- **Jump**: Enter
- **Attack**: L

### Online Multiplayer
1. Click **Play Online (Beta)** in the menu.
2. **Host**: Click "Host Game". Copy the generated Room ID. Send it to your friend.
3. **Client**: Click "Join Game". Enter the Room ID.
4. Wait for the host to select a level.
