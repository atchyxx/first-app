# Copilot Instructions

説明は日本語で表示するようにして。

## Project Overview

A browser-based side-scrolling action game built with vanilla HTML/CSS/JS and the Canvas 2D API. No build tools, no dependencies — open `index.html` directly in a browser to run.

## Architecture

Three files, each with a distinct role:

| File | Role |
|------|------|
| `index.html` | DOM structure: canvas, HUD (`#score`, `#lives`), overlay, controls hint |
| `style.css` | Layout and visual styling; game visuals are drawn on canvas, not via CSS |
| `game.js` | All game logic: constants, input, game loop, physics, rendering |

### game.js structure (top-to-bottom)

1. **DOM refs + canvas setup** — canvas is fixed at 800×450
2. **Constants** — `GRAVITY`, `JUMP_FORCE`, `PLAYER_SPEED`, `WORLD_WIDTH`
3. **`keys` map** — keyboard state tracked via `keydown`/`keyup` on `window`
4. **`player` object** — has `reset()`, `update()`, `draw()` methods; holds physics state (`vx`, `vy`, `onGround`, `invincible`, `frame`)
5. **`collideRect(a, b)`** — AABB collision used for all entity interactions
6. **`generateLevel()`** — populates the module-level arrays `platforms`, `coins`, `enemies` from hardcoded data
7. **`goal`** — static object at `WORLD_WIDTH - 80`
8. **`updateCamera()`** — camera tracks player at 1/3 from left; clamped to world bounds
9. **`drawBackground()`** — gradient sky + parallax clouds (0.3× scroll speed)
10. **`gameLoop()` / `update()` / `render()`** — standard rAF loop; only runs when `gameState === 'playing'`
11. **`startGame()` / `endGame(won)`** — lifecycle management

## Key Conventions

### Coordinate system
All world objects use world-space coordinates (x, y in `[0, WORLD_WIDTH]`). The camera offset `cameraX` is applied once via `ctx.translate(-cameraX, 0)` in `render()`, **except for the player** which calls `player.draw()` outside that translate block and handles the offset manually (`sx = this.x - cameraX`).

### Player flip for facing direction
The player is always drawn facing right in code. Left-facing is achieved by `ctx.translate(cx * 2, 0); ctx.scale(-1, 1)` around the character center `cx`.

### Entity shape
All entities (`player`, platforms, coins, enemies, `goal`) are plain objects with `{x, y, w, h}`. This makes them directly usable with `collideRect()`.

### Platform collision priority
Collision is resolved in this order: land-on-top → hit-from-below → push-from-side. The landing check uses a 1px tolerance with previous-frame position (`this.y + this.h - this.vy <= p.y + 1`).

### Invincibility frames
`player.invincible` counts down from 90 frames (~1.5s at 60fps) after taking damage. Enemy collision is skipped while `invincible > 0`. The player blinks by skipping `draw()` every 5 frames.

### Scoring
- Coin: +10
- Goal reached: +200

### Adding new entity types
Follow the pattern of `enemies`: define a data array in `generateLevel()`, update positions in `update()`, draw in `render()` inside the `ctx.translate(-cameraX, 0)` block.
