# auth-api

Backend do Porteiro - o servidor de autenticacao, autorizacao e multi-tenancy.

## Stack

- NestJS 12
- TypeScript
- Prisma 7 (com @prisma/adapter-pg)
- Postgres 17
- Redis 7
- JWT (access token 15 min + refresh token opaco 7 dias, com rotacao)
- bcrypt
- Swagger
- Pino + Loki

## Como rodar

### 1. Instalar dependencias

npm install

### 2. Variaveis de ambiente

cp .env.example .env

Ajuste o .env se necessario. Os valores padrao funcionam com o docker-compose.yml.

### 3. Subir os containers

docker compose up -d

Sobe:
- porteiro-postgres (banco de dados)
- porteiro-redis (cache)
- porteiro-redis-insight (UI, porta 5540)

### 4. Preparar o banco

Sequencia importante:

npx prisma generate
npx prisma migrate deploy
npx prisma db seed

Por que generate antes de migrate:
O Prisma Client e gerado em src/generated/prisma e e o que o TypeScript usa
pra falar com o banco. Se voce mudou o schema.prisma, precisa rodar
generate pra refletir as mudancas.

migrate dev vs migrate deploy:
- migrate dev - desenvolvimento, cria migration nova se o schema mudou
- migrate deploy - aplica migrations existentes (usado em CI/producao)

### 5. Rodar o backend

npm run start:dev

- API: http://localhost:3000
- Swagger: http://localhost:3000/api

## Estrutura de pastas

src/
  auth/              Autenticacao (login, refresh, logout, guards)
    guards/          JwtAuthGuard, PermissionGuard
    decorators/      @RequirePermissions
    services/        PermissionsResolver, PermissionsCache, Sessions
    dto/
  users/             CRUD de usuarios
  roles/             CRUD de papeis
  permissions/       Catalogo de permissoes (so leitura)
  user-roles/        Associacao user-role
  tenants/           CRUD de tenants (multi-tenancy)
  sessions/          Listagem e revogacao de sessoes
  products/          Exemplo de entidade de negocio
  categories/        Exemplo de entidade de negocio
  redis/             Modulo global do Redis
  prisma/            Modulo global do Prisma
  logger/            Configuracao do Pino
  generated/prisma/  Prisma Client (gerado, nao versionar)

## Modelo de autorizacao

Fluxo: User -> UserRole -> Role -> RolePermission -> Permission

- Permission e a unidade real de autorizacao (ex: catalog.products.read)
- Role agrupa permissions
- User recebe roles via UserRole
- Nunca se decide autorizacao pelo nome da role - sempre pela permission

### Formato das permissions

dominio.recurso.acao

Exemplos:
- iam.users.read
- catalog.products.create
- platform.tenants.delete

## Multi-tenancy

- Um usuario normal pertence a exatamente um tenant (tenantId no JWT)
- Um usuario de plataforma tem tenantId = null (admin global)
- Toda entidade de negocio (Product, Category, ...) tem tenantId

Regra geral (modulos de negocio): o tenant vem do JWT.
Regra especial (IAM): o tenant pode vir do query/DTO, quando o ator e plataforma.

## Como criar um modulo novo

Copie o padrao de products/ (ou categories/):

1. Schema (prisma/schema.prisma): adicione o model

   model Fornecedor {
     id       Int      @id @default(autoincrement())
     tenantId String
     name     String
     dateAt   DateTime @default(now())
     userId   String
     deleted  Boolean  @default(false)
   }

2. Migration: npx prisma migrate dev --name add-fornecedor
3. Permission: adicione no prisma/seed.ts (catalog.fornecedores.*) e rode o seed
4. Modulo: copie src/products/products.module.ts
5. Service: copie products.service.ts, ajuste os campos
6. Controller: copie products.controller.ts, ajuste as permissions
7. DTOs: copie products/dto/, ajuste os campos
8. Registre no app.module.ts

Sempre use:
- JwtAuthGuard + PermissionGuard no controller
- @RequirePermissions('dominio.recurso.acao') em cada rota
- actor.tenantId no service (nao confie no que o frontend manda)
- Auditoria: userId, dateAt, deleted

## Endpoints principais

Auth:
- POST /auth/login
- POST /auth/register
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me
- GET /auth/me/permissions

IAM:
- GET|POST|PATCH|DELETE /users
- GET|POST|PATCH|DELETE /roles
- GET|PUT /roles/:id/permissions
- GET /permissions
- GET|POST|DELETE /user-roles
- GET|POST|PATCH|DELETE /tenants

Sessoes:
- GET /users/:id/sessions
- DELETE /users/:id/sessions/:sessionId
- DELETE /users/:id/sessions

Negocio (exemplo):
- GET|POST|PUT|DELETE /products
- GET|POST|PATCH|DELETE /categories

## Comandos uteis

npm run start:dev          # dev com watch
npm run build              # build de producao
npm run start:prod         # rodar build
npm run lint               # lint
npm run test               # testes

npx prisma studio          # UI do banco
npx prisma migrate dev     # nova migration (dev)
npx prisma migrate deploy  # aplicar migrations (prod)
npx prisma db seed         # popular banco
npx prisma generate        # regenerar client

## Variaveis de ambiente

| Variavel | Descricao | Padrao |
|---|---|---|
| DATABASE_URL | URL do Postgres | postgresql://porteiro:porteiro123@localhost:5432/porteiro |
| JWT_SECRET | Segredo do JWT (compartilhado com clientes) | - |
| JWT_EXPIRES_IN | TTL do access token | 15m |
| REDIS_HOST | Host do Redis | localhost |
| REDIS_PORT | Porta do Redis | 6379 |

## Seguranca

- Permissions no JWT? Nao. O JWT carrega so sub e tenantId.
- Nome de role decide algo? Nao. So permission decide.
- Senhas: bcrypt (cost 12).
- Refresh token: opaco, 256 bits, armazenado como SHA-256 no banco.
- Rotacao (RTR): cada refresh revoga a sessao antiga e cria uma nova.
- Deteccao de reuso: se um refresh ja rotacionado reaparece, toda a cadeia e revogada.
