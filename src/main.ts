import './style.css'

// ─── Canvas Setup ───
const canvas = document.createElement('canvas')
document.getElementById('app')!.appendChild(canvas)
const ctx = canvas.getContext('2d')!

let isPortrait = true

function resize() {
  canvas.width = innerWidth
  canvas.height = innerHeight
  isPortrait = innerHeight > innerWidth
}
resize()
addEventListener('resize', resize)

// ─── Audio ───
const audioCtx = new AudioContext()

function sfxSushiThrow() {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain()
  o.connect(g); g.connect(audioCtx.destination)
  o.type = 'sine'
  o.frequency.setValueAtTime(600, audioCtx.currentTime)
  o.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.12)
  g.gain.setValueAtTime(0.1, audioCtx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12)
  o.start(); o.stop(audioCtx.currentTime + 0.12)
}

function sfxPoleSwing() {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain()
  o.connect(g); g.connect(audioCtx.destination)
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(150, audioCtx.currentTime)
  o.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25)
  g.gain.setValueAtTime(0.08, audioCtx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25)
  o.start(); o.stop(audioCtx.currentTime + 0.25)
}

function sfxHit() {
  const t = audioCtx.currentTime
  const noiseLen = audioCtx.sampleRate * 0.3
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1)
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuf
  const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'
  lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(50, t + 0.3)
  const g = audioCtx.createGain()
  g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination)
  src.start(t); src.stop(t + 0.3)
}

function sfxPlayerHit() {
  const t = audioCtx.currentTime
  const o = audioCtx.createOscillator(), g = audioCtx.createGain()
  o.connect(g); g.connect(audioCtx.destination)
  o.type = 'square'
  o.frequency.setValueAtTime(200, t)
  o.frequency.exponentialRampToValueAtTime(50, t + 0.5)
  g.gain.setValueAtTime(0.12, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
  o.start(t); o.stop(t + 0.5)
}

function sfxSplash() {
  const t = audioCtx.currentTime
  const len = audioCtx.sampleRate * 0.4
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = audioCtx.createBufferSource(); src.buffer = buf
  const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'
  bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(200, t + 0.4)
  const g = audioCtx.createGain()
  g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  src.connect(bp); bp.connect(g); g.connect(audioCtx.destination)
  src.start(t); src.stop(t + 0.4)
}

// ─── Types ───
interface Vec2 { x: number; y: number }

type EnemyType = 'crab' | 'seagull' | 'fisherman'
interface Enemy {
  pos: Vec2; vel: Vec2; type: EnemyType; hp: number; radius: number
  timer: number; shootTimer: number; animFrame: number
  worldY: number; baseX: number; moveFactor: number
}

interface Sushi { pos: Vec2; vel: Vec2; life: number }
interface EnemyProjectile { pos: Vec2; vel: Vec2; life: number }

interface PoleSwing {
  angle: number; timer: number; maxTimer: number; radius: number
}

interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string }

interface Player {
  pos: Vec2; vel: Vec2; radius: number; facing: number
  invulnTimer: number; visible: boolean; respawnTimer: number
}

// ─── Terrain ───
type TerrainType = 'water' | 'sand' | 'grass'
const TERRAIN_COLORS: Record<TerrainType, string> = {
  water: '#1a3a5c',
  sand: '#c2a65a',
  grass: '#2d7a2d'
}

// ─── Control Mode ───
type ControlMode = 'direction' | 'spin'
let controlMode: ControlMode = (localStorage.getItem('sushi-bros-ctrl') as ControlMode) || 'direction'

// ─── State ───
type GameState = 'menu' | 'playing' | 'gameover'
let state: GameState = 'menu'
let score = 0
let highScore = parseInt(localStorage.getItem('sushi-bros-hi') || '0')
let lives = 3
let scrollY = 0 // total scroll distance (increases)
let scrollSpeed = 1.2
let player: Player
let sushis: Sushi[] = []
let enemies: Enemy[] = []
let enemyProjectiles: EnemyProjectile[] = []
let particles: Particle[] = []
let poleSwing: PoleSwing | null = null
let frameCount = 0
let paused = false
let lastEnemySpawn = 0
let distance = 0
let boatY = 0 // intro boat position

// Terrain segments - each covers SEGMENT_H pixels of world height
const SEGMENT_H = 200
// We generate terrain as rows; terrainMap[worldRow] = terrain type
// worldRow = Math.floor(worldY / SEGMENT_H)
// The world scrolls: worldY increases as player progresses
// Screen shows worldY = scrollY at bottom, scrollY + canvas.height at top

// Simple deterministic hash for stable terrain transitions
function hashY(y: number): number {
  let h = (y * 2654435761) | 0
  h = ((h >>> 16) ^ h) * 0x45d9f3b | 0
  h = ((h >>> 16) ^ h) | 0
  return (h & 0x7fffffff) / 0x7fffffff // 0..1
}

function getTerrainAt(worldY: number): TerrainType {
  // worldY increases upward (forward progress)
  // Start on water, transition to sand then grass
  const d = worldY
  // Quantize to avoid per-pixel noise in transitions
  const qd = Math.floor(d / 8) * 8
  if (d < 800) return 'water'
  if (d < 1200) return hashY(qd) > (d - 800) / 400 ? 'water' : 'sand'
  if (d < 1600) return 'sand'
  if (d < 2000) return hashY(qd) > (d - 1600) / 400 ? 'sand' : 'grass'
  // After 2000: mostly grass with occasional sand/water patches
  const cycle = (d % 3000)
  if (cycle < 2000) return 'grass'
  if (cycle < 2400) return 'sand'
  if (cycle < 2600) return 'water'
  if (cycle < 3000) return 'sand'
  return 'grass'
}

function getTerrainColor(worldY: number): string {
  const t = getTerrainAt(worldY)
  return TERRAIN_COLORS[t]
}

// ─── Input ───
const keys: Record<string, boolean> = {}
addEventListener('keydown', e => {
  keys[e.code] = true
  if (state === 'menu' && e.code === 'Tab') { e.preventDefault(); toggleControlMode() }
  if (state === 'menu' && (e.code === 'Enter' || e.code === 'Space')) startGame()
  if (state === 'gameover' && e.code === 'Enter') startGame()
  if (state === 'gameover' && e.code === 'Escape') { state = 'menu' }
  if (state === 'playing' && (e.code === 'Escape' || e.code === 'KeyP')) { paused = !paused }
})
addEventListener('keyup', e => { keys[e.code] = false })

// ─── Touch Controls ───
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

const dpad = { left: false, right: false, up: false, down: false }
let dpadAngle: number | null = null
let dpadTouchId: number | null = null
let fireActive = false
let fireTouchId: number | null = null
let fireAutoTimer: ReturnType<typeof setInterval> | null = null
let firePos_: Vec2 | null = null
let fireOpacity = 0.35
let fireCenter: Vec2 | null = null
let fireThumb: Vec2 = { x: 0, y: 0 }
let shootAngle: number = -Math.PI / 2
let fireStickActive = false
let dpadOpacity = 0.35
let poleActive = false
let poleTouchId: number | null = null

const DPAD_R = 55
const DPAD_DEAD = 14
const BTN_R = 38
const POLE_R = Math.round(BTN_R * 0.7)

let joystickCenter: Vec2 | null = null
let joystickThumb: Vec2 = { x: 0, y: 0 }
const JOYSTICK_ZONE_X = 0.5

function dpadPos() { return joystickCenter || { x: 90, y: canvas.height - 280 } }
function firePos() { return firePos_ || { x: canvas.width - 85, y: canvas.height - 280 } }
function polePos() {
  const fp = firePos()
  const gap = BTN_R + POLE_R + 20
  if (fp.y - gap - POLE_R < 60) return { x: fp.x, y: fp.y + gap }
  return { x: fp.x, y: fp.y - gap }
}

function hitTest(tx: number, ty: number, cx: number, cy: number, r: number) {
  return Math.hypot(tx - cx, ty - cy) < r + 20
}

function updateDpad(tx: number, ty: number) {
  if (!joystickCenter) return
  const dx = tx - joystickCenter.x, dy = ty - joystickCenter.y
  const d = Math.hypot(dx, dy)
  if (d > DPAD_R) {
    const nx = dx / d, ny = dy / d
    joystickCenter.x = tx - nx * DPAD_R
    joystickCenter.y = ty - ny * DPAD_R
  }
  joystickThumb = { x: tx, y: ty }
  const fdx = tx - joystickCenter.x, fdy = ty - joystickCenter.y
  const fd = Math.hypot(fdx, fdy)
  dpad.left = false; dpad.right = false; dpad.up = false; dpad.down = false
  dpadAngle = null
  if (fd > DPAD_DEAD) {
    const a = Math.atan2(fdy, fdx)
    dpadAngle = a
    dpad.up = true // signal active
  }
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  if (state === 'menu') {
    const t0 = e.changedTouches[0]
    const b = ctrlToggleBounds
    if (t0.clientX >= b.x && t0.clientX <= b.x + b.w && t0.clientY >= b.y && t0.clientY <= b.y + b.h) {
      toggleControlMode(); return
    }
    startGame(); return
  }
  if (state === 'gameover') {
    const t0 = e.changedTouches[0]
    handleGameOverClick(t0.clientX, t0.clientY)
    return
  }
  {
    const t0 = e.changedTouches[0]
    const pb = pauseBtnBounds()
    if (t0.clientX >= pb.x - 10 && t0.clientX <= pb.x + pb.w + 10 &&
        t0.clientY >= pb.y - 10 && t0.clientY <= pb.y + pb.h + 10) {
      paused = !paused; return
    }
  }
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i]
    const hp = polePos()
    const TOUCH_TOP_LIMIT = canvas.height * 0.3
    if (dpadTouchId === null && t.clientX < canvas.width * JOYSTICK_ZONE_X && t.clientY > TOUCH_TOP_LIMIT) {
      dpadTouchId = t.identifier
      joystickCenter = { x: t.clientX, y: t.clientY }
      joystickThumb = { x: t.clientX, y: t.clientY }
      dpad.left = false; dpad.right = false; dpad.up = false
    } else if (hitTest(t.clientX, t.clientY, hp.x, hp.y, POLE_R)) {
      poleTouchId = t.identifier; poleActive = true; activatePole()
    } else if (fireTouchId === null && t.clientX > canvas.width * JOYSTICK_ZONE_X && t.clientY > TOUCH_TOP_LIMIT) {
      fireTouchId = t.identifier; fireActive = true; fireOpacity = 1
      firePos_ = { x: t.clientX, y: t.clientY }
      fireCenter = { x: t.clientX, y: t.clientY }
      fireThumb = { x: t.clientX, y: t.clientY }
      fireStickActive = false
      if (!fireAutoTimer) fireAutoTimer = setInterval(() => { if (fireActive && fireStickActive) throwSushi() }, 220)
    }
  }
}, { passive: false })

canvas.addEventListener('touchmove', e => {
  e.preventDefault()
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i]
    if (t.identifier === dpadTouchId) updateDpad(t.clientX, t.clientY)
    if (t.identifier === fireTouchId) {
      firePos_ = { x: t.clientX, y: t.clientY }
      fireThumb = { x: t.clientX, y: t.clientY }
      if (fireCenter) {
        const fdx = t.clientX - fireCenter.x, fdy = t.clientY - fireCenter.y
        const fd = Math.hypot(fdx, fdy)
        if (fd > DPAD_DEAD) {
          shootAngle = Math.atan2(fdy, fdx)
          fireStickActive = true
          if (fd > DPAD_R) {
            const nx = fdx / fd, ny = fdy / fd
            fireCenter.x = t.clientX - nx * DPAD_R
            fireCenter.y = t.clientY - ny * DPAD_R
          }
        } else {
          fireStickActive = false
        }
      }
    }
  }
}, { passive: false })

canvas.addEventListener('touchend', e => {
  e.preventDefault()
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i]
    if (t.identifier === dpadTouchId) { dpadTouchId = null; joystickCenter = null; dpad.left = false; dpad.right = false; dpad.up = false; dpad.down = false; dpadAngle = null }
    if (t.identifier === fireTouchId) {
      throwSushi()
      fireTouchId = null; fireActive = false; fireStickActive = false; fireCenter = null
      if (fireAutoTimer) { clearInterval(fireAutoTimer); fireAutoTimer = null }
    }
    if (t.identifier === poleTouchId) { poleTouchId = null; poleActive = false }
  }
}, { passive: false })

canvas.addEventListener('touchcancel', e => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === dpadTouchId) { dpadTouchId = null; joystickCenter = null; dpad.left = false; dpad.right = false; dpad.up = false; dpad.down = false; dpadAngle = null }
    if (e.changedTouches[i].identifier === fireTouchId) { fireTouchId = null; fireActive = false; fireStickActive = false; fireCenter = null; if (fireAutoTimer) { clearInterval(fireAutoTimer); fireAutoTimer = null } }
    if (e.changedTouches[i].identifier === poleTouchId) { poleTouchId = null; poleActive = false }
  }
})

function toggleControlMode() {
  controlMode = controlMode === 'spin' ? 'direction' : 'spin'
  localStorage.setItem('sushi-bros-ctrl', controlMode)
}

let ctrlToggleBounds = { x: 0, y: 0, w: 0, h: 0 }

const PAUSE_BTN_SIZE = 36
function pauseBtnBounds() {
  return { x: canvas.width - PAUSE_BTN_SIZE - 15, y: 42, w: PAUSE_BTN_SIZE, h: PAUSE_BTN_SIZE }
}

canvas.addEventListener('click', e => {
  if (state === 'playing') {
    const pb = pauseBtnBounds()
    if (e.clientX >= pb.x && e.clientX <= pb.x + pb.w && e.clientY >= pb.y && e.clientY <= pb.y + pb.h) {
      paused = !paused
    }
  }
  if (state === 'gameover') handleGameOverClick(e.clientX, e.clientY)
})

// ─── Actions ───
function throwSushi() {
  if (state !== 'playing' || !player.visible || sushis.length >= 10) return
  if (audioCtx.state === 'suspended') audioCtx.resume()
  sfxSushiThrow()
  const speed = 7
  // On touch use right-stick aim angle; on keyboard use facing direction
  const angle = (isTouchDevice && fireActive) ? shootAngle : player.facing
  sushis.push({
    pos: { x: player.pos.x + Math.cos(angle) * 16, y: player.pos.y + Math.sin(angle) * 16 },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    life: 80
  })
}

function activatePole() {
  if (state !== 'playing' || !player.visible || poleSwing) return
  if (audioCtx.state === 'suspended') audioCtx.resume()
  sfxPoleSwing()
  poleSwing = {
    angle: player.facing - Math.PI * 0.6,
    timer: 20,
    maxTimer: 20,
    radius: 45
  }
}

// ─── Game Init ───
function startGame() {
  if (audioCtx.state === 'suspended') audioCtx.resume()
  state = 'playing'
  score = 0; lives = 3; distance = 0
  scrollY = 0; scrollSpeed = 1.2
  sushis = []; enemies = []; enemyProjectiles = []; particles = []
  poleSwing = null
  nextEnemyWorldY = 400
  boatY = canvas.height * 0.7
  resetPlayer()
}

function resetPlayer() {
  player = {
    pos: { x: canvas.width / 2, y: canvas.height * 0.7 },
    vel: { x: 0, y: 0 },
    radius: 14,
    facing: -Math.PI / 2, // up
    invulnTimer: 180,
    visible: true,
    respawnTimer: 0
  }
}

// Track the furthest world-Y we've spawned enemies up to
let nextEnemyWorldY = 400

function spawnEnemiesAhead() {
  // Spawn enemies in world space ahead of the camera
  const cameraTopWorldY = scrollY + canvas.height + 200 // a bit above screen
  while (nextEnemyWorldY < cameraTopWorldY) {
    // Spawn 1-3 enemies per "row"
    const count = 1 + Math.floor(Math.random() * 2)
    for (let c = 0; c < count; c++) {
      const types: EnemyType[] = ['crab', 'seagull', 'fisherman']
      const diff = Math.min(nextEnemyWorldY / 5000, 1)
      const weights = [
        1 - diff * 0.3,
        0.3 + diff * 0.4,
        diff * 0.5
      ]
      const total = weights.reduce((a, b) => a + b)
      let r = Math.random() * total, type: EnemyType = 'crab'
      for (let i = 0; i < types.length; i++) {
        r -= weights[i]
        if (r <= 0) { type = types[i]; break }
      }

      const x = 30 + Math.random() * (canvas.width - 60)
      // Movement scales with distance: static early, very slow later
      // No downward velocity — they don't come at you
      const moveFactor = Math.min(nextEnemyWorldY / 8000, 0.6) // max 60% of original speed
      const enemy: Enemy = {
        pos: { x, y: 0 }, // screen Y computed from worldY each frame
        vel: { x: 0, y: 0 },
        type,
        hp: type === 'fisherman' ? 3 : type === 'seagull' ? 1 : 2,
        radius: type === 'fisherman' ? 16 : type === 'seagull' ? 12 : 14,
        timer: Math.random() * 200, // randomize animation phase
        shootTimer: 80 + Math.random() * 120,
        animFrame: 0,
        worldY: nextEnemyWorldY,
        baseX: x,
        moveFactor
      } as any
      // Slow lateral drift based on distance
      if (moveFactor > 0.05) {
        enemy.vel.x = (Math.random() - 0.5) * 1.5 * moveFactor
      }
      enemies.push(enemy)
    }
    nextEnemyWorldY += 100 + Math.random() * 150
  }
}

function spawnParticles(x: number, y: number, count: number, colors: string[]) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const s = Math.random() * 3
    particles.push({
      pos: { x, y }, vel: { x: Math.cos(a) * s, y: Math.sin(a) * s },
      life: 15 + Math.random() * 25, maxLife: 40,
      color: colors[Math.floor(Math.random() * colors.length)]
    })
  }
}

// ─── Update ───
function update() {
  frameCount++

  if (state === 'menu') return
  if (state === 'gameover') return
  if (paused) return

  // Respawn logic
  if (player.respawnTimer > 0) {
    player.respawnTimer--
    if (player.respawnTimer === 0) {
      resetPlayer()
    }
    updateEnemies()
    updateProjectiles()
    updateParticles()
    return
  }

  // Determine terrain under player
  const playerWorldYForTerrain = scrollY + (canvas.height - player.pos.y)
  const playerTerrain = getTerrainAt(playerWorldYForTerrain)
  const onWater = playerTerrain === 'water'

  // Player movement
  let moveX = 0, moveY = 0

  // Keyboard
  if (keys['ArrowLeft'] || keys['KeyA']) moveX -= 1
  if (keys['ArrowRight'] || keys['KeyD']) moveX += 1
  if (keys['ArrowUp'] || keys['KeyW']) moveY -= 1
  if (keys['ArrowDown'] || keys['KeyS']) moveY += 1

  // Touch joystick
  if (dpadAngle !== null) {
    moveX = Math.cos(dpadAngle)
    moveY = Math.sin(dpadAngle)
  }

  // On water (boat): only forward/backward (up/down), no left/right
  if (onWater) {
    moveX = 0
  }

  const moveLen = Math.hypot(moveX, moveY)
  if (moveLen > 0) {
    moveX /= moveLen; moveY /= moveLen
    if (onWater) {
      // On boat, always face up
      player.facing = -Math.PI / 2
    } else {
      player.facing = Math.atan2(moveY, moveX)
    }
  }

  const playerSpeed = onWater ? 2.5 : 3.5
  player.pos.x += moveX * playerSpeed
  player.pos.y += moveY * playerSpeed

  // Keep player on screen
  player.pos.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.pos.x))
  player.pos.y = Math.max(player.radius + 20, Math.min(canvas.height - player.radius - 20, player.pos.y))

  // Camera: when player tries to go above the top 33%, scroll the world instead.
  // Player never visually passes this threshold — the screen moves, not the player.
  const scrollThreshold = canvas.height * 0.33
  if (player.pos.y < scrollThreshold) {
    const diff = scrollThreshold - player.pos.y
    scrollY += diff
    player.pos.y = scrollThreshold
  }
  distance = Math.floor(scrollY)

  // Keyboard actions
  if (keys['Space']) { keys['Space'] = false; throwSushi() }
  if (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyZ']) {
    keys['ShiftLeft'] = false; keys['ShiftRight'] = false; keys['KeyZ'] = false
    activatePole()
  }

  // Invulnerability
  if (player.invulnTimer > 0) player.invulnTimer--

  // Pole swing update
  if (poleSwing) {
    poleSwing.timer--
    poleSwing.angle += Math.PI * 1.2 / poleSwing.maxTimer
    if (poleSwing.timer <= 0) poleSwing = null
  }

  // Sushi projectiles
  for (let i = sushis.length - 1; i >= 0; i--) {
    const s = sushis[i]
    s.pos.x += s.vel.x; s.pos.y += s.vel.y; s.life--
    if (s.life <= 0 || s.pos.x < -20 || s.pos.x > canvas.width + 20 || s.pos.y < -20 || s.pos.y > canvas.height + 20)
      sushis.splice(i, 1)
  }

  // Spawn enemies ahead in world space
  spawnEnemiesAhead()

  updateEnemies()

  // Sushi-Enemy collision
  for (let si = sushis.length - 1; si >= 0; si--) {
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const s = sushis[si], en = enemies[ei]
      if (!s || !en) continue
      if (Math.hypot(s.pos.x - en.pos.x, s.pos.y - en.pos.y) < en.radius + 6) {
        sushis.splice(si, 1)
        en.hp--
        if (en.hp <= 0) {
          const pts = en.type === 'fisherman' ? 300 : en.type === 'seagull' ? 100 : 150
          score += pts
          const colors = en.type === 'crab' ? ['#ff4444', '#ff8844', '#ffaa66'] :
                         en.type === 'seagull' ? ['#ffffff', '#cccccc', '#aaaaaa'] :
                         ['#4488ff', '#6699ff', '#88bbff']
          spawnParticles(en.pos.x, en.pos.y, 12, colors)
          sfxHit()
          enemies.splice(ei, 1)
        } else {
          spawnParticles(en.pos.x, en.pos.y, 4, ['#ffffff', '#ffff88'])
        }
        break
      }
    }
  }

  // Pole-Enemy collision
  if (poleSwing && player.visible) {
    const px = player.pos.x + Math.cos(poleSwing.angle) * poleSwing.radius * 0.7
    const py = player.pos.y + Math.sin(poleSwing.angle) * poleSwing.radius * 0.7
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const en = enemies[ei]
      if (Math.hypot(px - en.pos.x, py - en.pos.y) < en.radius + 20) {
        en.hp -= 2
        if (en.hp <= 0) {
          score += (en.type === 'fisherman' ? 400 : en.type === 'seagull' ? 150 : 200)
          const colors = ['#ffaa00', '#ff8800', '#ffcc44']
          spawnParticles(en.pos.x, en.pos.y, 15, colors)
          sfxHit()
          enemies.splice(ei, 1)
        }
      }
    }
  }

  // Enemy-Player collision
  if (player.visible && player.invulnTimer <= 0) {
    for (const en of enemies) {
      if (Math.hypot(player.pos.x - en.pos.x, player.pos.y - en.pos.y) < player.radius + en.radius - 4) {
        playerDamage()
        break
      }
    }
  }

  // Enemy projectile - player collision
  if (player.visible && player.invulnTimer <= 0) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = enemyProjectiles[i]
      if (Math.hypot(player.pos.x - ep.pos.x, player.pos.y - ep.pos.y) < player.radius + 5) {
        enemyProjectiles.splice(i, 1)
        playerDamage()
        break
      }
    }
  }

  updateProjectiles()

  // Opacity fades
  if (dpadTouchId !== null) dpadOpacity = 1
  else if (dpadOpacity > 0.35) { dpadOpacity -= 0.02; if (dpadOpacity < 0.35) dpadOpacity = 0.35 }
  if (fireActive) fireOpacity = 1
  else if (fireOpacity > 0.35) { fireOpacity -= 0.02; if (fireOpacity < 0.35) fireOpacity = 0.35 }

  updateParticles()
}

function playerDamage() {
  spawnParticles(player.pos.x, player.pos.y, 20, ['#ffffff', '#ff4444', '#ffaa00'])
  sfxPlayerHit()
  player.visible = false
  lives--
  if (lives <= 0) {
    state = 'gameover'
    if (score > highScore) { highScore = score; localStorage.setItem('sushi-bros-hi', String(highScore)) }
  } else {
    player.respawnTimer = 90
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i]
    en.timer++
    en.animFrame++

    // Convert world Y to screen Y
    en.pos.y = canvas.height - (en.worldY - scrollY)

    // Lateral movement (slow, based on moveFactor)
    if (en.moveFactor > 0.05) {
      // Crabs: gentle side-to-side
      if (en.type === 'crab') {
        en.pos.x = en.baseX + Math.sin(en.timer * 0.015 * en.moveFactor) * 30 * en.moveFactor
      }
      // Seagulls: gentle sine drift
      else if (en.type === 'seagull') {
        en.pos.x = en.baseX + Math.sin(en.timer * 0.02 * en.moveFactor) * 40 * en.moveFactor
      }
      // Fisherman: very subtle sway
      else if (en.type === 'fisherman') {
        en.pos.x = en.baseX + Math.sin(en.timer * 0.01 * en.moveFactor) * 15 * en.moveFactor
      }
    } else {
      en.pos.x = en.baseX
    }

    // Clamp to screen width
    en.pos.x = Math.max(en.radius, Math.min(canvas.width - en.radius, en.pos.x))

    // Fisherman shoot (only when on screen and close-ish)
    if (en.type === 'fisherman' && player.visible && en.pos.y > -20 && en.pos.y < canvas.height + 20) {
      en.shootTimer--
      if (en.shootTimer <= 0) {
        en.shootTimer = 120 + Math.random() * 80
        const dx = player.pos.x - en.pos.x, dy = player.pos.y - en.pos.y
        const d = Math.hypot(dx, dy)
        if (d > 0 && d < 300) { // only shoot if player is nearby
          enemyProjectiles.push({
            pos: { x: en.pos.x, y: en.pos.y },
            vel: { x: dx / d * 2.5, y: dy / d * 2.5 },
            life: 100
          })
        }
      }
    }

    // Remove if scrolled well past (below screen)
    if (en.pos.y > canvas.height + 100) enemies.splice(i, 1)
  }
}

function updateProjectiles() {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i]
    p.pos.x += p.vel.x; p.pos.y += p.vel.y; p.life--
    if (p.life <= 0 || p.pos.x < -10 || p.pos.x > canvas.width + 10 || p.pos.y < -10 || p.pos.y > canvas.height + 10)
      enemyProjectiles.splice(i, 1)
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.pos.x += p.vel.x; p.pos.y += p.vel.y; p.life--
    if (p.life <= 0) particles.splice(i, 1)
  }
}

// ─── Draw ───
function drawScrollingBackground() {
  // Draw terrain rows
  const rowH = 4 // pixel height per row
  for (let screenY = 0; screenY < canvas.height; screenY += rowH) {
    // World Y: bottom of screen = scrollY, top = scrollY + canvas.height
    const worldY = scrollY + (canvas.height - screenY)
    const baseColor = getTerrainColor(worldY)
    ctx.fillStyle = baseColor
    ctx.fillRect(0, screenY, canvas.width, rowH + 1)
  }

  // Water wave lines
  for (let screenY = 0; screenY < canvas.height; screenY += 3) {
    const worldY = scrollY + (canvas.height - screenY)
    if (getTerrainAt(worldY) === 'water') {
      const waveOffset = Math.sin((worldY * 0.02) + frameCount * 0.03) * 15
      ctx.strokeStyle = 'rgba(100,180,255,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x < canvas.width; x += 20) {
        const wy = screenY + Math.sin((x + waveOffset) * 0.03 + worldY * 0.01) * 3
        if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy)
      }
      ctx.stroke()
    }
  }

  // Sand dots/pebbles
  const sandSeed = Math.floor(scrollY / 50)
  for (let i = 0; i < 20; i++) {
    const hash = (sandSeed + i * 7919) % 10007
    const worldY = (hash % 500) + scrollY - 100
    if (getTerrainAt(worldY) === 'sand') {
      const screenYp = canvas.height - (worldY - scrollY)
      if (screenYp > 0 && screenYp < canvas.height) {
        const sx = (hash * 3) % canvas.width
        ctx.fillStyle = 'rgba(180,150,80,0.3)'
        ctx.beginPath()
        ctx.arc(sx, screenYp, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Grass tufts
  for (let i = 0; i < 30; i++) {
    const hash = (sandSeed + i * 6271) % 10007
    const worldY = (hash % 600) + scrollY - 100
    if (getTerrainAt(worldY) === 'grass') {
      const screenYp = canvas.height - (worldY - scrollY)
      if (screenYp > 0 && screenYp < canvas.height) {
        const sx = (hash * 5) % canvas.width
        ctx.fillStyle = `rgba(20,${100 + (hash % 60)},20,0.4)`
        ctx.beginPath()
        ctx.arc(sx, screenYp, 3 + (hash % 3), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Trees on grass (simple circles with trunk)
  for (let i = 0; i < 10; i++) {
    const hash = (Math.floor(scrollY / 300) + i * 4517) % 10007
    const worldY = (hash % 800) + scrollY - 200
    if (getTerrainAt(worldY) === 'grass') {
      const screenYp = canvas.height - (worldY - scrollY)
      if (screenYp > -20 && screenYp < canvas.height + 20) {
        const sx = (hash * 7) % canvas.width
        // Trunk
        ctx.fillStyle = '#5a3a1a'
        ctx.fillRect(sx - 3, screenYp - 5, 6, 12)
        // Canopy
        ctx.fillStyle = '#1a6a1a'
        ctx.beginPath()
        ctx.arc(sx, screenYp - 10, 10 + (hash % 5), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Boats on water (near start)
  if (scrollY < 1500) {
    for (let i = 0; i < 3; i++) {
      const bWorldY = 200 + i * 250
      const bScreenY = canvas.height - (bWorldY - scrollY)
      if (bScreenY > -30 && bScreenY < canvas.height + 30) {
        const bx = 80 + i * (canvas.width - 160) / 2
        drawBoat(bx, bScreenY)
      }
    }
  }
}

function drawBoat(x: number, y: number) {
  ctx.save()
  ctx.translate(x, y)
  // Hull
  ctx.fillStyle = '#8B4513'
  ctx.beginPath()
  ctx.moveTo(-20, 0); ctx.lineTo(-15, 10); ctx.lineTo(15, 10); ctx.lineTo(20, 0)
  ctx.closePath(); ctx.fill()
  // Mast
  ctx.fillStyle = '#654321'
  ctx.fillRect(-1, -20, 2, 20)
  // Sail
  ctx.fillStyle = '#f5f5dc'
  ctx.beginPath()
  ctx.moveTo(0, -18); ctx.lineTo(12, -6); ctx.lineTo(0, -4)
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

function drawPlayer() {
  if (!player.visible) return
  if (player.invulnTimer > 0 && Math.floor(frameCount / 4) % 2 === 0) return

  const px = player.pos.x, py = player.pos.y
  
  // Check if player is on water
  const pwY = scrollY + (canvas.height - py)
  const isOnWater = getTerrainAt(pwY) === 'water'

  // Draw boat under player when on water
  if (isOnWater) {
    ctx.save()
    ctx.translate(px, py)
    // Boat hull
    ctx.fillStyle = '#8B4513'
    ctx.beginPath()
    ctx.moveTo(-22, 8); ctx.lineTo(-16, 18); ctx.lineTo(16, 18); ctx.lineTo(22, 8)
    ctx.closePath(); ctx.fill()
    // Boat deck
    ctx.fillStyle = '#A0522D'
    ctx.fillRect(-14, 6, 28, 4)
    // Gentle bob
    const bob = Math.sin(frameCount * 0.04) * 1.5
    ctx.translate(0, bob)
    // Wake lines behind boat
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-10, 20); ctx.lineTo(-18, 32)
    ctx.moveTo(10, 20); ctx.lineTo(18, 32)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(px, py)
  // Bob on water
  if (isOnWater) {
    ctx.translate(0, Math.sin(frameCount * 0.04) * 1.5 - 4)
  }

  // Body (white chef outfit)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, 2, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 1
  ctx.stroke()

  // Head
  ctx.fillStyle = '#ffcc88'
  ctx.beginPath()
  ctx.arc(0, -6, 8, 0, Math.PI * 2)
  ctx.fill()

  // Chef hat
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-6, -18, 12, 10)
  ctx.beginPath()
  ctx.arc(0, -18, 7, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#dddddd'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.arc(0, -18, 7, Math.PI, 0)
  ctx.stroke()

  // Eyes (face toward movement direction)
  const ex = Math.cos(player.facing) * 2
  const ey = Math.sin(player.facing) * 2
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(-3 + ex * 0.5, -7 + ey * 0.5, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath()
  ctx.arc(3 + ex * 0.5, -7 + ey * 0.5, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.restore()

  // Pole swing visual
  if (poleSwing) {
    const endX = px + Math.cos(poleSwing.angle) * poleSwing.radius
    const endY = py + Math.sin(poleSwing.angle) * poleSwing.radius
    // Pole line
    ctx.strokeStyle = '#8B6914'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(px, py); ctx.lineTo(endX, endY)
    ctx.stroke()
    // Hook
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(endX, endY, 5, 0, Math.PI)
    ctx.stroke()
    // Swoosh arc
    const progress = 1 - poleSwing.timer / poleSwing.maxTimer
    ctx.strokeStyle = `rgba(255,255,200,${0.5 * (1 - progress)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px, py, poleSwing.radius, poleSwing.angle - 0.5, poleSwing.angle)
    ctx.stroke()
  }
}

function drawEnemy(en: Enemy) {
  ctx.save()
  ctx.translate(en.pos.x, en.pos.y)

  if (en.type === 'crab') {
    // Red crab body
    ctx.fillStyle = '#cc3333'
    ctx.beginPath()
    ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    // Claws
    const clawAnim = Math.sin(en.animFrame * 0.1) * 0.3
    ctx.fillStyle = '#ee4444'
    ctx.beginPath()
    ctx.arc(-16, -4, 6, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.arc(16, -4, 6, 0, Math.PI * 2); ctx.fill()
    // Eyes
    ctx.fillStyle = '#000000'
    ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(4, -5, 2, 0, Math.PI * 2); ctx.fill()
    // Legs
    ctx.strokeStyle = '#cc3333'; ctx.lineWidth = 1.5
    for (let s = -1; s <= 1; s += 2) {
      for (let j = 0; j < 3; j++) {
        const lx = s * (6 + j * 4), ly = 6
        ctx.beginPath()
        ctx.moveTo(lx, 4)
        ctx.lineTo(lx + s * 5, ly + Math.sin(en.animFrame * 0.15 + j) * 2)
        ctx.stroke()
      }
    }
  } else if (en.type === 'seagull') {
    // White body
    ctx.fillStyle = '#eeeeee'
    ctx.beginPath()
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    // Wings
    const wingFlap = Math.sin(en.animFrame * 0.15) * 15
    ctx.fillStyle = '#dddddd'
    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(-18, -wingFlap)
    ctx.lineTo(-12, 2)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(5, 0)
    ctx.lineTo(18, -wingFlap)
    ctx.lineTo(12, 2)
    ctx.closePath(); ctx.fill()
    // Beak
    ctx.fillStyle = '#ff8800'
    ctx.beginPath()
    ctx.moveTo(0, -4); ctx.lineTo(-2, -8); ctx.lineTo(2, -8)
    ctx.closePath(); ctx.fill()
    // Eye
    ctx.fillStyle = '#000000'
    ctx.beginPath(); ctx.arc(0, -2, 1.5, 0, Math.PI * 2); ctx.fill()
  } else if (en.type === 'fisherman') {
    // Body (blue jacket)
    ctx.fillStyle = '#3355aa'
    ctx.beginPath()
    ctx.arc(0, 2, 13, 0, Math.PI * 2)
    ctx.fill()
    // Head
    ctx.fillStyle = '#dda877'
    ctx.beginPath()
    ctx.arc(0, -7, 8, 0, Math.PI * 2)
    ctx.fill()
    // Hat (bucket hat)
    ctx.fillStyle = '#556633'
    ctx.fillRect(-9, -14, 18, 5)
    ctx.fillRect(-7, -18, 14, 5)
    // Eyes (angry)
    ctx.fillStyle = '#000000'
    ctx.fillRect(-5, -8, 3, 2)
    ctx.fillRect(2, -8, 3, 2)
    // Fishing rod
    ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(10, 0); ctx.lineTo(18, -15)
    ctx.stroke()
    ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(18, -15); ctx.lineTo(20, -10)
    ctx.stroke()
  }

  ctx.restore()
}

function drawSushis() {
  for (const s of sushis) {
    ctx.save()
    ctx.translate(s.pos.x, s.pos.y)
    const rot = frameCount * 0.15
    ctx.rotate(rot)
    // Rice base (white oval)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    // Fish topping (orange/salmon)
    ctx.fillStyle = '#ff7744'
    ctx.beginPath()
    ctx.ellipse(0, -2, 6, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    // Nori strip
    ctx.fillStyle = '#1a3a1a'
    ctx.fillRect(-2, -4, 4, 8)
    ctx.restore()
  }
}

function drawEnemyProjectiles() {
  for (const p of enemyProjectiles) {
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,100,100,0.3)'
    ctx.beginPath()
    ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = p.life / p.maxLife
    ctx.globalAlpha = a
    ctx.fillStyle = p.color
    ctx.fillRect(p.pos.x - 1.5, p.pos.y - 1.5, 3, 3)
  }
  ctx.globalAlpha = 1
}

function drawHUD() {
  const fontSize = isPortrait ? 16 : 18
  ctx.fillStyle = '#ffffff'; ctx.font = `${fontSize}px monospace`
  ctx.textAlign = 'left'; ctx.fillText(`SCORE: ${score}`, 15, 30)
  ctx.textAlign = 'right'; ctx.fillText(`HI: ${highScore}`, canvas.width - 55, 30)
  ctx.textAlign = 'left'

  // Lives as sushi icons
  for (let i = 0; i < lives; i++) {
    const lx = 20 + i * 22, ly = 48
    ctx.fillStyle = '#ff7744'
    ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(lx, ly + 2, 5, 0, Math.PI * 2); ctx.fill()
  }

  // Distance
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(`${distance}m`, canvas.width / 2, 25)

  // Terrain indicator
  const terrain = getTerrainAt(scrollY + canvas.height / 2)
  const terrainName = terrain === 'water' ? '🌊 OCEAN' : terrain === 'sand' ? '🏖 BEACH' : '🌴 ISLAND'
  ctx.fillText(terrainName, canvas.width / 2, 42)

  // Pause button
  const pb = pauseBtnBounds()
  const cx = pb.x + pb.w / 2, cy = pb.y + pb.h / 2
  ctx.strokeStyle = `rgba(255,255,255,${paused ? 0.9 : 0.4})`
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(cx, cy, pb.w / 2, 0, Math.PI * 2); ctx.stroke()
  if (paused) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.moveTo(cx - 5, cy - 8); ctx.lineTo(cx - 5, cy + 8); ctx.lineTo(cx + 8, cy)
    ctx.closePath(); ctx.fill()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(cx - 6, cy - 7, 4, 14)
    ctx.fillRect(cx + 2, cy - 7, 4, 14)
  }
}

function drawTouchControls() {
  if (!isTouchDevice || state !== 'playing') return

  {
    const dp = joystickCenter || dpadPos()
    const alpha = dpadOpacity
    ctx.beginPath()
    ctx.arc(dp.x, dp.y, DPAD_R, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${0.2 * alpha})`; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = `rgba(255,255,255,${0.04 * alpha})`; ctx.fill()

    if (joystickCenter) {
      const tdx = joystickThumb.x - dp.x, tdy = joystickThumb.y - dp.y
      const td = Math.hypot(tdx, tdy)
      const clamp = Math.min(td, DPAD_R)
      const nx = td > 0 ? tdx / td * clamp : 0
      const ny = td > 0 ? tdy / td * clamp : 0
      ctx.beginPath()
      ctx.arc(dp.x + nx, dp.y + ny, 18, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${0.2 * alpha})`; ctx.fill()
      ctx.strokeStyle = `rgba(255,255,255,${0.4 * alpha})`; ctx.lineWidth = 1.5; ctx.stroke()
    }

    const drawArrow = (angle: number, active: boolean) => {
      ctx.save(); ctx.translate(dp.x, dp.y); ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(DPAD_R - 12, 0); ctx.lineTo(DPAD_R - 28, -10); ctx.lineTo(DPAD_R - 28, 10)
      ctx.closePath()
      ctx.fillStyle = active ? `rgba(255,255,255,${0.7 * alpha})` : `rgba(255,255,255,${0.25 * alpha})`
      ctx.fill(); ctx.restore()
    }
    drawArrow(-Math.PI / 2, dpad.up)
    drawArrow(Math.PI, dpad.left)
    drawArrow(0, dpad.right)
    drawArrow(Math.PI / 2, dpad.down)
  }

  // Right stick (aim)
  const fc = fireCenter || firePos()
  const fo = fireOpacity
  {
    const alpha = fireActive ? 1 : fo
    ctx.beginPath()
    ctx.arc(fc.x, fc.y, DPAD_R, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,120,68,${0.2 * alpha})`; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = `rgba(255,120,68,${0.04 * alpha})`; ctx.fill()

    if (fireCenter && fireActive) {
      const fdx = fireThumb.x - fireCenter.x, fdy = fireThumb.y - fireCenter.y
      const fd = Math.hypot(fdx, fdy)
      const clamp = Math.min(fd, DPAD_R)
      const nx = fd > 0 ? fdx / fd * clamp : 0
      const ny = fd > 0 ? fdy / fd * clamp : 0
      ctx.beginPath()
      ctx.arc(fireCenter.x + nx, fireCenter.y + ny, 18, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,120,68,${0.3 * alpha})`; ctx.fill()
      ctx.strokeStyle = `rgba(255,120,68,${0.5 * alpha})`; ctx.lineWidth = 1.5; ctx.stroke()
    }

    // Aim direction indicator
    if (fireStickActive || !fireActive) {
      const aimA = shootAngle
      const indX = fc.x + Math.cos(aimA) * (DPAD_R + 10)
      const indY = fc.y + Math.sin(aimA) * (DPAD_R + 10)
      ctx.fillStyle = `rgba(255,120,68,${0.5 * alpha})`
      ctx.beginPath(); ctx.arc(indX, indY, 4, 0, Math.PI * 2); ctx.fill()
    }

    ctx.fillStyle = `rgba(255,255,255,${0.3 * alpha})`
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'
    ctx.fillText('🍣 AIM', fc.x, fc.y + 4)
  }

  const hp = polePos()
  {
    const alpha = poleActive ? 1 : fo
    ctx.beginPath()
    ctx.arc(hp.x, hp.y, POLE_R, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(139,105,20,${(poleActive ? 0.35 : 0.18) * alpha})`; ctx.fill()
    ctx.strokeStyle = `rgba(139,105,20,${(poleActive ? 0.9 : 0.55) * alpha})`
    ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = `rgba(255,255,255,${(poleActive ? 0.95 : 0.65) * alpha})`
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'
    ctx.fillText('POLE', hp.x, hp.y + 3)
  }
}

function drawMenu() {
  // Ocean background
  ctx.fillStyle = '#0a1a3a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Animated waves
  for (let y = 0; y < canvas.height; y += 30) {
    ctx.strokeStyle = `rgba(60,120,200,${0.1 + (y / canvas.height) * 0.15})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x < canvas.width; x += 10) {
      const wy = y + Math.sin((x * 0.02) + frameCount * 0.02 + y * 0.01) * 8
      if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy)
    }
    ctx.stroke()
  }

  // Draw a boat
  drawBoat(canvas.width / 2, canvas.height * 0.55)

  ctx.textAlign = 'center'

  // Title
  const titleSize = isPortrait ? 38 : 56
  ctx.fillStyle = '#ff7744'; ctx.font = `bold ${titleSize}px monospace`
  ctx.fillText('🍣 SUSHI BROS 🎣', canvas.width / 2, canvas.height * 0.28)

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${isPortrait ? 14 : 18}px monospace`
  ctx.fillText('A Top-Down Fishing Adventure', canvas.width / 2, canvas.height * 0.35)

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#cccccc'; ctx.font = `${isPortrait ? 18 : 22}px monospace`
    ctx.fillText(isTouchDevice ? 'TAP TO START' : 'PRESS ENTER OR SPACE', canvas.width / 2, canvas.height * 0.44)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
  if (isTouchDevice) {
    ctx.fillText('D-PAD: MOVE    SUSHI: THROW    POLE: SWING', canvas.width / 2, canvas.height * 0.65)
  } else {
    ctx.fillText('WASD/ARROWS — MOVE    SPACE — SUSHI    SHIFT/Z — POLE', canvas.width / 2, canvas.height * 0.65)
  }

  if (highScore > 0) {
    ctx.fillStyle = 'rgba(255,200,100,0.6)'; ctx.font = `${isPortrait ? 14 : 16}px monospace`
    ctx.fillText(`HIGH SCORE: ${highScore}`, canvas.width / 2, canvas.height * 0.72)
  }

  // Control mode toggle
  const ctrlFont = isPortrait ? 14 : 16
  ctx.font = `${ctrlFont}px monospace`
  const modeLabel = controlMode === 'direction' ? '► DIRECTION MODE' : '► SPIN & THROTTLE'
  const toggleText = isTouchDevice ? `[ ${modeLabel} ]  TAP TO CHANGE` : `[ ${modeLabel} ]  TAB TO CHANGE`
  const toggleY = canvas.height * 0.80
  const tw = ctx.measureText(toggleText).width
  ctrlToggleBounds = { x: canvas.width / 2 - tw / 2 - 10, y: toggleY - ctrlFont - 2, w: tw + 20, h: ctrlFont + 12 }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1
  ctx.strokeRect(ctrlToggleBounds.x, ctrlToggleBounds.y, ctrlToggleBounds.w, ctrlToggleBounds.h)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(toggleText, canvas.width / 2, toggleY)
}

// ─── Game Over ───
let gameOverBtnPlay = { x: 0, y: 0, w: 0, h: 0 }
let gameOverBtnMenu = { x: 0, y: 0, w: 0, h: 0 }

function handleGameOverClick(cx: number, cy: number) {
  if (cx >= gameOverBtnPlay.x && cx <= gameOverBtnPlay.x + gameOverBtnPlay.w &&
      cy >= gameOverBtnPlay.y && cy <= gameOverBtnPlay.y + gameOverBtnPlay.h) startGame()
  else if (cx >= gameOverBtnMenu.x && cx <= gameOverBtnMenu.x + gameOverBtnMenu.w &&
           cy >= gameOverBtnMenu.y && cy <= gameOverBtnMenu.y + gameOverBtnMenu.h) state = 'menu'
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.textAlign = 'center'
  const cx = canvas.width / 2
  const titleSize = isPortrait ? 36 : 48

  ctx.fillStyle = '#ff4444'; ctx.font = `bold ${titleSize}px monospace`
  ctx.fillText('GAME OVER', cx, canvas.height * 0.25)

  ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 20 : 24}px monospace`
  ctx.fillText(`SCORE: ${score}`, cx, canvas.height * 0.35)
  ctx.fillText(`DISTANCE: ${distance}m`, cx, canvas.height * 0.42)

  let nextY = canvas.height * 0.48
  if (score >= highScore && score > 0) {
    ctx.fillStyle = '#ffdd00'; ctx.font = `${isPortrait ? 16 : 20}px monospace`
    ctx.fillText('🏆 NEW HIGH SCORE!', cx, nextY)
    nextY += 35
  }

  const btnW = isPortrait ? 200 : 240, btnH = isPortrait ? 44 : 50, btnGap = 14
  const btnStartY = nextY + 10

  gameOverBtnPlay = { x: cx - btnW / 2, y: btnStartY, w: btnW, h: btnH }
  ctx.fillStyle = 'rgba(255,120,68,0.2)'
  ctx.fillRect(gameOverBtnPlay.x, gameOverBtnPlay.y, btnW, btnH)
  ctx.strokeStyle = 'rgba(255,120,68,0.8)'; ctx.lineWidth = 2
  ctx.strokeRect(gameOverBtnPlay.x, gameOverBtnPlay.y, btnW, btnH)
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${isPortrait ? 16 : 18}px monospace`
  ctx.fillText('PLAY AGAIN', cx, btnStartY + btnH / 2 + 6)

  const menuBtnY = btnStartY + btnH + btnGap
  gameOverBtnMenu = { x: cx - btnW / 2, y: menuBtnY, w: btnW, h: btnH }
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(gameOverBtnMenu.x, gameOverBtnMenu.y, btnW, btnH)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5
  ctx.strokeRect(gameOverBtnMenu.x, gameOverBtnMenu.y, btnW, btnH)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `${isPortrait ? 14 : 16}px monospace`
  ctx.fillText('MAIN MENU', cx, menuBtnY + btnH / 2 + 5)

  if (!isTouchDevice) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = `${isPortrait ? 10 : 12}px monospace`
    ctx.fillText('ENTER — PLAY AGAIN    ESC — MAIN MENU', cx, menuBtnY + btnH + 25)
  }
}

function draw() {
  if (state === 'menu') {
    drawMenu()
  } else if (state === 'playing') {
    drawScrollingBackground()
    for (const en of enemies) drawEnemy(en)
    drawPlayer()
    drawSushis()
    drawEnemyProjectiles()
    drawParticles()
    drawHUD()
    drawTouchControls()
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${isPortrait ? 36 : 48}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${isPortrait ? 14 : 18}px monospace`
      ctx.fillText(isTouchDevice ? 'TAP ▶ TO RESUME' : 'PRESS P OR ESC', canvas.width / 2, canvas.height / 2 + 40)
    }
  } else if (state === 'gameover') {
    drawScrollingBackground()
    drawParticles()
    drawGameOver()
  }
}

// ─── Loop ───
function loop() { update(); draw(); requestAnimationFrame(loop) }
loop()
