.PHONY: love web clean run

GAME_DIR = game
LOVE_FILE = sushi-bros.love
WEB_DIR = web

# Package as .love file
love:
	cd $(GAME_DIR) && zip -r ../$(LOVE_FILE) . -x ".*"

# Run locally with Love2D
run:
	love $(GAME_DIR)

# Build for web using love.js
# Requires: npx love.js (npm install -g love.js)
web: love
	npx love.js $(LOVE_FILE) $(WEB_DIR) -t "Sushi Bros" -c
	@echo "Web build ready in $(WEB_DIR)/"
	@echo "Serve with: npx serve $(WEB_DIR)"

clean:
	rm -f $(LOVE_FILE)
	rm -rf $(WEB_DIR)
