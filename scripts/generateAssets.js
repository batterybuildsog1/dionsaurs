const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../public/assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Helper to save canvas
function saveCanvas(canvas, filename) {
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, filename), buffer);
    console.log(`Saved ${filename}`);
}

// --- Dino Sprite Sheet ---
// 32x32 frames. 
// Frame 0: Idle
// Frame 1: Run 1
// Frame 2: Run 2
// Frame 3: Jump
// Frame 4: Attack
// Frame 5: Hit
// Frame 6: Die
const dinoCanvas = createCanvas(32 * 7, 32);
const ctx = dinoCanvas.getContext('2d');

function drawDino(ctx, x, y, pose) {
    ctx.save();
    ctx.translate(x, y);
    
    // Body color
    ctx.fillStyle = '#4CAF50'; // Green
    
    // Body
    ctx.fillRect(8, 12, 16, 14); 
    
    // Head
    ctx.fillRect(18, 4, 12, 10);
    
    // Eye
    ctx.fillStyle = 'white';
    ctx.fillRect(24, 6, 3, 3);
    ctx.fillStyle = 'black';
    ctx.fillRect(26, 7, 1, 1);
    
    // Tail
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.moveTo(8, 16);
    ctx.lineTo(2, 14);
    ctx.lineTo(8, 20);
    ctx.fill();
    
    // Legs (Pose dependent)
    ctx.fillStyle = '#388E3C'; // Darker green
    
    if (pose === 'idle') {
        ctx.fillRect(10, 26, 4, 6); // Left
        ctx.fillRect(18, 26, 4, 6); // Right
    } else if (pose === 'run1') {
        ctx.fillRect(8, 26, 4, 6); // Left back
        ctx.fillRect(20, 24, 4, 6); // Right up
    } else if (pose === 'run2') {
        ctx.fillRect(12, 24, 4, 6); // Left up
        ctx.fillRect(18, 26, 4, 6); // Right back
    } else if (pose === 'jump') {
        ctx.fillRect(8, 22, 4, 6); // Tucked
        ctx.fillRect(20, 24, 4, 6); // Tucked
    } else if (pose === 'attack') {
        ctx.fillRect(10, 26, 4, 6);
        ctx.fillRect(18, 26, 4, 6);
        // Attack Claw
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(22, 16);
        ctx.lineTo(30, 16);
        ctx.lineTo(26, 20);
        ctx.fill();
    } else if (pose === 'hit') {
        ctx.fillStyle = '#FF5252'; // Flash red
        ctx.fillRect(8, 12, 16, 14); // Body override
        ctx.fillRect(18, 4, 12, 10); // Head override
        // Eye X
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(24, 6); ctx.lineTo(27, 9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(27, 6); ctx.lineTo(24, 9); ctx.stroke();
    }

    ctx.restore();
}

drawDino(ctx, 0, 0, 'idle');
drawDino(ctx, 32, 0, 'run1');
drawDino(ctx, 64, 0, 'run2');
drawDino(ctx, 96, 0, 'jump');
drawDino(ctx, 128, 0, 'attack');
drawDino(ctx, 160, 0, 'hit');
// Die frame (lying down)
ctx.save();
ctx.translate(192 + 16, 16);
ctx.rotate(Math.PI / 2);
ctx.translate(-16, -16);
drawDino(ctx, 0, 0, 'hit');
ctx.restore();

saveCanvas(dinoCanvas, 'dino.png');


// --- Enemy Sprite Sheet (Raptor) ---
const enemyCanvas = createCanvas(32 * 4, 32);
const eCtx = enemyCanvas.getContext('2d');

function drawEnemy(ctx, x, y, pose) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#D32F2F'; // Red
    
    // Body
    ctx.fillRect(10, 14, 14, 12);
    // Head
    ctx.fillRect(6, 8, 10, 8);
    // Eye
    ctx.fillStyle = 'yellow';
    ctx.fillRect(8, 10, 2, 2);
    
    // Legs
    ctx.fillStyle = '#B71C1C';
    if (pose === 'walk1') {
        ctx.fillRect(12, 26, 3, 6);
        ctx.fillRect(18, 24, 3, 6);
    } else {
        ctx.fillRect(12, 24, 3, 6);
        ctx.fillRect(18, 26, 3, 6);
    }
    ctx.restore();
}

drawEnemy(eCtx, 0, 0, 'walk1');
drawEnemy(eCtx, 32, 0, 'walk2');
drawEnemy(eCtx, 64, 0, 'walk1');
drawEnemy(eCtx, 96, 0, 'walk2');
saveCanvas(enemyCanvas, 'enemy.png');


// --- Tiles ---
const tileCanvas = createCanvas(32 * 3, 32); // Ground, Platform, Wall
const tCtx = tileCanvas.getContext('2d');

// Ground
tCtx.fillStyle = '#5D4037';
tCtx.fillRect(0, 0, 32, 32);
tCtx.fillStyle = '#3E2723';
tCtx.fillRect(0, 0, 32, 4); // Grass top? No, brown top
tCtx.fillStyle = '#4CAF50';
tCtx.fillRect(0, 0, 32, 4); // Grass

// Platform (Floating)
tCtx.translate(32, 0);
tCtx.fillStyle = '#5D4037';
tCtx.fillRect(0, 0, 32, 32);
tCtx.fillStyle = '#8D6E63'; // Lighter details
tCtx.fillRect(4, 4, 24, 24);

saveCanvas(tileCanvas, 'tiles.png');

console.log('Assets generated successfully.');
