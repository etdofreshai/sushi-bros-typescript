-- Minimal boot test - phase by phase
local _error = nil
local _phase = "start"

-- Phase 1: Test requires
local Audio, Levels, BossMod
local ok, err = pcall(function()
    _phase = "require audio"
    Audio = require("audio")
    _phase = "require levels"
    Levels = require("levels")
    _phase = "require boss"
    BossMod = require("boss")
    _phase = "requires done"
end)
if not ok then _error = "Phase [" .. _phase .. "]: " .. tostring(err) end

-- Phase 2: Load game_main
if not _error then
    local ok2, err2 = xpcall(function()
        _phase = "load game_main"
        local chunk, loadErr = love.filesystem.load("game_main.lua")
        if not chunk then error(loadErr) end
        _phase = "exec game_main"
        chunk()
        _phase = "game_main done"
    end, function(e)
        return tostring(e) .. "\n" .. debug.traceback()
    end)
    if not ok2 then _error = "Phase [" .. _phase .. "]: " .. tostring(err2) end
end

-- Capture callbacks set by game_main
local _origLoad = love.load
local _origUpdate = love.update
local _origDraw = love.draw
local _origKeypressed = love.keypressed
local _origKeyreleased = love.keyreleased
local _origTouchpressed = love.touchpressed
local _origTouchmoved = love.touchmoved
local _origTouchreleased = love.touchreleased

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
        love.graphics.printf("BOOT ERROR (phase: " .. _phase .. ")", 10, 10, 780)
        love.graphics.setColor(1, 1, 1)
        love.graphics.printf(_error, 10, 40, 780)
        return
    end
    if _origDraw then
        local ok2, err2 = pcall(_origDraw)
        if not ok2 then _error = "love.draw: " .. tostring(err2) end
    end
end

function love.keypressed(...)
    if _error then return end
    if _origKeypressed then pcall(_origKeypressed, ...) end
end
function love.keyreleased(...)
    if _error then return end
    if _origKeyreleased then pcall(_origKeyreleased, ...) end
end
function love.touchpressed(...)
    if _error then return end
    if _origTouchpressed then pcall(_origTouchpressed, ...) end
end
function love.touchmoved(...)
    if _error then return end
    if _origTouchmoved then pcall(_origTouchmoved, ...) end
end
function love.touchreleased(...)
    if _error then return end
    if _origTouchreleased then pcall(_origTouchreleased, ...) end
end
