#!/bin/bash
set -u

WITH_OBS=false
if [ "${1:-}" = "--with-observability" ]; then
  WITH_OBS=true
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}>>>${NC} $1"; }
warn() { echo -e "${YELLOW}>>>${NC} $1"; }
err() { echo -e "${RED}>>>${NC} $1"; }

# ============================================================
# 0. Derruba tudo do Porteiro
# ============================================================
log "Derrubando tudo que estiver rodando do Porteiro..."

for sess in porteiro-api porteiro-panel; do
  tmux kill-session -t "$sess" 2>/dev/null || true
done

cd ~/projetos/porteiro/auth-api && docker compose down 2>/dev/null || true

if [ -d ~/projetos/porteiro/observability ]; then
  cd ~/projetos/porteiro/observability && docker compose down 2>/dev/null || true
fi

sleep 2

# ============================================================
# 1. Sobe containers Docker
# ============================================================
log "Subindo containers do Porteiro..."
cd ~/projetos/porteiro/auth-api && docker compose up -d

if [ "$WITH_OBS" = true ]; then
  log "Subindo observability..."
  cd ~/projetos/porteiro/observability && docker compose up -d
fi

# ============================================================
# 2. Aguarda Postgres aceitar conexao
# ============================================================
log "Aguardando Postgres aceitar conexoes..."

wait_postgres_ready() {
  local container=$1
  local user=$2
  local db=$3
  local max_attempts=30
  local attempt=0
  while [ $attempt -lt $max_attempts ]; do
    if docker exec "$container" pg_isready -U "$user" -d "$db" >/dev/null 2>&1; then
      echo "  $container: ready"
      return 0
    fi
    attempt=$((attempt+1))
    sleep 1
  done
  err "$container nao ficou pronto em ${max_attempts}s"
  return 1
}

if ! wait_postgres_ready "porteiro-postgres" "porteiro" "porteiro"; then
  err "Postgres do Porteiro nao subiu. Abortando."
  exit 1
fi

# ============================================================
# 3. Aguarda Redis responder
# ============================================================
log "Aguardando Redis responder..."

wait_redis_ready() {
  local container=$1
  local max_attempts=30
  local attempt=0
  while [ $attempt -lt $max_attempts ]; do
    if docker exec "$container" redis-cli ping >/dev/null 2>&1; then
      echo "  $container: ready"
      return 0
    fi
    attempt=$((attempt+1))
    sleep 1
  done
  err "$container nao ficou pronto em ${max_attempts}s"
  return 1
}

if ! wait_redis_ready "porteiro-redis"; then
  err "Redis do Porteiro nao subiu. Abortando."
  exit 1
fi

# ============================================================
# 4. Abre os 2 processos Node no tmux
# ============================================================
log "Abrindo Porteiro auth-api (porta 3000)..."
tmux kill-session -t porteiro-api 2>/dev/null || true
tmux new-session -d -s porteiro-api "cd ~/projetos/porteiro/auth-api && npm run start:dev; exec bash"

log "Abrindo Porteiro admin-panel (porta 3001)..."
tmux kill-session -t porteiro-panel 2>/dev/null || true
tmux new-session -d -s porteiro-panel "cd ~/projetos/porteiro/admin-panel && npm run dev; exec bash"

# ============================================================
# 5. Aguarda os servicos responderem HTTP
# ============================================================
log "Aguardando os servicos responderem (ate 120s cada)..."

wait_http() {
  local url=$1
  local label=$2
  local max_attempts=60
  local attempt=0
  local code="000"
  while [ $attempt -lt $max_attempts ]; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$url" 2>/dev/null || true)
    if [ -z "$code" ]; then
      code="000"
    fi
    if [ "$code" != "000" ]; then
      echo "  $label: HTTP $code"
      return 0
    fi
    attempt=$((attempt+1))
    sleep 2
  done
  err "$label NAO respondeu em $((max_attempts * 2))s (ultimo codigo: $code)"
  return 1
}

if ! wait_http "http://localhost:3000" "Porteiro API"; then
  err "Porteiro API falhou. Abortando."
  exit 1
fi

if ! wait_http "http://localhost:3001" "Porteiro Panel"; then
  err "Porteiro Panel falhou. Abortando."
  exit 1
fi

# ============================================================
# 6. Resumo
# ============================================================
echo ""
echo "=========================================="
echo -e "${GREEN}  PORTEIRO PRONTO${NC}"
echo "=========================================="
echo ""
echo "  Aplicacoes:"
echo "    Porteiro admin:   http://localhost:3001"
echo ""
echo "  APIs:"
echo "    Porteiro auth:    http://localhost:3000"
echo "    Porteiro Swagger: http://localhost:3000/api"
echo ""
if [ "$WITH_OBS" = true ]; then
  echo "  Observabilidade:"
  echo "    Grafana:          http://localhost:3002"
  echo "    Prometheus:       http://localhost:9090"
  echo ""
fi
echo "  Credenciais:"
echo "    admin@plataforma.com / 123456"
echo ""
echo "  Ver logs de um servico:"
echo "    tmux attach -t porteiro-api"
echo "    tmux attach -t porteiro-panel"
echo ""
echo "  Sair do log sem matar (dentro do tmux):"
echo "    Ctrl+B  depois  D"
echo ""
echo "  Para derrubar tudo:"
echo "    ./stop-all.sh"
echo "=========================================="