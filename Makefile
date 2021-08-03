  
URL := http://localhost:1313
OPEN_CMD := $(shell command -v open || command -v xdg-open || echo : 2>/dev/null)
HUGO_VERSION := v0.85.0+extended

hugo:
	@echo Downloading hugo wrapper 
	@curl -L -o hugo https://github.com/khos2ow/hugo-wrapper/releases/download/v1.4.0/hugow
	@@chmod +x hugo
	@./hugo --get-version $(HUGO_VERSION)

server: hugo
	(sleep 2; $(OPEN_CMD) $(URL)) &
	./hugo server

static: hugo
	./hugo -D -d output

publish: static
	./deploy.sh

.DEFAULT_GOAL := static 

.PHONY: static server
