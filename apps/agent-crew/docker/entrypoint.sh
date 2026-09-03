#!/bin/sh
set -eu
mkdir -p /state/conversations /tmp/codex
chown -R agent:agent /state /tmp/codex
exec runuser -u agent -- node /app/dist/server.js
