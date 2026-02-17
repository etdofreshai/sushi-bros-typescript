-- Ultra minimal test
function love.load()
end

function love.draw()
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("HELLO FROM MAIN.LUA", 100, 100)
    love.graphics.print("If you see this, main.lua runs fine!", 100, 130)
end
