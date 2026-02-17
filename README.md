# Sushi Bros 🍣🎣

A top-down fishing/sushi-throwing adventure game built with **Love2D** (Lua), deployable to the web via **love.js**.

## Game Features
- **3 Levels**: Ocean Voyage → Beach Landing → Island Interior
- **Boss Fights**: Giant Octopus, Crab King, Master Fisherman
- **Weapons**: Fishing pole (melee) on water, sushi throwing on land
- **Power-ups**: Speed, Triple Shot, Shield, Extra Life
- **Dialogue/cutscene system** between levels
- **Procedural audio** — all sound effects generated programmatically
- **Touch controls** with virtual joysticks for mobile/web
- **Score multiplier**, high scores, particles, screen shake

## Running Locally

### Prerequisites
- [Love2D](https://love2d.org/) 11.4+

### Run
```bash
love game/
# or
make run
```

## Web Deployment (love.js)

### Prerequisites
- Node.js 16+
- `npm install -g love.js` (or use npx)

### Build
```bash
make web
```

This creates a `web/` directory with the HTML5 build. Serve it:
```bash
npx serve web/
```

### Manual Steps
```bash
# 1. Package as .love
cd game && zip -r ../sushi-bros.love . && cd ..

# 2. Convert to web
npx love.js sushi-bros.love web/ -t "Sushi Bros" -c

# 3. Serve
npx serve web/
```

## Project Structure
```
game/           # Love2D game source
  main.lua      # Main game loop, input, drawing
  audio.lua     # Procedural audio (SFX + music)
  boss.lua      # Boss creation, AI, rendering
  levels.lua    # Level configs, terrain, dialogues
  conf.lua      # Love2D configuration
src/            # Original TypeScript version (reference)
Makefile        # Build commands
```

## Controls
- **WASD / Arrow Keys** — Move
- **Space** — Context weapon (pole on water, sushi on land)
- **Shift / Z** — Swing fishing pole
- **P / Escape** — Pause
- **Touch** — Virtual joysticks (left = move, right = aim/fire)
