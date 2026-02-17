-- Main entry point - loads modules then game_main with error handling
local results = {}

local ok1, err1 = pcall(function() require("audio") end)
table.insert(results, "audio: " .. tostring(ok1) .. (ok1 and "" or " ERR: " .. tostring(err1)))

local ok2, err2 = pcall(function() require("levels") end)
table.insert(results, "levels: " .. tostring(ok2) .. (ok2 and "" or " ERR: " .. tostring(err2)))

local ok3, err3 = pcall(function() require("boss") end)
table.insert(results, "boss: " .. tostring(ok3) .. (ok3 and "" or " ERR: " .. tostring(err3)))

local ok4, err4 = pcall(function() require("game_main") end)
table.insert(results, "game_main: " .. tostring(ok4) .. (ok4 and "" or " ERR: " .. tostring(err4)))

-- If game_main loaded, love.load/update/draw are set. Wrap them for safety.
if not ok4 then
    local loadLog = table.concat(results, "\n")
    function love.draw()
        love.graphics.setColor(1, 0, 0)
        love.graphics.printf("LOAD ERROR:\n" .. loadLog, 10, 10, 780)
    end
end
