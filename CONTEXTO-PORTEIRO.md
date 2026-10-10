# CONTEXTO - PORTEIRO

Este arquivo complementa o CONTEXTO-COMUM.md.
Leia o COMUM primeiro, depois este.

=========================================================================
O QUE E O PORTEIRO
=========================================================================

Servidor de autenticacao, autorizacao e multi-tenancy.
E a AUTORIDADE FINAL de seguranca do ecossistema.

Ele faz:
  - Autenticacao (login, refresh, logout)
  - Autorizacao (RBAC via permissions)
  - Multi-tenancy (tenants, isolamento)
  - Sessoes (RTR com deteccao de reuso)
  - CRUD de users, roles, permissions, tenants

Ele NAO faz:
  - Entidades de negocio (products, categories, etc) - isso e
    responsabilidade dos clientes (starter-kit, futuro produto X)

=========================================================================
ESTRUTURA DE PASTAS
=========================================================================

~/projetos/porteiro/
  auth-api/           backend NestJS (auth server)
  admin-panel/        frontend Next.js (admin do auth server)
  observability/      Loki + Grafana + Prometheus
  README.md           visao geral

O starter-kit NAO esta aqui. Ele fica em ~/projetos/starter-kit/.

=========================================================================
PORTAS
=========================================================================

auth-api:      3000
admin-panel:   3001
observability: 3002 (Grafana), 9090 (Prometheus), 3100 (Loki)
Postgres:      5432
Redis:         6379
RedisInsight:  5540

=========================================================================
ESTRUTURA DO BACKEND (auth-api/src/)
=========================================================================

src/
  auth/              Autenticacao
    auth.controller.ts
    auth.service.ts
    decorators/      @RequirePermissions, @CurrentUser
    dto/             login.dto, register.dto
    guards/          JwtAuthGuard, PermissionGuard
    services/
      permissions-resolver.service.ts    (Redis + Postgres)
      permissions-cache.service.ts       (invalidacao)
      sessions.service.ts                (RTR, revokeChain)
  users/             CRUD de usuarios
  roles/             CRUD de papeis
  permissions/       Catalogo de permissions (SO LEITURA)
  user-roles/        Associacao user <-> role
  tenants/           CRUD de tenants
  sessions/          Listagem/revogacao de sessoes (admin)
  products/          Entidade de exemplo (referencia de padrao)
  categories/        Entidade de exemplo (referencia de padrao)
  redis/             Modulo global do Redis
  prisma/            Modulo global do Prisma
  logger/            Configuracao do Pino
  generated/prisma/  Prisma Client (gerado, nao versionar)

=========================================================================
ESTRUTURA DO FRONTEND (admin-panel/)
=========================================================================

app/
  layout.tsx         Providers globais
  (auth)/login/      Tela de login
  (dashboard)/
    layout.tsx       Guard + bootstrap + sidebar
    dashboard/
      page.tsx
      tenants/       Gestao de tenants (cartao)
      roles/         Gestao de papeis
      users/         Gestao de usuarios
      products/      CRUD exemplo
      categories/    CRUD exemplo

components/
  layout/            Sidebar, TopBar, TenantSwitcher
  shared/            Combobox, ConfirmDialog, CanButton, CrudModal
  users/             Componentes de usuarios
  roles/             Componentes de papeis
  sessions/          Modal de sessoes
  products/          Componentes de produtos
  categories/        Componentes de categorias

hooks/               use-users, use-roles, use-role-sessions, ...
lib/
  api.ts             Cliente HTTP (interceptor 401/refresh)
  api/               Servicos por dominio
  permission-context.tsx
  confirm-context.tsx
stores/
  useAuthStore.ts    Zustand global

=========================================================================
MODELO CONCEITUAL
=========================================================================

User -> UserRole -> Role -> RolePermission -> Permission

Permission e a UNIDADE REAL de autorizacao.
A Role agrupa permissions.
O User recebe Roles via UserRole.

NUNCA se decide autorizacao pelo NOME da role. Sempre pela permission.

=========================================================================
LISTA DE PERMISSIONS (21 no seed)
=========================================================================

iam.users.read | create | update | delete
iam.roles.read | create | update | delete
iam.permissions.read
platform.tenants.read | create | update | delete
catalog.categories.read | create | update | delete
catalog.products.read | create | update | delete

=========================================================================
ENDPOINTS PRINCIPAIS
=========================================================================

Auth:
  POST /auth/register
  POST /auth/login
  POST /auth/refresh        (RTR)
  POST /auth/logout
  GET  /auth/me
  GET  /auth/me/permissions

IAM:
  GET|POST|PATCH|DELETE /users
  GET|POST|PATCH|DELETE /roles
  GET|PUT /roles/:id/permissions
  GET /permissions          (somente leitura)
  GET|POST|DELETE /user-roles
  GET|POST|PATCH|DELETE /tenants

Sessoes (por user, admin):
  GET /users/:userId/sessions
  DELETE /users/:userId/sessions/:sessionId
  DELETE /users/:userId/sessions

Negocio (exemplo):
  GET|POST|PUT|DELETE /products
  GET|POST|PATCH|DELETE /categories

=========================================================================
ENDPOINT /auth/login - DETALHE IMPORTANTE
=========================================================================

O login busca o user por email GLOBALMENTE (sem filtrar por tenant).

  const candidates = await prisma.user.findMany({
    where: { email, deleted: false },
  });

  if (candidates.length === 0) 401
  if (candidates.length > 1) 500 (ambiguidade - nunca deveria ocorrer)
  if (candidates.length === 1) -> valida senha -> emite JWT

Regra de negocio: email e unico GLOBALMENTE (nao so por tenant).
Isso e garantido no UsersService (assertEmailGloballyUnique).

=========================================================================
COMO O PORTEIRO E CONSUMIDO POR CLIENTES
=========================================================================

1. Cliente faz POST /auth/login no Porteiro
2. Porteiro valida, emite JWT + refresh (cookies httpOnly)
3. Porteiro resolve permissions e grava em Redis (perms:user:{id})
4. Porteiro devolve { user, permissions } pro cliente
5. Cliente guarda no Zustand (memoria)

Nas requisicoes seguintes:
  - Cliente envia o cookie em todas as chamadas
  - Se for pro proprio Porteiro: JwtAuthGuard valida + PermissionGuard
  - Se for pra um cliente (starter-kit): o cliente valida o JWT
    (mesmo JWT_SECRET) e consulta permissions no Redis do Porteiro
    ou via API

O JWT_SECRET e COMPARTILHADO entre Porteiro e todos os clientes.

=========================================================================
SESSIONS - DETALHES
=========================================================================

Campo revokedReason - valores possiveis:
  logout          -> POST /auth/logout
  rotated         -> refresh normal (RTR)
  reuse_detected  -> token revogado reapareceu (fraude)
  expired         -> expirou
  admin_revoked   -> admin revogou via UI
  user_revoked    -> usuario revogou via UI

Deteccao de anomalia na UI de sessoes:
  warn (amarelo)  -> mesma cadeia com IP diferente em < 15 min
  danger (vermelho) -> mesma cadeia com pais diferente em < 6h

GeoIP resolvido on-read com geoip-lite (nao persistido).

=========================================================================
FLUXO COMPLETO DE LOGIN
=========================================================================

1. POST /auth/login
   -> backend cria access (15min) + refresh (7d) + Session no banco
   -> Set-Cookie: access_token (Path=/), refresh_token (Path=/)
   -> resposta: { user, permissions } (sem tokens no corpo)

2. Frontend
   -> setSession({ user, permissions }) no Zustand
   -> router.push('/dashboard')

3. (dashboard)/layout
   -> se user existe: renderiza
   -> se nao: bootstrapUser() (chama /auth/me + /tenants +
      /auth/me/permissions)

4. Cada request do frontend
   -> credentials: 'include'
   -> browser envia cookie automaticamente

5. Access expira (15 min)
   -> proximo request retorna 401
   -> interceptor chama POST /auth/refresh
   -> backend valida Session, rotaciona, seta cookies novos
   -> interceptor repete request original
   -> usuario nao percebe

6. Refresh expira (7 dias) ou e revogado
   -> POST /auth/refresh retorna 401
   -> interceptor chama useAuthStore.clear() + redirect /login

F5: Zustand esvazia -> (dashboard)/layout.tsx chama bootstrapUser
no mount.

Trocar tenant no dropdown: so muda selectedTenantId no Zustand.
Cada tela que depende de tenant re-renderiza e refaz o fetch.

=========================================================================
SCRIPTS
=========================================================================

~/projetos/porteiro/start-all.sh    (nao existe ainda - criar?)
~/projetos/porteiro/stop-all.sh     (nao existe ainda - criar?)

Hoje o Porteiro sobe manualmente:
  cd auth-api && docker compose up -d && npm run start:dev
  cd admin-panel && npm run dev

O start-all.sh do starter-kit sobe o Porteiro tambem. Mas se voce
quer subir SO o Porteiro, faz manual.

=========================================================================
DEBITOS TECNICOS DO PORTEIRO
=========================================================================

1. Multi-aba com RTR
   Abas concorrentes podem causar queda pra login (reuse detectado).
   Solucao futura: BroadcastChannel coordenando refresh entre abas.

2. confirm() nativo
   Ja foi trocado por <ConfirmDialog> na maioria dos lugares.
   Se sobrar algum, trocar.

3. Tenant sem campos extras
   (color, plan, domain, status, timezone)
   Derivar status de licenseExpiresAt.

4. TTL do refresh vinculado a tenant.licenseExpiresAt
   Hoje fixo em 7 dias.

5. Redis sem senha
   Em producao, adicionar --requirepass e REDIS_PASSWORD.

6. lastUsedAt na Session nunca atualizado
   Deveria ser atualizado em /auth/refresh. Falta 1 linha no rotate().

7. roleName no PermissionsProvider
   Sempre "". Popular se necessario.

8. Login com defaults de dev
   admin@plataforma.com / 123456 pre-preenchidos. Remover em producao.

9. iam.users.password pre-preenchido com 123456
   Revisar antes de producao.

10. rate limiting em auth
    Nao existe. Adicionar @nestjs/throttler + Redis.

11. Testes automatizados
    Zero. Comecar pelo fluxo de auth (Jest + Supertest).

12. 2FA, politica de senha, auditoria de login
    Nao existem.

=========================================================================
PROXIMAS TAREFAS DO PORTEIRO
=========================================================================

1. Tela de Permissions (somente leitura, agrupada em 2 niveis)
2. Fluxo de convite / primeiro-login
3. UI de sessoes do proprio usuario (hoje so admin ve)
4. Logout de todas as sessoes
5. Multi-aba (BroadcastChannel)
6. Revisao de seguranca (rate limit, 2FA, etc)
7. Documentacao de API (Swagger mais completo)
8. Testes automatizados
9. start-all.sh / stop-all.sh proprios do Porteiro
10. Cleanup de sessoes (via @nestjs/schedule)

=========================================================================
COMO O PORTEIRO SE RELACIONA COM O STARTER-KIT
=========================================================================

O starter-kit e um CLIENTE do Porteiro.

  - O starter-kit NAO tem User/Role/Permission/Tenant/Session
  - O starter-kit tem SO Product e Category (negocio)
  - O starter-kit tem as MESMAS copias dos modulos IAM por
    decisao de facilitar o setup (schema completo)
  - Mas o PermissionsResolverService do starter-kit NAO consulta
    o banco local - consulta o Redis do Porteiro + API do Porteiro
  - Os dois compartilham JWT_SECRET e Redis

Para detalhes do starter, ver CONTEXTO-STARTER-KIT.md.