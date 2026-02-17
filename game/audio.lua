-- audio.lua - Procedural audio using love.audio SoundData
local Audio = {}

local sampleRate = 44100
local musicMuted = false
local musicSource = nil
local currentMusicLevel = -1

-- Helper: create a SoundData from a generator function
local function makeSound(duration, generator)
    local samples = math.floor(sampleRate * duration)
    local sd = love.sound.newSoundData(samples, sampleRate, 16, 1)
    for i = 0, samples - 1 do
        local t = i / sampleRate
        local v = generator(t, duration)
        sd:setSample(i, math.max(-1, math.min(1, v)))
    end
    return love.audio.newSource(sd, "static")
end

-- Simple oscillators
local function sine(freq, t) return math.sin(2 * math.pi * freq * t) end
local function square(freq, t) return sine(freq, t) > 0 and 1 or -1 end
local function sawtooth(freq, t) return 2 * ((freq * t) % 1) - 1 end
local function triangle(freq, t)
    local p = (freq * t) % 1
    return 4 * math.abs(p - 0.5) - 1
end
local function noise() return math.random() * 2 - 1 end

-- Lerp helper
local function lerp(a, b, t) return a + (b - a) * t end

-- Exponential ramp (simulating Web Audio exponentialRampToValueAtTime)
local function expRamp(startVal, endVal, t, duration)
    if t >= duration then return endVal end
    if startVal <= 0 then return endVal end
    local ratio = t / duration
    return startVal * (endVal / startVal) ^ ratio
end

function Audio.sfxSushiThrow()
    local src = makeSound(0.12, function(t, dur)
        local freq = expRamp(600, 300, t, dur)
        local gain = expRamp(0.1, 0.001, t, dur)
        return sine(freq, t) * gain
    end)
    src:play()
end

function Audio.sfxPoleSwing()
    local src = makeSound(0.25, function(t, dur)
        local freq = expRamp(150, 80, t, dur)
        local gain = expRamp(0.08, 0.001, t, dur)
        return sawtooth(freq, t) * gain
    end)
    src:play()
end

function Audio.sfxHit()
    local src = makeSound(0.3, function(t, dur)
        local gain = expRamp(0.15, 0.001, t, dur)
        return noise() * gain * (1 - t / dur)
    end)
    src:play()
end

function Audio.sfxPlayerHit()
    local src = makeSound(0.5, function(t, dur)
        local freq = expRamp(200, 50, t, dur)
        local gain = expRamp(0.12, 0.001, t, dur)
        return square(freq, t) * gain
    end)
    src:play()
end

function Audio.sfxSplash()
    local src = makeSound(0.4, function(t, dur)
        local gain = expRamp(0.06, 0.001, t, dur)
        return noise() * gain * (1 - t / dur)
    end)
    src:play()
end

function Audio.sfxBossWarning()
    local src = makeSound(0.75, function(t)
        local v = 0
        for i = 0, 2 do
            local start = i * 0.25
            local localT = t - start
            if localT >= 0 and localT < 0.22 then
                local freq = expRamp(200, 600, localT, 0.2)
                local gain = expRamp(0.1, 0.001, localT, 0.22)
                v = v + sawtooth(freq, localT) * gain
            end
        end
        return v
    end)
    src:play()
end

function Audio.sfxBossDefeat()
    local src = makeSound(1.2, function(t)
        local v = 0
        -- Explosion noise
        if t < 0.8 then
            local gain = expRamp(0.2, 0.001, t, 0.8)
            v = v + noise() * gain * (1 - t / 0.8)
        end
        -- Victory chime
        local notes = {523, 659, 784, 1047}
        for i, freq in ipairs(notes) do
            local ns = 0.3 + (i - 1) * 0.15
            local localT = t - ns
            if localT >= 0 and localT < 0.4 then
                local gain = expRamp(0.08, 0.001, localT, 0.4)
                v = v + sine(freq, localT) * gain
            end
        end
        return v
    end)
    src:play()
end

function Audio.sfxPowerUp()
    local src = makeSound(0.15, function(t, dur)
        local freq = expRamp(800, 1200, t, dur)
        local gain = expRamp(0.08, 0.001, t, dur)
        return sine(freq, t) * gain
    end)
    src:play()
end

function Audio.playVictoryJingle()
    if musicMuted then return end
    local notes = {523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51}
    local src = makeSound(#notes * 0.12 + 0.3, function(t)
        local v = 0
        for i, freq in ipairs(notes) do
            local ns = (i - 1) * 0.12
            local localT = t - ns
            if localT >= 0 and localT < 0.3 then
                local gain = expRamp(0.1, 0.001, localT, 0.3)
                v = v + sine(freq, localT) * gain
            end
        end
        return v
    end)
    src:play()
end

-- Background music using looping generated sound
function Audio.startMusic(level)
    Audio.stopMusic()
    currentMusicLevel = level
    if musicMuted then return end

    -- Generate a ~4 second loop
    local loopDur = 4.0
    local src = makeSound(loopDur, function(t)
        local v = 0
        if level == 0 then
            -- Calm oceanic
            local freqs = {130.81, 164.81, 196.00}
            for i, f in ipairs(freqs) do
                local lfoFreq = 0.3 + (i - 1) * 0.1
                local lfo = 1 + 0.15 * sine(lfoFreq, t)
                v = v + sine(f, t) * 0.3 * lfo
            end
        elseif level == 1 then
            -- Upbeat beachy
            local freqs = {261.63, 329.63, 392.00, 329.63}
            for i, f in ipairs(freqs) do
                local lfoFreq = 2 + (i - 1) * 0.5
                local lfo = 1 + 0.4 * sine(lfoFreq, t)
                v = v + triangle(f, t) * 0.25 * lfo
            end
        elseif level == 2 then
            -- Intense jungle
            local freqs = {220.00, 261.63, 329.63}
            for i, f in ipairs(freqs) do
                local lfoFreq = 3 + (i - 1)
                local lfo = 1 + 0.35 * sine(lfoFreq, t)
                v = v + sawtooth(f, t) * 0.15 * lfo
            end
        else
            -- Boss
            local lfo = 1 + 0.4 * sine(4, t)
            v = v + sawtooth(65.41, t) * 0.5 * lfo
            v = v + square(155.56, t) * 0.2
        end
        return v * 0.04
    end)
    src:setLooping(true)
    src:play()
    musicSource = src
end

function Audio.stopMusic()
    if musicSource then
        musicSource:stop()
        musicSource = nil
    end
    currentMusicLevel = -1
end

function Audio.toggleMute()
    musicMuted = not musicMuted
    if musicMuted then
        Audio.stopMusic()
    end
end

function Audio.isMuted()
    return musicMuted
end

function Audio.getCurrentMusicLevel()
    return currentMusicLevel
end

return Audio
