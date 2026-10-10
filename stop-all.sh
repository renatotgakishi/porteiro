#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}>>>${NC} $1"; }

log "Matando sessoes tmux do Porteiro..."
for sess in porteiro-api porteiro-panel; do
  tmux kill-session -t "$sess" 2>/dev/null && echo "  $sess morta" || true
done

log "Derrubando containers do Porteiro..."
cd ~/projetos/porteiro/auth-api 2>/dev/null && docker compose down --remove-orphans || true

log "Derrubando observability..."
cd ~/projetos/porteiro/observability 2>/dev/null && docker compose down --remove-orphans || true

echo ""
echo -e "${GREEN}Porteiro derrubado.${NC}"
echo ""
echo "Para ver o que sobrou:"
echo "  docker ps"
echo "  tmux ls"