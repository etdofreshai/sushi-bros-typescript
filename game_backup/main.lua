-- Sushi Bros - Love2D Port
-- A top-down fishing/sushi-throwing adventure game

local Audio = require("audio")
local Levels = require("levels")
local BossMod = require("boss")

-- ─── Globals ───
local W, H = love.graphics.getDimensions()
local isPortrait = H > W


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
}

-- Game state
local MENU_ITEMS = {"Start Game", "High Scores", "Controls"}

-- Sushi throw unlock

-- Splash screen
local SPLASH_DURATION = 120  -- ~2 seconds at 60fps

-- Screen transition

-- Screen shake

-- Score multiplier

-- Power-ups
local POWERUP_COLORS = {speed={1,0.867,0}, triple={1,0.267,0.267}, shield={0.267,0.533,1}, life={0.267,1,0.267}}
local POWERUP_LABELS = {speed="S", triple="T", shield="D", life="+"}

-- Player

-- Entities

-- Boss

-- Input
local isTouchDevice = love.system.getOS() == "Android" or love.system.getOS() == "iOS" or os.getenv("LOVE_WEB") ~= nil

-- Touch controls
local DPAD_R = 55
local DPAD_DEAD = 14
local BTN_R = 38
local POLE_R = math.floor(BTN_R * 0.7)

-- Dialogue
local DIALOGUE_CHAR_SPEED = 2

-- High scores (using love.filesystem)
local function loadHighScores()
    local ok, data = pcall(love.filesystem.read, "highscores.json")
    if ok and data then
        -- Simple JSON parse for our format
        local scores = {}
        for s, l, d in data:gmatch('"score":(%d+),"level":(%d+),"date":"([^"]*)"') do
            table.insert(scores, {score=tonumber(s), level=tonumber(l), date=d})
        end
        table.sort(scores, function(a, b) return a.score > b.score end)
        return scores
    end
    return {}
end

local function saveHighScore(s, lvl)
    local scores = loadHighScores()
    table.insert(scores, {score=s, level=lvl, date=os.date("%m/%d/%Y")})
    table.sort(scores, function(a, b) return a.score > b.score end)
    while #scores > 5 do table.remove(scores) end
    -- Simple JSON serialize
    local parts = {}
    for _, e in ipairs(scores) do
        table.insert(parts, string.format('{"score":%d,"level":%d,"date":"%s"}', e.score, e.level, e.date))
    end
    love.filesystem.write("highscores.json", "[" .. table.concat(parts, ",") .. "]")
    if s > G.highScore then G.highScore = s end
end

-- ─── Helpers ───
local function dist(x1, y1, x2, y2)
    return math.sqrt((x1-x2)^2 + (y1-y2)^2)
end

local function startTransition(callback)
    G.transitionAlpha = 0
    G.transitionDir = "in"
    G.transitionSpeed = 0.04
    G.transitionCallback = callback
end

local function triggerShake(intensity)
    G.shakeIntensity = intensity
end

local function addStreakHit()
    G.hitStreak = G.hitStreak + 1
    G.scoreMultiplier = math.min(math.floor(G.hitStreak / 3) + 1, 10)
    G.multiplierDisplayTimer = 120
end

local function resetStreak()
    G.hitStreak = 0
    G.scoreMultiplier = 1
end

local function spawnParticles(x, y, count, colors)
    for i = 1, count do
        local a = math.random() * math.pi * 2
        local s = math.random() * 3
        table.insert(G.particles, {
            x = x, y = y, vx = math.cos(a) * s, vy = math.sin(a) * s,
            life = 15 + math.random() * 25, maxLife = 40,
            color = colors[math.random(#colors)],
        })
    end
end

local function spawnPowerUp(x, worldY)
    local r = math.random()
    local ptype
    if r < 0.03 then ptype = "life"
    elseif r < 0.06 then ptype = "shield"
    elseif r < 0.10 then ptype = "triple"
    else ptype = "speed" end
    table.insert(G.powerUps, {x = x, y = 0, worldX = x, worldY = worldY, ptype = ptype, life = 600})
end

local function resetPlayer()
    G.player = {
        x = W / 2, y = H * 0.7, vx = 0, vy = 0,
        radius = 14, facing = -math.pi / 2,
        invulnTimer = 180, visible = true, respawnTimer = 0,
    }
end

-- ─── Dialogue ───
local function startDialogue(sceneId, onComplete)
    local lines = Levels.dialogues[sceneId]
    if not lines or #lines == 0 then onComplete(); return end
    G.currentDialogue = {lines = lines, onComplete = onComplete}
    G.dialogueIndex = 1
    G.dialogueCharIndex = 0
    G.dialogueCharTimer = 0
    G.dialogueFullyRevealed = false
    G.state = "dialogue"
end

local function advanceDialogue()
    if not G.currentDialogue then return end
    if not G.dialogueFullyRevealed then
        G.dialogueFullyRevealed = true
        G.dialogueCharIndex = #G.currentDialogue.lines[G.dialogueIndex].text
        return
    end
    G.dialogueIndex = G.dialogueIndex + 1
    if G.dialogueIndex > #G.currentDialogue.lines then
        local cb = G.currentDialogue.onComplete
        G.currentDialogue = nil
        cb()
    else
        G.dialogueCharIndex = 0
        G.dialogueCharTimer = 0
        G.dialogueFullyRevealed = false
    end
end

-- ─── Game Flow ───
local function beginLevel(level)
    G.currentLevel = level
    G.scrollY = 0; G.distance = 0
    G.sushis = {}; G.enemies = {}; G.enemyProjectiles = {}; G.particles = {}
    G.poleSwing = nil
    G.nextEnemyWorldY = 400
    G.treeObstacles = {}; G.nextTreeWorldY = 0
    G.bossFightState = "none"; G.currentBoss = nil
    G.bossWarningTimer = 0; G.bossClearTimer = 0
    G.bossProjectiles = {}; G.tentacleSweeps = {}
    G.powerUps = {}; G.activeSpeed = 0; G.activeTriple = 0; G.hasShield = false
    G.playerWasOnWater = false
    if level > 1 then G.sushiThrowUnlocked = true; G.sushiUnlockShown = true end
    resetPlayer()
    G.state = "levelIntro"
    G.levelIntroTimer = 120
    Audio.startMusic(level - 1)  -- 0-indexed for audio
end

local function startNewRun()
    G.score = 0; G.lives = 3; G.currentLevel = 1
    G.sushiThrowUnlocked = false; G.sushiUnlockShown = false
    resetStreak()
    startDialogue("intro", function() beginLevel(1) end)
end

local function advanceLevel()
    local sceneIds = {"afterLevel1", "afterLevel2", "afterLevel3"}
    local sceneId = sceneIds[G.currentLevel]
    if G.currentLevel < #Levels.configs then
        local nextLevel = G.currentLevel + 1
        startTransition(function()
            startDialogue(sceneId, function() beginLevel(nextLevel) end)
        end)
    else
        startTransition(function()
            startDialogue(sceneId, function()
                saveHighScore(G.score, G.currentLevel)
                G.state = "victory"
                Audio.playVictoryJingle()
                Audio.stopMusic()
            end)
        end)
    end
end

-- ─── Actions ───
local function throwSushi()
    if G.state ~= "playing" or not G.player.visible or #G.sushis >= 10 then return end
    Audio.sfxSushiThrow()
    G.playerShootAnim = 14
    local speed = 7
    local angle = G.player.facing
    if isTouchDevice and G.fireTouchId then angle = G.shootAngle end
    local angles = G.activeTriple > 0 and {angle - 0.2, angle, angle + 0.2} or {angle}
    for _, a in ipairs(angles) do
        local sx = G.player.x + math.cos(a) * 16
        local sy = G.player.y + math.sin(a) * 16
        table.insert(G.sushis, {
            x = sx, y = sy,
            vx = math.cos(a) * speed, vy = math.sin(a) * speed,
            life = 80,
            worldX = sx, worldY = G.scrollY + (H - sy),
        })
    end
end

local function activatePole()
    if G.state ~= "playing" or not G.player.visible or G.poleSwing then return end
    Audio.sfxPoleSwing()
    G.playerShootAnim = 14
    G.poleSwing = {
        angle = G.player.facing - math.pi * 0.6,
        timer = 20, maxTimer = 20, radius = 45,
    }
end

-- ─── Player Damage ───
local function playerDamage()
    if G.hasShield then
        G.hasShield = false
        spawnParticles(G.player.x, G.player.y, 15, {{0.267,0.533,1},{0.4,0.667,1},{0.533,0.8,1}})
        G.player.invulnTimer = 30
        triggerShake(3)
        return
    end
    spawnParticles(G.player.x, G.player.y, 20, {{1,1,1},{1,0.267,0.267},{1,0.667,0}})
    Audio.sfxPlayerHit()
    triggerShake(5)
    resetStreak()
    G.player.visible = false
    G.lives = G.lives - 1
    if G.lives <= 0 then
        G.state = "gameover"
        saveHighScore(G.score, G.currentLevel)
        Audio.stopMusic()
    else
        G.player.respawnTimer = 90
    end
end

-- ─── Spawning ───
local function spawnEnemiesAhead()
    local cameraTopWorldY = G.scrollY + H + 200
    while G.nextEnemyWorldY < cameraTopWorldY do
        local lvlCfg = Levels.configs[G.currentLevel]
        local count = 1 + math.floor(math.random() * 2)
        for c = 1, count do
            local terrainAtSpawn = Levels.getTerrainAt(G.currentLevel, G.nextEnemyWorldY)
            local isWaterSpawn = terrainAtSpawn == "water"
            local noFisherman = isWaterSpawn or G.currentLevel == 1

            local types, weights
            if noFisherman then
                types = {"crab", "seagull"}
                weights = {0.5, 0.5}
            else
                types = {"crab", "seagull", "fisherman"}
                local diff = math.min(G.nextEnemyWorldY / 5000, 1)
                weights = {
                    lvlCfg.enemyWeights[1] + (1 - diff) * 0.2,
                    lvlCfg.enemyWeights[2] + diff * 0.2,
                    lvlCfg.enemyWeights[3] + diff * 0.3,
                }
            end

            local total = 0
            for _, w in ipairs(weights) do total = total + w end
            local r = math.random() * total
            local etype = types[1]
            for i, w in ipairs(weights) do
                r = r - w
                if r <= 0 then etype = types[i]; break end
            end

            local x = 30 + math.random() * (W - 60)
            local moveFactor = math.min(G.nextEnemyWorldY / 8000, 0.6)
            local baseHp = etype == "fisherman" and 3 or (etype == "seagull" and 1 or 2)
            local stRange = lvlCfg.shootTimerRange
            table.insert(G.enemies, {
                x = x, y = 0, vx = 0, vy = 0, etype = etype,
                hp = math.max(1, math.floor(baseHp * lvlCfg.enemyHpScale + 0.5)),
                radius = etype == "fisherman" and 16 or (etype == "seagull" and 12 or 14),
                timer = math.random() * 200,
                shootTimer = stRange[1] + math.random() * (stRange[2] - stRange[1]),
                animFrame = 0,
                worldY = G.nextEnemyWorldY, baseX = x, moveFactor = moveFactor,
            })
        end
        local si = lvlCfg.spawnInterval
        G.nextEnemyWorldY = G.nextEnemyWorldY + si[1] + math.random() * (si[2] - si[1])
    end
end

local function spawnTreesAhead()
    if G.currentLevel ~= 3 then return end
    local cameraTopWorldY = G.scrollY + H + 300
    while G.nextTreeWorldY < cameraTopWorldY do
        if Levels.getTerrainAt(G.currentLevel, G.nextTreeWorldY) == "grass" then
            local count = 2 + math.floor(math.random() * 3)
            for c = 1, count do
                local seed = ((math.floor(G.nextTreeWorldY) * 7919 + c * 3571) % 0x7FFFFFFF)
                local tx = 20 + (seed % (W - 40))
                table.insert(G.treeObstacles, {worldX = tx, worldY = G.nextTreeWorldY + (seed % 60), radius = 12})
            end
        end
        G.nextTreeWorldY = G.nextTreeWorldY + 80 + math.floor(math.random() * 60)
    end
    -- Cull
    local cullY = G.scrollY - 200
    local new = {}
    for _, t in ipairs(G.treeObstacles) do
        if t.worldY > cullY then table.insert(new, t) end
    end
    G.treeObstacles = new
end

-- ─── Update ───
local function updateTransition()
    if G.transitionDir == "in" then
        G.transitionAlpha = G.transitionAlpha + G.transitionSpeed
        if G.transitionAlpha >= 1 then
            G.transitionAlpha = 1
            if G.transitionCallback then G.transitionCallback(); G.transitionCallback = nil end
            G.transitionDir = "out"
        end
    elseif G.transitionDir == "out" then
        G.transitionAlpha = G.transitionAlpha - G.transitionSpeed
        if G.transitionAlpha <= 0 then G.transitionAlpha = 0; G.transitionDir = "none" end
    end
end

local function updateShake()
    if G.shakeIntensity > 0.5 then
        G.shakeOffsetX = (math.random() - 0.5) * G.shakeIntensity * 2
        G.shakeOffsetY = (math.random() - 0.5) * G.shakeIntensity * 2
        G.shakeIntensity = G.shakeIntensity * G.shakeDecay
    else
        G.shakeIntensity = 0; G.shakeOffsetX = 0; G.shakeOffsetY = 0
    end
end

local function updateEnemies()
    for i = #G.enemies, 1, -1 do
        local en = G.enemies[i]
        en.timer = en.timer + 1
        en.animFrame = en.animFrame + 1
        en.y = H - (en.worldY - G.scrollY)

        if en.moveFactor > 0.05 then
            if en.etype == "crab" then
                en.x = en.baseX + math.sin(en.timer * 0.08) * 120
            elseif en.etype == "seagull" then
                local dir = en.baseX > W / 2 and -1 or 1
                en.x = en.baseX + dir * en.timer * 0.8
            elseif en.etype == "fisherman" then
                en.x = en.baseX + math.sin(en.timer * 0.01 * en.moveFactor) * 15 * en.moveFactor
            end
        else
            en.x = en.baseX
        end
        en.x = math.max(en.radius, math.min(W - en.radius, en.x))

        -- Fisherman shoot
        if en.etype == "fisherman" and G.player.visible and en.y > -20 and en.y < H + 20 then
            en.shootTimer = en.shootTimer - 1
            if en.shootTimer <= 0 then
                local stR = Levels.configs[G.currentLevel].shootTimerRange
                en.shootTimer = stR[1] + math.random() * (stR[2] - stR[1])
                local dx = G.player.x - en.x
                local dy = G.player.y - en.y
                local d = dist(en.x, en.y, G.player.x, G.player.y)
                local pSpeed = Levels.configs[G.currentLevel].projectileSpeed
                if d > 0 and d < 300 then
                    table.insert(G.enemyProjectiles, {
                        x = en.x, y = en.y, vx = dx/d*pSpeed, vy = dy/d*pSpeed,
                        life = 100, worldX = en.x, worldY = G.scrollY + (H - en.y),
                    })
                end
            end
        end

        if en.y > H + 100 then table.remove(G.enemies, i) end
    end
end

local function updateProjectiles()
    for i = #G.enemyProjectiles, 1, -1 do
        local p = G.enemyProjectiles[i]
        p.worldX = p.worldX + p.vx
        p.worldY = p.worldY - p.vy
        p.x = p.worldX
        p.y = H - (p.worldY - G.scrollY)
        p.life = p.life - 1
        if p.life <= 0 or p.x < -10 or p.x > W + 10 or p.y < -10 or p.y > H + 10 then
            table.remove(G.enemyProjectiles, i)
        end
    end
end

local function updateParticles()
    for i = #G.particles, 1, -1 do
        local p = G.particles[i]
        p.x = p.x + p.vx; p.y = p.y + p.vy; p.life = p.life - 1
        if p.life <= 0 then table.remove(G.particles, i) end
    end
end

local function updatePowerUps()
    if G.activeSpeed > 0 then G.activeSpeed = G.activeSpeed - 1 end
    if G.activeTriple > 0 then G.activeTriple = G.activeTriple - 1 end

    for i = #G.powerUps, 1, -1 do
        local p = G.powerUps[i]
        p.worldY = p.worldY - 0.3
        p.x = p.worldX
        p.y = H - (p.worldY - G.scrollY)
        p.life = p.life - 1
        if p.life <= 0 or p.y > H + 30 or p.y < -30 then
            table.remove(G.powerUps, i)
        elseif G.player.visible and dist(G.player.x, G.player.y, p.x, p.y) < G.player.radius + 12 then
            -- Collect
            if p.ptype == "speed" then G.activeSpeed = 300
            elseif p.ptype == "triple" then G.activeTriple = 300
            elseif p.ptype == "shield" then G.hasShield = true
            elseif p.ptype == "life" then G.lives = G.lives + 1 end
            Audio.sfxPowerUp()
            table.remove(G.powerUps, i)
        end
    end
end

function love.load()
    love.graphics.setBackgroundColor(0, 0, 0)
    math.randomseed(os.time())
    W, H = love.graphics.getDimensions()
    isPortrait = H > W

    -- Load high score
    local scores = loadHighScores()
    if #scores > 0 then G.highScore = scores[1].score end

    -- Check for touch via environment (love.js sets this)
    if love.touch then
        local touches = love.touch.getTouches()
        -- Will be populated on first touch
    end
end

function love.resize(w, h)
    W, H = w, h
    isPortrait = H > W
end

function love.update(dt)
    G.frameCount = G.frameCount + 1
    updateTransition()
    updateShake()

    if G.state == "splash" then
        G.splashTimer = G.splashTimer + 1
        if G.splashTimer >= SPLASH_DURATION then G.state = "menu" end
        return
    end

    if G.state == "dialogue" then
        if G.currentDialogue and not G.dialogueFullyRevealed then
            G.dialogueCharTimer = G.dialogueCharTimer + 1
            if G.dialogueCharTimer >= DIALOGUE_CHAR_SPEED then
                G.dialogueCharTimer = 0
                G.dialogueCharIndex = G.dialogueCharIndex + 1
                if G.dialogueCharIndex >= #G.currentDialogue.lines[G.dialogueIndex].text then
                    G.dialogueFullyRevealed = true
                end
            end
        end
        return
    end
    if G.state == "menu" or G.state == "gameover" or G.state == "highscores" or G.state == "controls" or G.state == "levelComplete" or G.state == "victory" then return end
    if G.state == "levelIntro" then
        G.levelIntroTimer = G.levelIntroTimer - 1
        if G.levelIntroTimer <= 0 then G.state = "playing" end
        return
    end
    if G.state == "unlockModal" then return end
    if G.paused then return end

    -- Respawn
    if G.player.respawnTimer > 0 then
        G.player.respawnTimer = G.player.respawnTimer - 1
        if G.player.respawnTimer == 0 then resetPlayer() end
        updateEnemies(); updateProjectiles(); updateParticles()
        return
    end

    -- Terrain check
    local playerWorldY = G.scrollY + (H - G.player.y)
    local playerTerrain = Levels.getTerrainAt(G.currentLevel, playerWorldY)
    local onWater = playerTerrain == "water"

    if onWater ~= G.playerWasOnWater and G.player.visible then
        spawnParticles(G.player.x, G.player.y, 12, {{0.267,0.533,1},{0.4,0.667,1},{0.533,0.8,1},{0.667,0.867,1}})
        Audio.sfxSplash()
    end
    if not onWater and G.playerWasOnWater and G.currentLevel == 1 and not G.sushiUnlockShown and G.player.visible then
        G.sushiThrowUnlocked = true; G.sushiUnlockShown = true
        G.unlockModalTimer = 0; G.state = "unlockModal"
    end
    G.playerWasOnWater = onWater

    -- Movement
    local moveX, moveY = 0, 0
    if G.keys["left"] or G.keys["a"] then moveX = moveX - 1 end
    if G.keys["right"] or G.keys["d"] then moveX = moveX + 1 end
    if G.keys["up"] or G.keys["w"] then moveY = moveY - 1 end
    if G.keys["down"] or G.keys["s"] then moveY = moveY + 1 end

    if G.dpadAngle then
        moveX = math.cos(G.dpadAngle)
        moveY = math.sin(G.dpadAngle)
    end

    local moveLen = math.sqrt(moveX*moveX + moveY*moveY)
    if moveLen > 0 then
        moveX = moveX / moveLen; moveY = moveY / moveLen
        G.player.facing = math.atan2(moveY, moveX)
    end

    local baseSpeed = onWater and 2.5 or 3.5
    local playerSpeed = G.activeSpeed > 0 and baseSpeed * 1.5 or baseSpeed
    G.player.x = G.player.x + moveX * playerSpeed
    G.player.y = G.player.y + moveY * playerSpeed
    G.player.x = math.max(G.player.radius, math.min(W - G.player.radius, G.player.x))
    G.player.y = math.max(G.player.radius + 20, math.min(H - G.player.radius - 20, G.player.y))

    G.playerIsMoving = moveLen > 0
    if G.playerIsMoving then G.playerWalkTimer = G.playerWalkTimer + 1 end
    if G.playerShootAnim > 0 then G.playerShootAnim = G.playerShootAnim - 1 end

    -- Camera scroll
    local scrollThreshold = H * 0.60
    if G.bossFightState == "none" then
        if G.player.y < scrollThreshold then
            local diff = scrollThreshold - G.player.y
            G.scrollY = G.scrollY + diff
            G.player.y = scrollThreshold
        end
        G.distance = math.floor(G.scrollY)
    else
        if G.player.y < G.player.radius + 20 then G.player.y = G.player.radius + 20 end
    end

    -- Boss trigger
    local levelCfg = Levels.configs[G.currentLevel]
    if levelCfg and G.distance >= levelCfg.targetDistance and G.bossFightState == "none" then
        G.bossFightState = "warning"
        G.bossWarningTimer = 120
        G.bossScrollYLock = G.scrollY
        Audio.sfxBossWarning()
    end

    -- Boss state machine
    if G.bossFightState == "warning" then
        G.bossWarningTimer = G.bossWarningTimer - 1
        if G.bossWarningTimer <= 0 then G.bossFightState = "clearing"; G.bossClearTimer = 60 end
    end
    if G.bossFightState == "clearing" then
        G.bossClearTimer = G.bossClearTimer - 1
        if #G.enemies > 0 and G.bossClearTimer % 5 == 0 then
            local en = table.remove(G.enemies)
            spawnParticles(en.x, en.y, 6, {{1,1,1},{0.667,0.667,0.667}})
        end
        if G.bossClearTimer <= 0 or #G.enemies == 0 then
            G.enemies = {}; G.enemyProjectiles = {}
            G.bossFightState = "fighting"
            G.currentBoss = BossMod.create(G.currentLevel, G.scrollY, W, H)
            Audio.startMusic(3)  -- boss music
        end
    end
    if G.bossFightState == "fighting" and G.currentBoss then
        G.scrollY = G.bossScrollYLock; G.distance = math.floor(G.scrollY)
        BossMod.update(G.currentBoss, W, H, G.scrollY, G.player.x, G.player.y, G.bossProjectiles, G.tentacleSweeps, G.enemies)
        -- Update boss projectiles
        for i = #G.bossProjectiles, 1, -1 do
            local p = G.bossProjectiles[i]
            if p.ptype ~= "net" then
                p.worldX = p.worldX + p.vx; p.worldY = p.worldY - p.vy
                p.x = p.worldX; p.y = H - (p.worldY - G.scrollY)
            end
            p.life = p.life - 1
            if p.life <= 0 or p.x < -30 or p.x > W+30 or p.y > H+30 or p.y < -30 then
                table.remove(G.bossProjectiles, i)
            end
        end
        -- Update tentacle sweeps
        for i = #G.tentacleSweeps, 1, -1 do
            local s = G.tentacleSweeps[i]
            s.y = s.y + s.velY; s.life = s.life - 1
            if s.life <= 0 or s.y > H + 50 then table.remove(G.tentacleSweeps, i) end
        end
    end
    if G.bossFightState == "defeated" and G.currentBoss then
        G.currentBoss.defeatTimer = G.currentBoss.defeatTimer - 1
        if G.currentBoss.defeatTimer % 8 == 0 then
            local bx = G.currentBoss.x + (math.random() - 0.5) * 60
            local by = G.currentBoss.y + (math.random() - 0.5) * 60
            spawnParticles(bx, by, 8, {{1,0.267,0.267},{1,0.667,0},{1,1,0.267},{1,1,1}})
        end
        if G.currentBoss.defeatTimer <= 0 then
            local bonuses = {500, 1000, 2000}
            G.score = G.score + (bonuses[G.currentLevel] or 500) * G.scoreMultiplier
            if G.currentLevel >= #Levels.configs then
                saveHighScore(G.score, G.currentLevel)
                G.state = "victory"; Audio.playVictoryJingle(); Audio.stopMusic()
            else
                G.state = "levelComplete"; Audio.playVictoryJingle(); Audio.stopMusic()
            end
            G.bossFightState = "none"; G.currentBoss = nil
            G.bossProjectiles = {}; G.tentacleSweeps = {}
            return
        end
    end

    -- Keyboard actions
    if G.keys["space"] then
        G.keys["space"] = false
        local kt = Levels.getTerrainAt(G.currentLevel, G.scrollY + (H - G.player.y))
        if kt == "water" then activatePole() else throwSushi() end
    end
    if G.keys["lshift"] or G.keys["rshift"] or G.keys["z"] then
        G.keys["lshift"] = false; G.keys["rshift"] = false; G.keys["z"] = false
        activatePole()
    end

    -- Invulnerability
    if G.player.invulnTimer > 0 then G.player.invulnTimer = G.player.invulnTimer - 1 end

    -- Pole swing
    if G.poleSwing then
        G.poleSwing.timer = G.poleSwing.timer - 1
        G.poleSwing.angle = G.poleSwing.angle + math.pi * 1.2 / G.poleSwing.maxTimer
        if G.poleSwing.timer <= 0 then G.poleSwing = nil end
    end

    -- Sushi projectiles
    for i = #G.sushis, 1, -1 do
        local s = G.sushis[i]
        s.worldX = s.worldX + s.vx; s.worldY = s.worldY - s.vy; s.life = s.life - 1
        s.x = s.worldX; s.y = H - (s.worldY - G.scrollY)
        if G.frameCount % 3 == 0 then
            table.insert(G.particles, {
                x = s.x + (math.random()-0.5)*4, y = s.y + (math.random()-0.5)*4,
                vx = (math.random()-0.5)*0.5, vy = (math.random()-0.5)*0.5,
                life = 10 + math.random()*8, maxLife = 18,
                color = ({1,1,1}),
            })
        end
        if s.life <= 0 or s.x < -20 or s.x > W+20 or s.y < -20 or s.y > H+20 then
            table.remove(G.sushis, i)
        end
    end

    -- Spawn
    if G.bossFightState == "none" then spawnEnemiesAhead(); spawnTreesAhead() end

    -- Tree collision (Level 3)
    if G.currentLevel == 3 and G.player.visible then
        local pwx = G.player.x
        local pwy = G.scrollY + (H - G.player.y)
        for _, tree in ipairs(G.treeObstacles) do
            local dx = pwx - tree.worldX
            local dy = pwy - tree.worldY
            local d = math.sqrt(dx*dx + dy*dy)
            local minDist = G.player.radius + tree.radius
            if d < minDist and d > 0 then
                local nx, ny = dx/d, dy/d
                G.player.x = tree.worldX + nx * minDist
                G.player.y = H - (tree.worldY + ny * minDist - G.scrollY)
            end
        end
    end

    updateEnemies()

    -- Sushi-Enemy collision
    for si = #G.sushis, 1, -1 do
        for ei = #G.enemies, 1, -1 do
            local s = G.sushis[si]; local en = G.enemies[ei]
            if s and en and dist(s.x, s.y, en.x, en.y) < en.radius + 6 then
                table.remove(G.sushis, si)
                en.hp = en.hp - 1; addStreakHit()
                if en.hp <= 0 then
                    local pts = en.etype == "fisherman" and 300 or (en.etype == "seagull" and 100 or 150)
                    G.score = G.score + pts * G.scoreMultiplier
                    local colors
                    if en.etype == "crab" then colors = {{1,0.267,0.267},{1,0.533,0.267},{1,0.667,0.4}}
                    elseif en.etype == "seagull" then colors = {{1,1,1},{0.8,0.8,0.8},{0.667,0.667,0.667}}
                    else colors = {{0.267,0.533,1},{0.4,0.6,1},{0.533,0.733,1}} end
                    spawnParticles(en.x, en.y, 20, colors); Audio.sfxHit()
                    if math.random() < 0.12 then spawnPowerUp(en.x, en.worldY) end
                    table.remove(G.enemies, ei)
                else
                    spawnParticles(en.x, en.y, 4, {{1,1,1},{1,1,0.533}})
                end
                break
            end
        end
    end

    -- Sushi-Boss collision
    if G.currentBoss and G.bossFightState == "fighting" and not G.currentBoss.defeated then
        for si = #G.sushis, 1, -1 do
            local s = G.sushis[si]
            if s then
                local handled = false
                if G.currentBoss.bossType == "crab_king" and G.currentBoss.shieldTimer and G.currentBoss.shieldTimer > 0 then
                    if dist(s.x, s.y, G.currentBoss.x, G.currentBoss.y) < G.currentBoss.radius + 6 then
                        table.remove(G.sushis, si)
                        spawnParticles(s.x, s.y, 4, {{0.533,0.533,1},{0.667,0.667,1}})
                        handled = true
                    end
                end
                if not handled and dist(s.x, s.y, G.currentBoss.x, G.currentBoss.y) < G.currentBoss.radius + 6 then
                    table.remove(G.sushis, si)
                    G.currentBoss.hp = G.currentBoss.hp - 1; G.currentBoss.flashTimer = 6
                    triggerShake(3); addStreakHit()
                    spawnParticles(G.currentBoss.x, G.currentBoss.y, 6, {{1,1,1},{1,1,0.533}})
                    Audio.sfxHit()
                    if G.currentBoss.hp <= 0 and not G.currentBoss.defeated then
                        G.currentBoss.defeated = true; G.currentBoss.defeatTimer = 90
                        G.bossFightState = "defeated"; Audio.sfxBossDefeat(); triggerShake(8)
                        spawnParticles(G.currentBoss.x, G.currentBoss.y, 30, {{1,0.267,0.267},{1,0.667,0},{1,1,0.267},{1,1,1}})
                    end
                    if G.currentBoss.hp > 0 and G.currentBoss.hp <= G.currentBoss.maxHp * 0.5 and G.currentBoss.currentPhase == 1 then
                        G.currentBoss.currentPhase = 2; G.currentBoss.attackTimer = 30
                        spawnParticles(G.currentBoss.x, G.currentBoss.y, 15, {{1,0,1},{1,0.267,1},{1,0.667,1}})
                    end
                    break
                end
            end
        end
    end

    -- Pole-Boss collision
    if G.poleSwing and G.player.visible and G.currentBoss and G.bossFightState == "fighting" and not G.currentBoss.defeated then
        local px = G.player.x + math.cos(G.poleSwing.angle) * G.poleSwing.radius * 0.7
        local py = G.player.y + math.sin(G.poleSwing.angle) * G.poleSwing.radius * 0.7
        local shielded = G.currentBoss.bossType == "crab_king" and G.currentBoss.shieldTimer and G.currentBoss.shieldTimer > 0
        if not shielded and dist(px, py, G.currentBoss.x, G.currentBoss.y) < G.currentBoss.radius + 20 then
            G.currentBoss.hp = G.currentBoss.hp - 2; G.currentBoss.flashTimer = 6
            Audio.sfxHit()
            spawnParticles(G.currentBoss.x, G.currentBoss.y, 8, {{1,0.667,0},{1,0.533,0},{1,0.8,0.267}})
            if G.currentBoss.hp <= 0 and not G.currentBoss.defeated then
                G.currentBoss.defeated = true; G.currentBoss.defeatTimer = 90
                G.bossFightState = "defeated"; Audio.sfxBossDefeat()
                spawnParticles(G.currentBoss.x, G.currentBoss.y, 30, {{1,0.267,0.267},{1,0.667,0},{1,1,0.267},{1,1,1}})
            end
            if G.currentBoss.hp > 0 and G.currentBoss.hp <= G.currentBoss.maxHp * 0.5 and G.currentBoss.currentPhase == 1 then
                G.currentBoss.currentPhase = 2; G.currentBoss.attackTimer = 30
            end
        end
    end

    -- Boss projectile - player
    if G.player.visible and G.player.invulnTimer <= 0 then
        for i = #G.bossProjectiles, 1, -1 do
            local bp = G.bossProjectiles[i]
            if bp.ptype == "net" then
                local nr = bp.netRadius or 30
                if dist(G.player.x, G.player.y, bp.x, bp.y) < nr then
                    bp.netTimer = (bp.netTimer or 0) + 1
                    if bp.netTimer > 30 then table.remove(G.bossProjectiles, i); playerDamage(); break end
                else bp.netTimer = 0 end
            else
                if dist(G.player.x, G.player.y, bp.x, bp.y) < G.player.radius + 5 then
                    table.remove(G.bossProjectiles, i); playerDamage(); break
                end
            end
        end
    end

    -- Tentacle sweep - player
    if G.player.visible and G.player.invulnTimer <= 0 then
        for _, sweep in ipairs(G.tentacleSweeps) do
            if G.player.x > sweep.x - sweep.width/2 and G.player.x < sweep.x + sweep.width/2 and
               G.player.y > sweep.y - sweep.height/2 and G.player.y < sweep.y + sweep.height/2 then
                playerDamage(); break
            end
        end
    end

    -- Boss contact damage
    if G.currentBoss and G.bossFightState == "fighting" and not G.currentBoss.defeated and G.player.visible and G.player.invulnTimer <= 0 then
        if dist(G.player.x, G.player.y, G.currentBoss.x, G.currentBoss.y) < G.player.radius + G.currentBoss.radius - 4 then
            playerDamage()
        end
    end

    -- Pole-Enemy collision
    if G.poleSwing and G.player.visible then
        local px = G.player.x + math.cos(G.poleSwing.angle) * G.poleSwing.radius * 0.7
        local py = G.player.y + math.sin(G.poleSwing.angle) * G.poleSwing.radius * 0.7
        for ei = #G.enemies, 1, -1 do
            local en = G.enemies[ei]
            if dist(px, py, en.x, en.y) < en.radius + 20 then
                en.hp = en.hp - 2; addStreakHit()
                if en.hp <= 0 then
                    G.score = G.score + (en.etype == "fisherman" and 400 or (en.etype == "seagull" and 150 or 200)) * G.scoreMultiplier
                    spawnParticles(en.x, en.y, 20, {{1,0.667,0},{1,0.533,0},{1,0.8,0.267}})
                    Audio.sfxHit()
                    if math.random() < 0.12 then spawnPowerUp(en.x, en.worldY) end
                    table.remove(G.enemies, ei)
                end
            end
        end
    end

    -- Enemy-Player collision
    if G.player.visible and G.player.invulnTimer <= 0 then
        for _, en in ipairs(G.enemies) do
            if dist(G.player.x, G.player.y, en.x, en.y) < G.player.radius + en.radius - 4 then
                playerDamage(); break
            end
        end
    end

    -- Enemy projectile - player
    if G.player.visible and G.player.invulnTimer <= 0 then
        for i = #G.enemyProjectiles, 1, -1 do
            local ep = G.enemyProjectiles[i]
            if dist(G.player.x, G.player.y, ep.x, ep.y) < G.player.radius + 5 then
                table.remove(G.enemyProjectiles, i); playerDamage(); break
            end
        end
    end

    updateProjectiles()
    updateParticles()
    updatePowerUps()
    if G.multiplierDisplayTimer > 0 then G.multiplierDisplayTimer = G.multiplierDisplayTimer - 1 end
end

-- ─── Draw ───
local function drawScrollingBackground()
    local rowH = 4
    for screenY = 0, H, rowH do
        local worldY = G.scrollY + (H - screenY)
        local c = Levels.getTerrainColor(G.currentLevel, worldY)
        love.graphics.setColor(c[1], c[2], c[3])
        love.graphics.rectangle("fill", 0, screenY, W, rowH + 1)
    end

    -- Water wave lines
    for screenY = 0, H, 3 do
        local worldY = G.scrollY + (H - screenY)
        if Levels.getTerrainAt(G.currentLevel, worldY) == "water" then
            local waveOffset = math.sin(worldY * 0.02 + G.frameCount * 0.03) * 15
            love.graphics.setColor(0.392, 0.706, 1, 0.15)
            love.graphics.setLineWidth(1)
            local points = {}
            for x = 0, W, 20 do
                local wy = screenY + math.sin((x + waveOffset) * 0.03 + worldY * 0.01) * 3
                table.insert(points, x); table.insert(points, wy)
            end
            if #points >= 4 then love.graphics.line(points) end
        end
    end

    -- Trees (non-collision for levels 1,2)
    if G.currentLevel ~= 3 then
        local gridSize = 300
        local startRow = math.floor(G.scrollY / gridSize) - 1
        local endRow = math.floor((G.scrollY + H) / gridSize) + 1
        for row = startRow, endRow do
            local seed = (row * 4517 + 9929) % 0x7FFFFFFF
            local wY = row * gridSize + (seed % gridSize)
            if Levels.getTerrainAt(G.currentLevel, wY) == "grass" then
                local sy = H - (wY - G.scrollY)
                if sy > -20 and sy < H + 20 then
                    local sx = ((seed * 7) % 0x7FFFFFFF) % W
                    love.graphics.setColor(0.353, 0.227, 0.102)
                    love.graphics.rectangle("fill", sx - 3, sy - 5, 6, 12)
                    love.graphics.setColor(0.102, 0.416, 0.102)
                    love.graphics.circle("fill", sx, sy - 10, 10 + (seed % 5))
                end
            end
        end
    end

    -- Collision trees (Level 3)
    if G.currentLevel == 3 then
        for _, tree in ipairs(G.treeObstacles) do
            local sy = H - (tree.worldY - G.scrollY)
            if sy > -30 and sy < H + 30 then
                love.graphics.setColor(0.29, 0.165, 0.039)
                love.graphics.rectangle("fill", tree.worldX - 4, sy - 4, 8, 16)
                love.graphics.setColor(0.051, 0.353, 0.051)
                love.graphics.circle("fill", tree.worldX, sy - 10, tree.radius)
            end
        end
    end

    -- Boats on water (Level 1)
    if G.currentLevel == 1 and G.scrollY < 1800 then
        for i = 0, 4 do
            local bWorldY = 150 + i * 350
            local bScreenY = H - (bWorldY - G.scrollY)
            if bScreenY > -30 and bScreenY < H + 30 then
                local bx = 60 + ((i * 137) % (W - 120))
                local bob = math.sin(G.frameCount * 0.05 + bx * 0.07) * 5
                love.graphics.push()
                love.graphics.translate(bx, bScreenY + bob)
                love.graphics.setColor(0.545, 0.271, 0.075)
                love.graphics.polygon("fill", -20, 0, -15, 10, 15, 10, 20, 0)
                love.graphics.setColor(0.396, 0.263, 0.129)
                love.graphics.rectangle("fill", -1, -20, 2, 20)
                love.graphics.setColor(0.961, 0.961, 0.863)
                love.graphics.polygon("fill", 0, -18, 12, -6, 0, -4)
                love.graphics.pop()
            end
        end
    end
end

local function drawPlayer()
    if not G.player.visible then return end
    if G.player.invulnTimer > 0 and math.floor(G.frameCount / 4) % 2 == 0 then return end

    local px, py = G.player.x, G.player.y
    local pwY = G.scrollY + (H - py)
    local isOnWater = Levels.getTerrainAt(G.currentLevel, pwY) == "water"

    -- Boat
    if isOnWater then
        love.graphics.push()
        love.graphics.translate(px, py)
        love.graphics.setColor(0.545, 0.271, 0.075)
        love.graphics.polygon("fill", -22, 8, -16, 18, 16, 18, 22, 8)
        love.graphics.setColor(0.627, 0.322, 0.176)
        love.graphics.rectangle("fill", -14, 6, 28, 4)
        love.graphics.pop()
    end

    love.graphics.push()
    love.graphics.translate(px, py)
    if isOnWater then love.graphics.translate(0, math.sin(G.frameCount * 0.05) * 5 - 4) end

    if G.playerIsMoving and not isOnWater then
        local wobbleX = math.sin(G.playerWalkTimer * 0.3) * 1.5
        local wobbleY = math.abs(math.sin(G.playerWalkTimer * 0.3)) * -1.5
        love.graphics.translate(wobbleX, wobbleY)
    end

    -- Shoot flash
    if G.playerShootAnim > 0 then
        local t = G.playerShootAnim / 14
        local expand = (14 - G.playerShootAnim) * 2.5
        love.graphics.setColor(1, 1, 0.392, t * 0.85)
        love.graphics.setLineWidth(3 * t)
        love.graphics.circle("line", 0, 0, 14 + expand)
    end

    -- Feet
    if not isOnWater then
        local legPhase = G.playerWalkTimer * 0.25
        local leftY = G.playerIsMoving and math.sin(legPhase) * 4 or 0
        local rightY = G.playerIsMoving and math.sin(legPhase + math.pi) * 4 or 0
        love.graphics.setColor(0.533, 0.533, 0.6)
        love.graphics.ellipse("fill", -5, 14 + leftY, 4, 3.5)
        love.graphics.ellipse("fill", 5, 14 + rightY, 4, 3.5)
    end

    -- Body
    love.graphics.setColor(1, 1, 1)
    love.graphics.circle("fill", 0, 2, 12)
    love.graphics.setColor(0.8, 0.8, 0.8)
    love.graphics.setLineWidth(1)
    love.graphics.circle("line", 0, 2, 12)

    -- Head
    love.graphics.setColor(1, 0.8, 0.533)
    love.graphics.circle("fill", 0, -6, 8)

    -- Chef hat
    love.graphics.setColor(1, 1, 1)
    love.graphics.rectangle("fill", -6, -18, 12, 10)
    love.graphics.circle("fill", 0, -18, 7)

    -- Eyes
    local ex = math.cos(G.player.facing) * 2
    local ey = math.sin(G.player.facing) * 2
    love.graphics.setColor(0, 0, 0)
    love.graphics.circle("fill", -3 + ex*0.5, -7 + ey*0.5, 1.5)
    love.graphics.circle("fill", 3 + ex*0.5, -7 + ey*0.5, 1.5)

    love.graphics.pop()

    -- Pole swing
    if G.poleSwing then
        local endX = px + math.cos(G.poleSwing.angle) * G.poleSwing.radius
        local endY = py + math.sin(G.poleSwing.angle) * G.poleSwing.radius
        love.graphics.setColor(0.545, 0.412, 0.078)
        love.graphics.setLineWidth(3)
        love.graphics.line(px, py, endX, endY)
        love.graphics.setColor(0.8, 0.8, 0.8)
        love.graphics.setLineWidth(2)
        love.graphics.arc("line", "open", endX, endY, 5, 0, math.pi)
        local progress = 1 - G.poleSwing.timer / G.poleSwing.maxTimer
        love.graphics.setColor(1, 1, 0.784, 0.5 * (1 - progress))
        love.graphics.setLineWidth(2)
        love.graphics.arc("line", "open", px, py, G.poleSwing.radius, G.poleSwing.angle - 0.5, G.poleSwing.angle)
    end
end

local function drawEnemy(en)
    love.graphics.push()
    love.graphics.translate(en.x, en.y)

    if en.etype == "crab" then
        love.graphics.setColor(0.8, 0.2, 0.2)
        love.graphics.ellipse("fill", 0, 0, 14, 10)
        love.graphics.setColor(0.933, 0.267, 0.267)
        love.graphics.circle("fill", -16, -4, 6)
        love.graphics.circle("fill", 16, -4, 6)
        love.graphics.setColor(0, 0, 0)
        love.graphics.circle("fill", -4, -5, 2)
        love.graphics.circle("fill", 4, -5, 2)
        love.graphics.setColor(0.8, 0.2, 0.2)
        love.graphics.setLineWidth(1.5)
        for _, side in ipairs({-1, 1}) do
            for j = 0, 2 do
                local lx = side * (6 + j * 4)
                love.graphics.line(lx, 4, lx + side * 5, 6 + math.sin(en.animFrame * 0.15 + j) * 2)
            end
        end

    elseif en.etype == "seagull" then
        love.graphics.setColor(0.933, 0.933, 0.933)
        love.graphics.ellipse("fill", 0, 0, 8, 6)
        local wingFlap = math.sin(en.animFrame * 0.15) * 15
        love.graphics.setColor(0.867, 0.867, 0.867)
        love.graphics.polygon("fill", -5, 0, -18, -wingFlap, -12, 2)
        love.graphics.polygon("fill", 5, 0, 18, -wingFlap, 12, 2)
        love.graphics.setColor(1, 0.533, 0)
        love.graphics.polygon("fill", 0, -4, -2, -8, 2, -8)
        love.graphics.setColor(0, 0, 0)
        love.graphics.circle("fill", 0, -2, 1.5)

    elseif en.etype == "fisherman" then
        -- Charge glow
        local CHARGE_THRESHOLD = 60
        if en.shootTimer > 0 and en.shootTimer <= CHARGE_THRESHOLD then
            local chargeT = 1 - en.shootTimer / CHARGE_THRESHOLD
            local glowR = en.radius + 4 + chargeT * 14
            local gColor = (1 - chargeT) * 0.647
            love.graphics.setColor(1, gColor, 0, 0.15 + chargeT * 0.45)
            love.graphics.circle("fill", 0, 0, glowR)
        end

        love.graphics.setColor(0.2, 0.333, 0.667)
        love.graphics.circle("fill", 0, 2, 13)
        love.graphics.setColor(0.867, 0.659, 0.467)
        love.graphics.circle("fill", 0, -7, 8)
        love.graphics.setColor(0.333, 0.4, 0.2)
        love.graphics.rectangle("fill", -9, -14, 18, 5)
        love.graphics.rectangle("fill", -7, -18, 14, 5)
        love.graphics.setColor(0, 0, 0)
        love.graphics.rectangle("fill", -5, -8, 3, 2)
        love.graphics.rectangle("fill", 2, -8, 3, 2)
        love.graphics.setColor(0.545, 0.412, 0.078)
        love.graphics.setLineWidth(2)
        love.graphics.line(10, 0, 18, -15)
        love.graphics.setColor(0.667, 0.667, 0.667)
        love.graphics.setLineWidth(0.5)
        love.graphics.line(18, -15, 20, -10)
    end

    love.graphics.pop()
end

local function drawSushis()
    for _, s in ipairs(G.sushis) do
        love.graphics.push()
        love.graphics.translate(s.x, s.y)
        love.graphics.rotate(G.frameCount * 0.15)
        love.graphics.setColor(1, 1, 1)
        love.graphics.ellipse("fill", 0, 0, 7, 4)
        love.graphics.setColor(1, 0.467, 0.267)
        love.graphics.ellipse("fill", 0, -2, 6, 3)
        love.graphics.setColor(0.102, 0.227, 0.102)
        love.graphics.rectangle("fill", -2, -4, 4, 8)
        love.graphics.pop()
    end
end

local function drawEnemyProjectiles()
    for _, p in ipairs(G.enemyProjectiles) do
        love.graphics.setColor(1, 0.267, 0.267)
        love.graphics.circle("fill", p.x, p.y, 3)
        love.graphics.setColor(1, 0.392, 0.392, 0.3)
        love.graphics.circle("fill", p.x, p.y, 6)
    end
end

local function drawParticles()
    for _, p in ipairs(G.particles) do
        local a = p.life / p.maxLife
        local c = p.color
        if type(c) == "table" then
            love.graphics.setColor(c[1], c[2], c[3], a)
        else
            love.graphics.setColor(1, 1, 1, a)
        end
        love.graphics.rectangle("fill", p.x - 1.5, p.y - 1.5, 3, 3)
    end
end

local function drawPowerUps()
    for _, p in ipairs(G.powerUps) do
        local bob = math.sin(G.frameCount * 0.06 + p.worldY) * 3
        local alpha = p.life < 60 and p.life / 60 or 1
        local c = POWERUP_COLORS[p.ptype]
        love.graphics.setColor(c[1], c[2], c[3], 0.267 * alpha)
        love.graphics.circle("fill", p.x, p.y + bob, 14)
        love.graphics.setColor(c[1], c[2], c[3], alpha)
        love.graphics.circle("fill", p.x, p.y + bob, 9)
        love.graphics.setColor(0, 0, 0, alpha)
        love.graphics.printf(POWERUP_LABELS[p.ptype], p.x - 10, p.y + bob - 6, 20, "center")
    end
end

local function drawHUD()
    local fontSize = isPortrait and 14 or 16
    local font = love.graphics.newFont(fontSize)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("SCORE: " .. G.score, 15, 12)
    love.graphics.printf("HI: " .. G.highScore, 0, 12, W - 55, "right")

    -- Lives
    for i = 0, G.lives - 1 do
        local lx = 20 + i * 22
        love.graphics.setColor(1, 0.467, 0.267)
        love.graphics.circle("fill", lx, 40, 6)
        love.graphics.setColor(1, 1, 1)
        love.graphics.circle("fill", lx, 42, 5)
    end

    -- Score multiplier
    if G.scoreMultiplier > 1 and G.multiplierDisplayTimer > 0 then
        love.graphics.setColor(1, 0.867, 0)
        love.graphics.print("x" .. G.scoreMultiplier, 15 + font:getWidth("SCORE: " .. G.score) + 10, 12)
    end

    -- Power-up indicators
    local px = 20
    love.graphics.setColor(1, 0.867, 0)
    if G.activeSpeed > 0 then love.graphics.print("SPD " .. math.ceil(G.activeSpeed/60) .. "s", px, 55); px = px + 55 end
    love.graphics.setColor(1, 0.267, 0.267)
    if G.activeTriple > 0 then love.graphics.print("TRI " .. math.ceil(G.activeTriple/60) .. "s", px, 55); px = px + 55 end
    love.graphics.setColor(0.267, 0.533, 1)
    if G.hasShield then love.graphics.print("SHD", px, 55) end

    -- Distance + level
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf(G.distance .. "m", 0, 8, W, "center")
    local cfg = Levels.configs[G.currentLevel]
    if cfg then
        love.graphics.printf("Lv" .. G.currentLevel .. ": " .. cfg.name, 0, 24, W, "center")
        -- Progress bar
        local prog = math.min(G.distance / cfg.targetDistance, 1)
        local barW = 100
        local barX = W/2 - barW/2
        love.graphics.setColor(1, 1, 1, 0.15)
        love.graphics.rectangle("fill", barX, 40, barW, 4)
        love.graphics.setColor(0.267, 1, 0.267, 0.6)
        love.graphics.rectangle("fill", barX, 40, barW * prog, 4)
    end

    -- Pause button
    local pbSize = 36
    local pbX, pbY = W - pbSize - 15, 42
    love.graphics.setColor(1, 1, 1, G.paused and 0.9 or 0.4)
    love.graphics.setLineWidth(1.5)
    love.graphics.circle("line", pbX + pbSize/2, pbY + pbSize/2, pbSize/2)
    if G.paused then
        love.graphics.setColor(1, 1, 1, 0.9)
        love.graphics.polygon("fill", pbX+pbSize/2-5, pbY+pbSize/2-8, pbX+pbSize/2-5, pbY+pbSize/2+8, pbX+pbSize/2+8, pbY+pbSize/2)
    else
        love.graphics.setColor(1, 1, 1, 0.5)
        love.graphics.rectangle("fill", pbX+pbSize/2-6, pbY+pbSize/2-7, 4, 14)
        love.graphics.rectangle("fill", pbX+pbSize/2+2, pbY+pbSize/2-7, 4, 14)
    end
end

local function drawMenuBackground()
    love.graphics.setColor(0.039, 0.102, 0.227)
    love.graphics.rectangle("fill", 0, 0, W, H)
    for y = 0, H, 30 do
        love.graphics.setColor(0.235, 0.471, 0.784, 0.1 + (y/H)*0.15)
        love.graphics.setLineWidth(1.5)
        local points = {}
        for x = 0, W, 10 do
            local wy = y + math.sin(x*0.02 + G.frameCount*0.02 + y*0.01) * 8
            table.insert(points, x); table.insert(points, wy)
        end
        if #points >= 4 then love.graphics.line(points) end
    end
end

local function drawSplash()
    love.graphics.setColor(0, 0, 0)
    love.graphics.rectangle("fill", 0, 0, W, H)

    -- Fade: in for first 30 frames, hold, out for last 30 frames
    local alpha
    if G.splashTimer < 30 then
        alpha = G.splashTimer / 30
    elseif G.splashTimer > SPLASH_DURATION - 30 then
        alpha = (SPLASH_DURATION - G.splashTimer) / 30
    else
        alpha = 1
    end

    local cx, cy = W / 2, H / 2

    -- Draw a heart
    local heartScale = 2.5 + math.sin(G.splashTimer * 0.05) * 0.15
    love.graphics.push()
    love.graphics.translate(cx, cy - 30)
    love.graphics.scale(heartScale, heartScale)
    -- Heart shape using two circles and a polygon
    love.graphics.setColor(0.91, 0.2, 0.35, alpha)
    love.graphics.circle("fill", -5, -3, 7)
    love.graphics.circle("fill", 5, -3, 7)
    love.graphics.polygon("fill", -11, -1, 0, 12, 11, -1)
    love.graphics.pop()

    -- "Made with LÖVE" text
    local font = love.graphics.newFont(isPortrait and 16 or 20)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1, alpha)
    love.graphics.printf("Made with L\195\150VE", 0, cy + 30, W, "center")

    -- Subtle hint
    if G.splashTimer > 60 then
        local hintAlpha = math.min((G.splashTimer - 60) / 30, 1) * alpha * 0.4
        local sf = love.graphics.newFont(isPortrait and 10 or 12)
        love.graphics.setFont(sf)
        love.graphics.setColor(1, 1, 1, hintAlpha)
        love.graphics.printf("Press any key to skip", 0, H * 0.85, W, "center")
    end
end


local function drawMenu()
    drawMenuBackground()
    local cx = W / 2

    local titleSize = isPortrait and 28 or 38
    local titleFont = love.graphics.newFont(titleSize)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(1, 0.467, 0.267)
    love.graphics.printf("SUSHI BROS", 0, H*0.18, W, "center")

    local subFont = love.graphics.newFont(isPortrait and 12 or 16)
    love.graphics.setFont(subFont)
    love.graphics.setColor(1, 1, 1, 0.5)
    love.graphics.printf("A Top-Down Fishing Adventure", 0, H*0.27, W, "center")

    local btnW = isPortrait and 220 or 260
    local btnH = isPortrait and 42 or 48
    local gap = 10
    local startY = H * 0.38
    local btnFont = love.graphics.newFont(isPortrait and 14 or 16)
    love.graphics.setFont(btnFont)

    G.menuItemBounds = {}
    for i, item in ipairs(MENU_ITEMS) do
        local y = startY + (i-1) * (btnH + gap)
        local bx = cx - btnW/2
        table.insert(G.menuItemBounds, {x=bx, y=y, w=btnW, h=btnH})
        local selected = G.menuSelection == i
        if selected then
            love.graphics.setColor(1, 0.471, 0.267, 0.25)
        else
            love.graphics.setColor(1, 1, 1, 0.06)
        end
        love.graphics.rectangle("fill", bx, y, btnW, btnH)
        if selected then love.graphics.setColor(1, 0.471, 0.267, 0.9) else love.graphics.setColor(1, 1, 1, 0.3) end
        love.graphics.setLineWidth(selected and 2 or 1)
        love.graphics.rectangle("line", bx, y, btnW, btnH)
        love.graphics.setColor(selected and {1,1,1} or {1,1,1,0.7})
        love.graphics.printf(item, bx, y + btnH/2 - btnFont:getHeight()/2, btnW, "center")
    end

    if G.highScore > 0 then
        love.graphics.setColor(1, 0.784, 0.392, 0.6)
        love.graphics.printf("HIGH SCORE: " .. G.highScore, 0, H*0.72, W, "center")
    end
end

local function drawHighScores()
    drawMenuBackground()
    local titleFont = love.graphics.newFont(isPortrait and 24 or 30)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(1, 0.867, 0)
    love.graphics.printf("HIGH SCORES", 0, H*0.15, W, "center")

    local scores = loadHighScores()
    local fs = isPortrait and 14 or 18
    local font = love.graphics.newFont(fs)
    love.graphics.setFont(font)
    if #scores == 0 then
        love.graphics.setColor(1, 1, 1, 0.5)
        love.graphics.printf("No scores yet!", 0, H*0.4, W, "center")
    else
        for i, s in ipairs(scores) do
            local y = H*0.30 + (i-1) * (fs + 16)
            love.graphics.setColor(i == 1 and {1,0.867,0} or {1,1,1})
            love.graphics.printf(string.format("%d. %d  (Lv%d)  %s", i, s.score, s.level, s.date), 0, y, W, "center")
        end
    end
    local smallFont = love.graphics.newFont(isPortrait and 11 or 13)
    love.graphics.setFont(smallFont)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("PRESS ESC OR ENTER TO GO BACK", 0, H*0.85, W, "center")
end

local function drawControlsScreen()
    drawMenuBackground()
    local titleFont = love.graphics.newFont(isPortrait and 24 or 30)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(1, 0.467, 0.267)
    love.graphics.printf("CONTROLS", 0, H*0.15, W, "center")

    local fs = isPortrait and 13 or 15
    local font = love.graphics.newFont(fs)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    local lines = {
        "WASD / Arrow Keys - Move",
        "SPACE - Throw Sushi / Pole",
        "SHIFT / Z - Swing Fishing Pole",
        "P / ESC - Pause",
    }
    for i, line in ipairs(lines) do
        love.graphics.printf(line, 0, H*0.35 + (i-1)*(fs+12), W, "center")
    end
    local smallFont = love.graphics.newFont(isPortrait and 11 or 13)
    love.graphics.setFont(smallFont)
    love.graphics.printf("PRESS ESC OR ENTER TO GO BACK", 0, H*0.85, W, "center")
end

local function drawLevelIntro()
    local cfg = Levels.configs[G.currentLevel]
    love.graphics.setColor(cfg.bgColor[1], cfg.bgColor[2], cfg.bgColor[3])
    love.graphics.rectangle("fill", 0, 0, W, H)

    local progress = 1 - G.levelIntroTimer / 120
    local alpha
    if progress < 0.2 then alpha = progress / 0.2
    elseif progress > 0.8 then alpha = (1 - progress) / 0.2
    else alpha = 1 end

    love.graphics.setColor(1, 0.467, 0.267, alpha)
    local bigFont = love.graphics.newFont(isPortrait and 24 or 32)
    love.graphics.setFont(bigFont)
    love.graphics.printf("Level " .. G.currentLevel, 0, H*0.35, W, "center")

    love.graphics.setColor(1, 1, 1, alpha)
    local nameFont = love.graphics.newFont(isPortrait and 20 or 26)
    love.graphics.setFont(nameFont)
    love.graphics.printf(cfg.name, 0, H*0.45, W, "center")

    love.graphics.setColor(1, 1, 1, 0.6 * alpha)
    local subFont = love.graphics.newFont(isPortrait and 12 or 16)
    love.graphics.setFont(subFont)
    love.graphics.printf(cfg.subtitle, 0, H*0.53, W, "center")
end

local function drawDialogue()
    if not G.currentDialogue then return end
    local line = G.currentDialogue.lines[G.dialogueIndex]
    love.graphics.setColor(0, 0, 0.078, 0.85)
    love.graphics.rectangle("fill", 0, 0, W, H)

    local cx = W / 2
    local sfs = isPortrait and 18 or 22
    local fs = isPortrait and 14 or 16

    if line.speaker and line.speaker ~= "" then
        local sf = love.graphics.newFont(sfs)
        love.graphics.setFont(sf)
        local c = line.speakerColor or {1, 0.8, 0}
        love.graphics.setColor(c[1], c[2], c[3])
        love.graphics.printf(line.speaker, 0, H*0.28, W, "center")
    end

    local vt = string.sub(line.text, 1, G.dialogueCharIndex)
    local f = love.graphics.newFont(fs)
    love.graphics.setFont(f)
    love.graphics.setColor(1, 1, 1)
    local pad = isPortrait and 30 or 60
    love.graphics.printf(vt, pad, H*0.35, W - pad*2, "center")

    if G.dialogueFullyRevealed and math.floor(G.frameCount / 30) % 2 == 0 then
        local sf = love.graphics.newFont(isPortrait and 11 or 14)
        love.graphics.setFont(sf)
        love.graphics.setColor(1, 1, 1, 0.7)
        love.graphics.printf("Press Enter to continue", 0, H*0.78, W, "center")
    end

    -- Progress dots
    local total = #G.currentDialogue.lines
    local dotSize = 12
    local startX = cx - ((total-1)*dotSize)/2
    for i = 1, total do
        if i == G.dialogueIndex then love.graphics.setColor(1,1,1) else love.graphics.setColor(1,1,1,0.3) end
        love.graphics.circle("fill", startX + (i-1)*dotSize, H*0.86, i == G.dialogueIndex and 4 or 2.5)
    end
end

local function drawUnlockModal()
    G.unlockModalTimer = G.unlockModalTimer + 1
    love.graphics.setColor(0, 0, 0, 0.65 * math.min(G.unlockModalTimer/20, 1))
    love.graphics.rectangle("fill", 0, 0, W, H)
    if G.unlockModalTimer < 10 then return end

    local scale = math.min((G.unlockModalTimer - 10) / 15, 1)
    local mW = math.min(W * 0.85, 360)
    local mH = isPortrait and 250 or 220
    local mX = W/2 - mW/2
    local mY = H/2 - mH/2

    love.graphics.push()
    love.graphics.translate(W/2, H/2)
    love.graphics.scale(scale, scale)
    love.graphics.translate(-W/2, -H/2)

    love.graphics.setColor(0.078, 0.118, 0.235, 0.95)
    love.graphics.rectangle("fill", mX, mY, mW, mH, 16, 16)
    love.graphics.setColor(1, 0.8, 0)
    love.graphics.setLineWidth(3)
    love.graphics.rectangle("line", mX, mY, mW, mH, 16, 16)

    local titleFont = love.graphics.newFont(isPortrait and 20 or 18)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(1, 0.8, 0)
    love.graphics.printf("ABILITY UNLOCKED!", mX, mY + 60, mW, "center")

    local nameFont = love.graphics.newFont(isPortrait and 24 or 22)
    love.graphics.setFont(nameFont)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("Sushi Throwing", mX, mY + 95, mW, "center")

    local descFont = love.graphics.newFont(isPortrait and 11 or 10)
    love.graphics.setFont(descFont)
    love.graphics.setColor(1, 1, 1, 0.75)
    love.graphics.printf("Hurl sushi at G.enemies on land!\nUse SPACE to throw.", mX, mY + 130, mW, "center")

    if G.unlockModalTimer > 40 and math.floor(G.unlockModalTimer/30) % 2 == 0 then
        love.graphics.setColor(1, 1, 1, 0.6)
        love.graphics.printf("Press ENTER to continue", mX, mY + mH - 35, mW, "center")
    end

    love.graphics.pop()
end

local function drawLevelComplete()
    love.graphics.setColor(0, 0, 0, 0.75)
    love.graphics.rectangle("fill", 0, 0, W, H)

    local titleFont = love.graphics.newFont(isPortrait and 28 or 38)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(0.267, 1, 0.267)
    love.graphics.printf("LEVEL COMPLETE!", 0, H*0.22, W, "center")

    local font = love.graphics.newFont(isPortrait and 16 or 20)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("Score: " .. G.score, 0, H*0.38, W, "center")
    love.graphics.printf("Distance: " .. G.distance .. "m", 0, H*0.45, W, "center")

    local sf = love.graphics.newFont(isPortrait and 12 or 14)
    love.graphics.setFont(sf)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("PRESS ENTER TO CONTINUE", 0, H*0.60, W, "center")
end

local function drawGameOver()
    love.graphics.setColor(0, 0, 0, 0.7)
    love.graphics.rectangle("fill", 0, 0, W, H)

    local titleFont = love.graphics.newFont(isPortrait and 30 or 40)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(1, 0.267, 0.267)
    love.graphics.printf("GAME OVER", 0, H*0.22, W, "center")

    local font = love.graphics.newFont(isPortrait and 18 or 22)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("SCORE: " .. G.score, 0, H*0.33, W, "center")
    love.graphics.printf("DISTANCE: " .. G.distance .. "m", 0, H*0.40, W, "center")

    if G.score >= G.highScore and G.score > 0 then
        love.graphics.setColor(1, 0.867, 0)
        love.graphics.printf("NEW HIGH SCORE!", 0, H*0.48, W, "center")
    end

    local sf = love.graphics.newFont(isPortrait and 12 or 14)
    love.graphics.setFont(sf)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("ENTER - PLAY AGAIN    ESC - MAIN MENU", 0, H*0.62, W, "center")
end

local function drawVictory()
    drawMenuBackground()
    local titleFont = love.graphics.newFont(isPortrait and 30 or 40)
    love.graphics.setFont(titleFont)
    love.graphics.setColor(1, 0.867, 0)
    love.graphics.printf("VICTORY!", 0, H*0.18, W, "center")

    local font = love.graphics.newFont(isPortrait and 16 or 20)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("Congratulations, Sushi Chef!", 0, H*0.30, W, "center")
    love.graphics.printf("Total Score: " .. G.score, 0, H*0.38, W, "center")

    local sf = love.graphics.newFont(isPortrait and 12 or 14)
    love.graphics.setFont(sf)
    love.graphics.printf("ENTER - PLAY AGAIN    ESC - MAIN MENU", 0, H*0.52, W, "center")
end

local function drawPauseOverlay()
    love.graphics.setColor(0, 0, 0, 0.5)
    love.graphics.rectangle("fill", 0, 0, W, H)
    local font = love.graphics.newFont(isPortrait and 30 or 40)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf("PAUSED", 0, H/2 - 30, W, "center")

    local sf = love.graphics.newFont(isPortrait and 12 or 16)
    love.graphics.setFont(sf)
    love.graphics.setColor(1, 1, 1, 0.5)
    love.graphics.printf("P or ESC to resume", 0, H/2 + 15, W, "center")
    love.graphics.printf("M - Music: " .. (Audio.isMuted() and "OFF" or "ON"), 0, H/2 + 40, W, "center")
    love.graphics.printf("Q - Quit to menu", 0, H/2 + 65, W, "center")

    if G.confirmingQuit then
        love.graphics.setColor(0, 0, 0, 0.7)
        love.graphics.rectangle("fill", 0, 0, W, H)
        local qf = love.graphics.newFont(isPortrait and 16 or 20)
        love.graphics.setFont(qf)
        love.graphics.setColor(1, 1, 1)
        love.graphics.printf("QUIT TO MENU?\nProgress will be lost\nY - Yes   N - No", 0, H/2 - 40, W, "center")
    end
end

function love.draw()
    love.graphics.push()
    if G.shakeIntensity > 0 then
        love.graphics.translate(G.shakeOffsetX, G.shakeOffsetY)
    end

    if G.state == "splash" then
        drawSplash()
    elseif G.state == "menu" then
        drawMenu()
    elseif G.state == "highscores" then
        drawHighScores()
    elseif G.state == "controls" then
        drawControlsScreen()
    elseif G.state == "levelIntro" then
        drawLevelIntro()
    elseif G.state == "levelComplete" then
        drawScrollingBackground(); drawParticles(); drawLevelComplete()
    elseif G.state == "victory" then
        drawVictory()
    elseif G.state == "playing" then
        drawScrollingBackground()
        for _, en in ipairs(G.enemies) do drawEnemy(en) end
        if G.currentBoss and (G.bossFightState == "fighting" or G.bossFightState == "defeated") then BossMod.draw(G.currentBoss) end
        BossMod.drawProjectiles(G.bossProjectiles)
        BossMod.drawTentacleSweeps(G.tentacleSweeps)
        drawPlayer(); drawSushis(); drawEnemyProjectiles(); drawPowerUps(); drawParticles()
        -- Shield
        if G.hasShield and G.player.visible then
            love.graphics.setColor(0.267, 0.533, 1, 0.3 + math.sin(G.frameCount*0.1)*0.15)
            love.graphics.setLineWidth(2)
            love.graphics.circle("line", G.player.x, G.player.y, G.player.radius + 6)
        end
        drawHUD()
        if G.bossFightState == "fighting" or G.bossFightState == "defeated" then
            BossMod.drawHealthBar(G.currentBoss, W, isPortrait)
        end
        if G.bossFightState == "warning" then
            BossMod.drawWarning(G.bossWarningTimer, W, H, isPortrait, G.frameCount)
        end
        if G.paused then drawPauseOverlay() end
    elseif G.state == "unlockModal" then
        drawScrollingBackground()
        for _, en in ipairs(G.enemies) do drawEnemy(en) end
        drawParticles(); drawPlayer(); drawHUD()
        drawUnlockModal()
    elseif G.state == "dialogue" then
        drawDialogue()
    elseif G.state == "gameover" then
        drawScrollingBackground(); drawParticles(); drawGameOver()
    end

    love.graphics.pop()

    -- Transition overlay
    if G.transitionDir ~= "none" then
        love.graphics.setColor(0, 0, 0, G.transitionAlpha)
        love.graphics.rectangle("fill", 0, 0, W, H)
    end
end

-- ─── Input ───
function love.keypressed(key)
    G.keys[key] = true

    if G.state == "splash" then G.state = "menu"; return end
    if G.state == "menu" then
        if key == "up" or key == "w" then G.menuSelection = ((G.menuSelection - 2) % #MENU_ITEMS) + 1 end
        if key == "down" or key == "s" then G.menuSelection = (G.menuSelection % #MENU_ITEMS) + 1 end
        if key == "return" or key == "space" then
            if G.menuSelection == 1 then startTransition(startNewRun)
            elseif G.menuSelection == 2 then G.state = "highscores"
            elseif G.menuSelection == 3 then G.state = "controls" end
        end
    end
    if G.state == "highscores" or G.state == "controls" then
        if key == "escape" or key == "return" then G.state = "menu" end
    end
    if G.state == "unlockModal" and (key == "return" or key == "space") then G.state = "playing"; return end
    if G.state == "dialogue" and (key == "return" or key == "space") then advanceDialogue(); return end
    if G.state == "gameover" then
        if key == "return" then startTransition(startNewRun) end
        if key == "escape" then startTransition(function() G.state = "menu"; Audio.stopMusic() end) end
    end
    if G.state == "levelComplete" and key == "return" then advanceLevel() end
    if G.state == "victory" then
        if key == "return" then startTransition(startNewRun) end
        if key == "escape" then startTransition(function() G.state = "menu"; Audio.stopMusic() end) end
    end
    if G.state == "playing" then
        if G.paused and G.confirmingQuit then
            if key == "y" or key == "return" then
                G.confirmingQuit = false; G.paused = false
                startTransition(function() G.state = "menu"; Audio.stopMusic() end)
            end
            if key == "n" or key == "escape" then G.confirmingQuit = false end
            return
        end
        if key == "escape" or key == "p" then G.paused = not G.paused; G.confirmingQuit = false end
        if key == "q" and G.paused then G.confirmingQuit = true end
        if key == "m" and G.paused then Audio.toggleMute() end
    end
end

function love.keyreleased(key)
    G.keys[key] = false
end

-- Touch support
function love.touchpressed(id, x, y)
    if G.state == "splash" then G.state = "menu"; return end
    if G.state == "menu" then
        for i, b in ipairs(G.menuItemBounds) do
            if x >= b.x and x <= b.x + b.w and y >= b.y and y <= b.y + b.h then
                G.menuSelection = i
                if i == 1 then startTransition(startNewRun)
                elseif i == 2 then G.state = "highscores"
                elseif i == 3 then G.state = "controls" end
                return
            end
        end
        return
    end
    if G.state == "unlockModal" then G.state = "playing"; return end
    if G.state == "dialogue" then advanceDialogue(); return end
    if G.state == "highscores" or G.state == "controls" then G.state = "menu"; return end
    if G.state == "gameover" then startTransition(startNewRun); return end
    if G.state == "levelComplete" then advanceLevel(); return end
    if G.state == "victory" then startTransition(startNewRun); return end

    if G.state == "playing" then
        -- Pause button hit test
        local pbSize = 36
        local pbX, pbY = W - pbSize - 15, 42
        if x >= pbX and x <= pbX + pbSize and y >= pbY and y <= pbY + pbSize then
            G.paused = not G.paused; G.confirmingQuit = false; return
        end
        if G.paused then return end

        -- Left half = move joystick
        if G.dpadTouchId == nil and x < W * 0.5 and y > H * 0.3 then
            G.dpadTouchId = id
            G.joystickCenter = {x = x, y = y}
            G.joystickThumb = {x = x, y = y}
        -- Right half = aim/fire or pole
        elseif G.fireTouchId == nil and x > W * 0.5 and y > H * 0.3 then
            local pwY = G.scrollY + (H - G.player.y)
            local weaponTerrain = Levels.getTerrainAt(G.currentLevel, pwY)
            if weaponTerrain == "water" then
                G.poleTouchId = id; activatePole()
            else
                G.fireTouchId = id
                G.fireCenter = {x = x, y = y}
                G.fireThumb = {x = x, y = y}
                G.fireStickActive = false
            end
        end
    end
end

function love.touchmoved(id, x, y)
    if id == G.dpadTouchId and G.joystickCenter then
        local dx = x - G.joystickCenter.x
        local dy = y - G.joystickCenter.y
        local d = math.sqrt(dx*dx + dy*dy)
        if d > DPAD_R then
            local nx, ny = dx/d, dy/d
            G.joystickCenter.x = x - nx * DPAD_R
            G.joystickCenter.y = y - ny * DPAD_R
        end
        G.joystickThumb = {x = x, y = y}
        local fdx = x - G.joystickCenter.x
        local fdy = y - G.joystickCenter.y
        local fd = math.sqrt(fdx*fdx + fdy*fdy)
        if fd > DPAD_DEAD then
            G.dpadAngle = math.atan2(fdy, fdx)
        else
            G.dpadAngle = nil
        end
    end
    if id == G.fireTouchId and G.fireCenter then
        G.fireThumb = {x = x, y = y}
        local fdx = x - G.fireCenter.x
        local fdy = y - G.fireCenter.y
        local fd = math.sqrt(fdx*fdx + fdy*fdy)
        if fd > DPAD_DEAD then
            G.shootAngle = math.atan2(fdy, fdx)
            G.fireStickActive = true
            if fd > DPAD_R then
                local nx, ny = fdx/fd, fdy/fd
                G.fireCenter.x = x - nx * DPAD_R
                G.fireCenter.y = y - ny * DPAD_R
            end
        else
            G.fireStickActive = false
        end
    end
end

function love.touchreleased(id, x, y)
    if id == G.dpadTouchId then
        G.dpadTouchId = nil; G.joystickCenter = nil; G.dpadAngle = nil
    end
    if id == G.fireTouchId then
        throwSushi()
        G.fireTouchId = nil; G.fireCenter = nil; G.fireStickActive = false
    end
    if id == G.poleTouchId then G.poleTouchId = nil end
end

-- Mouse fallback for desktop touch simulation
function love.mousepressed(x, y, button)
    if button == 1 then
        love.touchpressed("mouse", x, y)
    end
end

function love.mousemoved(x, y)
    if love.mouse.isDown(1) then
        love.touchmoved("mouse", x, y)
    end
end

function love.mousereleased(x, y, button)
    if button == 1 then
        love.touchreleased("mouse", x, y)
    end
end
