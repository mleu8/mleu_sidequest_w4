/*
Level.js

A Level represents ONE maze grid loaded from levels.json. 

Tile legend (from your original example): 
0 = floor
1 = wall
2 = start
3 = goal

Responsibilities:
- Store the grid
- Find the start tile
- Provide collision/meaning queries (isWall, isGoal, inBounds)
- Draw the tiles (including a goal highlight)
*/

class Level {
  constructor(grid, tileSize) {
    // Store the tile grid and tile size (pixels per tile).
    this.grid = grid;
    this.ts = tileSize;

    // Start position in grid coordinates (row/col).
    // We compute this by scanning for tile value 2.
    this.start = this.findStart();

    // Optional: if you don't want the start tile to remain "special"
    // after you’ve used it to spawn the player, you can normalize it
    // to floor so it draws like floor and behaves like floor.
    if (this.start) {
      this.grid[this.start.r][this.start.c] = 0;
    }
  }

  // ----- Size helpers -----

  rows() {
    return this.grid.length;
  }

  cols() {
    return this.grid[0].length;
  }

  pixelWidth() {
    return this.cols() * this.ts;
  }

  pixelHeight() {
    return this.rows() * this.ts;
  }

  // ----- Semantic helpers -----

  inBounds(r, c) {
    return r >= 0 && c >= 0 && r < this.rows() && c < this.cols();
  }

  tileAt(r, c) {
    // Caller should check inBounds first.
    return this.grid[r][c];
  }

  isWall(r, c) {
    return this.tileAt(r, c) === 1;
  }

  isGoal(r, c) {
    return this.tileAt(r, c) === 3;
  }

  // Key tile: 4 means a collectible key
  isKey(r, c) {
    return this.tileAt(r, c) === 4;
  }

  // Remove a key from the grid after it's collected.
  clearKey(r, c) {
    if (this.inBounds(r, c) && this.isKey(r, c)) this.grid[r][c] = 0;
  }

  // ----- Start-finding -----

  findStart() {
    // Scan entire grid to locate the tile value 2 (start).
    for (let r = 0; r < this.rows(); r++) {
      for (let c = 0; c < this.cols(); c++) {
        if (this.grid[r][c] === 2) {
          return { r, c };
        }
      }
    }

    // If a level forgets to include a start tile, return null.
    // (Then the game can choose a default spawn.)
    return null;
  }

  // ----- Drawing -----

  draw() {
    /*
    Draw each tile as a rectangle.

    Visual rules (matches your original logic): 
    - Walls (1): dark teal
    - Everything else: light floor
    - Goal tile (3): add a highlighted inset rectangle
    */
    for (let r = 0; r < this.rows(); r++) {
      for (let c = 0; c < this.cols(); c++) {
        const v = this.grid[r][c];

        // Draw tile background. Walls become wooden bookshelves.
        if (v === 1) {
          push();
          // wooden shelf background
          noStroke();
          fill(120, 75, 35);
          rect(c * this.ts, r * this.ts, this.ts, this.ts);

          // subtle plank lines for wood texture
          stroke(100, 55, 25, 180);
          strokeWeight(1);
          for (let i = 1; i <= 2; i++) {
            const yline = r * this.ts + (i * this.ts) / 3;
            line(c * this.ts + 4, yline, c * this.ts + this.ts - 4, yline);
          }

          // deterministic pseudo-random generator per cell so books look stable
          let seed = ((r + 1) * 374761393) ^ ((c + 1) * 668265263);
          function rand() {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
          }

          // draw a row of books with varied widths, heights and colors
          noStroke();
          const pad = Math.floor(this.ts * 0.08);
          const shelfX = c * this.ts + pad;
          const shelfY = r * this.ts + pad;
          const shelfW = this.ts - pad * 2;
          const shelfH = this.ts - pad * 2;

          // Choose how many book groups to attempt (3-6)
          const count = Math.floor(rand() * 4) + 3;
          let x = shelfX;

          // palette of book colors
          const palette = [
            [200, 60, 60],
            [60, 120, 200],
            [80, 180, 120],
            [220, 180, 60],
            [160, 80, 200],
            [200, 120, 80],
            [120, 120, 120],
          ];

          for (let i = 0; i < count; i++) {
            if (x >= shelfX + shelfW - 8) break;

            // book width and height variation
            const bw = Math.floor((0.12 + rand() * 0.18) * this.ts);
            const bh = Math.floor((0.5 + rand() * 0.45) * shelfH);

            // pick color from palette deterministically
            const col = palette[Math.floor(rand() * palette.length)];
            fill(col[0], col[1], col[2]);

            // align book bottoms to shelf bottom
            const bx = x;
            const by = r * this.ts + this.ts - pad - bh;
            rect(bx, by, Math.min(bw, shelfX + shelfW - x), bh, 2);

            // small spine highlight
            fill(255, 255, 255, 50);
            rect(
              bx + 2,
              by + 4,
              Math.max(1, Math.floor(bw * 0.15)),
              Math.max(2, bh - 8),
              1,
            );

            // gap to next book
            x += bw + Math.floor(rand() * (this.ts * 0.06 + 1));
          }

          pop();
        } else {
          fill(232);
          rect(c * this.ts, r * this.ts, this.ts, this.ts);
        }

        // Goal highlight overlay (only on tile 3).
        if (v === 3) {
          noStroke();
          fill(255, 200, 120, 200);
          rect(c * this.ts + 4, r * this.ts + 4, this.ts - 8, this.ts - 8, 6);
        }

        // Key draw (tile value 4): a small yellow key-like shape.
        if (v === 4) {
          noStroke();
          fill(220, 180, 20);
          const cx = c * this.ts + this.ts * 0.5;
          const cy = r * this.ts + this.ts * 0.5;
          // simple key: circle + rectangle 'teeth'
          circle(cx - 6, cy, this.ts * 0.24);
          rect(cx - 2, cy - 6, this.ts * 0.5, this.ts * 0.18, 3);
          // teeth
          rect(cx + this.ts * 0.2, cy - 3, this.ts * 0.06, this.ts * 0.06);
        }
      }
    }
  }
}
