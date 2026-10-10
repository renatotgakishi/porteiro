# Porteiro

Servidor de autenticacao, autorizacao e multi-tenancy para aplicacoes cliente.

O Porteiro e a fonte de verdade de identidade, permissoes e sessoes. Qualquer
sistema que precise de login (admin panels, ERPs, APIs de negocio) pode consumir
o Porteiro como servico - do mesmo jeito que se usa Keycloak, Auth0 ou Cognito.

## Arquitetura

O Porteiro tem tres modulos:

- auth-api (backend) -> NestJS + Postgres + Redis + JWT
- admin-panel (frontend) -> Next.js, painel administrativo
- observability -> Grafana + Loki + Prometheus

Fluxo:

1. Aplicacoes cliente chamam o auth-api via HTTP.
2. O auth-api valida credenciais e devolve um JWT (cookie httpOnly).
3. O admin-panel usa o auth-api para gerenciar usuarios, papeis e permissoes.
4. O observability monitora o auth-api (logs e metricas).

## Projetos

| Pasta | O que e | Stack |
|---|---|---|
| auth-api/ | O servidor de autenticacao (backend) | NestJS 12, Prisma 7, Postgres 17, Redis 7 |
| admin-panel/ | O painel administrativo | Next.js 16, React 19, TailwindCSS 4, Zustand |
| observability/ | Stack de observabilidade | Grafana, Loki, Prometheus |

## Como subir do zero

### Pre-requisitos

- Node.js 20+
- Docker + Docker Compose
- npm (ou pnpm/yarn)

### Passo 1 - Infraestrutura

cd auth-api
docker compose up -d

Sobe:
- porteiro-postgres (porta 5432)
- porteiro-redis (porta 6379)
- porteiro-redis-insight (porta 5540)

### Passo 2 - Backend (auth-api)

cd auth-api
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

O backend sobe em http://localhost:3000
Swagger: http://localhost:3000/api

### Passo 3 - Frontend (admin-panel)

Em outro terminal:

cd admin-panel
npm install
cp .env.example .env.local
npm run dev

O painel sobe em http://localhost:3001

### Passo 4 - Observabilidade (opcional)

cd observability
docker compose up -d

- Grafana: http://localhost:3002
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100

## Credenciais padrao (seed)

- Email: admin@plataforma.com
- Senha: 123456

Aviso: troque a senha em producao.

## Como o Porteiro e consumido por outras aplicacoes

1. A aplicacao cliente faz POST /auth/login no Porteiro.
2. O Porteiro valida as credenciais e devolve um JWT (cookie httpOnly).
3. A aplicacao cliente usa o JWT em todas as requisicoes.
4. Quando precisar saber as permissoes do usuario, chama GET /auth/me/permissions.
5. O Porteiro resolve as permissoes (via Redis ou Postgres) e devolve.

O segredo do JWT (JWT_SECRET) e compartilhado entre o Porteiro e as
aplicacoes cliente. Assim cada cliente pode validar o token localmente
sem precisar chamar o Porteiro a cada requisicao.

## Documentacao interna

- auth-api/README.md - como rodar e evoluir o backend
- admin-panel/README.md - como rodar e evoluir o painel

## Licenca

Uso interno.
