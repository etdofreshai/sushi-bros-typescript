# 🍣 Sushi Bros — Game Development Plan

> Generated from analysis of `src/main.ts` (~1050 lines, single-file architecture)

---

## 1. Known Bugs to Fix

### BUG-1: Trees move with scrolling (not world-anchored)
**Location:** `drawScrollingBackground()`, lines ~490-510 (tree drawing loop)
```js
const hash = (Math.floor(scrollY / 300) + i * 4517) % 10007
const worldY = (hash % 800) + scrollY - 200
```
**Problem:** The `hash` input uses `Math.floor(scrollY / 300)`, which changes as the camera scrolls. This means tree positions are recomputed relative to the current scroll position, causing them to jump/shift every 300 pixels of scroll. Trees should have fixed world-Y positions determined once (like enemies use `worldY`).

**Fix:** Assign tree positions based on a fixed world grid (e.g., every ~300 world-Y units) using a stable seed that doesn't depend on `scrollY`. Generate tree positions the same way enemies are spawned — in world space, with a deterministic hash based solely on their grid cell index.

### BUG-2: Enemy bullets don't account for camera scroll
**Location:** `updateProjectiles()`, lines ~430-436
```js
p.pos.x += p.vel.x; p.pos.y += p.vel.y; p.life--
```
**Problem:** Enemy projectiles are spawned at screen-space positions (`en.pos.x`, `en.pos.y` which are already screen-converted) and move with fixed velocity. However, when the camera scrolls (player moves up), the projectiles don't compensate for scroll movement. Since enemies are re-projected each frame via `en.pos.y = canvas.height - (en.worldY - scrollY)`, but projectiles use raw screen coords, projectiles effectively move faster downward than intended (camera scroll adds to their apparent downward speed).

**Fix:** Either:
- (a) Store projectile positions in **world space** (like enemies) and convert to screen space for rendering, or
- (b) Apply the scroll delta each frame: when `scrollY` increases by `diff`, shift all projectile screen-Y positions by `+diff` (same direction as enemies shift).

Option (a) is cleaner. Add `worldX`/`worldY` to the `EnemyProjectile` interface and convert in the draw step.

### BUG-3: Player sushi projectiles also don't account for camera scroll
**Location:** Sushi update in `update()`, lines ~340-345
```js
s.pos.x += s.vel.x; s.pos.y += s.vel.y; s.life--
```
**Same issue as BUG-2.** When the camera scrolls up (player moves forward), sushi projectiles fired upward appear to slow down (scroll subtracts from their visual speed). Less noticeable since players fire upward and scroll is upward, but still physically incorrect.

### BUG-4: Sand dots and grass tufts use unstable procedural generation
**Location:** `drawScrollingBackground()`, sand dots (~lines 470-485) and grass tufts (~lines 487-500)
```js
const sandSeed = Math.floor(scrollY / 50)
```
**Problem:** Like the trees, these decorations shift/pop every 50 pixels of scroll because the seed changes discretely with `scrollY`. They should be generated from stable world-space positions.

### BUG-5: `scrollSpeed` is set but never used
**Location:** Line ~110: `let scrollSpeed = 1.2`
The variable is initialized and reassigned in `startGame()` but never referenced in the update loop. Camera scroll is purely player-driven (line ~335: `scrollY += diff`). Either remove this dead variable or implement auto-scrolling if that was the intent.

### BUG-6: `boatY` variable is unused
**Location:** Line ~113: `let boatY = canvas.height * 0.7`
Set in `startGame()` but never read. Dead code — remove it.

### BUG-7: `lastEnemySpawn` is unused
**Location:** Line ~111: `let lastEnemySpawn = 0`
Never referenced. Remove.

---

## 2. Core Game Structure

### Current State
- **Menu:** Basic text-based menu with title, controls hint, control mode toggle. No navigation.
- **Playing:** Infinite vertical scrolling, enemy spawning gets harder over distance, no win condition.
- **Game Over:** Score display, play again / main menu buttons. Works.
- **No levels, no bosses, no level completion.**

### Existing Terrain Types (in `getTerrainAt()`)
| Type | Color | World-Y Range | Notes |
|------|-------|--------------|-------|
| `water` | `#1a3a5c` | 0–800, cyclic patches | Player rides a boat, no lateral movement |
| `sand` | `#c2a65a` | 800–1600, cyclic patches | Beach theme |
| `grass` | `#2d7a2d` | 2000+, dominant | Island/forest theme |

These map perfectly to **3 levels**:

### Proposed Level Structure

#### Level 1: "Ocean Voyage" (Water)
- World Y: 0 → 2000
- Terrain: Mostly water with sand shores appearing
- Enemies: Crabs (floating on debris), seagulls
- Boss: **Giant Octopus** — 8 tentacle swipe attacks, ink projectiles
- Player: On boat, restricted movement (already implemented!)

#### Level 2: "Beach Landing" (Sand)
- World Y: 0 → 2500
- Terrain: Sand dominant, some grass patches
- Enemies: Crabs (more frequent), fishermen appear
- Boss: **Giant Crab King** — charge attacks, spawns mini-crabs
- Player: On foot, full movement

#### Level 3: "Island Interior" (Grass)
- World Y: 0 → 3000
- Terrain: Grass with trees as obstacles
- Enemies: All types, higher density, faster
- Boss: **Master Fisherman** — casts net traps, rapid-fire hooks, summons seagulls
- Player: Must dodge trees (collision)

### Screen Flow
```
[Main Menu] → [Level Select / Start]
    ↓
[Level 1: Ocean] → [Level 1 Complete!] → [Level 2: Beach] → [Level 2 Complete!] → [Level 3: Island]
    ↓ (death)          ↓                      ↓ (death)                                  ↓
[Game Over] ←──────────────────────────────────────────────────────────── [Level 3 Complete! / Victory!]
    ↓
[Main Menu]
```

### Required New Screens
1. **Main Menu** (enhance existing `drawMenu()`): Add "Start Game", "High Scores", "Controls" as selectable items
2. **Level Intro** splash: "Level 1: Ocean Voyage" with 2-second fade
3. **Level Complete** screen: Score tally, "Next Level" button
4. **Victory** screen: After beating Level 3
5. **Boss Warning**: "WARNING!" flash before boss appears

---

## 3. Feature Roadmap

### Phase 1: Bug Fixes (1-2 days)
- [ ] **BUG-1:** Fix tree positions — use stable world-space grid
- [ ] **BUG-2:** Convert enemy projectiles to world space
- [ ] **BUG-3:** Convert sushi projectiles to world space
- [ ] **BUG-4:** Fix sand/grass decorations to use stable world positions
- [ ] **BUG-5/6/7:** Remove dead variables (`scrollSpeed`, `boatY`, `lastEnemySpawn`)

### Phase 2: Menu + Game Flow (2-3 days)
- [ ] Add `GameState` values: `'levelIntro' | 'levelComplete' | 'victory'`
- [ ] Add `currentLevel: number` (1-3) to state
- [ ] Add level config object: `{ name, targetDistance, terrainFn, enemyWeights, scrollSpeed }`
- [ ] Implement `drawLevelIntro()`, `drawLevelComplete()`, `drawVictory()` screens
- [ ] Add level transition logic: when `distance >= level.targetDistance` and no boss alive → level complete
- [ ] Enhance main menu: selectable items with keyboard/touch nav
- [ ] Add high score table (top 5, stored in localStorage)
- [ ] Persist level progress in localStorage

### Phase 3: Level Design (2-3 days)
- [ ] Create `LevelConfig` type with per-level terrain generation functions
- [ ] Refactor `getTerrainAt()` to be level-aware
- [ ] Level 1: Water-dominant, slow scroll encouragement, boats as scenery
- [ ] Level 2: Sand + grass mix, introduce tree obstacles (collision), more enemies
- [ ] Level 3: Dense grass/forest, all enemy types, highest density
- [ ] Difficulty curve: enemy `hp`, `shootTimer`, spawn density, projectile speed scale per level
- [ ] Add level-specific decorations (coral for water, shells for sand, flowers for grass)

### Phase 4: Boss Fights (3-4 days)
- [ ] Create `Boss` interface extending `Enemy` with phases, attack patterns, health bar
- [ ] **Level 1 Boss — Giant Octopus:**
  - Phase 1: Sweeping tentacle (arc hitbox)
  - Phase 2 (<50% HP): Ink spray (spread projectiles)
  - Visual: Large sprite, tentacle animation
- [ ] **Level 2 Boss — Crab King:**
  - Phase 1: Side-to-side charge
  - Phase 2: Spawn 4 mini-crabs, bubble shield
  - Visual: Oversized crab with crown
- [ ] **Level 3 Boss — Master Fisherman:**
  - Phase 1: Cast net (area denial), hook throw (aimed projectile)
  - Phase 2: Rapid hooks, summons seagull waves
  - Visual: Large fisherman on a dock/platform
- [ ] Boss health bar UI (top of screen, segmented)
- [ ] Stop camera scroll during boss fights
- [ ] "WARNING" screen flash + audio cue before boss

### Phase 5: Polish (ongoing)
- [ ] **Screen transitions:** Fade-to-black between levels (canvas alpha overlay)
- [ ] **Particle effects:** Explosion on enemy death (enhance existing `spawnParticles`), water splash when entering/leaving water, sushi trail particles
- [ ] **Animations:** Player walk cycle (alternate sprite), enemy death animation (flash + expand before disappearing)
- [ ] **Audio improvements:**
  - Background music loop (procedural using Web Audio oscillators — extend existing pattern)
  - Level-specific ambient sounds (waves for water, wind for grass)
  - Boss music (more intense oscillator pattern)
  - Victory jingle
- [ ] **Screen shake** on boss hits and player damage
- [ ] **Power-ups:** Speed boost, triple-shot sushi, shield, extra life — spawn as drops from enemies
- [ ] **Score multiplier** for consecutive hits without taking damage
- [ ] **Mini-map** or progress bar showing distance to boss/level end

---

## 4. Technical Notes

### Current Architecture
- **Single file** (`main.ts`, ~1050 lines) — manageable now but will balloon with bosses/levels
- **No game loop abstraction** — `update()` and `draw()` are monolithic functions with inline state checks
- **State machine** is implicit via `if (state === 'menu')` checks scattered through update/draw
- **Entity management** uses plain arrays with `splice()` — fine for current scale
- **Input handling** is well-structured with dual keyboard/touch support — this is **solid, don't rewrite**
- **Audio** uses Web Audio API procedural SFX — clever and dependency-free, **keep this approach**
- **Terrain generation** via `getTerrainAt()` deterministic hash — good concept, buggy implementation (see BUG-1/4)

### What's Already Solid ✅
- Touch controls (dual-stick with virtual joysticks) — well-polished
- Player rendering with terrain-aware boat mode
- Enemy type system with distinct behaviors (crab/seagull/fisherman)
- Particle system
- SFX system (procedural, no assets needed)
- Responsive canvas (portrait/landscape detection)
- HUD with score, lives, distance, terrain indicator
- Game over screen with buttons
- Pause functionality
- localStorage for high score and control preferences

### What Needs Rework 🔧
- **World-space consistency:** Decorations (trees, sand dots, grass tufts) must use stable world coordinates like enemies do
- **Projectile coordinate system:** Both sushi and enemy projectiles should be in world space
- **Level/state management:** Needs a proper level config system instead of hardcoded terrain thresholds
- **`getTerrainAt()`:** Currently uses absolute world-Y with hardcoded thresholds — needs to be level-relative

### Suggested Code Organization (Phase 2+)
If the file exceeds ~1500 lines, split into modules:
```
src/
  main.ts          — Entry point, game loop, state machine
  player.ts        — Player state, movement, rendering
  enemies.ts       — Enemy types, spawning, AI, rendering
  bosses.ts        — Boss definitions, attack patterns
  projectiles.ts   — Sushi + enemy projectile systems
  terrain.ts       — Terrain generation, background rendering
  hud.ts           — Score, lives, touch controls, menus
  audio.ts         — All SFX functions
  levels.ts        — Level configs, progression
  types.ts         — Shared interfaces (Vec2, Enemy, etc.)
  particles.ts     — Particle system
```
Keep it as a single file until it becomes painful. The Vite setup makes splitting easy when needed.

### Key Variables & Functions Reference
| Name | Purpose | Notes |
|------|---------|-------|
| `scrollY` | Camera position (world units scrolled) | Core to all world↔screen conversions |
| `getTerrainAt(worldY)` | Returns terrain type at world position | Needs per-level refactor |
| `spawnEnemiesAhead()` | Generates enemies in world space ahead of camera | Good pattern, extend for bosses |
| `nextEnemyWorldY` | Tracks furthest enemy spawn point | Per-level reset needed |
| `updateEnemies()` | Moves enemies, converts world→screen, handles shooting | Solid, extend for boss AI |
| `drawScrollingBackground()` | Renders terrain, decorations, trees | Has bugs (BUG-1/4), needs fixing |
| `playerDamage()` | Handles hit, lives, game over transition | Add screen shake here |
| `startGame()` | Resets all state | Needs level parameter |
| `resetPlayer()` | Respawn player at default position | Fine as-is |

---

## Summary Priority Matrix

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Fix tree/decoration scrolling bugs | Small | High (visual) |
| 🔴 P0 | Fix projectile world-space bugs | Small | High (gameplay) |
| 🟡 P1 | Level system + game flow | Medium | High (structure) |
| 🟡 P1 | 3 distinct levels with configs | Medium | High (content) |
| 🟢 P2 | Boss fights | Large | High (gameplay) |
| 🟢 P2 | Enhanced menus | Small | Medium (UX) |
| 🔵 P3 | Power-ups | Medium | Medium (depth) |
| 🔵 P3 | Audio/visual polish | Medium | Medium (feel) |
