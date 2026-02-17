-- Sushi Bros - Love2D Port
-- A top-down fishing/sushi-throwing adventure game

local Audio = require("audio")
local Levels = require("levels")
local BossMod = require("boss")

-- ─── Globals ───
local W, H = 800, 600
pcall(function() W, H = love.graphics.getDimensions() end)
local isPortrait = H > W

local isTouchDevice = false
pcall(function()
    isTouchDevice = love.system.getOS() == "Android" or love.system.getOS() == "iOS"
end)
if not isTouchDevice then
    pcall(function()
        isTouchDevice = os.getenv("LOVE_WEB") ~= nil
    end)
end

local G = {
    state = "splash",
    score = 0,
    highScore = 0,
    lives = 3,
    scrollY = 0,
    distance = 0,
    currentLevel = 1,
    frameCount = 0,
    paused = false,
    confirmingQuit = false,
    levelIntroTimer = 0,
    menuSelection = 1,
    sushiThrowUnlocked = false,
    sushiUnlockShown = false,
    unlockModalTimer = 0,
    splashTimer = 0,
    transitionAlpha = 0,
    transitionDir = "none",
    transitionSpeed = 0.04,
    transitionCallback = nil,
    shakeIntensity = 0,
    shakeDecay = 0.8,
    shakeOffsetX = 0,
    shakeOffsetY = 0,
    hitStreak = 0,
    scoreMultiplier = 1,
    multiplierDisplayTimer = 0,
    powerUps = {},
    activeSpeed = 0,
    activeTriple = 0,
    hasShield = false,
    player = {},
    playerIsMoving = false,
    playerWalkTimer = 0,
    playerShootAnim = 0,
    playerWasOnWater = false,
    sushis = {},
    enemies = {},
    enemyProjectiles = {},
    particles = {},
    poleSwing = nil,
    treeObstacles = {},
    nextTreeWorldY = 0,
    nextEnemyWorldY = 400,
    bossFightState = "none",
    currentBoss = nil,
    bossWarningTimer = 0,
    bossClearTimer = 0,
    bossProjectiles = {},
    tentacleSweeps = {},
    bossScrollYLock = 0,
    keys = {},
    dpadTouchId = nil,
    fireTouchId = nil,
    poleTouchId = nil,
    joystickCenter = nil,
    joystickThumb = {x=0, y=0},
    fireCenter = nil,
    fireThumb = {x=0, y=0},
    fireStickActive = false,
    shootAngle = -math.pi / 2,
    dpadAngle = nil,
    currentDialogue = nil,
    dialogueIndex = 1,
    dialogueCharIndex = 0,
    dialogueCharTimer = 0,
    dialogueFullyRevealed = false,
    menuItemBounds = {},
    -- Constants moved here to reduce top-level locals
    MENU_ITEMS = {"Start Game", "High Scores", "Controls"},
    SPLASH_DURATION = 120,
    POWERUP_COLORS = {speed={1,0.867,0}, triple={1,0.267,0.267}, shield={0.267,0.533,1}, life={0.267,1,0.267}},
    POWERUP_LABELS = {speed="S", triple="T", shield="D", life="+"},
    DPAD_R = 55,
    DPAD_DEAD = 14,
    BTN_R = 38,
    POLE_R = math.floor(38 * 0.7),
    DIALOGUE_CHAR_SPEED = 2,
}

-- Functions table to avoid upvalue limit
local F = {}

function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("First 105 lines loaded OK!", 100, 100)
    love.graphics.print("G keys: " .. #G, 100, 130)
end
