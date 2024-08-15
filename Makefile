URL := http://localhost:1313
OPEN_CMD := $(shell command -v open || command -v xdg-open || echo : 2>/dev/null)

ensurehugo:
	@which hugo > /dev/null || (echo "Hugo not found. Please install it from https://gohugo.io/getting-started/installing/"; exit 1)

server: ensurehugo
	(sleep 2; $(OPEN_CMD) $(URL)) &
	hugo server

static: ensurehugo
	hugo -D -d output

publish: static
	./deploy.sh

.DEFAULT_GOAL := static

.PHONY: static server
