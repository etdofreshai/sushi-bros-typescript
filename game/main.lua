-- Incremental test: requires only
local status = "starting..."

local ok1, err1 = pcall(function() require("audio") end)
local ok2, err2 = pcall(function() require("levels") end)
local ok3, err3 = pcall(function() require("boss") end)

status = "audio:" .. tostring(ok1) .. " levels:" .. tostring(ok2) .. " boss:" .. tostring(ok3)
if not ok1 then status = status .. "\n\naudio err: " .. tostring(err1) end
if not ok2 then status = status .. "\n\nlevels err: " .. tostring(err2) end
if not ok3 then status = status .. "\n\nboss err: " .. tostring(err3) end

-- Now try loading game_main
local ok4, err4 = pcall(function()
    local chunk, loadErr = love.filesystem.load("game_main.lua")
    if not chunk then error("load failed: " .. tostring(loadErr)) end
    chunk()
end)
status = status .. "\n\ngame_main:" .. tostring(ok4)
if not ok4 then status = status .. "\n\ngame_main err: " .. tostring(err4) end

-- Capture whatever game_main set
local _origLoad = love.load
local _origUpdate = love.update
local _origDraw = love.draw

function love.load(...)
    if _origLoad and ok4 then pcall(_origLoad, ...) end
end

function love.update(...)
    if _origUpdate and ok4 then pcall(_origUpdate, ...) end
end

function love.draw()
    if ok4 and _origDraw then
        local dok, derr = pcall(_origDraw)
        if not dok then
            love.graphics.setColor(1, 0.3, 0.3)
            love.graphics.printf("DRAW ERROR: " .. tostring(derr), 10, 10, 780)
        end
    else
        love.graphics.setColor(1, 1, 1)
        love.graphics.printf(status, 10, 30, 780)
    end
end
