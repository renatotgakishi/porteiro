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
  - OAuth (Google)
  - Autorizacao (RBAC via permissions)
  - Multi-tenancy (tenants, isolamento)
  - Sessoes (RTR com deteccao de reuso)
  - CRUD de users, roles, permissions, tenants
  - CRUD de themes (catalogo + vinculo a tenant)
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
  SISTEMA-DE-TEMAS.md (copia)
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
Redis:         6379 (COM SENHA)
RedisInsight:  5540

=========================================================================
ESTRUTURA DO BACKEND (auth-api/src/)
=========================================================================

src/
  auth/              Autenticacao
    auth.controller.ts
    auth.service.ts
    cookie-prefix.ts                 (deteccao de prefixo por Origin)
    decorators/                      @RequirePermissions, @CurrentUser
    dto/                             login, register, forgot-password,
                                     set-password, change-password
    guards/                          JwtAuthGuard, PermissionGuard
    oauth/                           OAuth Google
      oauth.controller.ts
      oauth.service.ts
      google.client.ts
      oauth.module.ts
    services/
      permissions-resolver.service.ts    (Redis + Postgres)
      permissions-cache.service.ts       (invalidacao)
      sessions.service.ts                (RTR, revokeChain)
      verification-token.service.ts      (convite + reset)
  users/             CRUD de usuarios + endpoint /invite
  roles/             CRUD de papeis
  permissions/       Catalogo de permissions (SO LEITURA)
  user-roles/        Associacao user <-> role
  tenants/           CRUD de tenants + GET/PATCH /tenants/:id/theme
  sessions/          Listagem/revogacao de sessoes (admin)
  themes/            CRUD de temas (catalogo + vinculo a tenant)
  products/          Entidade de exemplo (referencia de padrao)
  categories/        Entidade de exemplo (referencia de padrao)
  mail/              MailModule + MailService (@Global)
  common/throttler/  Guards + storage customizado de rate limit
  redis/             Modulo global do Redis (COM SENHA)
  prisma/            Modulo global do Prisma
  logger/            Configuracao do Pino
  generated/prisma/  Prisma Client (gerado, nao versionar)

=========================================================================
ESTRUTURA DO FRONTEND (admin-panel/)
=========================================================================

app/
  layout.tsx         Providers globais (ThemeProvider + TenantThemeProvider
                     + PermissionsProvider + ConfirmProvider)
  (auth)/login/      Tela de login
  (dashboard)/
    layout.tsx       Guard + bootstrap + sidebar
    dashboard/
      page.tsx
      tenants/       Gestao de tenants (cartao) + atribuicao de tema
      roles/         Gestao de papeis
      users/         Gestao de usuarios
      themes/        CRUD de temas (catalogo)
      products/      CRUD exemplo
      categories/    CRUD exemplo

components/
  theme/
    TenantThemeProvider.tsx   aplica o tema do tenant ativo
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
  api/               Servicos por dominio (users, roles, tenants, themes)
  permission-context.tsx
  confirm-context.tsx
stores/
  useAuthStore.ts    Zustand global
  useThemeStore.ts   Zustand (temas do catalogo + activeThemeId)

=========================================================================
MODELO CONCEITUAL
=========================================================================

User -> UserRole -> Role -> RolePermission -> Permission

Permission e a UNIDADE REAL de autorizacao.
A Role agrupa permissions.
O User recebe Roles via UserRole.

NUNCA se decide autorizacao pelo NOME da role. Sempre pela permission.

=========================================================================
LISTA DE PERMISSIONS (seed)
=========================================================================

iam.users.read | create | update | delete
iam.roles.read | create | update | delete
iam.permissions.read
platform.tenants.read | create | update | delete
catalog.categories.read | create | update | delete
catalog.products.read | create | update | delete
observabilidade.visaogeral.read

Obs: themes usam as permissions platform.tenants.* (nao tem dominio
proprio). Decisao pra nao criar mais dominios. Se virar necessidade,
criar platform.themes.*.

=========================================================================
ENDPOINTS PRINCIPAIS
=========================================================================

Auth:
  POST /auth/register
  POST /auth/login                 (retorna { user, permissions, accessToken })
  POST /auth/refresh               (RTR)
  POST /auth/logout
  GET  /auth/me                    (retorna theme junto com o user)
  GET  /auth/me/permissions
  POST /auth/forgot-password
  POST /auth/set-password          (marca emailVerified)
  POST /auth/change-password

OAuth Google:
  GET  /auth/oauth/google           (redireciona pro Google)
  GET  /auth/oauth/google/callback  (recebe callback, seta cookies)

IAM:
  GET|POST|PATCH|DELETE /users
  POST /users/:id/invite
  GET|POST|PATCH|DELETE /roles
  GET|PUT /roles/:id/permissions
  GET /permissions          (somente leitura)
  GET|POST|DELETE /user-roles
  GET|POST|PATCH|DELETE /tenants
  GET /tenants/:id/theme            (retorna tema do tenant)
  PATCH /tenants/:id/theme          (seta tema)

Themes:
  GET|POST|PATCH|DELETE /themes     (catalogo global)

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
  if (candidates.length === 1) -> valida senha -> issueSession

Regra: email e unico GLOBALMENTE (nao so por tenant).
Garantido no banco (User.@@unique([email])) e no UsersService.
Se achar mais de um, e sinal de dado inconsistente (insercao manual
ou seed). Melhor falhar que logar no tenant errado.

=========================================================================
ISSUESESSION - PONTO UNICO DE EMISSAO
=========================================================================

AuthService tem um metodo PRIVADO issueSession(user, userAgent, ipAddress)
que faz o trabalho de emitir sessao:
  - Assina JWT
  - Cria Session (SessionsService.createSession)
  - Atualiza User.lastLoginAt
  - Resolve permissions
  - Retorna { accessToken, refreshToken, user, permissions }

Usado por:
  - login (email + senha)
  - OAuth (via issueSessionForUser publico)

Qualquer coisa que precise emitir sessao DEVE usar esse metodo.
NAO duplicar a logica.

=========================================================================
GET /AUTH/ME - RETORNA TEMA
=========================================================================

O /auth/me chama AuthService.getMeWithTheme(userId):
  - Busca o user com SELECT explicito (NAO use findUnique sem select,
    senao vaza password).
  - Inclui tenant + tenant.theme.

Retorno:
  {
    id, name, email, tenantId, emailVerified, image, lastLoginAt,
    dateAt,
    tenant: {
      id, name, slug, starterKitUrl,
      theme: { ...todos os campos do tema... }
    }
  }

NAO retorna password. NUNCA.
NAO retorna userId (campo de auditoria interno).

=========================================================================
OAUTH - DETALHES
=========================================================================

Modulo: src/auth/oauth/
  oauth.controller.ts   endpoints /auth/oauth/google[/callback]
  oauth.service.ts      startGoogleFlow() + handleGoogleCallback()
  google.client.ts      wrapper da google-auth-library
  oauth.module.ts       importa AuthModule (pra reusar issueSessionForUser)

Cookie de state (CSRF): oauth_state, httpOnly, 5 min.
Validado no callback. Sem isso, qualquer um poderia forjar login.

Callback NUNCA devolve JSON. Sempre redirect HTTP (302).
Motivo: quem navega e o browser, nao o JS.

Falha: redireciona pra OAUTH_FAILURE_REDIRECT?error=<motivo>.
Motivos comuns:
  access_denied           -> user cancelou no Google
  invalid_state           -> cookie oauth_state nao bate
  missing_code_or_state   -> Google nao mandou code ou state
  Email do Google nao esta verificado
  Voce precisa ser convidado antes de entrar com Google
  Esta conta Google ja esta vinculada a outro usuario
  Falha na autenticacao com o Google

COOKIE PREFIX no OAuth:
  O callback nao tem Origin (navegacao top-level). Hardcodamos
  OAUTH_CLIENT_PREFIX = 'starter_' no oauth.controller.
  Se um dia houver OAuth no admin-panel, passar ?client=admin
  na URL de /auth/oauth/google.

=========================================================================
COMO O PORTEIRO E CONSUMIDO POR CLIENTES
=========================================================================

1. Cliente faz POST /auth/login no Porteiro
2. Porteiro valida, emite JWT + refresh (cookies com prefixo do cliente)
3. Porteiro resolve permissions e grava em Redis (perms:user:{id})
4. Porteiro devolve { user, permissions } pro cliente
5. Cliente guarda no Zustand (memoria)

Nas requisicoes seguintes:
  - Cliente envia o cookie em todas as chamadas (credentials: 'include')
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

TTL do refresh: 7 dias (fixo). NAO vinculado a licenseExpiresAt por
enquanto (decisao: com planos trimestral/semestral/anual, 7 dias de
grace e irrelevante).

PENDENCIA: lastUsedAt na Session nunca e atualizado no rotate().
Falta 1 linha.

=========================================================================
RATE LIMITING - DETALHES
=========================================================================

Storage customizado em src/common/throttler/throttler-redis.storage.ts
Implementa ThrottlerStorage usando o RedisService existente
(que ja tem a senha do Redis).
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

Como limpar o rate limit em dev (se travar):
  docker exec -it porteiro-redis redis-cli -a <senha> --scan --pattern "throttle:*"
  docker exec -it porteiro-redis redis-cli -a <senha> FLUSHALL

=========================================================================
SCRIPTS
=========================================================================

~/projetos/porteiro/start-all.sh    sobe o Porteiro (auth-api + admin-panel)
~/projetos/porteiro/stop-all.sh     derruba o Porteiro

O start-all.sh do starter-kit sobe o Porteiro TAMBEM (para o cliente
funcionar). Mas se voce quer subir SO o Porteiro, usa o daqui.

PENDENCIA: o start-all.sh do starter-kit tem polling fraco. As vezes
nao sobe tudo (starter-api fica de fora, observability nunca sobe).
O script aborta com exit 1 se algum falhar, mas a verificacao pode
ser melhorada.

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
   permissions, user-roles, sessions, themes NAO tem rate limit.

2. Multi-aba com RTR
   Abas concorrentes podem causar queda pra login (reuse detectado).
   Solucao futura: BroadcastChannel coordenando refresh entre abas.
   So ocorre em multi-aba do MESMO app (nao confundir com "cookies
   com prefixo" - aquilo resolveu admin-panel vs starter-web).

3. Status HTTP nos outros controllers
   Auth corrigido (@HttpCode(200) nos endpoints que nao criam recurso).
   Os outros controllers ainda usam 201 indiscriminado em @Post.

4. Tenant sem campos extras
   (color, plan, domain, status, timezone)
   Derivar status de licenseExpiresAt.

5. TTL do refresh vinculado a tenant.licenseExpiresAt
   Hoje fixo em 7 dias. Decisao: NAO fazer (planos trimestral/anual).
   Revisitar se virar cobranca por uso.

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
    Nao existem. Ver CONTEXTO-COMUM secao "2FA / STEP-UP (PLANEJADO)".

11. Testes automatizados
    Zero. Comecar pelo fluxo de auth (Jest + Supertest).

12. OAuth (Google/GitHub)
    Google implementado (Cenario B). GitHub nao.

13. Menu de configuracoes
    Onde vao morar: retencao de sessoes, timezone, rate limit
    configuravel, politica de senha, etc.

14. Cleanup de sessoes
    Job para apagar sessoes revogadas antigas. Adiado.

15. start-all.sh precisa de polling melhor
    As vezes o tmux nao sobe tudo. O script ja foi ajustado pra
    abortar se falhar, mas a logica de verificacao pode ser melhorada.

16. Observability nao sobe
    Loki/Grafana/Prometheus. Erros de ECONNREFUSED no log do Porteiro.

17. start-all.sh - observability
    O --with-observability nao esta funcionando consistentemente.

18. ThemesService.remove nao usa transacao
    Se falhar entre updateMany (tenants) e update (tema), tenants
    ficam orfaos. Envolver em $transaction.

19. 401 generico no frontend
    Admin-panel e starter-web mostram "Email ou senha invalidos" pra
    QUALQUER 401 do /auth/login. Esconde mensagens como "Licenca da
    empresa expirada". Corrigir lendo o `message` do body.

20. Redis sem senha - RESOLVIDO
    requirepass configurado. REDIS_PASSWORD nos .env.

21. CORS hardcoded - RESOLVIDO
    Agora le de CORS_ORIGINS no .env.

22. STARTER_IT_URL typo - RESOLVIDO
    Corrigido pra STARTER_KIT_URL.

23. register usa tenantId_email composto - RESOLVIDO
    Agora checa email global. Schema tem @@unique([email]).

24. emailVerified nao e checado em lugar nenhum
    Campo populado em setPassword + OAuth, mas nenhum login valida.
    Decisao: implementar na fase de testes (bloquear login de user
    nao verificado).

25. Contextos desatualizados
    Este arquivo + CONTEXTO-COMUM + CONTEXTO-STARTER-KIT + SISTEMA-DE-TEMAS
    precisam ser mantidos atualizados.

=========================================================================
PROXIMAS TAREFAS DO PORTEIRO
=========================================================================

1. Aplicar rate limit nos outros controllers
2. Aplicar @HttpCode(200) nos outros controllers (status HTTP correto)
3. Resolver start-all.sh (polling + observability)
4. Multi-aba com RTR (BroadcastChannel)
5. Cleanup de sessoes (via @nestjs/schedule)
6. Menu de configuracoes
7. Revisao de seguranca (2FA, politica de senha, auditoria de login)
8. Documentacao de API (Swagger mais completo)
9. Testes automatizados
10. Refactor: monorepo com npm workspaces (codigo duplicado)

=========================================================================
COMO O PORTEIRO SE RELACIONA COM O STARTER-KIT
=========================================================================

O starter-kit e um CLIENTE do Porteiro.

  - O starter-kit NAO tem User/Role/Permission/Tenant/Session no
    sentido de "serem a fonte de verdade". Eles vivem no Porteiro.
  - O starter-kit tem copia dos modulos IAM no schema (por decisao
    de facilitar o setup), mas o JwtAuthGuard do starter NAO consulta
    banco local. Ele confia no payload do JWT.
  - Os dois compartilham JWT_SECRET e Redis.

Para detalhes do starter, ver CONTEXTO-STARTER-KIT.md.