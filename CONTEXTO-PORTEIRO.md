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
  - Convite + reset de senha (VerificationToken + Mail)
  - Rate limiting em endpoints de auth

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
  CONTEXTO-COMUM.md   (copia)
  CONTEXTO-PORTEIRO.md (este arquivo)
  CONTEXTO-STARTER-KIT.md (copia)
  DESIGN-SYSTEM.md    (copia)
  start-all.sh        sobe so o Porteiro
  stop-all.sh         derruba so o Porteiro

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
    dto/             login, register, forgot-password, set-password,
                     change-password
    guards/          JwtAuthGuard, PermissionGuard
    services/
      permissions-resolver.service.ts    (Redis + Postgres)
      permissions-cache.service.ts       (invalidacao)
      sessions.service.ts                (RTR, revokeChain)
      verification-token.service.ts      (convite + reset)
  users/             CRUD de usuarios + endpoint /invite
  roles/             CRUD de papeis
  permissions/       Catalogo de permissions (SO LEITURA)
  user-roles/        Associacao user <-> role
  tenants/           CRUD de tenants
  sessions/          Listagem/revogacao de sessoes (admin)
  products/          Entidade de exemplo (referencia de padrao)
  categories/        Entidade de exemplo (referencia de padrao)
  mail/              MailModule + MailService (@Global)
  common/throttler/  Guards + storage customizado de rate limit
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

hooks/               use-users, use-roles, use-user-sessions, ...
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
  POST /auth/forgot-password
  POST /auth/set-password
  POST /auth/change-password

IAM:
  GET|POST|PATCH|DELETE /users
  POST /users/:id/invite
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
FLUXO DE CONVITE (VerificationToken)
=========================================================================

1. Admin cria user no admin-panel com senha temporaria (123456)
2. Admin clica em "Convidar" no user-list-item
3. POST /users/:id/invite gera token 'invite' + envia email
4. Email tem link: {tenant.starterKitUrl}/set-password?token=xxx
   (fallback: STARTER_KIT_URL do .env)
5. User clica, define senha em POST /auth/set-password
6. Backend valida token, atualiza senha, consome token,
   revoga TODAS as sessoes do user

Reset de senha (esqueci):
  - Mesmo mecanismo, type='reset'
  - POST /auth/forgot-password gera token
  - Email com mesmo link /set-password?token=xxx

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
  admin_revoked   -> admin revogou via UI, OU troca de senha
  user_revoked    -> usuario revogou via UI

Deteccao de anomalia na UI de sessoes:
  warn (amarelo)  -> mesma cadeia com IP diferente em < 15 min
  danger (vermelho) -> mesma cadeia com pais diferente em < 6h

GeoIP resolvido on-read com geoip-lite (nao persistido).

=========================================================================
RATE LIMITING - DETALHES
=========================================================================

Storage customizado em src/common/throttler/throttler-redis.storage.ts
Implementa ThrottlerStorage usando o RedisService existente.
Chave: throttle:{throttlerName}:{tracker}

O ThrottlerGuard GLOBAL foi removido (APP_GUARD). Cada endpoint
declara seu proprio @UseGuards(ThrottlerGuard) ou um dos customizados.

Guards customizados em src/common/throttler/:
  - login-throttler.guard.ts   -> chave = IP + email
  - email-throttler.guard.ts   -> chave = email (fallback IP)
  - user-throttler.guard.ts    -> chave = user.id (fallback IP)

Limites atuais no auth.controller.ts:
  POST /auth/login            -> 5 / 1 min   (IP + email)
  POST /auth/register         -> 3 / 1 hora  (IP)
  POST /auth/refresh          -> 30 / 1 min  (IP)
  POST /auth/forgot-password  -> 5 / 15 min  (email)
  POST /auth/set-password     -> 10 / 15 min (IP)
  POST /auth/change-password  -> 5 / 15 min  (user)

Como aplicar em outros controllers:
  1. Importar UserThrottlerGuard (ou ThrottlerGuard padrao)
  2. @UseGuards(JwtAuthGuard, UserThrottlerGuard) no topo do controller
  3. @Throttle({ default: { limit: X, ttl: Y } }) onde quiser
     limite diferente do global

Sugestao de limites por controller:
  products     -> global (100/min) + POST 30/min
  categories   -> global (100/min) + POST 30/min
  users        -> global + POST 10/min + POST /:id/invite 5/min
  tenants      -> global + POST 10/min
  roles        -> global
  permissions  -> global
  user-roles   -> global
  sessions     -> global

Conceitos importantes:
  - limit = numero de requisicoes
  - ttl = janela em milissegundos (60_000 = 1 min, 900_000 = 15 min)
  - A 11a request (limit=10) e bloqueada com 429
  - O contador e por tracker (IP, user, email) - nao global
  - Cada tracker tem seu proprio balde

=========================================================================
SCRIPTS
=========================================================================

~/projetos/porteiro/start-all.sh    sobe o Porteiro (auth-api + admin-panel)
~/projetos/porteiro/stop-all.sh     derruba o Porteiro

O start-all.sh do starter-kit sobe o Porteiro TAMBEM (para o cliente
funcionar). Mas se voce quer subir SO o Porteiro, usa o daqui.

Ambos os scripts tem verificacao: se algum servico nao subir,
o script ABORTA com exit 1 e diz qual falhou.

=========================================================================
LOG DE EMAILS EM DEV
=========================================================================

O MailService (driver console) grava os emails em:
  ~/projetos/porteiro/auth-api/logs/mail.log

Esse arquivo NAO quebra linhas longas (diferente do tmux).
Sempre ler o link com:
  tail -30 ~/projetos/porteiro/auth-api/logs/mail.log | grep -o "http://localhost:4001/set-password?token=[a-f0-9]*" | tail -1

O arquivo esta no .gitignore.

=========================================================================
DEBITOS TECNICOS DO PORTEIRO
=========================================================================

1. Rate limit nos outros controllers
   Auth esta protegido. Products, categories, users, tenants, roles,
   permissions, user-roles, sessions NAO tem rate limit.
   Solucao: aplicar @UseGuards(ThrottlerGuard) no topo de cada
   controller (ver secao RATE LIMITING).

2. Multi-aba com RTR
   Abas concorrentes podem causar queda pra login (reuse detectado).
   Solucao futura: BroadcastChannel coordenando refresh entre abas.

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
   admin@plataforma.com / 123456 pre-preenchidos no admin-panel.
   Remover em producao.

9. iam.users.password pre-preenchido com 123456
   Revisar antes de producao.

10. 2FA, politica de senha, auditoria de login
    Nao existem.

11. Testes automatizados
    Zero. Comecar pelo fluxo de auth (Jest + Supertest).

12. OAuth (Google/GitHub)
    Tabela Account existe no schema (resquicio do NextAuth) mas
    nao e usada. Feature futura.

13. Menu de configuracoes
    Onde vao morar: retencao de sessoes, timezone, rate limit
    configuravel, etc.

14. Cleanup de sessoes
    Job para apagar sessoes revogadas antigas. Adiado.

15. start-all.sh precisa de polling melhor
    As vezes o tmux nao sobe tudo. O script ja foi ajustado pra
    abortar se falhar, mas a logica de verificacao pode ser melhorada.

=========================================================================
PROXIMAS TAREFAS DO PORTEIRO
=========================================================================

1. Aplicar rate limit nos outros controllers
2. Tela de Permissions (somente leitura, agrupada em 2 niveis)
3. Fluxo de OAuth (Google/GitHub) - usa tabela Account
4. UI de sessoes do proprio usuario (hoje so admin ve)
5. Logout de todas as sessoes pelo proprio usuario
6. Multi-aba (BroadcastChannel)
7. Revisao de seguranca (2FA, auditoria de login)
8. Documentacao de API (Swagger mais completo)
9. Testes automatizados
10. Menu de configuracoes
11. Cleanup de sessoes (via @nestjs/schedule)

=========================================================================
COMO O PORTEIRO SE RELACIONA COM O STARTER-KIT
=========================================================================

O starter-kit e um CLIENTE do Porteiro.

  - O starter-kit NAO tem User/Role/Permission/Tenant/Session no
    sentido de "serem a fonte de verdade". Eles vivem no Porteiro.
  - O starter-kit tem copia dos modulos IAM no schema (por decisao
    de facilitar o setup), mas o PermissionsResolverService do
    starter-kit NAO consulta o banco local - consulta o Redis do
    Porteiro + API do Porteiro.
  - Os dois compartilham JWT_SECRET e Redis.

Para detalhes do starter, ver CONTEXTO-STARTER-KIT.md.