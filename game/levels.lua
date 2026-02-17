-- levels.lua - Level configurations and terrain
local Levels = {}

-- Terrain types and colors
Levels.TERRAIN_COLORS = {
    water = {0.102, 0.227, 0.361},
    sand  = {0.761, 0.651, 0.353},
    grass = {0.176, 0.478, 0.176},
}

-- Simple deterministic hash
local function hashY(y)
    -- Simple hash that works with LuaJIT (no Lua 5.3 operators)
    local h = math.abs(math.floor(y * 127.1 + 311.7))
    h = h % 100000
    return (math.sin(h) * 43758.5453) % 1
end
Levels.hashY = hashY

-- Level configs
Levels.configs = {
    {
        name = "Ocean Voyage",
        subtitle = "Navigate the treacherous waters!",
        targetDistance = 2000,
        terrainFn = function(worldY)
            local shoreStart = 1650
            if worldY < shoreStart then return "water" end
            local wave = math.sin(worldY * 0.03) * 40
                + math.sin(worldY * 0.071 + 2.0) * 25
                + math.sin(worldY * 0.15 + 5.0) * 12
            local shoreEdge = shoreStart + 80 + wave
            if worldY < shoreEdge then return "water" end
            return "sand"
        end,
        enemyWeights = {0.55, 0.45, 0},
        bgColor = {0.039, 0.102, 0.227},
        spawnInterval = {140, 220},
        enemyHpScale = 0.8,
        shootTimerRange = {160, 240},
        projectileSpeed = 2.0,
    },
    {
        name = "Beach Landing",
        subtitle = "Storm the sandy shores!",
        targetDistance = 2500,
        terrainFn = function(worldY)
            if worldY < 600 then return "water" end
            local shoreWave = math.sin(worldY * 0.025) * 45
                + math.sin(worldY * 0.063 + 1.7) * 30
                + math.sin(worldY * 0.14 + 4.2) * 15
            local shoreEdge = 700 + shoreWave
            if worldY < shoreEdge then return "water" end
            if worldY < 1800 then return "sand" end
            local grassWave = math.sin(worldY * 0.028) * 40
                + math.sin(worldY * 0.072 + 3.1) * 28
                + math.sin(worldY * 0.16 + 1.5) * 12
            local grassEdge = 1900 + grassWave
            if worldY < grassEdge then return "sand" end
            return "grass"
        end,
        enemyWeights = {0.35, 0.30, 0.35},
        bgColor = {0.102, 0.102, 0.039},
        spawnInterval = {110, 170},
        enemyHpScale = 1.0,
        shootTimerRange = {120, 180},
        projectileSpeed = 2.5,
    },
    {
        name = "Island Interior",
        subtitle = "Brave the dense jungle!",
        targetDistance = 3000,
        terrainFn = function(worldY)
            if worldY < 200 then return "sand" end
            if worldY < 450 then
                local qd = math.floor(worldY / 8) * 8
                if hashY(qd) > (worldY - 200) / 250 then return "sand" end
                return "grass"
            end
            return "grass"
        end,
        enemyWeights = {0.33, 0.33, 0.34},
        bgColor = {0.039, 0.102, 0.039},
        spawnInterval = {70, 120},
        enemyHpScale = 1.4,
        shootTimerRange = {80, 130},
        projectileSpeed = 3.2,
    },
}

function Levels.getTerrainAt(currentLevel, worldY)
    local cfg = Levels.configs[currentLevel]
    if cfg then return cfg.terrainFn(worldY) end
    return "water"
end

function Levels.getTerrainColor(currentLevel, worldY)
    local t = Levels.getTerrainAt(currentLevel, worldY)
    return Levels.TERRAIN_COLORS[t]
end

-- Dialogue scenes
Levels.dialogues = {
    intro = {
        {speaker = "", text = "In a world where sushi is life, legends speak of the rarest ingredients hidden on a mysterious island far across the sea..."},
        {speaker = "Chef Toro", text = "I've spent my whole career perfecting the craft. But the ULTIMATE sushi? It requires ingredients no chef has ever tasted!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "", text = "The Sushi Brothers -- legendary chefs of unmatched skill -- have finally pinpointed the island's location."},
        {speaker = "Chef Toro", text = "There's just one tiny problem... the ocean is CRAWLING with hostile crabs, angry seagulls, and rival fishermen who want those ingredients for themselves.", speakerColor = {1, 0.42, 0.42}},
        {speaker = "Chef Toro", text = "Ha! As if that would stop me. Knife in hand, rice in heart -- TIME TO SET SAIL!", speakerColor = {1, 0.42, 0.42}},
    },
    afterLevel1 = {
        {speaker = "Chef Toro", text = "Whew! That was one rough ocean crossing... I nearly got seasick AND sliced in half!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "Chef Toro", text = "That giant sea creature was no joke. But nothing stops a chef on a mission!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "", text = "Through the mist, a sandy beach emerges on the horizon..."},
        {speaker = "Chef Toro", text = "I can see the shore! Time to storm the beach and fight our way inland!", speakerColor = {1, 0.42, 0.42}},
    },
    afterLevel2 = {
        {speaker = "Chef Toro", text = "Finally! Solid ground under my feet. Well... sandy ground, but still!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "", text = "The dense jungle of the island interior looms ahead, thick with mystery and danger."},
        {speaker = "Chef Toro", text = "I can practically SMELL the rare ingredients from here. Matsutake mushrooms? New tuna?! My chef senses are TINGLING!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "Chef Toro", text = "Into the jungle we go. The ultimate sushi awaits!", speakerColor = {1, 0.42, 0.42}},
    },
    afterLevel3 = {
        {speaker = "Chef Toro", text = "I... I DID IT! The legendary ingredients are MINE!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "", text = "Chef Toro holds up the shimmering, impossibly fresh ingredients -- they glow with an otherworldly light."},
        {speaker = "Chef Toro", text = "Golden uni from the deep caves... starlight wasabi... dragon-scale nori... It's all here!", speakerColor = {1, 0.42, 0.42}},
        {speaker = "Chef Toro", text = "The ultimate sushi is COMPLETE. The Sushi Brothers' legend will live FOREVER!", speakerColor = {1, 0.42, 0.42}},
    },
}

return Levels
