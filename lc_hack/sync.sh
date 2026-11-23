#!/bin/sh
# Copies lc_hack's browser test mode into this page, so the demo runs the real code.
# Run after changing lc_hack:  sh lc_hack/sync.sh [path to lc_hack]
set -e
src=${1:-../lc_hack}
dst=$(dirname "$0")/app
rm -rf "$dst"
mkdir -p "$dst/server" "$dst/scenarios"
cp -R "$src/web" "$src/websites" "$src/config.lua" "$dst/"
cp "$src/server/commands.lua" "$dst/server/"
cp "$(dirname "$0")"/scenarios/*.lua "$dst/scenarios/"
echo "synced $src -> $dst"
