#!/bin/bash
# Cierra opencode y los servidores de este MCP (no cierra CADCraft).
cd "$(dirname "$0")" || exit 1
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
[ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
node scripts/cerrar-mcp.mjs
read -n 1 -s -r -p "Presiona una tecla para cerrar..."; echo
