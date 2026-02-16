import './style.css'

declare const __BUILD_DATE__: string

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

function sfxBossWarning() {
  const t = audioCtx.currentTime
  // Alarm-like rising tone
  for (let i = 0; i < 3; i++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    o.type = 'sawtooth'
    const start = t + i * 0.25
    o.frequency.setValueAtTime(200, start)
    o.frequency.exponentialRampToValueAtTime(600, start + 0.2)
    g.gain.setValueAtTime(0.1, start)
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.22)
    o.start(start); o.stop(start + 0.22)
  }
}

function sfxBossDefeat() {
  const t = audioCtx.currentTime
  // Big explosion + descending boom
  const noiseLen = audioCtx.sampleRate * 0.8
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1)
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuf
  const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'
  lp.frequency.setValueAtTime(800, t); lp.frequency.exponentialRampToValueAtTime(40, t + 0.8)
  const g = audioCtx.createGain()
  g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination)
  src.start(t); src.stop(t + 0.8)
  // Victory chime
  const notes = [523, 659, 784, 1047]
  for (let i = 0; i < notes.length; i++) {
    const o = audioCtx.createOscillator(), g2 = audioCtx.createGain()
    o.connect(g2); g2.connect(audioCtx.destination)
    o.type = 'sine'
    const ns = t + 0.3 + i * 0.15
    o.frequency.setValueAtTime(notes[i], ns)
    g2.gain.setValueAtTime(0.08, ns)
    g2.gain.exponentialRampToValueAtTime(0.001, ns + 0.4)
    o.start(ns); o.stop(ns + 0.4)
  }
}

// ─── Screen Transition ───
let transitionAlpha = 0
let transitionDir: 'in' | 'out' | 'none' = 'none'
let transitionSpeed = 0.04
let transitionCallback: (() => void) | null = null

function startTransition(callback: () => void) {
  transitionAlpha = 0
  transitionDir = 'in'
  transitionSpeed = 0.04
  transitionCallback = callback
}

function updateTransition() {
  if (transitionDir === 'in') {
    transitionAlpha += transitionSpeed
    if (transitionAlpha >= 1) {
      transitionAlpha = 1
      if (transitionCallback) { transitionCallback(); transitionCallback = null }
      transitionDir = 'out'
    }
  } else if (transitionDir === 'out') {
    transitionAlpha -= transitionSpeed
    if (transitionAlpha <= 0) { transitionAlpha = 0; transitionDir = 'none' }
  }
}

function drawTransition() {
  if (transitionDir === 'none') return
  ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

// ─── Screen Shake ───
let shakeIntensity = 0
let shakeDecay = 0.8
let shakeOffsetX = 0
let shakeOffsetY = 0

function triggerShake(intensity: number) {
  shakeIntensity = intensity
}

function updateShake() {
  if (shakeIntensity > 0.5) {
    shakeOffsetX = (Math.random() - 0.5) * shakeIntensity * 2
    shakeOffsetY = (Math.random() - 0.5) * shakeIntensity * 2
    shakeIntensity *= shakeDecay
  } else {
    shakeIntensity = 0; shakeOffsetX = 0; shakeOffsetY = 0
  }
}

// ─── Score Multiplier ───
let hitStreak = 0
let scoreMultiplier = 1
let multiplierDisplayTimer = 0

function addStreakHit() {
  hitStreak++
  scoreMultiplier = Math.min(Math.floor(hitStreak / 3) + 1, 10)
  multiplierDisplayTimer = 120
}

function resetStreak() {
  hitStreak = 0; scoreMultiplier = 1
}

// ─── Power-ups ───
type PowerUpType = 'speed' | 'triple' | 'shield' | 'life'
interface PowerUp {
  pos: Vec2; worldX: number; worldY: number
  type: PowerUpType; life: number
}

let powerUps: PowerUp[] = []
let activeSpeed = 0 // frames remaining
let activeTriple = 0
let hasShield = false

const POWERUP_COLORS: Record<PowerUpType, string> = {
  speed: '#ffdd00', triple: '#ff4444', shield: '#4488ff', life: '#44ff44'
}
const POWERUP_LABELS: Record<PowerUpType, string> = {
  speed: '⚡', triple: '🔥', shield: '🛡', life: '❤'
}

function spawnPowerUp(x: number, worldY: number) {
  const r = Math.random()
  let type: PowerUpType
  if (r < 0.03) type = 'life'
  else if (r < 0.06) type = 'shield'
  else if (r < 0.10) type = 'triple'
  else type = 'speed'
  powerUps.push({ pos: { x, y: 0 }, worldX: x, worldY, type, life: 600 })
}

function updatePowerUps() {
  if (activeSpeed > 0) activeSpeed--
  if (activeTriple > 0) activeTriple--

  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i]
    p.worldY -= 0.3 // float down in world space
    p.pos.x = p.worldX
    p.pos.y = canvas.height - (p.worldY - scrollY)
    p.life--
    if (p.life <= 0 || p.pos.y > canvas.height + 30 || p.pos.y < -30) {
      powerUps.splice(i, 1); continue
    }
    // Collect
    if (player.visible && Math.hypot(player.pos.x - p.pos.x, player.pos.y - p.pos.y) < player.radius + 12) {
      applyPowerUp(p.type)
      powerUps.splice(i, 1)
    }
  }
}

function applyPowerUp(type: PowerUpType) {
  if (type === 'speed') activeSpeed = 300
  else if (type === 'triple') activeTriple = 300
  else if (type === 'shield') hasShield = true
  else if (type === 'life') lives++
  // SFX
  const o = audioCtx.createOscillator(), g = audioCtx.createGain()
  o.connect(g); g.connect(audioCtx.destination); o.type = 'sine'
  o.frequency.setValueAtTime(800, audioCtx.currentTime)
  o.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15)
  g.gain.setValueAtTime(0.08, audioCtx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
  o.start(); o.stop(audioCtx.currentTime + 0.15)
}

function drawPowerUps() {
  for (const p of powerUps) {
    const bob = Math.sin(frameCount * 0.06 + p.worldY) * 3
    const alpha = p.life < 60 ? p.life / 60 : 1
    ctx.globalAlpha = alpha
    // Glow
    ctx.fillStyle = POWERUP_COLORS[p.type] + '44'
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y + bob, 14, 0, Math.PI * 2); ctx.fill()
    // Circle
    ctx.fillStyle = POWERUP_COLORS[p.type]
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y + bob, 9, 0, Math.PI * 2); ctx.fill()
    // Label
    ctx.fillStyle = '#000'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'
    ctx.fillText(POWERUP_LABELS[p.type], p.pos.x, p.pos.y + bob + 4)
    ctx.globalAlpha = 1
  }
}

// ─── Background Music ───
let musicPlaying = false
let musicMuted = false
let musicGain: GainNode | null = null
let musicOscillators: OscillatorNode[] = []
let currentMusicLevel = -1

function startMusic(level: number) {
  stopMusic()
  if (musicMuted) { currentMusicLevel = level; return }
  currentMusicLevel = level
  musicGain = audioCtx.createGain()
  musicGain.gain.value = 0.04
  musicGain.connect(audioCtx.destination)
  musicPlaying = true

  // Different mood per level using oscillators
  const t = audioCtx.currentTime
  if (level === 0) {
    // Calm oceanic - low sine drones
    const freqs = [130.81, 164.81, 196.00] // C3, E3, G3
    for (const f of freqs) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = 'sine'; o.frequency.value = f
      g.gain.value = 0.3
      // Slow LFO tremolo
      const lfo = audioCtx.createOscillator()
      const lfoG = audioCtx.createGain()
      lfo.frequency.value = 0.3 + Math.random() * 0.2
      lfoG.gain.value = 0.15
      lfo.connect(lfoG); lfoG.connect(g.gain)
      lfo.start(t)
      o.connect(g); g.connect(musicGain!)
      o.start(t)
      musicOscillators.push(o, lfo)
    }
  } else if (level === 1) {
    // Upbeat beachy - major key arpeggios
    const freqs = [261.63, 329.63, 392.00, 329.63] // C4, E4, G4, E4
    for (let i = 0; i < freqs.length; i++) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = 'triangle'; o.frequency.value = freqs[i]
      // Rhythmic pulsing
      const lfo = audioCtx.createOscillator()
      const lfoG = audioCtx.createGain()
      lfo.frequency.value = 2 + i * 0.5
      lfoG.gain.value = 0.4
      lfo.connect(lfoG); lfoG.connect(g.gain)
      lfo.start(t)
      g.gain.value = 0.25
      o.connect(g); g.connect(musicGain!)
      o.start(t)
      musicOscillators.push(o, lfo)
    }
  } else if (level === 2) {
    // Intense jungle - minor key, faster
    const freqs = [220.00, 261.63, 329.63] // A3, C4, E4 (A minor)
    for (let i = 0; i < freqs.length; i++) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.type = 'sawtooth'; o.frequency.value = freqs[i]
      const lfo = audioCtx.createOscillator()
      const lfoG = audioCtx.createGain()
      lfo.frequency.value = 3 + i
      lfoG.gain.value = 0.35
      lfo.connect(lfoG); lfoG.connect(g.gain)
      lfo.start(t)
      g.gain.value = 0.15
      o.connect(g); g.connect(musicGain!)
      o.start(t)
      musicOscillators.push(o, lfo)
    }
  } else {
    // Boss - dramatic, heavy bass
    const bass = audioCtx.createOscillator()
    const bassG = audioCtx.createGain()
    bass.type = 'sawtooth'; bass.frequency.value = 65.41 // C2
    bassG.gain.value = 0.5
    const lfo = audioCtx.createOscillator()
    const lfoG = audioCtx.createGain()
    lfo.frequency.value = 4; lfoG.gain.value = 0.4
    lfo.connect(lfoG); lfoG.connect(bassG.gain)
    lfo.start(t)
    bass.connect(bassG); bassG.connect(musicGain!)
    bass.start(t)
    const mid = audioCtx.createOscillator()
    const midG = audioCtx.createGain()
    mid.type = 'square'; mid.frequency.value = 155.56
    midG.gain.value = 0.2
    mid.connect(midG); midG.connect(musicGain!)
    mid.start(t)
    musicOscillators.push(bass, lfo, mid)
  }
}

function stopMusic() {
  for (const o of musicOscillators) { try { o.stop() } catch(_e) { /* ignore */ } }
  musicOscillators = []
  if (musicGain) { try { musicGain.disconnect() } catch(_e) { /* ignore */ } }
  musicGain = null; musicPlaying = false; currentMusicLevel = -1
}

function toggleMusicMute() {
  musicMuted = !musicMuted
  if (musicMuted) { stopMusic() }
  else if (currentMusicLevel >= 0 || state === 'playing') {
    startMusic(currentLevel >= 3 ? 3 : currentLevel)
  }
}

// ─── Victory Jingle ───
function playVictoryJingle() {
  if (musicMuted) return
  const t = audioCtx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51]
  for (let i = 0; i < notes.length; i++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    o.type = 'sine'
    const ns = t + i * 0.12
    o.frequency.setValueAtTime(notes[i], ns)
    g.gain.setValueAtTime(0.1, ns)
    g.gain.exponentialRampToValueAtTime(0.001, ns + 0.3)
    o.start(ns); o.stop(ns + 0.3)
  }
}

// ─── Water Splash Tracking ───
let playerWasOnWater = false

// ─── Types ───
interface Vec2 { x: number; y: number }

type EnemyType = 'crab' | 'seagull' | 'fisherman'
interface Enemy {
  pos: Vec2; vel: Vec2; type: EnemyType; hp: number; radius: number
  timer: number; shootTimer: number; animFrame: number
  worldY: number; baseX: number; moveFactor: number
}

interface Sushi { pos: Vec2; vel: Vec2; life: number; worldX: number; worldY: number }
interface EnemyProjectile { pos: Vec2; vel: Vec2; life: number; worldX: number; worldY: number }

interface PoleSwing {
  angle: number; timer: number; maxTimer: number; radius: number
}

interface Particle { pos: Vec2; vel: Vec2; life: number; maxLife: number; color: string }

interface Player {
  pos: Vec2; vel: Vec2; radius: number; facing: number
  invulnTimer: number; visible: boolean; respawnTimer: number
}

// ─── Boss Types ───
type BossPhasePattern = 'ink_spread' | 'tentacle_sweep' | 'charge' | 'spawn_minions' | 'cast_nets' | 'throw_hooks' | 'summon_seagulls'

interface BossPhase {
  patterns: BossPhasePattern[]
  attackInterval: number // frames between attacks
}

interface BossProjectile {
  pos: Vec2; vel: Vec2; life: number; worldX: number; worldY: number
  type: 'ink' | 'hook' | 'net'
  netTimer?: number // for nets: time player has stood in it
  netRadius?: number
}

interface TentacleSweep {
  x: number; y: number; width: number; height: number; life: number; velY: number
}

interface Boss {
  name: string
  pos: Vec2
  worldY: number
  hp: number
  maxHp: number
  radius: number
  currentPhase: number
  phases: BossPhase[]
  phaseTimer: number
  attackTimer: number
  animFrame: number
  defeated: boolean
  defeatTimer: number
  // Type-specific
  bossType: 'octopus' | 'crab_king' | 'fisherman'
  // Crab king specifics
  chargeVelX?: number
  chargeDir?: number
  shieldTimer?: number
  // Fisherman specifics
  // General
  flashTimer: number
}

type BossFightState = 'none' | 'warning' | 'clearing' | 'fighting' | 'defeated'

// ─── Terrain ───
type TerrainType = 'water' | 'sand' | 'grass'
const TERRAIN_COLORS: Record<TerrainType, string> = {
  water: '#1a3a5c',
  sand: '#c2a65a',
  grass: '#2d7a2d'
}

// ─── Control Mode ───
type ControlMode = 'direction' | 'spin'
let controlMode: ControlMode = 'direction'

// ─── Level System ───
interface LevelConfig {
  name: string
  subtitle: string
  targetDistance: number
  terrainFn: (worldY: number) => TerrainType
  enemyWeights: [number, number, number] // crab, seagull, fisherman
  bgColor: string
  spawnInterval: [number, number] // min, max gap between enemy rows
  enemyHpScale: number // multiplier for enemy HP
  shootTimerRange: [number, number] // fisherman shoot timer min, max
  projectileSpeed: number // fisherman projectile speed
}

// Tree obstacles for Level 3
interface TreeObstacle { worldX: number; worldY: number; radius: number }

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    name: 'Ocean Voyage',
    subtitle: 'Navigate the treacherous waters!',
    targetDistance: 2000,
    terrainFn: (worldY: number) => {
      // Open ocean for most of the level, then a wavy shoreline near the end
      const shoreStart = 1650
      if (worldY < shoreStart) return 'water'
      // Wavy shoreline using overlapping sine waves for organic look
      // X-position varies per row to create the wavy edge
      const wave = Math.sin(worldY * 0.03) * 40
        + Math.sin(worldY * 0.071 + 2.0) * 25
        + Math.sin(worldY * 0.15 + 5.0) * 12
      const shoreEdge = shoreStart + 80 + wave
      if (worldY < shoreEdge) return 'water'
      return 'sand'
    },
    enemyWeights: [0.55, 0.4, 0.05],
    bgColor: '#0a1a3a',
    spawnInterval: [140, 220],
    enemyHpScale: 0.8,
    shootTimerRange: [160, 240],
    projectileSpeed: 2.0
  },
  {
    name: 'Beach Landing',
    subtitle: 'Storm the sandy shores!',
    targetDistance: 2500,
    terrainFn: (worldY: number) => {
      // Zone 1: Open water (y=0..600)
      if (worldY < 600) return 'water'
      // Wavy shoreline transition (water → sand) around y=600-800
      const shoreWave = Math.sin(worldY * 0.025) * 45
        + Math.sin(worldY * 0.063 + 1.7) * 30
        + Math.sin(worldY * 0.14 + 4.2) * 15
      const shoreEdge = 700 + shoreWave
      if (worldY < shoreEdge) return 'water'
      // Zone 2: Solid sand/beach (up to ~1800-2000)
      if (worldY < 1800) return 'sand'
      // Wavy transition (sand → grass) around y=1800-2000
      const grassWave = Math.sin(worldY * 0.028) * 40
        + Math.sin(worldY * 0.072 + 3.1) * 28
        + Math.sin(worldY * 0.16 + 1.5) * 12
      const grassEdge = 1900 + grassWave
      if (worldY < grassEdge) return 'sand'
      // Zone 3: Solid grass to boss
      return 'grass'
    },
    enemyWeights: [0.35, 0.30, 0.35],
    bgColor: '#1a1a0a',
    spawnInterval: [110, 170],
    enemyHpScale: 1.0,
    shootTimerRange: [120, 180],
    projectileSpeed: 2.5
  },
  {
    name: 'Island Interior',
    subtitle: 'Brave the dense jungle!',
    targetDistance: 3000,
    terrainFn: (worldY: number) => {
      const qd = Math.floor(worldY / 8) * 8
      if (worldY < 200) return 'sand'
      if (worldY < 450) return hashY(qd) > (worldY - 200) / 250 ? 'sand' : 'grass'
      return 'grass'
    },
    enemyWeights: [0.33, 0.33, 0.34],
    bgColor: '#0a1a0a',
    spawnInterval: [70, 120],
    enemyHpScale: 1.4,
    shootTimerRange: [80, 130],
    projectileSpeed: 3.2
  }
]

// ─── High Scores ───
interface HighScoreEntry { score: number; level: number; date: string }

function loadHighScores(): HighScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem('sushi-bros-scores') || '[]')
  } catch { return [] }
}

function saveHighScore(s: number, lvl: number) {
  const scores = loadHighScores()
  scores.push({ score: s, level: lvl, date: new Date().toLocaleDateString() })
  scores.sort((a, b) => b.score - a.score)
  scores.length = Math.min(scores.length, 5)
  localStorage.setItem('sushi-bros-scores', JSON.stringify(scores))
  // Also update legacy highScore
  if (s > highScore) { highScore = s; localStorage.setItem('sushi-bros-hi', String(highScore)) }
}

// ─── State ───
type GameState = 'menu' | 'playing' | 'gameover' | 'levelIntro' | 'levelComplete' | 'victory' | 'highscores' | 'controls'
let state: GameState = 'menu'
let score = 0
let highScore = parseInt(localStorage.getItem('sushi-bros-hi') || '0')
let lives = 3
let scrollY = 0
let player: Player
let sushis: Sushi[] = []
let enemies: Enemy[] = []
let enemyProjectiles: EnemyProjectile[] = []
let particles: Particle[] = []
let poleSwing: PoleSwing | null = null
let treeObstacles: TreeObstacle[] = []
let nextTreeWorldY = 0
let frameCount = 0
let paused = false
let distance = 0
let currentLevel = 0 // 0-indexed
let levelIntroTimer = 0
let menuSelection = 0
// Boss state
let bossFightState: BossFightState = 'none'
let currentBoss: Boss | null = null
let bossWarningTimer = 0
let bossClearTimer = 0
let bossProjectiles: BossProjectile[] = []
let tentacleSweeps: TentacleSweep[] = []
let bossScrollYLock = 0
const MENU_ITEMS = ['Start Game', 'High Scores', 'Controls']

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
  const cfg = LEVEL_CONFIGS[currentLevel]
  if (cfg) return cfg.terrainFn(worldY)
  // Fallback
  return 'water'
}

function getTerrainColor(worldY: number): string {
  const t = getTerrainAt(worldY)
  return TERRAIN_COLORS[t]
}

// ─── Input ───
const keys: Record<string, boolean> = {}
addEventListener('keydown', e => {
  keys[e.code] = true
  if (state === 'menu') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { menuSelection = (menuSelection - 1 + MENU_ITEMS.length) % MENU_ITEMS.length }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { menuSelection = (menuSelection + 1) % MENU_ITEMS.length }
    if (e.code === 'Enter' || e.code === 'Space') { handleMenuSelect() }
  }
  if (state === 'highscores' || state === 'controls') {
    if (e.code === 'Escape' || e.code === 'Enter') { state = 'menu' }
  }
  if (state === 'gameover' && e.code === 'Enter') startTransition(() => startNewRun())
  if (state === 'gameover' && e.code === 'Escape') startTransition(() => { state = 'menu'; stopMusic() })
  if (state === 'levelComplete' && e.code === 'Enter') advanceLevel()
  if (state === 'victory' && e.code === 'Enter') startTransition(() => startNewRun())
  if (state === 'victory' && e.code === 'Escape') startTransition(() => { state = 'menu'; stopMusic() })
  if (state === 'playing' && (e.code === 'Escape' || e.code === 'KeyP')) { paused = !paused }
  if (state === 'playing' && e.code === 'KeyM' && paused) { toggleMusicMute() }
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
    handleMenuClick(t0.clientX, t0.clientY); return
  }
  if (state === 'highscores' || state === 'controls') { state = 'menu'; return }
  if (state === 'gameover') {
    const t0 = e.changedTouches[0]
    handleGameOverClick(t0.clientX, t0.clientY)
    return
  }
  if (state === 'levelComplete') { advanceLevel(); return }
  if (state === 'victory') {
    const t0 = e.changedTouches[0]
    handleVictoryClick(t0.clientX, t0.clientY)
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

let ctrlToggleBounds = { x: 0, y: 0, w: 0, h: 0 }

const PAUSE_BTN_SIZE = 36
function pauseBtnBounds() {
  return { x: canvas.width - PAUSE_BTN_SIZE - 15, y: 42, w: PAUSE_BTN_SIZE, h: PAUSE_BTN_SIZE }
}

canvas.addEventListener('click', e => {
  if (state === 'menu') handleMenuClick(e.clientX, e.clientY)
  if (state === 'highscores' || state === 'controls') { state = 'menu' }
  if (state === 'playing') {
    const pb = pauseBtnBounds()
    if (e.clientX >= pb.x && e.clientX <= pb.x + pb.w && e.clientY >= pb.y && e.clientY <= pb.y + pb.h) {
      paused = !paused
    }
  }
  if (state === 'gameover') handleGameOverClick(e.clientX, e.clientY)
  if (state === 'levelComplete') advanceLevel()
  if (state === 'victory') handleVictoryClick(e.clientX, e.clientY)
})

// ─── Actions ───
function throwSushi() {
  if (state !== 'playing' || !player.visible || sushis.length >= 10) return
  if (audioCtx.state === 'suspended') audioCtx.resume()
  sfxSushiThrow()
  const speed = 7
  const angle = (isTouchDevice && fireActive) ? shootAngle : player.facing
  const angles = activeTriple > 0 ? [angle - 0.2, angle, angle + 0.2] : [angle]
  for (const a of angles) {
    const spawnScreenX = player.pos.x + Math.cos(a) * 16
    const spawnScreenY = player.pos.y + Math.sin(a) * 16
    sushis.push({
      pos: { x: spawnScreenX, y: spawnScreenY },
      vel: { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
      life: 80,
      worldX: spawnScreenX,
      worldY: scrollY + (canvas.height - spawnScreenY)
    })
  }
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

// ─── Menu Logic ───
let menuItemBounds: { x: number; y: number; w: number; h: number }[] = []

function handleMenuSelect() {
  if (menuSelection === 0) startTransition(() => startNewRun())
  else if (menuSelection === 1) state = 'highscores'
  else if (menuSelection === 2) state = 'controls'
}

function handleMenuClick(cx: number, cy: number) {
  for (let i = 0; i < menuItemBounds.length; i++) {
    const b = menuItemBounds[i]
    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
      menuSelection = i; handleMenuSelect(); return
    }
  }
}

// ─── Game Init ───
function startNewRun() {
  if (audioCtx.state === 'suspended') audioCtx.resume()
  score = 0; lives = 3; currentLevel = 0
  resetStreak()
  beginLevel(0)
}

function beginLevel(level: number) {
  currentLevel = level
  scrollY = 0; distance = 0
  sushis = []; enemies = []; enemyProjectiles = []; particles = []
  poleSwing = null
  nextEnemyWorldY = 400
  treeObstacles = []
  nextTreeWorldY = 0
  bossFightState = 'none'
  currentBoss = null
  bossWarningTimer = 0
  bossClearTimer = 0
  bossProjectiles = []
  tentacleSweeps = []
  powerUps = []
  activeSpeed = 0; activeTriple = 0; hasShield = false
  playerWasOnWater = false
  resetPlayer()
  state = 'levelIntro'
  levelIntroTimer = 120
  startMusic(level)
}

function advanceLevel() {
  if (currentLevel < LEVEL_CONFIGS.length - 1) {
    startTransition(() => beginLevel(currentLevel + 1))
  } else {
    startTransition(() => { saveHighScore(score, currentLevel + 1); state = 'victory'; playVictoryJingle(); stopMusic() })
  }
}

function startGame(level?: number) {
  if (audioCtx.state === 'suspended') audioCtx.resume()
  if (level !== undefined) currentLevel = level
  state = 'playing'
  scrollY = 0; distance = 0
  sushis = []; enemies = []; enemyProjectiles = []; particles = []
  poleSwing = null
  nextEnemyWorldY = 400
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
    const lvlCfg = LEVEL_CONFIGS[currentLevel]
    // Spawn 1-3 enemies per "row"
    const count = 1 + Math.floor(Math.random() * 2)
    for (let c = 0; c < count; c++) {
      const types: EnemyType[] = ['crab', 'seagull', 'fisherman']
      const diff = Math.min(nextEnemyWorldY / 5000, 1)
      const weights = lvlCfg ? [
        lvlCfg.enemyWeights[0] + (1 - diff) * 0.2,
        lvlCfg.enemyWeights[1] + diff * 0.2,
        lvlCfg.enemyWeights[2] + diff * 0.3
      ] : [
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
      const moveFactor = Math.min(nextEnemyWorldY / 8000, 0.6)
      const hpScale = lvlCfg ? lvlCfg.enemyHpScale : 1
      const baseHp = type === 'fisherman' ? 3 : type === 'seagull' ? 1 : 2
      const stRange = lvlCfg ? lvlCfg.shootTimerRange : [80, 120] as [number, number]
      const enemy: Enemy = {
        pos: { x, y: 0 },
        vel: { x: 0, y: 0 },
        type,
        hp: Math.max(1, Math.round(baseHp * hpScale)),
        radius: type === 'fisherman' ? 16 : type === 'seagull' ? 12 : 14,
        timer: Math.random() * 200,
        shootTimer: stRange[0] + Math.random() * (stRange[1] - stRange[0]),
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
    const si = lvlCfg ? lvlCfg.spawnInterval : [100, 150] as [number, number]
    nextEnemyWorldY += si[0] + Math.random() * (si[1] - si[0])
  }
}

function spawnTreesAhead() {
  if (currentLevel !== 2) return // Only Level 3 (index 2) has collision trees
  const cameraTopWorldY = scrollY + canvas.height + 300
  while (nextTreeWorldY < cameraTopWorldY) {
    if (getTerrainAt(nextTreeWorldY) === 'grass') {
      // 2-4 trees per row
      const count = 2 + Math.floor(Math.random() * 3)
      for (let c = 0; c < count; c++) {
        const seed = ((nextTreeWorldY * 7919 + c * 3571) & 0x7fffffff)
        const tx = 20 + (seed % (canvas.width - 40))
        treeObstacles.push({ worldX: tx, worldY: nextTreeWorldY + (seed % 60), radius: 12 })
      }
    }
    nextTreeWorldY += 80 + Math.floor(Math.random() * 60)
  }
  // Cull trees far behind camera
  const cullY = scrollY - 200
  treeObstacles = treeObstacles.filter(t => t.worldY > cullY)
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
  updateTransition()
  updateShake()

  if (state === 'menu' || state === 'gameover' || state === 'highscores' || state === 'controls' || state === 'levelComplete' || state === 'victory') return
  if (state === 'levelIntro') {
    levelIntroTimer--
    if (levelIntroTimer <= 0) state = 'playing'
    return
  }
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

  // Water splash particles
  if (onWater !== playerWasOnWater && player.visible) {
    spawnParticles(player.pos.x, player.pos.y, 12, ['#4488ff', '#66aaff', '#88ccff', '#aaddff'])
    sfxSplash()
  }
  playerWasOnWater = onWater

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

  const baseSpeed = onWater ? 2.5 : 3.5
  const playerSpeed = activeSpeed > 0 ? baseSpeed * 1.5 : baseSpeed
  player.pos.x += moveX * playerSpeed
  player.pos.y += moveY * playerSpeed

  // Keep player on screen
  player.pos.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.pos.x))
  player.pos.y = Math.max(player.radius + 20, Math.min(canvas.height - player.radius - 20, player.pos.y))

  // Camera: player is clamped to the bottom 40% of the screen.
  // When they'd move higher than 60% from the top, the camera scrolls instead.
  const scrollThreshold = canvas.height * 0.60
  if (bossFightState === 'none') {
    if (player.pos.y < scrollThreshold) {
      const diff = scrollThreshold - player.pos.y
      scrollY += diff
      player.pos.y = scrollThreshold
    }
    distance = Math.floor(scrollY)
  } else {
    // During boss, lock camera but clamp player
    if (player.pos.y < player.radius + 20) player.pos.y = player.radius + 20
  }

  // Boss trigger: when distance reaches target, start boss sequence
  const levelCfg = LEVEL_CONFIGS[currentLevel]
  if (levelCfg && distance >= levelCfg.targetDistance && bossFightState === 'none') {
    bossFightState = 'warning'
    bossWarningTimer = 120 // 2 seconds
    bossScrollYLock = scrollY
    sfxBossWarning()
  }

  // Boss fight state machine
  if (bossFightState === 'warning') {
    bossWarningTimer--
    if (bossWarningTimer <= 0) {
      bossFightState = 'clearing'
      bossClearTimer = 60
    }
  }
  if (bossFightState === 'clearing') {
    bossClearTimer--
    // Clear enemies gradually
    if (enemies.length > 0 && bossClearTimer % 5 === 0) {
      const en = enemies.pop()!
      spawnParticles(en.pos.x, en.pos.y, 6, ['#ffffff', '#aaaaaa'])
    }
    if (bossClearTimer <= 0 || enemies.length === 0) {
      enemies = []
      enemyProjectiles = []
      bossFightState = 'fighting'
      currentBoss = createBoss(currentLevel)
      startMusic(3) // boss music
    }
  }
  if (bossFightState === 'fighting' && currentBoss) {
    // Lock camera
    scrollY = bossScrollYLock
    distance = Math.floor(scrollY)
    updateBoss()
  }
  if (bossFightState === 'defeated' && currentBoss) {
    currentBoss.defeatTimer--
    // Explosion particles during defeat
    if (currentBoss.defeatTimer % 8 === 0) {
      const bx = currentBoss.pos.x + (Math.random() - 0.5) * 60
      const by = currentBoss.pos.y + (Math.random() - 0.5) * 60
      spawnParticles(bx, by, 8, ['#ff4444', '#ffaa00', '#ffff44', '#ffffff'])
    }
    if (currentBoss.defeatTimer <= 0) {
      const bonuses = [500, 1000, 2000]
      score += (bonuses[currentLevel] || 500) * scoreMultiplier
      if (currentLevel >= LEVEL_CONFIGS.length - 1) {
        saveHighScore(score, currentLevel + 1)
        state = 'victory'
        playVictoryJingle()
        stopMusic()
      } else {
        state = 'levelComplete'
        playVictoryJingle()
        stopMusic()
      }
      bossFightState = 'none'
      currentBoss = null
      bossProjectiles = []
      tentacleSweeps = []
      return
    }
  }

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

  // Sushi projectiles (world space)
  for (let i = sushis.length - 1; i >= 0; i--) {
    const s = sushis[i]
    s.worldX += s.vel.x; s.worldY -= s.vel.y; s.life--
    s.pos.x = s.worldX
    s.pos.y = canvas.height - (s.worldY - scrollY)
    // Sushi trail particles
    if (frameCount % 3 === 0) {
      particles.push({
        pos: { x: s.pos.x + (Math.random() - 0.5) * 4, y: s.pos.y + (Math.random() - 0.5) * 4 },
        vel: { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 },
        life: 10 + Math.random() * 8, maxLife: 18,
        color: ['#ffffff', '#fff5e6', '#ffe8cc'][Math.floor(Math.random() * 3)]
      })
    }
    if (s.life <= 0 || s.pos.x < -20 || s.pos.x > canvas.width + 20 || s.pos.y < -20 || s.pos.y > canvas.height + 20)
      sushis.splice(i, 1)
  }

  // Spawn enemies and trees ahead (not during boss)
  if (bossFightState === 'none') {
    spawnEnemiesAhead()
    spawnTreesAhead()
  }

  // Tree collision (Level 3)
  if (currentLevel === 2 && player.visible) {
    const playerWX = player.pos.x
    const playerWY = scrollY + (canvas.height - player.pos.y)
    for (const tree of treeObstacles) {
      const dx = playerWX - tree.worldX
      const dy = playerWY - tree.worldY
      const dist = Math.hypot(dx, dy)
      const minDist = player.radius + tree.radius
      if (dist < minDist && dist > 0) {
        // Push player out
        const nx = dx / dist, ny = dy / dist
        const pushWX = tree.worldX + nx * minDist
        const pushWY = tree.worldY + ny * minDist
        player.pos.x = pushWX
        player.pos.y = canvas.height - (pushWY - scrollY)
      }
    }
  }

  updateEnemies()

  // Sushi-Enemy collision
  for (let si = sushis.length - 1; si >= 0; si--) {
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const s = sushis[si], en = enemies[ei]
      if (!s || !en) continue
      if (Math.hypot(s.pos.x - en.pos.x, s.pos.y - en.pos.y) < en.radius + 6) {
        sushis.splice(si, 1)
        en.hp--
        addStreakHit()
        if (en.hp <= 0) {
          const pts = en.type === 'fisherman' ? 300 : en.type === 'seagull' ? 100 : 150
          score += pts * scoreMultiplier
          const colors = en.type === 'crab' ? ['#ff4444', '#ff8844', '#ffaa66', '#ff2222', '#ffcc44'] :
                         en.type === 'seagull' ? ['#ffffff', '#cccccc', '#aaaaaa', '#eeeeff', '#ddddee'] :
                         ['#4488ff', '#6699ff', '#88bbff', '#3366dd', '#aaccff']
          spawnParticles(en.pos.x, en.pos.y, 20, colors) // More dramatic
          sfxHit()
          // Power-up drop chance
          if (Math.random() < 0.12) spawnPowerUp(en.pos.x, en.worldY)
          enemies.splice(ei, 1)
        } else {
          spawnParticles(en.pos.x, en.pos.y, 4, ['#ffffff', '#ffff88'])
        }
        break
      }
    }
  }

  // Sushi-Boss collision
  if (currentBoss && bossFightState === 'fighting' && !currentBoss.defeated) {
    for (let si = sushis.length - 1; si >= 0; si--) {
      const s = sushis[si]
      if (!s) continue
      // Crab king shield check
      if (currentBoss.bossType === 'crab_king' && currentBoss.shieldTimer && currentBoss.shieldTimer > 0) {
        if (Math.hypot(s.pos.x - currentBoss.pos.x, s.pos.y - currentBoss.pos.y) < currentBoss.radius + 6) {
          sushis.splice(si, 1)
          spawnParticles(s.pos.x, s.pos.y, 4, ['#8888ff', '#aaaaff'])
          continue
        }
      }
      if (Math.hypot(s.pos.x - currentBoss.pos.x, s.pos.y - currentBoss.pos.y) < currentBoss.radius + 6) {
        sushis.splice(si, 1)
        currentBoss.hp--
        currentBoss.flashTimer = 6
        triggerShake(3)
        addStreakHit()
        spawnParticles(currentBoss.pos.x, currentBoss.pos.y, 6, ['#ffffff', '#ffff88'])
        sfxHit()
        if (currentBoss.hp <= 0 && !currentBoss.defeated) {
          currentBoss.defeated = true
          currentBoss.defeatTimer = 90
          bossFightState = 'defeated'
          sfxBossDefeat()
          triggerShake(8)
          spawnParticles(currentBoss.pos.x, currentBoss.pos.y, 30, ['#ff4444', '#ffaa00', '#ffff44', '#ffffff'])
        }
        if (currentBoss.hp > 0 && currentBoss.hp <= currentBoss.maxHp * 0.5 && currentBoss.currentPhase === 0) {
          currentBoss.currentPhase = 1
          currentBoss.attackTimer = 30
          spawnParticles(currentBoss.pos.x, currentBoss.pos.y, 15, ['#ff00ff', '#ff44ff', '#ffaaff'])
        }
        break
      }
    }
  }

  // Pole-Boss collision
  if (poleSwing && player.visible && currentBoss && bossFightState === 'fighting' && !currentBoss.defeated) {
    const px = player.pos.x + Math.cos(poleSwing.angle) * poleSwing.radius * 0.7
    const py = player.pos.y + Math.sin(poleSwing.angle) * poleSwing.radius * 0.7
    if (!(currentBoss.bossType === 'crab_king' && currentBoss.shieldTimer && currentBoss.shieldTimer > 0)) {
      if (Math.hypot(px - currentBoss.pos.x, py - currentBoss.pos.y) < currentBoss.radius + 20) {
        currentBoss.hp -= 2
        currentBoss.flashTimer = 6
        sfxHit()
        spawnParticles(currentBoss.pos.x, currentBoss.pos.y, 8, ['#ffaa00', '#ff8800', '#ffcc44'])
        if (currentBoss.hp <= 0 && !currentBoss.defeated) {
          currentBoss.defeated = true
          currentBoss.defeatTimer = 90
          bossFightState = 'defeated'
          sfxBossDefeat()
          spawnParticles(currentBoss.pos.x, currentBoss.pos.y, 30, ['#ff4444', '#ffaa00', '#ffff44', '#ffffff'])
        }
        if (currentBoss.hp > 0 && currentBoss.hp <= currentBoss.maxHp * 0.5 && currentBoss.currentPhase === 0) {
          currentBoss.currentPhase = 1
          currentBoss.attackTimer = 30
          spawnParticles(currentBoss.pos.x, currentBoss.pos.y, 15, ['#ff00ff', '#ff44ff', '#ffaaff'])
        }
      }
    }
  }

  // Boss projectile - player collision
  if (player.visible && player.invulnTimer <= 0) {
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
      const bp = bossProjectiles[i]
      if (bp.type === 'net') {
        // Net: damage if player stands in it for >0.5s (~30 frames)
        const nr = bp.netRadius || 30
        if (Math.hypot(player.pos.x - bp.pos.x, player.pos.y - bp.pos.y) < nr) {
          bp.netTimer = (bp.netTimer || 0) + 1
          if (bp.netTimer > 30) {
            bossProjectiles.splice(i, 1)
            playerDamage()
            break
          }
        } else {
          bp.netTimer = 0
        }
      } else {
        if (Math.hypot(player.pos.x - bp.pos.x, player.pos.y - bp.pos.y) < player.radius + 5) {
          bossProjectiles.splice(i, 1)
          playerDamage()
          break
        }
      }
    }
  }

  // Tentacle sweep - player collision
  if (player.visible && player.invulnTimer <= 0) {
    for (const sweep of tentacleSweeps) {
      if (player.pos.x > sweep.x - sweep.width / 2 && player.pos.x < sweep.x + sweep.width / 2 &&
          player.pos.y > sweep.y - sweep.height / 2 && player.pos.y < sweep.y + sweep.height / 2) {
        playerDamage()
        break
      }
    }
  }

  // Boss contact damage
  if (currentBoss && bossFightState === 'fighting' && !currentBoss.defeated && player.visible && player.invulnTimer <= 0) {
    if (Math.hypot(player.pos.x - currentBoss.pos.x, player.pos.y - currentBoss.pos.y) < player.radius + currentBoss.radius - 4) {
      playerDamage()
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
        addStreakHit()
        if (en.hp <= 0) {
          score += (en.type === 'fisherman' ? 400 : en.type === 'seagull' ? 150 : 200) * scoreMultiplier
          const colors = ['#ffaa00', '#ff8800', '#ffcc44']
          spawnParticles(en.pos.x, en.pos.y, 20, colors)
          sfxHit()
          if (Math.random() < 0.12) spawnPowerUp(en.pos.x, en.worldY)
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
  updatePowerUps()
  updateShake()
  if (multiplierDisplayTimer > 0) multiplierDisplayTimer--
}

function playerDamage() {
  // Shield absorbs hit
  if (hasShield) {
    hasShield = false
    spawnParticles(player.pos.x, player.pos.y, 15, ['#4488ff', '#66aaff', '#88ccff'])
    player.invulnTimer = 30
    triggerShake(3)
    return
  }
  spawnParticles(player.pos.x, player.pos.y, 20, ['#ffffff', '#ff4444', '#ffaa00'])
  sfxPlayerHit()
  triggerShake(5)
  resetStreak()
  player.visible = false
  lives--
  if (lives <= 0) {
    state = 'gameover'
    saveHighScore(score, currentLevel + 1)
    stopMusic()
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
        const lvlCfg = LEVEL_CONFIGS[currentLevel]
        const stR = lvlCfg ? lvlCfg.shootTimerRange : [120, 200] as [number, number]
        en.shootTimer = stR[0] + Math.random() * (stR[1] - stR[0])
        const dx = player.pos.x - en.pos.x, dy = player.pos.y - en.pos.y
        const d = Math.hypot(dx, dy)
        const pSpeed = lvlCfg ? lvlCfg.projectileSpeed : 2.5
        if (d > 0 && d < 300) {
          enemyProjectiles.push({
            pos: { x: en.pos.x, y: en.pos.y },
            vel: { x: dx / d * pSpeed, y: dy / d * pSpeed },
            life: 100,
            worldX: en.pos.x,
            worldY: scrollY + (canvas.height - en.pos.y)
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
    p.worldX += p.vel.x; p.worldY -= p.vel.y; p.life--
    // Convert to screen space
    p.pos.x = p.worldX
    p.pos.y = canvas.height - (p.worldY - scrollY)
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

// ─── Boss Logic ───
function createBoss(level: number): Boss {
  const screenX = canvas.width / 2
  const screenY = canvas.height * 0.22
  const worldY = bossScrollYLock + (canvas.height - screenY)

  if (level === 0) {
    return {
      name: 'Giant Octopus',
      pos: { x: screenX, y: screenY },
      worldY,
      hp: 25, maxHp: 25,
      radius: 40,
      currentPhase: 0,
      phases: [
        { patterns: ['ink_spread'], attackInterval: 120 },
        { patterns: ['ink_spread', 'tentacle_sweep'], attackInterval: 80 }
      ],
      phaseTimer: 0, attackTimer: 60, animFrame: 0,
      defeated: false, defeatTimer: 0,
      bossType: 'octopus', flashTimer: 0
    }
  } else if (level === 1) {
    return {
      name: 'Crab King',
      pos: { x: screenX, y: screenY },
      worldY,
      hp: 35, maxHp: 35,
      radius: 42,
      currentPhase: 0,
      phases: [
        { patterns: ['charge'], attackInterval: 100 },
        { patterns: ['charge', 'spawn_minions'], attackInterval: 70 }
      ],
      phaseTimer: 0, attackTimer: 60, animFrame: 0,
      defeated: false, defeatTimer: 0,
      bossType: 'crab_king', flashTimer: 0,
      chargeVelX: 0, chargeDir: 1, shieldTimer: 0
    }
  } else {
    return {
      name: 'Master Fisherman',
      pos: { x: screenX, y: screenY },
      worldY,
      hp: 40, maxHp: 40,
      radius: 38,
      currentPhase: 0,
      phases: [
        { patterns: ['cast_nets', 'throw_hooks'], attackInterval: 110 },
        { patterns: ['throw_hooks', 'summon_seagulls', 'cast_nets'], attackInterval: 60 }
      ],
      phaseTimer: 0, attackTimer: 60, animFrame: 0,
      defeated: false, defeatTimer: 0,
      bossType: 'fisherman', flashTimer: 0
    }
  }
}

function updateBoss() {
  if (!currentBoss || currentBoss.defeated) return
  const boss = currentBoss
  boss.animFrame++
  boss.phaseTimer++
  if (boss.flashTimer > 0) boss.flashTimer--

  const phase = boss.phases[boss.currentPhase]
  boss.attackTimer--

  if (boss.attackTimer <= 0) {
    boss.attackTimer = phase.attackInterval
    // Pick a pattern
    const pattern = phase.patterns[boss.phaseTimer % phase.patterns.length]
    executeBossAttack(boss, pattern)
  }

  // Type-specific update
  if (boss.bossType === 'octopus') {
    // Gentle sway
    boss.pos.x = canvas.width / 2 + Math.sin(boss.animFrame * 0.015) * 60
  } else if (boss.bossType === 'crab_king') {
    // Charge movement
    if (boss.chargeVelX && boss.chargeVelX !== 0) {
      boss.pos.x += boss.chargeVelX
      if (boss.pos.x < boss.radius + 10 || boss.pos.x > canvas.width - boss.radius - 10) {
        boss.chargeVelX = 0
        boss.pos.x = Math.max(boss.radius + 10, Math.min(canvas.width - boss.radius - 10, boss.pos.x))
      }
    } else {
      // Gentle bob
      boss.pos.y = canvas.height * 0.22 + Math.sin(boss.animFrame * 0.02) * 10
    }
    if (boss.shieldTimer && boss.shieldTimer > 0) boss.shieldTimer--
  } else if (boss.bossType === 'fisherman') {
    // Subtle sway
    boss.pos.x = canvas.width / 2 + Math.sin(boss.animFrame * 0.01) * 40
  }

  // Update boss projectiles
  for (let i = bossProjectiles.length - 1; i >= 0; i--) {
    const p = bossProjectiles[i]
    if (p.type !== 'net') {
      p.worldX += p.vel.x; p.worldY -= p.vel.y
      p.pos.x = p.worldX
      p.pos.y = canvas.height - (p.worldY - scrollY)
    }
    p.life--
    if (p.life <= 0 || p.pos.x < -30 || p.pos.x > canvas.width + 30 || p.pos.y > canvas.height + 30 || p.pos.y < -30)
      bossProjectiles.splice(i, 1)
  }

  // Update tentacle sweeps
  for (let i = tentacleSweeps.length - 1; i >= 0; i--) {
    const s = tentacleSweeps[i]
    s.y += s.velY
    s.life--
    if (s.life <= 0 || s.y > canvas.height + 50) tentacleSweeps.splice(i, 1)
  }
}

function executeBossAttack(boss: Boss, pattern: BossPhasePattern) {
  if (pattern === 'ink_spread') {
    // Fire ink projectiles in a fan
    const count = boss.currentPhase === 0 ? 3 : 5
    const spread = Math.PI * 0.6
    const baseAngle = Math.PI / 2 // downward
    const speed = boss.currentPhase === 0 ? 2.5 : 3.5
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i
      bossProjectiles.push({
        pos: { x: boss.pos.x, y: boss.pos.y + boss.radius },
        vel: { x: Math.cos(angle) * speed, y: -Math.sin(angle) * speed },
        life: 120,
        worldX: boss.pos.x,
        worldY: scrollY + (canvas.height - boss.pos.y - boss.radius),
        type: 'ink'
      })
    }
  } else if (pattern === 'tentacle_sweep') {
    tentacleSweeps.push({
      x: canvas.width / 2,
      y: boss.pos.y + boss.radius + 10,
      width: canvas.width * 0.8,
      height: 20,
      life: 80,
      velY: 2
    })
  } else if (pattern === 'charge') {
    const speed = boss.currentPhase === 0 ? 5 : 8
    boss.chargeDir = boss.pos.x > canvas.width / 2 ? -1 : 1
    boss.chargeVelX = boss.chargeDir * speed
  } else if (pattern === 'spawn_minions') {
    // Spawn 2-3 mini crabs as regular enemies
    const count = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < count; i++) {
      const x = 40 + Math.random() * (canvas.width - 80)
      const wy = scrollY + canvas.height * 0.4 + Math.random() * canvas.height * 0.3
      enemies.push({
        pos: { x, y: 0 },
        vel: { x: 0, y: 0 },
        type: 'crab',
        hp: 1, radius: 10,
        timer: Math.random() * 200,
        shootTimer: 999,
        animFrame: 0,
        worldY: wy, baseX: x, moveFactor: 0.4
      })
    }
    boss.shieldTimer = 60 // 1 second invulnerable
  } else if (pattern === 'cast_nets') {
    // Area denial circles
    const count = boss.currentPhase === 0 ? 2 : 3
    const nr = boss.currentPhase === 0 ? 30 : 45
    for (let i = 0; i < count; i++) {
      const tx = 40 + Math.random() * (canvas.width - 80)
      const ty = canvas.height * 0.4 + Math.random() * (canvas.height * 0.4)
      bossProjectiles.push({
        pos: { x: tx, y: ty },
        vel: { x: 0, y: 0 },
        life: 180,
        worldX: tx,
        worldY: scrollY + (canvas.height - ty),
        type: 'net',
        netTimer: 0,
        netRadius: nr
      })
    }
  } else if (pattern === 'throw_hooks') {
    // Aimed hook at player
    const count = boss.currentPhase === 0 ? 1 : 3
    for (let i = 0; i < count; i++) {
      const dx = player.pos.x - boss.pos.x + (Math.random() - 0.5) * 40
      const dy = player.pos.y - boss.pos.y
      const d = Math.hypot(dx, dy)
      const speed = boss.currentPhase === 0 ? 3 : 4.5
      if (d > 0) {
        bossProjectiles.push({
          pos: { x: boss.pos.x, y: boss.pos.y + boss.radius },
          vel: { x: (dx / d) * speed, y: -(dy / d) * speed },
          life: 100,
          worldX: boss.pos.x,
          worldY: scrollY + (canvas.height - boss.pos.y - boss.radius),
          type: 'hook'
        })
      }
    }
  } else if (pattern === 'summon_seagulls') {
    for (let i = 0; i < 3; i++) {
      const x = 30 + Math.random() * (canvas.width - 60)
      const wy = scrollY + canvas.height + 50 + i * 80
      enemies.push({
        pos: { x, y: 0 },
        vel: { x: 0, y: 0 },
        type: 'seagull',
        hp: 1, radius: 12,
        timer: Math.random() * 200,
        shootTimer: 999,
        animFrame: 0,
        worldY: wy, baseX: x, moveFactor: 0.5
      })
    }
  }
}

function drawBoss() {
  if (!currentBoss) return
  const boss = currentBoss
  if (boss.defeated && boss.defeatTimer % 4 < 2) return // Flash when defeated

  ctx.save()
  ctx.translate(boss.pos.x, boss.pos.y)

  // Flash white on hit
  const isFlash = boss.flashTimer > 0

  if (boss.bossType === 'octopus') {
    // Body
    ctx.fillStyle = isFlash ? '#ffffff' : '#663388'
    ctx.beginPath()
    ctx.arc(0, 0, boss.radius, 0, Math.PI * 2)
    ctx.fill()
    // Spots
    if (!isFlash) {
      ctx.fillStyle = '#884499'
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + boss.animFrame * 0.01
        ctx.beginPath()
        ctx.arc(Math.cos(a) * 20, Math.sin(a) * 15, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Eyes
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(-12, -10, 8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(12, -10, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000000'
    ctx.beginPath(); ctx.arc(-10, -10, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(14, -10, 4, 0, Math.PI * 2); ctx.fill()
    // 8 tentacles
    if (!isFlash) {
      ctx.strokeStyle = '#553377'; ctx.lineWidth = 4
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI + Math.PI * 0.1
        const baseX = Math.cos(a) * boss.radius * 0.8
        const baseY = boss.radius * 0.6
        const wave = Math.sin(boss.animFrame * 0.05 + i) * 15
        ctx.beginPath()
        ctx.moveTo(baseX, baseY)
        ctx.quadraticCurveTo(baseX + wave, baseY + 25, baseX + wave * 0.5, baseY + 50)
        ctx.stroke()
      }
    }
  } else if (boss.bossType === 'crab_king') {
    // Shield visual
    if (boss.shieldTimer && boss.shieldTimer > 0) {
      ctx.strokeStyle = `rgba(100,100,255,${0.3 + Math.sin(boss.animFrame * 0.3) * 0.2})`
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, boss.radius + 10, 0, Math.PI * 2); ctx.stroke()
    }
    // Body
    ctx.fillStyle = isFlash ? '#ffffff' : '#cc2222'
    ctx.beginPath()
    ctx.ellipse(0, 0, boss.radius + 5, boss.radius - 5, 0, 0, Math.PI * 2)
    ctx.fill()
    // Crown
    ctx.fillStyle = '#ffdd00'
    ctx.beginPath()
    ctx.moveTo(-15, -boss.radius + 5)
    ctx.lineTo(-12, -boss.radius - 12)
    ctx.lineTo(-5, -boss.radius + 2)
    ctx.lineTo(0, -boss.radius - 15)
    ctx.lineTo(5, -boss.radius + 2)
    ctx.lineTo(12, -boss.radius - 12)
    ctx.lineTo(15, -boss.radius + 5)
    ctx.closePath(); ctx.fill()
    // Crown gems
    ctx.fillStyle = '#ff0000'
    ctx.beginPath(); ctx.arc(0, -boss.radius - 8, 3, 0, Math.PI * 2); ctx.fill()
    // Giant claws
    if (!isFlash) {
      const clawAnim = Math.sin(boss.animFrame * 0.08) * 0.3
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.translate(side * (boss.radius + 15), -5)
        ctx.rotate(side * clawAnim)
        ctx.fillStyle = '#ee3333'
        ctx.beginPath()
        ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill()
        // Claw pinch
        ctx.fillStyle = '#dd2222'
        ctx.beginPath()
        ctx.moveTo(side * 8, -10); ctx.lineTo(side * 20, -15); ctx.lineTo(side * 12, -5)
        ctx.closePath(); ctx.fill()
        ctx.beginPath()
        ctx.moveTo(side * 8, 5); ctx.lineTo(side * 20, 10); ctx.lineTo(side * 12, 0)
        ctx.closePath(); ctx.fill()
        ctx.restore()
      }
    }
    // Eyes
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(-10, -8, 6, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(10, -8, 6, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000000'
    ctx.beginPath(); ctx.arc(-9, -8, 3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(11, -8, 3, 0, Math.PI * 2); ctx.fill()
    // Legs
    ctx.strokeStyle = '#cc2222'; ctx.lineWidth = 3
    for (const side of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const lx = side * (15 + j * 10)
        ctx.beginPath()
        ctx.moveTo(lx, boss.radius - 10)
        ctx.lineTo(lx + side * 8, boss.radius + 8 + Math.sin(boss.animFrame * 0.1 + j) * 3)
        ctx.stroke()
      }
    }
  } else if (boss.bossType === 'fisherman') {
    // Body (large)
    ctx.fillStyle = isFlash ? '#ffffff' : '#3355aa'
    ctx.beginPath()
    ctx.arc(0, 5, boss.radius - 5, 0, Math.PI * 2)
    ctx.fill()
    // Head
    ctx.fillStyle = isFlash ? '#ffffff' : '#dda877'
    ctx.beginPath()
    ctx.arc(0, -boss.radius + 8, 16, 0, Math.PI * 2)
    ctx.fill()
    // Big hat
    ctx.fillStyle = '#556633'
    ctx.fillRect(-18, -boss.radius - 8, 36, 10)
    ctx.fillRect(-14, -boss.radius - 18, 28, 12)
    // Angry eyes
    ctx.fillStyle = '#000000'
    ctx.fillRect(-8, -boss.radius + 5, 5, 3)
    ctx.fillRect(3, -boss.radius + 5, 5, 3)
    // Eyebrows (angry)
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(-10, -boss.radius + 2); ctx.lineTo(-3, -boss.radius + 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(10, -boss.radius + 2); ctx.lineTo(3, -boss.radius + 4); ctx.stroke()
    // Giant fishing rod
    if (!isFlash) {
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(20, 0); ctx.lineTo(40, -40); ctx.lineTo(50, -50)
      ctx.stroke()
      ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(50, -50)
      ctx.lineTo(50 + Math.sin(boss.animFrame * 0.05) * 10, -30)
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawBossProjectiles() {
  for (const p of bossProjectiles) {
    if (p.type === 'ink') {
      ctx.fillStyle = '#2a0a3a'
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(60,20,80,0.4)'
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 9, 0, Math.PI * 2); ctx.fill()
    } else if (p.type === 'hook') {
      ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI)
      ctx.stroke()
      ctx.fillStyle = '#888888'
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2); ctx.fill()
    } else if (p.type === 'net') {
      const nr = p.netRadius || 30
      const alpha = Math.min(p.life / 30, 1) * 0.35
      ctx.fillStyle = `rgba(139,69,19,${alpha})`
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, nr, 0, Math.PI * 2); ctx.fill()
      // Net pattern
      ctx.strokeStyle = `rgba(160,120,60,${alpha + 0.1})`; ctx.lineWidth = 1
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath()
        ctx.moveTo(p.pos.x, p.pos.y)
        ctx.lineTo(p.pos.x + Math.cos(a) * nr, p.pos.y + Math.sin(a) * nr)
        ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, nr * 0.5, 0, Math.PI * 2); ctx.stroke()
    }
  }

  // Tentacle sweeps
  for (const s of tentacleSweeps) {
    const alpha = Math.min(s.life / 20, 1) * 0.6
    ctx.fillStyle = `rgba(100,50,150,${alpha})`
    ctx.fillRect(s.x - s.width / 2, s.y - s.height / 2, s.width, s.height)
    ctx.strokeStyle = `rgba(150,80,200,${alpha})`; ctx.lineWidth = 2
    ctx.strokeRect(s.x - s.width / 2, s.y - s.height / 2, s.width, s.height)
  }
}

function drawBossHealthBar() {
  if (!currentBoss || bossFightState !== 'fighting' && bossFightState !== 'defeated') return
  const boss = currentBoss
  const barW = canvas.width * 0.7
  const barH = 16
  const barX = (canvas.width - barW) / 2
  const barY = 10

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4)

  // Health gradient
  const hpRatio = Math.max(0, boss.hp / boss.maxHp)
  const grad = ctx.createLinearGradient(barX, 0, barX + barW * hpRatio, 0)
  if (hpRatio > 0.5) {
    grad.addColorStop(0, '#44ff44')
    grad.addColorStop(1, '#88ff44')
  } else if (hpRatio > 0.25) {
    grad.addColorStop(0, '#ffcc00')
    grad.addColorStop(1, '#ff8800')
  } else {
    grad.addColorStop(0, '#ff4444')
    grad.addColorStop(1, '#ff0000')
  }
  ctx.fillStyle = grad
  ctx.fillRect(barX, barY, barW * hpRatio, barH)

  // Segments
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1
  const segments = 20
  for (let i = 1; i < segments; i++) {
    const sx = barX + (barW / segments) * i
    ctx.beginPath(); ctx.moveTo(sx, barY); ctx.lineTo(sx, barY + barH); ctx.stroke()
  }

  // Border
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5
  ctx.strokeRect(barX, barY, barW, barH)

  // Boss name
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${isPortrait ? 11 : 13}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(boss.name, canvas.width / 2, barY + barH + 14)
}

function drawBossWarning() {
  if (bossFightState !== 'warning') return
  const flash = Math.sin(bossWarningTimer * 0.3) > 0
  if (flash) {
    ctx.fillStyle = 'rgba(255,0,0,0.15)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.save()
  ctx.textAlign = 'center'
  const scale = 1 + Math.sin(bossWarningTimer * 0.2) * 0.1
  ctx.translate(canvas.width / 2, canvas.height * 0.4)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ff0000'
  ctx.font = `bold ${isPortrait ? 40 : 56}px monospace`
  ctx.fillText('⚠ WARNING! ⚠', 0, 0)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `bold ${isPortrait ? 18 : 24}px monospace`
  ctx.fillText('BOSS APPROACHING', 0, 40)
  ctx.restore()
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

  // ─── Level-specific decorations ───
  drawLevelDecorations()

  // Trees on grass (visual-only for levels 1 & 2; level 3 uses collision trees)
  if (currentLevel !== 2) {
    const gridSize = 300
    const startRow = Math.floor(scrollY / gridSize) - 1
    const endRow = Math.floor((scrollY + canvas.height) / gridSize) + 1
    for (let row = startRow; row <= endRow; row++) {
      const seed = (row * 4517 + 9929) & 0x7fffffff
      const wY = row * gridSize + (seed % gridSize)
      if (getTerrainAt(wY) === 'grass') {
        const screenYp = canvas.height - (wY - scrollY)
        if (screenYp > -20 && screenYp < canvas.height + 20) {
          const sx = ((seed * 7) & 0x7fffffff) % canvas.width
          ctx.fillStyle = '#5a3a1a'
          ctx.fillRect(sx - 3, screenYp - 5, 6, 12)
          ctx.fillStyle = '#1a6a1a'
          ctx.beginPath()
          ctx.arc(sx, screenYp - 10, 10 + (seed % 5), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  // Level 3: Draw collision trees
  if (currentLevel === 2) {
    for (const tree of treeObstacles) {
      const screenYp = canvas.height - (tree.worldY - scrollY)
      if (screenYp > -30 && screenYp < canvas.height + 30) {
        // Trunk
        ctx.fillStyle = '#4a2a0a'
        ctx.fillRect(tree.worldX - 4, screenYp - 4, 8, 16)
        // Canopy (larger, denser for jungle feel)
        ctx.fillStyle = '#0d5a0d'
        ctx.beginPath()
        ctx.arc(tree.worldX, screenYp - 10, tree.radius, 0, Math.PI * 2)
        ctx.fill()
        // Highlight
        ctx.fillStyle = 'rgba(30,120,30,0.5)'
        ctx.beginPath()
        ctx.arc(tree.worldX - 3, screenYp - 13, tree.radius * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Boats on water (Level 1 scenery)
  if (currentLevel === 0 && scrollY < 1800) {
    for (let i = 0; i < 5; i++) {
      const bWorldY = 150 + i * 350
      const bScreenY = canvas.height - (bWorldY - scrollY)
      if (bScreenY > -30 && bScreenY < canvas.height + 30) {
        const bx = 60 + ((i * 137) % (canvas.width - 120))
        drawBoat(bx, bScreenY)
      }
    }
  }
}

function drawLevelDecorations() {
  const gridSize = 60
  const startRow = Math.floor(scrollY / gridSize) - 2
  const endRow = Math.floor((scrollY + canvas.height) / gridSize) + 2

  if (currentLevel === 0) {
    // Ocean: Coral, seaweed, floating debris, boat wakes
    for (let row = startRow; row <= endRow; row++) {
      for (let j = 0; j < 3; j++) {
        const seed = (row * 8123 + j * 2917 + 1) & 0x7fffffff
        const wY = row * gridSize + (seed % gridSize)
        const terrain = getTerrainAt(wY)
        const screenYp = canvas.height - (wY - scrollY)
        if (screenYp < -10 || screenYp > canvas.height + 10) continue
        const sx = ((seed * 3) & 0x7fffffff) % canvas.width

        if (terrain === 'water') {
          const kind = seed % 4
          if (kind === 0) {
            // Coral
            ctx.fillStyle = `rgba(${180 + seed % 60},${80 + seed % 40},${100 + seed % 50},0.4)`
            ctx.beginPath()
            ctx.arc(sx, screenYp, 4 + seed % 3, 0, Math.PI * 2); ctx.fill()
            ctx.beginPath()
            ctx.arc(sx + 5, screenYp - 3, 3, 0, Math.PI * 2); ctx.fill()
          } else if (kind === 1) {
            // Seaweed
            ctx.strokeStyle = 'rgba(30,140,60,0.35)'; ctx.lineWidth = 2
            const sway = Math.sin(frameCount * 0.03 + sx * 0.1) * 4
            ctx.beginPath()
            ctx.moveTo(sx, screenYp)
            ctx.quadraticCurveTo(sx + sway, screenYp - 8, sx + sway * 0.5, screenYp - 16)
            ctx.stroke()
          } else if (kind === 2) {
            // Floating debris
            ctx.fillStyle = 'rgba(120,90,50,0.25)'
            ctx.fillRect(sx - 4, screenYp - 1, 8, 2)
          } else {
            // Bubble
            ctx.strokeStyle = 'rgba(150,200,255,0.2)'; ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(sx, screenYp, 2, 0, Math.PI * 2); ctx.stroke()
          }
        } else if (terrain === 'sand') {
          // Sand pebbles
          ctx.fillStyle = 'rgba(180,150,80,0.3)'
          ctx.beginPath(); ctx.arc(sx, screenYp, 2, 0, Math.PI * 2); ctx.fill()
        }
      }
    }
  } else if (currentLevel === 1) {
    // Beach: Shells, starfish, beach umbrellas, driftwood, tide pools
    for (let row = startRow; row <= endRow; row++) {
      for (let j = 0; j < 3; j++) {
        const seed = (row * 5431 + j * 3719 + 2) & 0x7fffffff
        const wY = row * gridSize + (seed % gridSize)
        const terrain = getTerrainAt(wY)
        const screenYp = canvas.height - (wY - scrollY)
        if (screenYp < -10 || screenYp > canvas.height + 10) continue
        const sx = ((seed * 3) & 0x7fffffff) % canvas.width

        if (terrain === 'water') {
          // Water: seaweed & foam
          ctx.fillStyle = 'rgba(200,230,255,0.15)'
          ctx.beginPath(); ctx.arc(sx, screenYp, 3, 0, Math.PI * 2); ctx.fill()
        } else if (terrain === 'sand') {
          const kind = seed % 5
          if (kind === 0) {
            // Shell (spiral)
            ctx.fillStyle = 'rgba(230,210,180,0.5)'
            ctx.beginPath(); ctx.arc(sx, screenYp, 3, 0, Math.PI * 2); ctx.fill()
            ctx.strokeStyle = 'rgba(180,160,130,0.4)'; ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.arc(sx, screenYp, 2, 0, Math.PI); ctx.stroke()
          } else if (kind === 1) {
            // Starfish
            ctx.fillStyle = 'rgba(220,120,80,0.45)'
            for (let a = 0; a < 5; a++) {
              const angle = (a / 5) * Math.PI * 2 - Math.PI / 2
              ctx.beginPath()
              ctx.moveTo(sx, screenYp)
              ctx.lineTo(sx + Math.cos(angle) * 5, screenYp + Math.sin(angle) * 5)
              ctx.lineTo(sx + Math.cos(angle + 0.3) * 2, screenYp + Math.sin(angle + 0.3) * 2)
              ctx.fill()
            }
          } else if (kind === 2) {
            // Driftwood
            ctx.fillStyle = 'rgba(140,110,70,0.35)'
            ctx.save(); ctx.translate(sx, screenYp); ctx.rotate((seed % 314) / 100)
            ctx.fillRect(-6, -1, 12, 2); ctx.restore()
          } else if (kind === 3) {
            // Tide pool
            ctx.fillStyle = 'rgba(40,80,120,0.25)'
            ctx.beginPath(); ctx.ellipse(sx, screenYp, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
          } else {
            // Sand pebble
            ctx.fillStyle = 'rgba(180,150,80,0.3)'
            ctx.beginPath(); ctx.arc(sx, screenYp, 2, 0, Math.PI * 2); ctx.fill()
          }
        } else if (terrain === 'grass') {
          // Grass tufts
          ctx.fillStyle = `rgba(20,${100 + seed % 60},20,0.4)`
          ctx.beginPath(); ctx.arc(sx, screenYp, 3 + seed % 3, 0, Math.PI * 2); ctx.fill()
        }
      }
    }
    // Beach umbrellas (sparse, big grid)
    {
      const uGrid = 400
      const uStart = Math.floor(scrollY / uGrid) - 1
      const uEnd = Math.floor((scrollY + canvas.height) / uGrid) + 1
      for (let row = uStart; row <= uEnd; row++) {
        const seed = (row * 9371 + 4447) & 0x7fffffff
        const wY = row * uGrid + 100 + (seed % 200)
        if (getTerrainAt(wY) !== 'sand') continue
        const screenYp = canvas.height - (wY - scrollY)
        if (screenYp < -20 || screenYp > canvas.height + 20) continue
        const sx = ((seed * 7) & 0x7fffffff) % canvas.width
        // Pole
        ctx.fillStyle = 'rgba(160,130,90,0.5)'
        ctx.fillRect(sx - 1, screenYp - 12, 2, 14)
        // Umbrella top
        const colors = ['rgba(220,60,60,0.4)', 'rgba(60,60,220,0.4)', 'rgba(220,180,40,0.4)']
        ctx.fillStyle = colors[seed % 3]
        ctx.beginPath(); ctx.arc(sx, screenYp - 12, 10, Math.PI, 0); ctx.fill()
      }
    }
  } else if (currentLevel === 2) {
    // Island: Flowers, mushrooms, rocks, bushes
    for (let row = startRow; row <= endRow; row++) {
      for (let j = 0; j < 4; j++) {
        const seed = (row * 6733 + j * 4091 + 3) & 0x7fffffff
        const wY = row * gridSize + (seed % gridSize)
        const terrain = getTerrainAt(wY)
        const screenYp = canvas.height - (wY - scrollY)
        if (screenYp < -10 || screenYp > canvas.height + 10) continue
        const sx = ((seed * 3) & 0x7fffffff) % canvas.width

        if (terrain === 'grass') {
          const kind = seed % 5
          if (kind === 0) {
            // Flower
            const fColors = ['rgba(255,100,100,0.6)', 'rgba(255,200,50,0.6)', 'rgba(200,100,255,0.6)', 'rgba(255,150,200,0.6)']
            ctx.fillStyle = fColors[seed % fColors.length]
            ctx.beginPath(); ctx.arc(sx, screenYp, 3, 0, Math.PI * 2); ctx.fill()
            ctx.fillStyle = 'rgba(255,230,100,0.7)'
            ctx.beginPath(); ctx.arc(sx, screenYp, 1.5, 0, Math.PI * 2); ctx.fill()
          } else if (kind === 1) {
            // Mushroom
            ctx.fillStyle = 'rgba(200,180,150,0.4)'
            ctx.fillRect(sx - 1, screenYp, 2, 4)
            ctx.fillStyle = 'rgba(200,50,50,0.45)'
            ctx.beginPath(); ctx.arc(sx, screenYp, 4, Math.PI, 0); ctx.fill()
            // Spots
            ctx.fillStyle = 'rgba(255,255,255,0.3)'
            ctx.beginPath(); ctx.arc(sx - 1, screenYp - 1, 1, 0, Math.PI * 2); ctx.fill()
          } else if (kind === 2) {
            // Rock
            ctx.fillStyle = 'rgba(120,115,105,0.45)'
            ctx.beginPath(); ctx.ellipse(sx, screenYp, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
          } else if (kind === 3) {
            // Bush
            ctx.fillStyle = 'rgba(25,90,25,0.4)'
            ctx.beginPath(); ctx.arc(sx, screenYp, 5 + seed % 3, 0, Math.PI * 2); ctx.fill()
          } else {
            // Dense grass tuft
            ctx.fillStyle = `rgba(15,${90 + seed % 50},15,0.5)`
            ctx.beginPath(); ctx.arc(sx, screenYp, 3 + seed % 3, 0, Math.PI * 2); ctx.fill()
          }
        } else if (terrain === 'sand') {
          ctx.fillStyle = 'rgba(180,150,80,0.3)'
          ctx.beginPath(); ctx.arc(sx, screenYp, 2, 0, Math.PI * 2); ctx.fill()
        }
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

  // Score multiplier
  if (scoreMultiplier > 1 && multiplierDisplayTimer > 0) {
    ctx.fillStyle = '#ffdd00'; ctx.font = `bold ${isPortrait ? 14 : 16}px monospace`
    ctx.textAlign = 'left'
    ctx.fillText(`x${scoreMultiplier}`, 15 + ctx.measureText(`SCORE: ${score}`).width + 10, 30)
  }

  // Active power-up indicators
  {
    let px = 20
    const py = 68
    ctx.font = `bold ${isPortrait ? 11 : 13}px monospace`; ctx.textAlign = 'left'
    if (activeSpeed > 0) { ctx.fillStyle = '#ffdd00'; ctx.fillText(`⚡${Math.ceil(activeSpeed / 60)}s`, px, py); px += 45 }
    if (activeTriple > 0) { ctx.fillStyle = '#ff4444'; ctx.fillText(`🔥${Math.ceil(activeTriple / 60)}s`, px, py); px += 45 }
    if (hasShield) { ctx.fillStyle = '#4488ff'; ctx.fillText('🛡', px, py); px += 25 }
  }

  // Distance
  ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
  ctx.textAlign = 'center'
  ctx.fillText(`${distance}m`, canvas.width / 2, 25)

  // Level + terrain indicator
  const cfg = LEVEL_CONFIGS[currentLevel]
  const levelLabel = cfg ? `Lv${currentLevel + 1}: ${cfg.name}` : ''
  ctx.fillText(levelLabel, canvas.width / 2, 42)

  // Progress bar toward level target
  if (cfg) {
    const prog = Math.min(distance / cfg.targetDistance, 1)
    const barW = 100, barH = 4
    const barX = canvas.width / 2 - barW / 2, barY = 48
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(barX, barY, barW, barH)
    ctx.fillStyle = 'rgba(68,255,68,0.6)'; ctx.fillRect(barX, barY, barW * prog, barH)
  }

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

function drawMenuBackground() {
  ctx.fillStyle = '#0a1a3a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
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
}

function drawMenu() {
  drawMenuBackground()
  drawBoat(canvas.width / 2, canvas.height * 0.50)
  ctx.textAlign = 'center'
  const cx = canvas.width / 2

  const titleSize = isPortrait ? 38 : 56
  ctx.fillStyle = '#ff7744'; ctx.font = `bold ${titleSize}px monospace`
  ctx.fillText('🍣 SUSHI BROS 🎣', cx, canvas.height * 0.22)

  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${isPortrait ? 14 : 18}px monospace`
  ctx.fillText('A Top-Down Fishing Adventure', cx, canvas.height * 0.29)

  // Menu items
  const btnW = isPortrait ? 220 : 260, btnH = isPortrait ? 42 : 48, gap = 10
  const startY = canvas.height * 0.38
  menuItemBounds = []
  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const y = startY + i * (btnH + gap)
    const bx = cx - btnW / 2
    menuItemBounds.push({ x: bx, y, w: btnW, h: btnH })
    const selected = menuSelection === i
    ctx.fillStyle = selected ? 'rgba(255,120,68,0.25)' : 'rgba(255,255,255,0.06)'
    ctx.fillRect(bx, y, btnW, btnH)
    ctx.strokeStyle = selected ? 'rgba(255,120,68,0.9)' : 'rgba(255,255,255,0.3)'
    ctx.lineWidth = selected ? 2 : 1
    ctx.strokeRect(bx, y, btnW, btnH)
    ctx.fillStyle = selected ? '#ffffff' : 'rgba(255,255,255,0.7)'
    ctx.font = `${selected ? 'bold ' : ''}${isPortrait ? 16 : 18}px monospace`
    ctx.fillText(MENU_ITEMS[i], cx, y + btnH / 2 + 6)
  }

  if (highScore > 0) {
    ctx.fillStyle = 'rgba(255,200,100,0.6)'; ctx.font = `${isPortrait ? 14 : 16}px monospace`
    ctx.fillText(`HIGH SCORE: ${highScore}`, cx, canvas.height * 0.72)
  }

  if (!isTouchDevice) {
    ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 10 : 12}px monospace`
    ctx.fillText('↑↓ SELECT   ENTER TO CONFIRM', cx, canvas.height * 0.90)
  }
}

function drawHighScores() {
  drawMenuBackground()
  ctx.textAlign = 'center'
  const cx = canvas.width / 2
  ctx.fillStyle = '#ffdd00'; ctx.font = `bold ${isPortrait ? 28 : 36}px monospace`
  ctx.fillText('🏆 HIGH SCORES', cx, canvas.height * 0.18)

  const scores = loadHighScores()
  const fs = isPortrait ? 16 : 20
  ctx.font = `${fs}px monospace`
  if (scores.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('No scores yet!', cx, canvas.height * 0.4)
  } else {
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i]
      const y = canvas.height * 0.30 + i * (fs + 16)
      ctx.fillStyle = i === 0 ? '#ffdd00' : '#ffffff'
      ctx.fillText(`${i + 1}. ${s.score}  (Lv${s.level})  ${s.date}`, cx, y)
    }
  }
  ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
  ctx.fillText(isTouchDevice ? 'TAP TO GO BACK' : 'PRESS ESC OR ENTER', cx, canvas.height * 0.85)
}

function drawControlsScreen() {
  drawMenuBackground()
  ctx.textAlign = 'center'
  const cx = canvas.width / 2
  ctx.fillStyle = '#ff7744'; ctx.font = `bold ${isPortrait ? 28 : 36}px monospace`
  ctx.fillText('CONTROLS', cx, canvas.height * 0.18)

  const fs = isPortrait ? 14 : 16
  ctx.font = `${fs}px monospace`; ctx.fillStyle = '#ffffff'
  const lines = isTouchDevice ? [
    'LEFT STICK — Move',
    'RIGHT STICK — Aim & Throw Sushi',
    'POLE Button — Swing Fishing Pole',
  ] : [
    'WASD / Arrow Keys — Move',
    'SPACE — Throw Sushi',
    'SHIFT / Z — Swing Fishing Pole',
    'P / ESC — Pause',
  ]
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, canvas.height * 0.35 + i * (fs + 12))
  }
  ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
  ctx.fillText(isTouchDevice ? 'TAP TO GO BACK' : 'PRESS ESC OR ENTER', cx, canvas.height * 0.85)

  // Build info
  const infoFs = isPortrait ? 9 : 10
  ctx.font = `${infoFs}px monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  const infoLines = [
    'Owner: etdofreshai | Repo: sushi-bros-typescript',
    'Branch: main | Commit: e700288',
    `Build: ${__BUILD_DATE__}`,
  ]
  for (let i = 0; i < infoLines.length; i++) {
    ctx.fillText(infoLines[i], cx, canvas.height * 0.90 + i * (infoFs + 4))
  }
}

function drawLevelIntro() {
  const cfg = LEVEL_CONFIGS[currentLevel]
  ctx.fillStyle = cfg.bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Fade: in first half, fade in; second half, hold then fade out
  const progress = 1 - levelIntroTimer / 120
  let alpha: number
  if (progress < 0.2) alpha = progress / 0.2
  else if (progress > 0.8) alpha = (1 - progress) / 0.2
  else alpha = 1

  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  const cx = canvas.width / 2

  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.font = `bold ${isPortrait ? 60 : 80}px monospace`
  ctx.fillText(`${currentLevel + 1}`, cx, canvas.height * 0.45)

  ctx.fillStyle = '#ff7744'
  ctx.font = `bold ${isPortrait ? 28 : 38}px monospace`
  ctx.fillText(`Level ${currentLevel + 1}`, cx, canvas.height * 0.38)

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${isPortrait ? 22 : 30}px monospace`
  ctx.fillText(cfg.name, cx, canvas.height * 0.48)

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `${isPortrait ? 14 : 18}px monospace`
  ctx.fillText(cfg.subtitle, cx, canvas.height * 0.56)

  ctx.globalAlpha = 1
}

function drawLevelComplete() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'
  const cx = canvas.width / 2
  const cfg = LEVEL_CONFIGS[currentLevel]

  ctx.fillStyle = '#44ff44'; ctx.font = `bold ${isPortrait ? 32 : 44}px monospace`
  ctx.fillText('LEVEL COMPLETE!', cx, canvas.height * 0.25)

  ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 18 : 22}px monospace`
  ctx.fillText(`${cfg.name}`, cx, canvas.height * 0.34)
  ctx.fillText(`Score: ${score}`, cx, canvas.height * 0.42)
  ctx.fillText(`Distance: ${distance}m`, cx, canvas.height * 0.49)

  // Next level button
  const btnW = isPortrait ? 220 : 260, btnH = isPortrait ? 48 : 54
  const btnY = canvas.height * 0.58
  ctx.fillStyle = 'rgba(68,255,68,0.2)'
  ctx.fillRect(cx - btnW / 2, btnY, btnW, btnH)
  ctx.strokeStyle = 'rgba(68,255,68,0.8)'; ctx.lineWidth = 2
  ctx.strokeRect(cx - btnW / 2, btnY, btnW, btnH)
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${isPortrait ? 18 : 20}px monospace`
  ctx.fillText('NEXT LEVEL →', cx, btnY + btnH / 2 + 6)

  if (!isTouchDevice) {
    ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 10 : 12}px monospace`
    ctx.fillText('PRESS ENTER TO CONTINUE', cx, canvas.height * 0.80)
  }
}

let victoryBtnPlay = { x: 0, y: 0, w: 0, h: 0 }
let victoryBtnMenu = { x: 0, y: 0, w: 0, h: 0 }

function handleVictoryClick(cx: number, cy: number) {
  if (cx >= victoryBtnPlay.x && cx <= victoryBtnPlay.x + victoryBtnPlay.w &&
      cy >= victoryBtnPlay.y && cy <= victoryBtnPlay.y + victoryBtnPlay.h) startTransition(() => startNewRun())
  else if (cx >= victoryBtnMenu.x && cx <= victoryBtnMenu.x + victoryBtnMenu.w &&
           cy >= victoryBtnMenu.y && cy <= victoryBtnMenu.y + victoryBtnMenu.h) startTransition(() => { state = 'menu'; stopMusic() })
}

function drawVictory() {
  drawMenuBackground()
  ctx.textAlign = 'center'
  const cx = canvas.width / 2

  ctx.fillStyle = '#ffdd00'; ctx.font = `bold ${isPortrait ? 36 : 48}px monospace`
  ctx.fillText('🎉 VICTORY! 🎉', cx, canvas.height * 0.22)

  ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 18 : 24}px monospace`
  ctx.fillText('Congratulations, Sushi Chef!', cx, canvas.height * 0.32)
  ctx.fillText(`Total Score: ${score}`, cx, canvas.height * 0.40)

  const btnW = isPortrait ? 200 : 240, btnH = isPortrait ? 44 : 50, gap = 14
  const btnStartY = canvas.height * 0.50

  victoryBtnPlay = { x: cx - btnW / 2, y: btnStartY, w: btnW, h: btnH }
  ctx.fillStyle = 'rgba(255,120,68,0.2)'; ctx.fillRect(victoryBtnPlay.x, victoryBtnPlay.y, btnW, btnH)
  ctx.strokeStyle = 'rgba(255,120,68,0.8)'; ctx.lineWidth = 2
  ctx.strokeRect(victoryBtnPlay.x, victoryBtnPlay.y, btnW, btnH)
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${isPortrait ? 16 : 18}px monospace`
  ctx.fillText('PLAY AGAIN', cx, btnStartY + btnH / 2 + 6)

  const menuBtnY = btnStartY + btnH + gap
  victoryBtnMenu = { x: cx - btnW / 2, y: menuBtnY, w: btnW, h: btnH }
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(victoryBtnMenu.x, victoryBtnMenu.y, btnW, btnH)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5
  ctx.strokeRect(victoryBtnMenu.x, victoryBtnMenu.y, btnW, btnH)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `${isPortrait ? 14 : 16}px monospace`
  ctx.fillText('MAIN MENU', cx, menuBtnY + btnH / 2 + 5)

  // Show high scores
  const scores = loadHighScores()
  if (scores.length > 0) {
    ctx.fillStyle = 'rgba(255,200,100,0.6)'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
    const hsY = menuBtnY + btnH + 30
    ctx.fillText('— HIGH SCORES —', cx, hsY)
    for (let i = 0; i < Math.min(scores.length, 3); i++) {
      ctx.fillText(`${i + 1}. ${scores[i].score}`, cx, hsY + 20 + i * 18)
    }
  }
}

// ─── Game Over ───
let gameOverBtnPlay = { x: 0, y: 0, w: 0, h: 0 }
let gameOverBtnMenu = { x: 0, y: 0, w: 0, h: 0 }

function handleGameOverClick(cx: number, cy: number) {
  if (cx >= gameOverBtnPlay.x && cx <= gameOverBtnPlay.x + gameOverBtnPlay.w &&
      cy >= gameOverBtnPlay.y && cy <= gameOverBtnPlay.y + gameOverBtnPlay.h) startTransition(() => startNewRun())
  else if (cx >= gameOverBtnMenu.x && cx <= gameOverBtnMenu.x + gameOverBtnMenu.w &&
           cy >= gameOverBtnMenu.y && cy <= gameOverBtnMenu.y + gameOverBtnMenu.h) startTransition(() => { state = 'menu'; stopMusic() })
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
    ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 10 : 12}px monospace`
    ctx.fillText('ENTER — PLAY AGAIN    ESC — MAIN MENU', cx, menuBtnY + btnH + 25)
  }
}

function draw() {
  ctx.save()
  // Apply screen shake
  if (shakeIntensity > 0) {
    ctx.translate(shakeOffsetX, shakeOffsetY)
  }

  if (state === 'menu') {
    drawMenu()
  } else if (state === 'highscores') {
    drawHighScores()
  } else if (state === 'controls') {
    drawControlsScreen()
  } else if (state === 'levelIntro') {
    drawLevelIntro()
  } else if (state === 'levelComplete') {
    drawScrollingBackground()
    drawParticles()
    drawLevelComplete()
  } else if (state === 'victory') {
    drawVictory()
  } else if (state === 'playing') {
    drawScrollingBackground()
    for (const en of enemies) drawEnemy(en)
    if (currentBoss && (bossFightState === 'fighting' || bossFightState === 'defeated')) drawBoss()
    drawBossProjectiles()
    drawPlayer()
    drawSushis()
    drawEnemyProjectiles()
    drawPowerUps()
    drawParticles()
    // Shield visual around player
    if (hasShield && player.visible) {
      ctx.strokeStyle = `rgba(68,136,255,${0.3 + Math.sin(frameCount * 0.1) * 0.15})`
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(player.pos.x, player.pos.y, player.radius + 6, 0, Math.PI * 2); ctx.stroke()
    }
    drawHUD()
    if (bossFightState === 'fighting' || bossFightState === 'defeated') drawBossHealthBar()
    drawBossWarning()
    drawTouchControls()
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${isPortrait ? 36 : 48}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `${isPortrait ? 14 : 18}px monospace`
      ctx.fillText(isTouchDevice ? 'TAP ▶ TO RESUME' : 'PRESS P OR ESC', canvas.width / 2, canvas.height / 2 + 40)
      // Mute toggle in pause menu
      ctx.fillStyle = '#ffffff'; ctx.font = `${isPortrait ? 12 : 14}px monospace`
      ctx.fillText(`MUSIC: ${musicMuted ? 'OFF' : 'ON'}  (press M)`, canvas.width / 2, canvas.height / 2 + 70)
    }
  } else if (state === 'gameover') {
    drawScrollingBackground()
    drawParticles()
    drawGameOver()
  }

  ctx.restore()
  // Transition overlay (not affected by shake)
  drawTransition()
}

// ─── Loop ───
function loop() { update(); draw(); requestAnimationFrame(loop) }
loop()
