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

-- ─── Draw helpers ───
function F.drawScrollingBackground()
    local rowH = 4
    for screenY = 0, H, rowH do
        local worldY = G.scrollY + (H - screenY)
        local c = Levels.getTerrainColor(G.currentLevel, worldY)
        love.graphics.setColor(c[1], c[2], c[3])
        love.graphics.rectangle("fill", 0, screenY, W, rowH + 1)
    end

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

function F.drawPlayer()
    if not G.player.visible then return end
    if G.player.invulnTimer > 0 and math.floor(G.frameCount / 4) % 2 == 0 then return end

    local px, py = G.player.x, G.player.y
    local pwY = G.scrollY + (H - py)
    local isOnWater = Levels.getTerrainAt(G.currentLevel, pwY) == "water"

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

    if G.playerShootAnim > 0 then
        local t = G.playerShootAnim / 14
        local expand = (14 - G.playerShootAnim) * 2.5
        love.graphics.setColor(1, 1, 0.392, t * 0.85)
        love.graphics.setLineWidth(3 * t)
        love.graphics.circle("line", 0, 0, 14 + expand)
    end

    if not isOnWater then
        local legPhase = G.playerWalkTimer * 0.25
        local leftY = G.playerIsMoving and math.sin(legPhase) * 4 or 0
        local rightY = G.playerIsMoving and math.sin(legPhase + math.pi) * 4 or 0
        love.graphics.setColor(0.533, 0.533, 0.6)
        love.graphics.ellipse("fill", -5, 14 + leftY, 4, 3.5)
        love.graphics.ellipse("fill", 5, 14 + rightY, 4, 3.5)
    end

    love.graphics.setColor(1, 1, 1)
    love.graphics.circle("fill", 0, 2, 12)
    love.graphics.setColor(0.8, 0.8, 0.8)
    love.graphics.setLineWidth(1)
    love.graphics.circle("line", 0, 2, 12)

    love.graphics.setColor(1, 0.8, 0.533)
    love.graphics.circle("fill", 0, -6, 8)

    love.graphics.setColor(1, 1, 1)
    love.graphics.rectangle("fill", -6, -18, 12, 10)
    love.graphics.circle("fill", 0, -18, 7)

    local ex = math.cos(G.player.facing) * 2
    local ey = math.sin(G.player.facing) * 2
    love.graphics.setColor(0, 0, 0)
    love.graphics.circle("fill", -3 + ex*0.5, -7 + ey*0.5, 1.5)
    love.graphics.circle("fill", 3 + ex*0.5, -7 + ey*0.5, 1.5)

    love.graphics.pop()

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

function F.drawEnemy(en)
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

function F.drawSushis()
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

function F.drawEnemyProjectiles()
    for _, p in ipairs(G.enemyProjectiles) do
        love.graphics.setColor(1, 0.267, 0.267)
        love.graphics.circle("fill", p.x, p.y, 3)
        love.graphics.setColor(1, 0.392, 0.392, 0.3)
        love.graphics.circle("fill", p.x, p.y, 6)
    end
end

function F.drawParticles()
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

function F.drawPowerUps()
    for _, p in ipairs(G.powerUps) do
        local bob = math.sin(G.frameCount * 0.06 + p.worldY) * 3
        local alpha = p.life < 60 and p.life / 60 or 1
        local c = G.POWERUP_COLORS[p.ptype]
        love.graphics.setColor(c[1], c[2], c[3], 0.267 * alpha)
        love.graphics.circle("fill", p.x, p.y + bob, 14)
        love.graphics.setColor(c[1], c[2], c[3], alpha)
        love.graphics.circle("fill", p.x, p.y + bob, 9)
        love.graphics.setColor(0, 0, 0, alpha)
        love.graphics.printf(G.POWERUP_LABELS[p.ptype], p.x - 10, p.y + bob - 6, 20, "center")
    end
end

function F.drawHUD()
    local fontSize = isPortrait and 14 or 16
    local font = love.graphics.newFont(fontSize)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("SCORE: " .. G.score, 15, 12)
    love.graphics.printf("HI: " .. G.highScore, 0, 12, W - 55, "right")

    for i = 0, G.lives - 1 do
        local lx = 20 + i * 22
        love.graphics.setColor(1, 0.467, 0.267)
        love.graphics.circle("fill", lx, 40, 6)
        love.graphics.setColor(1, 1, 1)
        love.graphics.circle("fill", lx, 42, 5)
    end

    if G.scoreMultiplier > 1 and G.multiplierDisplayTimer > 0 then
        love.graphics.setColor(1, 0.867, 0)
        love.graphics.print("x" .. G.scoreMultiplier, 15 + font:getWidth("SCORE: " .. G.score) + 10, 12)
    end

    local px = 20
    love.graphics.setColor(1, 0.867, 0)
    if G.activeSpeed > 0 then love.graphics.print("SPD " .. math.ceil(G.activeSpeed/60) .. "s", px, 55); px = px + 55 end
    love.graphics.setColor(1, 0.267, 0.267)
    if G.activeTriple > 0 then love.graphics.print("TRI " .. math.ceil(G.activeTriple/60) .. "s", px, 55); px = px + 55 end
    love.graphics.setColor(0.267, 0.533, 1)
    if G.hasShield then love.graphics.print("SHD", px, 55) end

    love.graphics.setColor(1, 1, 1)
    love.graphics.printf(G.distance .. "m", 0, 8, W, "center")
    local cfg = Levels.configs[G.currentLevel]
    if cfg then
        love.graphics.printf("Lv" .. G.currentLevel .. ": " .. cfg.name, 0, 24, W, "center")
        local prog = math.min(G.distance / cfg.targetDistance, 1)
        local barW = 100
        local barX = W/2 - barW/2
        love.graphics.setColor(1, 1, 1, 0.15)
        love.graphics.rectangle("fill", barX, 40, barW, 4)
        love.graphics.setColor(0.267, 1, 0.267, 0.6)
        love.graphics.rectangle("fill", barX, 40, barW * prog, 4)
    end

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

function F.drawMenuBackground()
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

function F.drawSplash()
    love.graphics.setColor(0, 0, 0)
    love.graphics.rectangle("fill", 0, 0, W, H)

    local alpha
    if G.splashTimer < 30 then
        alpha = G.splashTimer / 30
    elseif G.splashTimer > G.SPLASH_DURATION - 30 then
        alpha = (G.SPLASH_DURATION - G.splashTimer) / 30
    else
        alpha = 1
    end

    local cx, cy = W / 2, H / 2

    local heartScale = 2.5 + math.sin(G.splashTimer * 0.05) * 0.15
    love.graphics.push()
    love.graphics.translate(cx, cy - 30)
    love.graphics.scale(heartScale, heartScale)
    love.graphics.setColor(0.91, 0.2, 0.35, alpha)
    love.graphics.circle("fill", -5, -3, 7)
    love.graphics.circle("fill", 5, -3, 7)
    love.graphics.polygon("fill", -11, -1, 0, 12, 11, -1)
    love.graphics.pop()

    local font = love.graphics.newFont(isPortrait and 16 or 20)
    love.graphics.setFont(font)
    love.graphics.setColor(1, 1, 1, alpha)
    love.graphics.printf("Made with L\195\150VE", 0, cy + 30, W, "center")

    if G.splashTimer > 60 then
        local hintAlpha = math.min((G.splashTimer - 60) / 30, 1) * alpha * 0.4
        local sf = love.graphics.newFont(isPortrait and 10 or 12)
        love.graphics.setFont(sf)
        love.graphics.setColor(1, 1, 1, hintAlpha)
        love.graphics.printf("Press any key to skip", 0, H * 0.85, W, "center")
    end
end

function F.drawMenu()
    F.drawMenuBackground()
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
    for i, item in ipairs(G.MENU_ITEMS) do
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
        if selected then love.graphics.setColor(1, 1, 1) else love.graphics.setColor(1, 1, 1, 0.7) end
        love.graphics.printf(item, bx, y + btnH/2 - btnFont:getHeight()/2, btnW, "center")
    end

    if G.highScore > 0 then
        love.graphics.setColor(1, 0.784, 0.392, 0.6)
        love.graphics.printf("HIGH SCORE: " .. G.highScore, 0, H*0.72, W, "center")
    end
end


function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("First 945 lines loaded OK!", 100, 100)
end
