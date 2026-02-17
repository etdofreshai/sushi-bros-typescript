-- boss.lua - Boss creation, AI, drawing
local Boss = {}

function Boss.create(level, scrollY, W, H)
    local screenX = W / 2
    local screenY = H * 0.22
    local worldY = scrollY + (H - screenY)

    if level == 1 then
        return {
            name = "Giant Octopus", bossType = "octopus",
            x = screenX, y = screenY, worldY = worldY,
            hp = 25, maxHp = 25, radius = 40,
            currentPhase = 1,
            phases = {
                {patterns = {"ink_spread"}, attackInterval = 120},
                {patterns = {"ink_spread", "tentacle_sweep"}, attackInterval = 80},
            },
            phaseTimer = 0, attackTimer = 60, animFrame = 0,
            defeated = false, defeatTimer = 0, flashTimer = 0,
        }
    elseif level == 2 then
        return {
            name = "Crab King", bossType = "crab_king",
            x = screenX, y = screenY, worldY = worldY,
            hp = 35, maxHp = 35, radius = 42,
            currentPhase = 1,
            phases = {
                {patterns = {"charge"}, attackInterval = 100},
                {patterns = {"charge", "spawn_minions"}, attackInterval = 70},
            },
            phaseTimer = 0, attackTimer = 60, animFrame = 0,
            defeated = false, defeatTimer = 0, flashTimer = 0,
            chargeVelX = 0, chargeDir = 1, shieldTimer = 0,
        }
    else
        return {
            name = "Master Fisherman", bossType = "fisherman",
            x = screenX, y = screenY, worldY = worldY,
            hp = 40, maxHp = 40, radius = 38,
            currentPhase = 1,
            phases = {
                {patterns = {"cast_nets", "throw_hooks"}, attackInterval = 110},
                {patterns = {"throw_hooks", "summon_seagulls", "cast_nets"}, attackInterval = 60},
            },
            phaseTimer = 0, attackTimer = 60, animFrame = 0,
            defeated = false, defeatTimer = 0, flashTimer = 0,
        }
    end
end

function Boss.executeAttack(boss, pattern, W, H, scrollY, playerX, playerY, bossProjectiles, tentacleSweeps, enemies)
    if pattern == "ink_spread" then
        local count = boss.currentPhase == 1 and 3 or 5
        local spread = math.pi * 0.6
        local baseAngle = math.pi / 2
        local speed = boss.currentPhase == 1 and 2.5 or 3.5
        for i = 0, count - 1 do
            local angle = baseAngle - spread / 2 + (spread / (count - 1)) * i
            table.insert(bossProjectiles, {
                x = boss.x, y = boss.y + boss.radius,
                vx = math.cos(angle) * speed, vy = -math.sin(angle) * speed,
                life = 120, worldX = boss.x,
                worldY = scrollY + (H - boss.y - boss.radius),
                ptype = "ink",
            })
        end
    elseif pattern == "tentacle_sweep" then
        table.insert(tentacleSweeps, {
            x = W / 2, y = boss.y + boss.radius + 10,
            width = W * 0.8, height = 20, life = 80, velY = 2,
        })
    elseif pattern == "charge" then
        local speed = boss.currentPhase == 1 and 5 or 8
        boss.chargeDir = boss.x > W / 2 and -1 or 1
        boss.chargeVelX = boss.chargeDir * speed
    elseif pattern == "spawn_minions" then
        local count = 2 + math.floor(math.random() * 2)
        for i = 1, count do
            local x = 40 + math.random() * (W - 80)
            local wy = scrollY + H * 0.4 + math.random() * H * 0.3
            table.insert(enemies, {
                x = x, y = 0, vx = 0, vy = 0, etype = "crab",
                hp = 1, radius = 10, timer = math.random() * 200,
                shootTimer = 999, animFrame = 0, worldY = wy,
                baseX = x, moveFactor = 0.4,
            })
        end
        boss.shieldTimer = 60
    elseif pattern == "cast_nets" then
        local count = boss.currentPhase == 1 and 2 or 3
        local nr = boss.currentPhase == 1 and 30 or 45
        for i = 1, count do
            local tx = 40 + math.random() * (W - 80)
            local ty = H * 0.4 + math.random() * H * 0.4
            table.insert(bossProjectiles, {
                x = tx, y = ty, vx = 0, vy = 0, life = 180,
                worldX = tx, worldY = scrollY + (H - ty),
                ptype = "net", netTimer = 0, netRadius = nr,
            })
        end
    elseif pattern == "throw_hooks" then
        local count = boss.currentPhase == 1 and 1 or 3
        for i = 1, count do
            local dx = playerX - boss.x + (math.random() - 0.5) * 40
            local dy = playerY - boss.y
            local d = math.sqrt(dx * dx + dy * dy)
            local speed = boss.currentPhase == 1 and 3 or 4.5
            if d > 0 then
                table.insert(bossProjectiles, {
                    x = boss.x, y = boss.y + boss.radius,
                    vx = (dx / d) * speed, vy = -(dy / d) * speed,
                    life = 100, worldX = boss.x,
                    worldY = scrollY + (H - boss.y - boss.radius),
                    ptype = "hook",
                })
            end
        end
    elseif pattern == "summon_seagulls" then
        for i = 1, 3 do
            local x = 30 + math.random() * (W - 60)
            local wy = scrollY + H + 50 + (i - 1) * 80
            table.insert(enemies, {
                x = x, y = 0, vx = 0, vy = 0, etype = "seagull",
                hp = 1, radius = 12, timer = math.random() * 200,
                shootTimer = 999, animFrame = 0, worldY = wy,
                baseX = x, moveFactor = 0.5,
            })
        end
    end
end

function Boss.update(boss, W, H, scrollY, playerX, playerY, bossProjectiles, tentacleSweeps, enemies)
    if boss.defeated then return end
    boss.animFrame = boss.animFrame + 1
    boss.phaseTimer = boss.phaseTimer + 1
    if boss.flashTimer > 0 then boss.flashTimer = boss.flashTimer - 1 end

    local phase = boss.phases[boss.currentPhase]
    boss.attackTimer = boss.attackTimer - 1

    if boss.attackTimer <= 0 then
        boss.attackTimer = phase.attackInterval
        local idx = (boss.phaseTimer % #phase.patterns) + 1
        local pattern = phase.patterns[idx]
        Boss.executeAttack(boss, pattern, W, H, scrollY, playerX, playerY, bossProjectiles, tentacleSweeps, enemies)
    end

    if boss.bossType == "octopus" then
        boss.x = W / 2 + math.sin(boss.animFrame * 0.015) * 60
    elseif boss.bossType == "crab_king" then
        if boss.chargeVelX and boss.chargeVelX ~= 0 then
            boss.x = boss.x + boss.chargeVelX
            if boss.x < boss.radius + 10 or boss.x > W - boss.radius - 10 then
                boss.chargeVelX = 0
                boss.x = math.max(boss.radius + 10, math.min(W - boss.radius - 10, boss.x))
            end
        else
            boss.y = H * 0.22 + math.sin(boss.animFrame * 0.02) * 10
        end
        if boss.shieldTimer and boss.shieldTimer > 0 then boss.shieldTimer = boss.shieldTimer - 1 end
    elseif boss.bossType == "fisherman" then
        boss.x = W / 2 + math.sin(boss.animFrame * 0.01) * 40
    end
end

function Boss.draw(boss)
    if boss.defeated and boss.defeatTimer % 4 < 2 then return end
    local isFlash = boss.flashTimer > 0

    love.graphics.push()
    love.graphics.translate(boss.x, boss.y)

    if boss.bossType == "octopus" then
        if isFlash then love.graphics.setColor(1,1,1) else love.graphics.setColor(0.4, 0.2, 0.533) end
        love.graphics.circle("fill", 0, 0, boss.radius)
        if not isFlash then
            love.graphics.setColor(0.533, 0.267, 0.6)
            for i = 0, 4 do
                local a = (i / 5) * math.pi * 2 + boss.animFrame * 0.01
                love.graphics.circle("fill", math.cos(a) * 20, math.sin(a) * 15, 5)
            end
        end
        -- Eyes
        love.graphics.setColor(1,1,1)
        love.graphics.circle("fill", -12, -10, 8)
        love.graphics.circle("fill", 12, -10, 8)
        love.graphics.setColor(0,0,0)
        love.graphics.circle("fill", -10, -10, 4)
        love.graphics.circle("fill", 14, -10, 4)
        -- Tentacles
        if not isFlash then
            love.graphics.setColor(0.333, 0.2, 0.467)
            love.graphics.setLineWidth(4)
            for i = 0, 7 do
                local a = (i / 8) * math.pi + math.pi * 0.1
                local baseX = math.cos(a) * boss.radius * 0.8
                local baseY = boss.radius * 0.6
                local wave = math.sin(boss.animFrame * 0.05 + i) * 15
                love.graphics.line(baseX, baseY, baseX + wave, baseY + 25, baseX + wave * 0.5, baseY + 50)
            end
        end

    elseif boss.bossType == "crab_king" then
        -- Shield
        if boss.shieldTimer and boss.shieldTimer > 0 then
            local a = 0.3 + math.sin(boss.animFrame * 0.3) * 0.2
            love.graphics.setColor(0.39, 0.39, 1, a)
            love.graphics.setLineWidth(3)
            love.graphics.circle("line", 0, 0, boss.radius + 10)
        end
        if isFlash then love.graphics.setColor(1,1,1) else love.graphics.setColor(0.8, 0.133, 0.133) end
        love.graphics.ellipse("fill", 0, 0, boss.radius + 5, boss.radius - 5)
        -- Crown
        love.graphics.setColor(1, 0.867, 0)
        local cr = boss.radius
        love.graphics.polygon("fill", -15, -cr+5, -12, -cr-12, -5, -cr+2, 0, -cr-15, 5, -cr+2, 12, -cr-12, 15, -cr+5)
        -- Crown gem
        love.graphics.setColor(1, 0, 0)
        love.graphics.circle("fill", 0, -cr - 8, 3)
        -- Claws
        if not isFlash then
            local clawAnim = math.sin(boss.animFrame * 0.08) * 0.3
            for _, side in ipairs({-1, 1}) do
                love.graphics.push()
                love.graphics.translate(side * (boss.radius + 15), -5)
                love.graphics.rotate(side * clawAnim)
                love.graphics.setColor(0.933, 0.2, 0.2)
                love.graphics.circle("fill", 0, 0, 18)
                love.graphics.setColor(0.867, 0.133, 0.133)
                love.graphics.polygon("fill", side*8, -10, side*20, -15, side*12, -5)
                love.graphics.polygon("fill", side*8, 5, side*20, 10, side*12, 0)
                love.graphics.pop()
            end
        end
        -- Eyes
        love.graphics.setColor(1,1,1)
        love.graphics.circle("fill", -10, -8, 6)
        love.graphics.circle("fill", 10, -8, 6)
        love.graphics.setColor(0,0,0)
        love.graphics.circle("fill", -9, -8, 3)
        love.graphics.circle("fill", 11, -8, 3)
        -- Legs
        love.graphics.setColor(0.8, 0.133, 0.133)
        love.graphics.setLineWidth(3)
        for _, side in ipairs({-1, 1}) do
            for j = 0, 2 do
                local lx = side * (15 + j * 10)
                love.graphics.line(lx, boss.radius - 10, lx + side * 8, boss.radius + 8 + math.sin(boss.animFrame * 0.1 + j) * 3)
            end
        end

    elseif boss.bossType == "fisherman" then
        if isFlash then love.graphics.setColor(1,1,1) else love.graphics.setColor(0.2, 0.333, 0.667) end
        love.graphics.circle("fill", 0, 5, boss.radius - 5)
        if isFlash then love.graphics.setColor(1,1,1) else love.graphics.setColor(0.867, 0.659, 0.467) end
        love.graphics.circle("fill", 0, -boss.radius + 8, 16)
        -- Hat
        love.graphics.setColor(0.333, 0.4, 0.2)
        love.graphics.rectangle("fill", -18, -boss.radius - 8, 36, 10)
        love.graphics.rectangle("fill", -14, -boss.radius - 18, 28, 12)
        -- Eyes
        love.graphics.setColor(0,0,0)
        love.graphics.rectangle("fill", -8, -boss.radius + 5, 5, 3)
        love.graphics.rectangle("fill", 3, -boss.radius + 5, 5, 3)
        -- Eyebrows
        love.graphics.setLineWidth(2)
        love.graphics.line(-10, -boss.radius + 2, -3, -boss.radius + 4)
        love.graphics.line(10, -boss.radius + 2, 3, -boss.radius + 4)
        -- Rod
        if not isFlash then
            love.graphics.setColor(0.545, 0.412, 0.078)
            love.graphics.setLineWidth(4)
            love.graphics.line(20, 0, 40, -40, 50, -50)
            love.graphics.setColor(0.667, 0.667, 0.667)
            love.graphics.setLineWidth(1)
            love.graphics.line(50, -50, 50 + math.sin(boss.animFrame * 0.05) * 10, -30)
        end
    end

    love.graphics.pop()
end

function Boss.drawProjectiles(bossProjectiles)
    for _, p in ipairs(bossProjectiles) do
        if p.ptype == "ink" then
            love.graphics.setColor(0.165, 0.039, 0.227)
            love.graphics.circle("fill", p.x, p.y, 5)
            love.graphics.setColor(0.235, 0.078, 0.314, 0.4)
            love.graphics.circle("fill", p.x, p.y, 9)
        elseif p.ptype == "hook" then
            love.graphics.setColor(0.8, 0.8, 0.8)
            love.graphics.setLineWidth(2)
            love.graphics.arc("line", "open", p.x, p.y, 6, 0, math.pi)
            love.graphics.setColor(0.533, 0.533, 0.533)
            love.graphics.circle("fill", p.x, p.y, 3)
        elseif p.ptype == "net" then
            local nr = p.netRadius or 30
            local alpha = math.min(p.life / 30, 1) * 0.35
            love.graphics.setColor(0.545, 0.271, 0.075, alpha)
            love.graphics.circle("fill", p.x, p.y, nr)
            love.graphics.setColor(0.627, 0.471, 0.235, alpha + 0.1)
            love.graphics.setLineWidth(1)
            for a = 0, math.pi * 2 - 0.01, math.pi / 4 do
                love.graphics.line(p.x, p.y, p.x + math.cos(a) * nr, p.y + math.sin(a) * nr)
            end
            love.graphics.circle("line", p.x, p.y, nr * 0.5)
        end
    end
end

function Boss.drawTentacleSweeps(sweeps)
    for _, s in ipairs(sweeps) do
        local alpha = math.min(s.life / 20, 1) * 0.6
        love.graphics.setColor(0.392, 0.196, 0.588, alpha)
        love.graphics.rectangle("fill", s.x - s.width/2, s.y - s.height/2, s.width, s.height)
        love.graphics.setColor(0.588, 0.314, 0.784, alpha)
        love.graphics.setLineWidth(2)
        love.graphics.rectangle("line", s.x - s.width/2, s.y - s.height/2, s.width, s.height)
    end
end

function Boss.drawHealthBar(boss, W, isPortrait)
    local barW = W * 0.7
    local barH = 16
    local barX = (W - barW) / 2
    local barY = 10

    love.graphics.setColor(0, 0, 0, 0.6)
    love.graphics.rectangle("fill", barX - 2, barY - 2, barW + 4, barH + 4)

    local hpRatio = math.max(0, boss.hp / boss.maxHp)
    if hpRatio > 0.5 then love.graphics.setColor(0.267, 1, 0.267)
    elseif hpRatio > 0.25 then love.graphics.setColor(1, 0.8, 0)
    else love.graphics.setColor(1, 0.267, 0.267) end
    love.graphics.rectangle("fill", barX, barY, barW * hpRatio, barH)

    love.graphics.setColor(1, 1, 1)
    love.graphics.setLineWidth(1.5)
    love.graphics.rectangle("line", barX, barY, barW, barH)

    local font = love.graphics.getFont()
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf(boss.name, 0, barY + barH + 2, W, "center")
end

function Boss.drawWarning(bossWarningTimer, W, H, isPortrait, frameCount)
    local flash = math.sin(bossWarningTimer * 0.3) > 0
    if flash then
        love.graphics.setColor(1, 0, 0, 0.15)
        love.graphics.rectangle("fill", 0, 0, W, H)
    end
    local scale = 1 + math.sin(bossWarningTimer * 0.2) * 0.1
    love.graphics.push()
    love.graphics.translate(W / 2, H * 0.4)
    love.graphics.scale(scale, scale)
    love.graphics.setColor(1, 0, 0)
    local fs = isPortrait and 30 or 40
    local font = love.graphics.newFont(fs)
    love.graphics.setFont(font)
    love.graphics.printf("WARNING!", -200, -fs/2, 400, "center")
    love.graphics.setColor(1, 1, 1, 0.7)
    local fs2 = isPortrait and 16 or 20
    local font2 = love.graphics.newFont(fs2)
    love.graphics.setFont(font2)
    love.graphics.printf("BOSS APPROACHING", -200, fs/2 + 5, 400, "center")
    love.graphics.pop()
end

return Boss
