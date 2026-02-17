-- Test step by step
local results = {}

local ok1, err1 = pcall(function() require("audio") end)
table.insert(results, "audio: " .. tostring(ok1) .. (ok1 and "" or " ERR:" .. tostring(err1)))

local ok2, err2 = pcall(function() require("levels") end)
table.insert(results, "levels: " .. tostring(ok2) .. (ok2 and "" or " ERR:" .. tostring(err2)))

local ok3, err3 = pcall(function() require("boss") end)
table.insert(results, "boss: " .. tostring(ok3) .. (ok3 and "" or " ERR:" .. tostring(err3)))

-- DON'T load game_main yet
local status = table.concat(results, "\n")

function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf(status, 10, 30, 780)
end
