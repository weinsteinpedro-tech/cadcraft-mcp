#!/bin/bash
# Abre CADCraft y opencode (con el MCP) a la vez. Si dice "permiso denegado": bash Abrir-cadcraft.command
cd "$(dirname "$0")" || exit 1
[ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
[ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$PATH"
pausa() { echo; read -n 1 -s -r -p "Presiona una tecla para cerrar..."; echo; }
. scripts/asegurar-node.sh
asegurar_node || { pausa; exit 1; }
node scripts/abrir-app-y-opencode.mjs || pausa
