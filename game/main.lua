local ok, err

ok, err = pcall(require, "audio")
if not ok then
    _G._BOOT_ERROR = "audio: " .. tostring(err)
end

if ok then
    ok, err = pcall(require, "levels")
    if not ok then
        _G._BOOT_ERROR = "levels: " .. tostring(err)
    end
end

if ok then
    ok, err = pcall(require, "boss")
    if not ok then
        _G._BOOT_ERROR = "boss: " .. tostring(err)
    end
end

function love.draw()
    love.graphics.setColor(1, 1, 1)
    if _G._BOOT_ERROR then
        love.graphics.print("ERROR: " .. _G._BOOT_ERROR, 10, 10)
    else
        love.graphics.print("All modules loaded OK!", 300, 280)
    end
end
