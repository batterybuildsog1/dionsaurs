/**
 * Sprite Generator using Gemini 2.5 Flash Image API
 * Generates pixel art game sprites for the Dinosaur platformer
 *
 * Usage: GEMINI_API_KEY=your_key node tools/generate-sprites.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable not set');
  console.log('Usage: GEMINI_API_KEY=your_key node tools/generate-sprites.js');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Output directory
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

// Sprite definitions with prompts
const SPRITE_CONFIGS = [
  // Player character - dinosaur sprite sheet
  {
    name: 'dino-new',
    filename: 'dino-new.png',
    prompt: `Create a pixel art sprite sheet for a cute green dinosaur character for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels, no anti-aliasing
    - Character: Small green T-Rex dinosaur, friendly appearance, big eyes
    - Layout: Horizontal strip with 7 frames, each frame 32x32 pixels
    - Frames from left to right:
      1. Idle pose (standing)
      2. Run frame 1 (left foot forward)
      3. Run frame 2 (right foot forward)
      4. Jump pose (legs tucked, arms up)
      5. Attack pose (mouth open, lunging forward)
      6. Attack frame 2 (bite animation)
      7. Hurt/hit pose
    - Background: Transparent or solid magenta (#FF00FF) for easy removal
    - Colors: Bright green body, lighter green belly, white eyes with black pupils
    - Total image size: 224x32 pixels (7 frames x 32 pixels each)`,
  },

  // Enemy sprites - 5 types
  {
    name: 'enemy-basic',
    filename: 'enemy-basic.png',
    prompt: `Create a pixel art sprite sheet for a basic enemy creature in a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Character: Red slime/blob monster, angry eyes, simple but menacing
    - Layout: Horizontal strip with 4 frames, each 32x32 pixels
    - Frames: Idle, walk 1, walk 2, hurt
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 128x32 pixels`,
  },
  {
    name: 'enemy-fast',
    filename: 'enemy-fast.png',
    prompt: `Create a pixel art sprite sheet for a fast enemy creature in a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Character: Yellow bat or flying insect, small and zippy looking, angry expression
    - Layout: Horizontal strip with 4 frames, each 32x32 pixels
    - Frames: Flying idle, wing flap 1, wing flap 2, hurt
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 128x32 pixels`,
  },
  {
    name: 'enemy-tank',
    filename: 'enemy-tank.png',
    prompt: `Create a pixel art sprite sheet for a tank/heavy enemy in a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Character: Brown armored beetle or turtle, big and sturdy, armored shell
    - Layout: Horizontal strip with 4 frames, each 32x32 pixels
    - Frames: Idle, walk 1, walk 2, hurt (shell crack)
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 128x32 pixels`,
  },
  {
    name: 'enemy-flying',
    filename: 'enemy-flying.png',
    prompt: `Create a pixel art sprite sheet for a flying enemy in a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Character: Purple ghost or phantom, floaty and ethereal, glowing eyes
    - Layout: Horizontal strip with 4 frames, each 32x32 pixels
    - Frames: Float 1, float 2, float 3, hurt/fade
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 128x32 pixels`,
  },
  {
    name: 'enemy-shooter',
    filename: 'enemy-shooter.png',
    prompt: `Create a pixel art sprite sheet for a ranged shooter enemy in a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Character: Green plant/flower enemy that shoots, like a venus flytrap or cactus with eyes
    - Layout: Horizontal strip with 4 frames, each 32x32 pixels
    - Frames: Idle, charging shot, shooting, hurt
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 128x32 pixels`,
  },

  // Tiles
  {
    name: 'tiles-new',
    filename: 'tiles-new.png',
    prompt: `Create a pixel art tileset for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Layout: Horizontal strip with 6 tiles, each 32x32 pixels
    - Tiles from left to right:
      1. Ground/floor tile (brown dirt/stone, textured top edge)
      2. Platform tile (wooden plank or stone block)
      3. Ice/snow tile (light blue/white, crystalline)
      4. Space/metal tile (dark purple/gray, sci-fi look)
      5. Lava/volcano tile (dark rock with orange glow)
      6. Grass variation (green grass on dirt)
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 192x32 pixels`,
  },

  // Collectibles
  {
    name: 'egg',
    filename: 'egg-new.png',
    prompt: `Create a pixel art collectible egg sprite for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels, cute
    - Single frame: 16x16 pixels
    - Design: Golden/yellow speckled dinosaur egg with shine highlights
    - Should look valuable and collectible
    - Background: Transparent or magenta (#FF00FF)`,
  },
  {
    name: 'heart',
    filename: 'heart-new.png',
    prompt: `Create a pixel art heart/life pickup sprite for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Single frame: 16x16 pixels
    - Design: Bright pink/red heart with shine highlight, looks like health pickup
    - Background: Transparent or magenta (#FF00FF)`,
  },
  {
    name: 'powerups',
    filename: 'powerups-new.png',
    prompt: `Create a pixel art powerup sprite sheet for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Layout: Horizontal strip with 5 powerups, each 24x24 pixels
    - Powerups from left to right:
      1. Speed boost (blue lightning bolt or running shoe)
      2. Invincibility (golden star or shield)
      3. Shield (cyan bubble or force field icon)
      4. Double jump (magenta wings or spring)
      5. Magnet (orange magnet or swirl)
    - Each should be instantly recognizable
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 120x24 pixels`,
  },
  {
    name: 'checkpoint',
    filename: 'checkpoint-new.png',
    prompt: `Create a pixel art checkpoint flag sprite for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Layout: 2 frames side by side, each 32x48 pixels
    - Frame 1: Inactive checkpoint (gray/white flag on pole)
    - Frame 2: Active checkpoint (green glowing flag on pole)
    - Flag should wave slightly between frames
    - Background: Transparent or magenta (#FF00FF)
    - Total size: 64x48 pixels`,
  },
  {
    name: 'exit',
    filename: 'exit-new.png',
    prompt: `Create a pixel art exit portal/door sprite for a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Single frame: 32x64 pixels (tall doorway)
    - Design: Glowing cyan/teal portal or doorway with swirling energy effect
    - Should look like the goal/finish of a level
    - Background: Transparent or magenta (#FF00FF)`,
  },
  {
    name: 'projectile',
    filename: 'projectile-new.png',
    prompt: `Create a pixel art projectile sprite for enemy attacks in a 2D platformer game.

    Requirements:
    - Style: 16-bit pixel art, clean pixels
    - Single frame: 12x12 pixels
    - Design: Green energy ball or seed projectile with glow effect
    - Should look dangerous but small
    - Background: Transparent or magenta (#FF00FF)`,
  },
];

async function generateSprite(config) {
  console.log(`Generating: ${config.name}...`);

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",  // Use the experimental model with image generation
    });

    // For image generation, we need to use the imagen model or a different approach
    // Gemini 2.0 Flash can generate images with the right configuration
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: config.prompt }]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const response = result.response;

    // Check for image in response
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, 'base64');
          const filepath = path.join(ASSETS_DIR, config.filename);
          fs.writeFileSync(filepath, buffer);
          console.log(`  Saved: ${filepath}`);
          return true;
        }
      }
    }

    console.log(`  Warning: No image generated for ${config.name}`);
    console.log(`  Response:`, response.text?.substring(0, 200));
    return false;

  } catch (error) {
    console.error(`  Error generating ${config.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Dinosaur Game Sprite Generator');
  console.log('Using Gemini API for AI image generation');
  console.log('='.repeat(50));
  console.log(`Output directory: ${ASSETS_DIR}`);
  console.log('');

  // Ensure assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  for (const config of SPRITE_CONFIGS) {
    const success = await generateSprite(config);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`Generation complete: ${successCount} succeeded, ${failCount} failed`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Review generated sprites in public/assets/');
  console.log('2. Edit sprites if needed (remove backgrounds, adjust)');
  console.log('3. Update GameScene.ts to use new sprite files');
  console.log('='.repeat(50));
}

main().catch(console.error);
