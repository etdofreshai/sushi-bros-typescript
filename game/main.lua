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

-- ─── Helpers ───
function F.dist(x1, y1, x2, y2)
    return math.sqrt((x1-x2)^2 + (y1-y2)^2)
end

function F.loadHighScores()
    local ok, data = pcall(love.filesystem.read, "highscores.json")
    if ok and data then
        local scores = {}
        for s, l, d in data:gmatch('"score":(%d+),"level":(%d+),"date":"([^"]*)"') do
            table.insert(scores, {score=tonumber(s), level=tonumber(l), date=d})
        end
        table.sort(scores, function(a, b) return a.score > b.score end)
        return scores
    end
    return {}
end

function F.saveHighScore(s, lvl)
    local scores = F.loadHighScores()
    table.insert(scores, {score=s, level=lvl, date=os.date("%m/%d/%Y")})
    table.sort(scores, function(a, b) return a.score > b.score end)
    while #scores > 5 do table.remove(scores) end
    local parts = {}
    for _, e in ipairs(scores) do
        table.insert(parts, string.format('{"score":%d,"level":%d,"date":"%s"}', e.score, e.level, e.date))
    end
    love.filesystem.write("highscores.json", "[" .. table.concat(parts, ",") .. "]")
    if s > G.highScore then G.highScore = s end
end

function F.startTransition(callback)
    G.transitionAlpha = 0
    G.transitionDir = "in"
    G.transitionSpeed = 0.04
    G.transitionCallback = callback
end

function F.triggerShake(intensity)
    G.shakeIntensity = intensity
end

function F.addStreakHit()
    G.hitStreak = G.hitStreak + 1
    G.scoreMultiplier = math.min(math.floor(G.hitStreak / 3) + 1, 10)
    G.multiplierDisplayTimer = 120
end

function F.resetStreak()
    G.hitStreak = 0
    G.scoreMultiplier = 1
end

function F.spawnParticles(x, y, count, colors)
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

function F.spawnPowerUp(x, worldY)
    local r = math.random()
    local ptype
    if r < 0.03 then ptype = "life"
    elseif r < 0.06 then ptype = "shield"
    elseif r < 0.10 then ptype = "triple"
    else ptype = "speed" end
    table.insert(G.powerUps, {x = x, y = 0, worldX = x, worldY = worldY, ptype = ptype, life = 600})
end

function F.resetPlayer()
    G.player = {
        x = W / 2, y = H * 0.7, vx = 0, vy = 0,
        radius = 14, facing = -math.pi / 2,
        invulnTimer = 180, visible = true, respawnTimer = 0,
    }
end

-- ─── Dialogue ───
function F.startDialogue(sceneId, onComplete)
    local lines = Levels.dialogues[sceneId]
    if not lines or #lines == 0 then onComplete(); return end
    G.currentDialogue = {lines = lines, onComplete = onComplete}
    G.dialogueIndex = 1
    G.dialogueCharIndex = 0
    G.dialogueCharTimer = 0
    G.dialogueFullyRevealed = false
    G.state = "dialogue"
end

function F.advanceDialogue()
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
function F.beginLevel(level)
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
    F.resetPlayer()
    G.state = "levelIntro"
    G.levelIntroTimer = 120
    Audio.startMusic(level - 1)
end

function F.startNewRun()
    G.score = 0; G.lives = 3; G.currentLevel = 1
    G.sushiThrowUnlocked = false; G.sushiUnlockShown = false
    F.resetStreak()
    F.startDialogue("intro", function() F.beginLevel(1) end)
end

function F.advanceLevel()
    local sceneIds = {"afterLevel1", "afterLevel2", "afterLevel3"}
    local sceneId = sceneIds[G.currentLevel]
    if G.currentLevel < #Levels.configs then
        local nextLevel = G.currentLevel + 1
        F.startTransition(function()
            F.startDialogue(sceneId, function() F.beginLevel(nextLevel) end)
        end)
    else
        F.startTransition(function()
            F.startDialogue(sceneId, function()
                F.saveHighScore(G.score, G.currentLevel)
                G.state = "victory"
                Audio.playVictoryJingle()
                Audio.stopMusic()
            end)
        end)
    end
end

-- ─── Actions ───
function F.throwSushi()
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

function F.activatePole()
    if G.state ~= "playing" or not G.player.visible or G.poleSwing then return end
    Audio.sfxPoleSwing()
    G.playerShootAnim = 14
    G.poleSwing = {
        angle = G.player.facing - math.pi * 0.6,
        timer = 20, maxTimer = 20, radius = 45,
    }
end

-- ─── Player Damage ───
function F.playerDamage()
    if G.hasShield then
        G.hasShield = false
        F.spawnParticles(G.player.x, G.player.y, 15, {{0.267,0.533,1},{0.4,0.667,1},{0.533,0.8,1}})
        G.player.invulnTimer = 30
        F.triggerShake(3)
        return
    end
    F.spawnParticles(G.player.x, G.player.y, 20, {{1,1,1},{1,0.267,0.267},{1,0.667,0}})
    Audio.sfxPlayerHit()
    F.triggerShake(5)
    F.resetStreak()
    G.player.visible = false
    G.lives = G.lives - 1
    if G.lives <= 0 then
        G.state = "gameover"
        F.saveHighScore(G.score, G.currentLevel)
        Audio.stopMusic()
    else
        G.player.respawnTimer = 90
    end
end

-- ─── Spawning ───
function F.spawnEnemiesAhead()
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

function F.spawnTreesAhead()
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
    local cullY = G.scrollY - 200
    local new = {}
    for _, t in ipairs(G.treeObstacles) do
        if t.worldY > cullY then table.insert(new, t) end
    end
    G.treeObstacles = new
end

-- ─── Update helpers ───
function F.updateTransition()
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

function F.updateShake()
    if G.shakeIntensity > 0.5 then
        G.shakeOffsetX = (math.random() - 0.5) * G.shakeIntensity * 2
        G.shakeOffsetY = (math.random() - 0.5) * G.shakeIntensity * 2
        G.shakeIntensity = G.shakeIntensity * G.shakeDecay
    else
        G.shakeIntensity = 0; G.shakeOffsetX = 0; G.shakeOffsetY = 0
    end
end

function F.updateEnemies()
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

        if en.etype == "fisherman" and G.player.visible and en.y > -20 and en.y < H + 20 then
            en.shootTimer = en.shootTimer - 1
            if en.shootTimer <= 0 then
                local stR = Levels.configs[G.currentLevel].shootTimerRange
                en.shootTimer = stR[1] + math.random() * (stR[2] - stR[1])
                local dx = G.player.x - en.x
                local dy = G.player.y - en.y
                local d = F.dist(en.x, en.y, G.player.x, G.player.y)
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

function F.updateProjectiles()
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

function F.updateParticles()
    for i = #G.particles, 1, -1 do
        local p = G.particles[i]
        p.x = p.x + p.vx; p.y = p.y + p.vy; p.life = p.life - 1
        if p.life <= 0 then table.remove(G.particles, i) end
    end
end

function F.updatePowerUps()
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
        elseif G.player.visible and F.dist(G.player.x, G.player.y, p.x, p.y) < G.player.radius + 12 then
            if p.ptype == "speed" then G.activeSpeed = 300
            elseif p.ptype == "triple" then G.activeTriple = 300
            elseif p.ptype == "shield" then G.hasShield = true
            elseif p.ptype == "life" then G.lives = G.lives + 1 end
            Audio.sfxPowerUp()
            table.remove(G.powerUps, i)
        end
    end
end


function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("First 510 lines loaded OK!", 100, 100)
end
