-- Wrapper to catch and display boot errors
local _error = nil

local ok, err = xpcall(function()
    dofile("game_main.lua")
end, function(e)
    return tostring(e) .. "\n" .. debug.traceback()
end)

if not ok then
    _error = err
end

local _origDraw = love.draw
local _origUpdate = love.update
local _origLoad = love.load

function love.load(...)
    if _error then return end
    if _origLoad then
        local ok2, err2 = pcall(_origLoad, ...)
        if not ok2 then _error = "love.load: " .. tostring(err2) end
    end
end

function love.update(...)
    if _error then return end
    if _origUpdate then
        local ok2, err2 = pcall(_origUpdate, ...)
        if not ok2 then _error = "love.update: " .. tostring(err2) end
    end
end

function love.draw()
    if _error then
        love.graphics.setBackgroundColor(0.1, 0.1, 0.1)
        love.graphics.setColor(1, 0.3, 0.3)
        love.graphics.print("BOOT ERROR:", 10, 10)
        love.graphics.setColor(1, 1, 1)
        -- Word wrap the error
        local y = 40
        for line in _error:gmatch("[^\n]+") do
            love.graphics.print(line, 10, y)
            y = y + 18
            if y > 580 then break end
        end
        return
    end
    if _origDraw then
        local ok2, err2 = pcall(_origDraw)
        if not ok2 then _error = "love.draw: " .. tostring(err2) end
    end
end
