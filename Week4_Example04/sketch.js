/*
Week 4 — Example 4: Playable Maze (JSON + Level class + Player class)
Course: GBDA302
Instructors: Dr. Karen Cochrane and David Han
Date: Feb. 5, 2026

This is the "orchestrator" file:
- Loads JSON levels (preload)
- Builds Level objects
- Creates/positions the Player
- Handles input + level switching

It is intentionally light on "details" because those are moved into:
- Level.js (grid + drawing + tile meaning)
- Player.js (position + movement rules)

Based on the playable maze structure from Example 3
*/

// Increase tile size to make the screen bigger.
// Larger `TS` produces a larger canvas because canvas = cols*TS by rows*TS.
const TS = 64;

// Raw JSON data (from levels.json).
let levelsData;

// Array of Level instances.
let levels = [];

// Current level index.
let li = 0;

// Player instance (tile-based).
let player;
// Temporary message show time for 'need key' feedback
let needKeyUntil = 0;
// Game state: 'menu', 'instructions', 'playing'
let gameState = "menu";

// DOM buttons for menu/instructions
let startBtn, instrBtn, backBtn;
// Cached static menu background (p5.Graphics)
let menuBG = null;
// Track current level drawing transform so HUD can align into the gap
let levelScreenX = 0;
let levelScreenY = 0;
let levelScale = 1;

function preload() {
  // Ensure level data is ready before setup runs.
  levelsData = loadJSON("levels.json");
}

function setup() {
  /*
  Convert raw JSON grids into Level objects.
  If there are fewer than 3 levels in the JSON, generate a third randomized,
  solvable level (start -> key -> goal) and append it.
  */
  if (!levelsData.levels) levelsData.levels = [];
  if (levelsData.levels.length < 3) {
    // Make the third level tougher by increasing wall density (wallProb).
    const generated = generateSolvableLevel(7, 10, 0.42, 400);
    if (generated) levelsData.levels.push(generated);
  }

  levels = levelsData.levels.map((grid) => new Level(copyGrid(grid), TS));

  // Create a player (will be positioned when a level loads).
  player = new Player(TS);

  // Start with a full-window canvas for the menu; we'll resize when a level loads.
  createCanvas(windowWidth, windowHeight);

  noStroke();
  textFont("sans-serif");
  // Slightly larger HUD text to suit the bigger tiles/canvas.
  textSize(18);

  // Create menu buttons (hidden/positioned by showMenu)
  startBtn = createButton("Start");
  instrBtn = createButton("Instructions");
  backBtn = createButton("Back");

  startBtn.mousePressed(() => startGame());
  instrBtn.mousePressed(() => showInstructions());
  backBtn.mousePressed(() => showMenu());

  // Style buttons for a library-themed look
  [startBtn, instrBtn, backBtn].forEach((b) => {
    b.style("font-size", "20px");
    b.style("padding", "10px 20px");
    b.style("border-radius", "6px");
    b.style("background-color", "#f3e2c7");
    b.style("border", "2px solid #8b5a2b");
    // smooth hover transition
    b.style("transition", "transform 0.12s, background-color 0.12s");
    b.hide();
  });

  // Hover effects for Start and Instructions buttons
  startBtn.mouseOver(() => {
    startBtn.style("background-color", "#ecd3a3");
    startBtn.style("transform", "scale(1.05)");
  });
  startBtn.mouseOut(() => {
    startBtn.style("background-color", "#f3e2c7");
    startBtn.style("transform", "scale(1)");
  });

  instrBtn.mouseOver(() => {
    instrBtn.style("background-color", "#ecd3a3");
    instrBtn.style("transform", "scale(1.05)");
  });
  instrBtn.mouseOut(() => {
    instrBtn.style("background-color", "#f3e2c7");
    instrBtn.style("transform", "scale(1)");
  });

  // Show initial menu
  showMenu();
}

function draw() {
  if (gameState === 'win') {
    drawWin();
    return;
  }
  if (gameState === "menu") {
    drawMenu();
    return;
  }

  if (gameState === "instructions") {
    drawInstructions();
    return;
  }

  // playing: scale and center the level so it fills the screen like the menu
  background(240);
  const level = levels[li];
  const lw = level.pixelWidth();
  const lh = level.pixelHeight();

  // compute uniform scale to fit level into the canvas
  let s = Math.min(width / lw, height / lh);
  if (!isFinite(s) || s <= 0) s = 1;

  const tx = (width - lw * s) / 2;
  const ty = (height - lh * s) / 2;

  // expose transform for HUD positioning
  levelScreenX = tx;
  levelScreenY = ty;
  levelScale = s;

  push();
  translate(tx, ty);
  scale(s);
  level.draw();
  player.draw();
  pop();

  // HUD drawn in screen space (uses levelScreenX/Y to place text in gap)
  drawHUD();
}

function windowResized() {
  // Always resize canvas to the window; menu uses cached background, playing will scale level.
  resizeCanvas(windowWidth, windowHeight);
  if (gameState === "menu" || gameState === "instructions") showMenu();
}

// ---- Menu / Instructions UI ----

function showMenu() {
  gameState = "menu";
  backBtn.hide();
  startBtn.show();
  instrBtn.show();

  // position buttons centered near bottom
  const cx = width / 2;
  startBtn.position(cx - 110, height - 160);
  instrBtn.position(cx + 10, height - 160);

  // Reset game state so it can be played again from level 1
  li = 0;
  player.hasKey = false;

  // Generate a static menu background image so it does not change each frame
  menuBG = makeMenuBackground(width, height);
}

function showInstructions() {
  gameState = "instructions";
  startBtn.hide();
  instrBtn.hide();
  backBtn.show();
  backBtn.position(20, 20);
}

function startGame() {
  // Remove buttons and start first level
  startBtn.hide();
  instrBtn.hide();
  backBtn.hide();

  // Recreate levels from original data so keys are restored
  levels = levelsData.levels.map((grid) => new Level(copyGrid(grid), TS));

  loadLevel(0);
  gameState = "playing";
}

function drawMenu() {
  // Draw the pre-rendered static menu background
  if (menuBG) image(menuBG, 0, 0);

  // Title
  fill(20);
  textAlign(CENTER, CENTER);
  textSize(48);
  // Title centered between the top shelves and the key logo
  text("Escape the Library", width / 2, height * 0.3);

  // Large key logo centered above the title
  drawKeyLogo(width / 2, height * 0.18, Math.min(width, height) * 0.25);
  // (no extra instructions text on the home page)
}

// Create a static menu background once (p5.Graphics) so it doesn't animate.
function makeMenuBackground(w, h) {
  const g = createGraphics(w, h);
  g.noStroke();
  g.background(210, 180, 140);

  // deterministic seeded RNG for consistent shelves
  let seed = 1234567;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const shelfCount = 4;
  for (let s = 0; s < shelfCount; s++) {
    const y = (s + 0.6) * (h / shelfCount);
    // shelf board
    g.fill(110, 65, 30);
    g.rect(0, y, w, h / (shelfCount * 6));

    // books on shelf
    const shelfH = Math.floor(h / (shelfCount * 6));
    let x = 40;
    while (x < w - 40) {
      const bw = Math.floor((0.02 + rand() * 0.04) * w);
      const bh = Math.floor(shelfH * (0.5 + rand() * 1.1));
      const col = [
        Math.floor(60 + rand() * 160),
        Math.floor(60 + rand() * 160),
        Math.floor(60 + rand() * 160),
      ];
      g.fill(col[0], col[1], col[2]);
      g.rect(x, y - bh, bw, bh, 3);
      x += bw + Math.floor(6 + rand() * 12);
    }
  }

  return g;
}

function drawInstructions() {
  // Use the same static menu background so the instructions screen matches the title
  if (menuBG) image(menuBG, 0, 0);

  // Centered white rectangle taking 75% of the screen
  const rw = width * 0.75;
  const rh = height * 0.75;
  const rx = (width - rw) / 2;
  const ry = (height - rh) / 2;

  fill(255);
  stroke(200);
  strokeWeight(2);
  rect(rx, ry, rw, rh, 8);
  noStroke();

  // Title at top of the rectangle
  fill(20);
  textAlign(CENTER, TOP);
  textSize(28);
  text("Instructions", width / 2, ry + 20);

  // Instruction lines inside the white panel
  textAlign(LEFT, TOP);
  textSize(16);
  const padding = 28;
  const startX = rx + padding;
  let startY = ry + 64;
  const lines = [
    "- Move with WASD or Arrow keys",
    "- Collect the yellow key before using the exit",
    "- Walls are bookshelves; explore the library!",
    "- Reach the glowing exit after you have the key to advance",
  ];
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], startX, startY + i * 28);
  }
}

// Draw a large decorative key (with teeth) for the title/logo
function drawKeyLogo(cx, cy, diameter) {
  push();
  translate(cx, cy);
  noStroke();

  const scale = diameter / 200; // base size reference

  // shaft
  fill(220, 180, 40);
  rect(
    -diameter * 0.05 * scale - 0,
    -diameter * 0.06 * scale,
    diameter * 0.6,
    diameter * 0.12,
    8 * scale,
  );

  // head (ring) — moved closer to the shaft for a tighter look
  const headX = -diameter * 0.22 * scale;
  fill(210, 170, 40);
  circle(headX, 0, diameter * 0.38 * scale);
  fill(245, 220, 120);
  circle(headX, 0, diameter * 0.22 * scale);

  // teeth (three rectangular teeth) — shifted slightly left so they sit close to the shaft
  fill(200, 150, 30);
  const txStart = diameter * 0.12 * scale;
  const toothW = diameter * 0.07 * scale;
  const toothH = diameter * 0.12 * scale;
  for (let i = 0; i < 3; i++) {
    rect(
      txStart + i * (toothW + 4 * scale),
      -toothH / 2,
      toothW,
      toothH,
      2 * scale,
    );
  }

  // little hole in head
  fill(180, 140, 40);
  circle(-diameter * 0.35 * scale, 0, diameter * 0.06 * scale);

  pop();
}

function drawHUD() {
  // HUD: small level/key text placed near the level (in the gap).
  // If level transform is not set, fall back to top-left.
  // Place HUD at the left edge of the canvas (small margin)
  const x = 8;
  const y = typeof levelScreenY === "number" ? levelScreenY + 12 : 12;

  push();
  textAlign(LEFT, TOP);
  textSize(12);
  noStroke();
  fill(0);
  text(`Level ${li + 1}/${levels.length}`, x, y);

  if (player.hasKey) {
    fill(200, 150, 20);
    text("Key: collected", x, y + 16);
  } else {
    fill(0);
    text("Key: none", x, y + 16);
  }

  // brief feedback (slightly larger, centered above HUD if present)
  if (millis() < needKeyUntil) {
    fill(180, 30, 30);
    textSize(14);
    text("You need the key before exiting!", x, y + 36);
  }
  pop();
}

function keyPressed() {
  /*
  Convert key presses into a movement direction. (WASD + arrows)
  */
  let dr = 0;
  let dc = 0;

  if (keyCode === LEFT_ARROW || key === "a" || key === "A") dc = -1;
  else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") dc = 1;
  else if (keyCode === UP_ARROW || key === "w" || key === "W") dr = -1;
  else if (keyCode === DOWN_ARROW || key === "s" || key === "S") dr = 1;
  else return; // not a movement key

  // Try to move. If blocked, nothing happens.
  const moved = player.tryMove(levels[li], dr, dc);

  if (moved) {
    // If the player stepped on a key, collect it and remove from level.
    if (levels[li].isKey(player.r, player.c)) {
      player.hasKey = true;
      levels[li].clearKey(player.r, player.c);
    }

    // If the player moved onto a goal tile, only advance if they have the key.
    if (levels[li].isGoal(player.r, player.c)) {
      if (player.hasKey) {
        // consume key and advance
        player.hasKey = false;
        nextLevel();
      } else {
        // brief feedback that a key is required
        needKeyUntil = millis() + 800;
      }
    }
  }
}

// ----- Level switching -----

function loadLevel(idx) {
  li = idx;

  const level = levels[li];

  // Place player at the level's start tile (2), if present.
  if (level.start) {
    player.setCell(level.start.r, level.start.c);
  } else {
    // Fallback spawn: top-left-ish (but inside bounds).
    player.setCell(1, 1);
  }

  // Reset key state when a new level loads.
  player.hasKey = false;

  // We keep the canvas fullscreen and scale the level when drawing, so
  // do not resize the canvas here. (Window resizing will trigger `windowResized`.)
}

function nextLevel() {
  // Advance to the next level. If we've finished the last level, show the end screen.
  const next = li + 1;
  if (next >= levels.length) {
    showWin();
  } else {
    loadLevel(next);
  }
}

function showWin() {
  gameState = 'win';
  // hide game buttons
  startBtn.hide();
  instrBtn.hide();
  // show back/menu button so player can return
  backBtn.show();
  backBtn.html('Home');
  backBtn.position((width - backBtn.size().width) / 2, height - 50);
  
  // Add hover effect to Home button
  backBtn.mouseOver(() => {
    backBtn.style('background-color', '#ecd3a3');
    backBtn.style('transform', 'scale(1.05)');
  });
  backBtn.mouseOut(() => {
    backBtn.style('background-color', '#f3e2c7');
    backBtn.style('transform', 'scale(1)');
  });
}

function drawWin() {
  // Exterior library scene: sky, clouds, building facade with bricks, pillars, triangular roof, steps and door

  // sky gradient
  for (let i = 0; i <= height; i++) {
    const t = i / height;
    const r = lerp(135, 200, t);
    const g = lerp(206, 220, t);
    const b = lerp(235, 255, t);
    stroke(r, g, b);
    line(0, i, width, i);
  }
  noStroke();

  // clouds (translucent, moving, varied shapes and spread out)
  const cloudOffset = (millis() * 0.01) % (width * 1.5);
  const cloudSeeds = [0.2, 0.55, 0.95, 1.3, 1.7, 2.1, 2.5]; // more spread
  const cloudSizes = [1.1, 0.7, 1.3, 0.85, 1.15, 0.95, 1.25]; // varied sizes
  const cloudHeights = [0.09, 0.15, 0.07, 0.13, 0.11, 0.16, 0.08]; // varied heights
  const cloudShapes = [
    [1.0, 0.9, 0.85], // cloud shape ratios for ellipses
    [1.2, 0.8, 1.0],
    [0.9, 1.1, 0.95],
    [1.0, 0.85, 1.1],
    [1.15, 1.05, 0.9],
    [0.95, 1.0, 1.2],
    [1.05, 0.95, 0.88]
  ];
  fill(255, 255, 255, 160);
  for (let i = 0; i < 7; i++) {
    const baseX = cloudSeeds[i] * (width / 6.5);
    const cx = (baseX + cloudOffset + i * 120) % (width + 300) - 150;
    const cy = height * cloudHeights[i];
    const s = cloudSizes[i];
    const shape = cloudShapes[i];
    ellipse(cx, cy, 140 * s * shape[0], 70 * s * shape[0]);
    ellipse(cx + 40 * s * shape[1], cy + 6 * s, 110 * s * shape[1], 60 * s * shape[1]);
    ellipse(cx - 40 * s * shape[2], cy + 6 * s, 110 * s * shape[2], 60 * s * shape[2]);
  }

  // ground
  fill(100, 180, 120);
  rect(0, height * 0.75, width, height * 0.25);

  // building facade (skinnier)
  const bw = Math.min(width * 0.52, 650);
  const bh = height * 0.52;
  const bx = (width - bw) / 2;
  const by = height * 0.75 - bh;
  fill(205, 170, 140);
  rect(bx, by, bw, bh, 6);

  // brick texture
  // subtle brick texture: smaller, lighter bricks with soft mortar
  const brickH = 12;
  const brickW = 28;
  for (let ry = by + 12; ry < by + bh - 12; ry += brickH) {
    let offset = (Math.floor((ry - by) / brickH) % 2) * (brickW / 2);
    for (let rx = bx + 12 - offset; rx < bx + bw - 12; rx += brickW + 8) {
      // keep bricks inside facade
      const brx = Math.max(bx + 12, rx);
      const brw = Math.min(brickW, bx + bw - 12 - brx);
      if (brw > 6) {
        fill(190, 150, 130, 180); // lighter, semi-transparent brick
        rect(brx, ry, brw, brickH - 4, 2);
      }
    }
  }

  // triangular roof (taller)
  const roofHeight = bh * 0.32;
  fill(100, 40, 40);
  triangle(bx - 40, by, bx + bw + 40, by, bx + bw / 2, by - roofHeight);
  // roof ridge highlight
  fill(140, 70, 40);
  rect(bx + bw / 2 - 4, by - roofHeight, 8, roofHeight);

  // Norman arched windows
  const cols = 5;
  const winW = bw / (cols * 1.6);
  const winH = bh * 0.28;
  const archRadius = winW / 2;
  for (let i = 0; i < cols; i++) {
    const wx = bx + (i + 0.6) * (bw / cols) - winW / 2;
    const wy = by + bh * 0.18;
    const centerX = wx + winW / 2;
    const archTop = wy;
    const archBase = wy + archRadius;
    
    // window frame (no stroke, consistent fill)
    noStroke();
    fill(80, 100, 130, 220);
    // rectangular bottom portion
    rect(wx, archBase, winW, winH - archRadius);
    // semicircular arch top with same fill
    arc(centerX, archBase, winW, archRadius * 2, PI, 0, CHORD);
    
    // subtle glass reflection
    fill(200, 230, 255, 50);
    rect(wx + 6, archBase + 6, winW - 12, winH - archRadius - 12, 3);
  }

  // door with arch
  const doorW = bw * 0.18;
  const doorH = bh * 0.36;
  const dx = bx + bw / 2 - doorW / 2;
  const dy = by + bh - doorH;
  fill(80, 40, 20);
  rect(dx, dy + doorH * 0.18, doorW, doorH * 0.82, 6);
  fill(120, 80, 40);
  arc(bx + bw / 2, dy + doorH * 0.18, doorW, doorH * 0.36, PI, 0, CHORD);

  // pillars flanking the door that reach up to the roofline
  const pillarW = Math.max(32, bw * 0.06);
  // pillars end right at the facade top (below the roof)
  const pillarTop = by;
  const pillarBottom = by + bh;
  const pillarH = pillarBottom - pillarTop;
  fill(240);
  const p1x = bx + bw * 0.14 - pillarW / 2;
  const p2x = bx + bw * 0.86 - pillarW / 2;
  rect(p1x, pillarTop, pillarW, pillarH, 6);
  rect(p2x, pillarTop, pillarW, pillarH, 6);
  // pillar capitals
  fill(210);
  rect(p1x - 4, pillarTop - 10, pillarW + 8, 12, 4);
  rect(p2x - 4, pillarTop - 10, pillarW + 8, 12, 4);

  // steps
  fill(180);
  rect(bx + bw * 0.16, by + bh - 10, bw * 0.68, 12, 4);
  rect(bx + bw * 0.20, by + bh + 6, bw * 0.60, 8, 4);

  // sign above door
  fill(120, 40, 40);
  rect(bx + bw * 0.32, by + 14, bw * 0.36, 36, 6);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text('LIBRARY', bx + bw / 2, by + 32);

  // celebratory banner below library on the ground
  const bannerY = by + bh + 60;
  fill(240, 210, 60);
  rect(width / 2 - 220, bannerY - 20, 440, 40, 8);
  fill(40);
  textAlign(CENTER, CENTER);
  textSize(28);
  text('Congrats! You escaped!', width / 2, bannerY);

  // small subtext
  textSize(16);
  fill(60);
  text('Thanks for playing.', width / 2, bannerY + 32);
}

// ----- Utility -----

function copyGrid(grid) {
  /*
  Make a deep-ish copy of a 2D array:
  - new outer array
  - each row becomes a new array

  Why copy?
  - Because Level constructor may normalize tiles (e.g., replace 2 with 0)
  - And we don’t want to accidentally mutate the raw JSON data object. 
  */
  return grid.map((row) => row.slice());
}

// ----- Level generator (solvable) -----
function generateSolvableLevel(rows, cols, wallProb = 0.28, maxAttempts = 200) {
  // Ensure minimum size
  rows = Math.max(5, rows);
  cols = Math.max(5, cols);

  function makeEmpty() {
    const g = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(0);
      g.push(row);
    }
    return g;
  }

  function inBounds(r, c) {
    return r >= 0 && c >= 0 && r < rows && c < cols;
  }

  function neighbors(r, c) {
    const out = [];
    const steps = [ [1,0],[-1,0],[0,1],[0,-1] ];
    for (const [dr, dc] of steps) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) out.push([nr, nc]);
    }
    return out;
  }

  function bfs(grid, start, target) {
    const q = [];
    const seen = new Array(rows).fill(0).map(() => new Array(cols).fill(false));
    q.push(start);
    seen[start[0]][start[1]] = true;
    while (q.length) {
      const [r, c] = q.shift();
      if (r === target[0] && c === target[1]) return true;
      for (const [nr, nc] of neighbors(r, c)) {
        if (seen[nr][nc]) continue;
        if (grid[nr][nc] === 1) continue; // wall blocks
        seen[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
    return false;
  }

  // Start cell (choose near top-left as in other levels)
  const start = [1, 1];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const g = makeEmpty();

    // make border walls
    for (let r = 0; r < rows; r++) {
      g[r][0] = 1;
      g[r][cols - 1] = 1;
    }
    for (let c = 0; c < cols; c++) {
      g[0][c] = 1;
      g[rows - 1][c] = 1;
    }

    // random interior walls
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (r === start[0] && c === start[1]) continue;
        if (Math.random() < wallProb) g[r][c] = 1;
      }
    }

    // pick key and goal locations on floor cells
    const floorCells = [];
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) if (g[r][c] === 0) floorCells.push([r, c]);
    if (floorCells.length < 3) continue;

    // helper to choose a random floor cell that is not equal to some others
    function chooseRandom(exclude = []) {
      const pick = floorCells[Math.floor(Math.random() * floorCells.length)];
      for (const e of exclude) if (pick[0] === e[0] && pick[1] === e[1]) return chooseRandom(exclude);
      return pick;
    }

    const key = chooseRandom([start]);
    const goal = chooseRandom([start, key]);

    // Check reachability: start -> key and key -> goal
    if (!bfs(g, start, key)) continue;
    if (!bfs(g, key, goal)) continue;

    // success: mark tiles (2=start, 4=key, 3=goal)
    g[start[0]][start[1]] = 2;
    g[key[0]][key[1]] = 4;
    g[goal[0]][goal[1]] = 3;

    return g;
  }

  // fallback simple level if generator fails after maxAttempts
  const fallback = [
    [1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,1,0,0,0,1],
    [1,0,1,0,0,1,0,1,0,1],
    [1,0,1,0,4,0,0,1,0,1],
    [1,0,0,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,3,1],
    [1,1,1,1,1,1,1,1,1,1]
  ];
  return fallback;
}
