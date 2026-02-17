-- Test: can we even PARSE game_main.lua?
local status = "testing..."

-- Step 1: just load (compile) without executing
local ok1, err1 = pcall(function()
    local chunk, lerr = love.filesystem.load("game_main.lua")
    if not chunk then error("load: " .. tostring(lerr)) end
end)
status = "compile game_main: " .. tostring(ok1)
if not ok1 then status = status .. "\nERR: " .. tostring(err1) end

-- Step 2: if compile works, try executing just the first few lines
if ok1 then
    local ok2, err2 = pcall(function()
        -- Load and execute
        local chunk = love.filesystem.load("game_main.lua")
        chunk()
    end)
    status = status .. "\nexec game_main: " .. tostring(ok2)
    if not ok2 then status = status .. "\nERR: " .. tostring(err2) end
end

function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.printf(status, 10, 30, 780)
end
