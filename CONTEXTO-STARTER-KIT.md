# CONTEXTO - STARTER-KIT

Este arquivo complementa o CONTEXTO-COMUM.md.
Leia o COMUM primeiro, depois este.

=========================================================================
O QUE E O STARTER-KIT
=========================================================================

Template de projeto-cliente do Porteiro.

E o MODELO para criar produtos que usam o Porteiro como servidor de
autenticacao e autorizacao.

Ele NAO TEM IAM PROPRIO. Toda autenticacao e permissions vem do
Porteiro (via API + Redis compartilhado).

O starter-kit e o primeiro de varios clientes que existirao:
  starter-kit-1  (loja do Joao)
  starter-kit-2  (loja da Maria)
  starter-kit-3  (loja do Pedro)
  ...

Todos compartilham:
  - O MESMO Porteiro (auth server)
  - O MESMO Redis do Porteiro (cache de permissions, COM SENHA)
  - O MESMO JWT_SECRET
  - Cada um tem seu proprio Postgres (dados de negocio)

=========================================================================
ESTRUTURA DE PASTAS
=========================================================================

~/projetos/starter-kit/
  api/              backend NestJS (negocio: products, categories)
  web/              frontend Next.js (painel do produto)
  start-all.sh      sobe tudo (Porteiro + Starter)
  stop-all.sh       derruba tudo
  README.md         visao geral
  CONTEXTO-COMUM.md
  CONTEXTO-PORTEIRO.md
  CONTEXTO-STARTER-KIT.md (este arquivo)
  DESIGN-SYSTEM.md
  SISTEMA-DE-TEMAS.md

Nome das pastas (dentro do starter-kit):
  api/  (nao "auth-api", pra evitar confusao com o Porteiro)
  web/  (nao "admin-panel", pra evitar confusao com o Porteiro)

=========================================================================
PORTAS
=========================================================================

Starter-api:       4000
Starter-web:       4001
Starter-postgres:  5433

Porteiro (compartilhado):
  auth-api:        3000
  admin-panel:     3001
  Postgres:        5432
  Redis:           6379   <- COMPARTILHADO, COM SENHA
  RedisInsight:    5540

=========================================================================
ARQUITETURA - FLUXO
=========================================================================

  starter-web (:4001)
      |
      | 1. login -> Porteiro :3000/auth/login
      | 2. auth/me -> Porteiro :3000/auth/me
      | 3. permissions -> Porteiro :3000/auth/me/permissions
      | 4. tenants -> Porteiro :3000/tenants
      | 5. set-password -> Porteiro :3000/auth/set-password
      | 6. forgot-password -> Porteiro :3000/auth/forgot-password
      | 7. change-password -> Porteiro :3000/auth/change-password
      | 8. oauth/google -> Porteiro :3000/auth/oauth/google
      | 9. tenant/theme -> Porteiro :3000/tenants/:id/theme
      |
      v
  Porteiro (:3000) -> responde
      |
      | Set-Cookie: starter_access_token (httpOnly, Path=/)
      | Set-Cookie: starter_refresh_token (httpOnly, Path=/)
      |
      v
  starter-web (guarda user + permissions no Zustand)
      |
      | 10. products/categories -> starter-api :4000
      | 11. cookie vai automaticamente
      |
      v
  starter-api (:4000)
      | JwtAuthGuard valida JWT (mesmo JWT_SECRET)
      | PermissionGuard le @RequirePermissions
      | PermissionsResolverService:
      |   1. Redis do Porteiro (perms:user:{id})
      |   2. Se miss -> GET :3000/auth/me/permissions
      |
      v
  starter-postgres (:5433) - dados de negocio

Duas URLs no frontend:
  NEXT_PUBLIC_AUTH_URL=http://localhost:3000   (Porteiro)
  NEXT_PUBLIC_API_URL=http://localhost:4000    (starter-api)

O frontend tem DOIS clients HTTP:
  apiAuth(path)  -> chama Porteiro (auth/me/permissions/tenants/logout)
  api(path)      -> chama starter-api (products/categories)

COOKIE PREFIX:
  O starter-web usa cookies com prefixo 'starter_':
    starter_access_token / starter_refresh_token
  Motivo: evitar conflito com admin-panel (prefixo 'admin_').
  Ver CONTEXTO-COMUM secao "COOKIES COM PREFIXO POR APLICACAO".

=========================================================================
ESTRUTURA DO BACKEND (starter-kit/api/src/)
=========================================================================

O starter-api tem os MESMOS modulos do Porteiro (copia), por decisao
para facilitar o setup:

  auth/          (copia, mas veja observacao abaixo)
  users/         (copia - nao usado na pratica)
  roles/         (copia - nao usado na pratica)
  permissions/   (copia - nao usado na pratica)
  user-roles/    (copia - nao usado na pratica)
  tenants/       (copia - nao usado na pratica)
  sessions/      (copia - nao usado na pratica)
  products/      (negocio real - CRUD)
  categories/    (negocio real - CRUD)
  mail/          (copia - nao usado na pratica)
  common/throttler/ (copia - nao usado na pratica)
  redis/         (cliente do Redis do Porteiro, COM SENHA)
  prisma/        (conexao com starter-postgres)
  logger/
  generated/prisma/

IMPORTANTE - o que muda no starter-api vs Porteiro:

1. JwtAuthGuard (jwt-auth.guard.ts)
   - NAO consulta banco local
   - Confia no payload do JWT:
       { id: payload.sub, tenantId: payload.tenantId }
   - Monta request.user a partir do payload:
       { id: string, tenantId: string | null }
   - NAO chama AuthService.validateTokenPayload (foi removido)
   - Le cookie 'starter_access_token' com fallback pra 'access_token'

2. PermissionsResolverService (permissions-resolver.service.ts)
   - NAO consulta prisma.permission.findMany (banco local)
   - Le do Redis do Porteiro (chave perms:user:{userId})
   - Se miss -> chama GET :3000/auth/me/permissions com o cookie
   - Assinatura: resolve(userId: string, cookie?: string)
   - Monta header Cookie: `access_token=${cookie}` ao chamar o Porteiro
     (o Porteiro aceita porque Origin :4000 nao esta no mapa de prefixos,
     entao cai no fallback '').

3. PermissionGuard (permission.guard.ts)
   - Passa o cookie pro resolve
   - Le request.cookies?.starter_access_token (com fallback 'access_token')

4. .env
   - REDIS_PORT=6379   (Porteiro, COM SENHA)
   - REDIS_PASSWORD="..."
   - PORTEIRO_URL=http://localhost:3000
   - STARTER_KIT_URL=http://localhost:4001 (usado pelo Porteiro pra
     montar o link do convite, quando o tenant nao tem starterKitUrl)
   - CORS_ORIGINS="http://localhost:3001,http://localhost:4001"

5. docker-compose.yml
   - SO tem postgres (:5433)
   - NAO tem redis (usa o do Porteiro)

=========================================================================
ESTRUTURA DO FRONTEND (starter-kit/web/)
=========================================================================

app/
  layout.tsx         Providers globais (ThemeProvider + PorteiroThemeProvider
                     + PermissionsProvider + ConfirmProvider)
  (auth)/
    login/           Tela de login (+ botao "Entrar com Google")
    forgot-password/ Tela de "esqueci a senha"
    set-password/    Tela de definir nova senha (aceita token)
  (dashboard)/
    layout.tsx       Guard + bootstrap + sidebar + UserMenu
    dashboard/
      page.tsx       Dashboard
      products/      CRUD de produtos
      categories/    CRUD de categorias

components/
  theme-provider.tsx          next-themes
  porteiro-theme-provider.tsx aplica o tema do tenant
  layout/            Sidebar, TopBar, TenantSwitcher, UserMenu
  shared/            Combobox, ConfirmDialog, CanButton, CrudModal
  products/          Componentes de produtos
  categories/        Componentes de categorias
  profile/           ChangePasswordModal
  ui/                PasswordInput, SearchInput, Input

hooks/               use-products, use-categories
lib/
  api.ts             Dois clients: apiAuth (Porteiro), api (starter-api)
                     Tem NO_REFRESH_PATHS
  api/
    products.ts
    categories.ts
    auth.ts          (AuthAPI: changePassword, forgotPassword, setPassword)
  permission-context.tsx
  confirm-context.tsx
stores/
  useAuthStore.ts    Zustand (auth via Porteiro)
  useThemeStore.ts   Zustand (temas)

O starter-web NAO TEM:
  - Tela de Tenants, Roles, Users, Sessions, Themes
  - components/users/, components/roles/, components/sessions/
  - lib/api/users.ts, lib/api/roles.ts, lib/api/tenants.ts
  - hooks/use-users.ts, hooks/use-roles.ts

=========================================================================
LIB/API.TS - DOIS CLIENTS
=========================================================================

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

apiAuth<T>(path, options)   -> fetch em AUTH_URL (Porteiro)
api<T>(path, options)       -> fetch em API_URL (starter-api)

O refresh (interceptor 401) chama AUTH_URL/auth/refresh, porque e
o Porteiro que emite o refresh.

NO_REFRESH_PATHS (rotas que NAO disparam refresh no 401):
  /auth/login
  /auth/refresh
  /auth/forgot-password
  /auth/set-password
  /auth/change-password
Motivo: 401 nessas rotas e resposta de negocio (senha errada,
licenca expirada), nao "sessao expirou". Sem isso, o interceptor
dispara refresh desnecessario e confunde o erro.

=========================================================================
LOGIN COM GOOGLE
=========================================================================

Botao "Entrar com Google" na tela /login.
E um LINK (window.location.href), NAO fetch:
  window.location.href = `${AUTH_URL}/auth/oauth/google`

Fluxo:
  1. User clica -> browser vai pro Porteiro -> Google.
  2. Google autoriza -> browser volta pro Porteiro (callback).
  3. Porteiro valida, emite cookies (starter_access_token +
     starter_refresh_token), redireciona pro :4001/dashboard.
  4. starter-web carrega, chama /auth/me, popula Zustand.

Em caso de erro: Porteiro redireciona pra :4001/login?error=<motivo>.
O login/page.tsx le o ?error=, mostra mensagem amigavel, limpa a query.

Erros mapeados (OAUTH_ERROR_MESSAGES no login/page.tsx):
  access_denied           -> "Voce cancelou o login com Google."
  invalid_state           -> "Sessao de login expirada."
  missing_code_or_state   -> "Resposta invalida do Google."
  oauth_failed            -> "Falha ao entrar com Google."
  Email do Google nao esta verificado
  Voce precisa ser convidado antes de entrar com Google
  Esta conta Google ja esta vinculada a outro usuario
  Falha na autenticacao com o Google
  Empresa nao encontrada
  Licenca da empresa expirada

=========================================================================
ENDPOINTS DO STARTER-API
=========================================================================

Auth (copia - mas na pratica o frontend usa direto do Porteiro):

  POST /auth/login
  POST /auth/refresh
  POST /auth/logout
  GET  /auth/me
  GET  /auth/me/permissions

Negocio (uso real):

  GET    /products
  POST   /products         @RequirePermissions('catalog.products.create')
  GET    /products/:id
  PUT    /products/:id     @RequirePermissions('catalog.products.update')
  DELETE /products/:id     @RequirePermissions('catalog.products.delete')

  GET    /categories
  POST   /categories       @RequirePermissions('catalog.categories.create')
  GET    /categories/:id
  PATCH  /categories/:id   @RequirePermissions('catalog.categories.update')
  DELETE /categories/:id   @RequirePermissions('catalog.categories.delete')

Todos os endpoints passam por:
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('catalog.xxx.yyy')

=========================================================================
MODELO DE NEGOCIO
=========================================================================

model Category {
  id          Int       @id @default(autoincrement())
  tenantId    String
  name        String
  dateAt      DateTime  @default(now())
  userId      String
  deleted     Boolean   @default(false)
  products    Product[]
  @@unique([tenantId, name])
}

model Product {
  id          Int       @id @default(autoincrement())
  tenantId    String
  name        String
  description String
  price       Decimal
  stock       Int
  categoryId  Int
  dateAt      DateTime  @default(now())
  userId      String
  deleted     Boolean   @default(false)
  category    Category  @relation(fields: [categoryId], references: [id])
}

tenantId e userId sao STRINGS SOLTAS (sem FK).
Motivo: o user e o tenant vivem no Porteiro, nao aqui.

=========================================================================
SCRIPTS
=========================================================================

~/projetos/starter-kit/start-all.sh
  - Derruba tudo (tmux + docker)
  - Sobe containers do Porteiro + Starter
  - Aguarda Postgres (pg_isready) e Redis
  - Abre 4 sessoes tmux:
      porteiro-api   (:3000)
      porteiro-panel (:3001)
      starter-api    (:4000)
      starter-web    (:4001)
  - Aguarda os 4 responderem HTTP 200
  - Se algum falhar, ABORTA com exit 1

~/projetos/starter-kit/stop-all.sh
  - Mata as 4 sessoes tmux
  - Derruba containers (com --remove-orphans)

Comando:
  cd ~/projetos/starter-kit
  ./start-all.sh                    # sem observability
  ./start-all.sh --with-observability  # com Loki/Grafana/Prometheus

PENDENCIA: o start-all.sh tem polling fraco. As vezes nao sobe tudo
(starter-api fica de fora). O --with-observability nao sobe o
observability. Reescrever a logica de verificacao.

=========================================================================
COMO FUNCIONA A AUTENTICACAO (passo a passo)
=========================================================================

1. Usuario digita email + senha no starter-web
2. starter-web chama apiAuth('/auth/login') -> Porteiro :3000
3. Porteiro:
   - Valida email/senha
   - Emite JWT (15 min) + refresh (7 dias)
   - Seta cookies starter_access_token / starter_refresh_token
   - Resolve permissions e grava no Redis (perms:user:{id})
   - Devolve { user, permissions }
4. starter-web:
   - setSession({ user, permissions }) no Zustand
   - router.push('/dashboard')
5. Zustand tem: user, permissions, selectedTenantId, availableTenants
6. Quando o user acessa Produtos:
   - starter-web chama api('/products') -> starter-api :4000
   - Cookie starter_access_token vai automaticamente
   - JwtAuthGuard valida o JWT (monta user do payload)
   - PermissionGuard le @RequirePermissions('catalog.products.read')
   - PermissionsResolverService:
     a. Le do Redis do Porteiro (perms:user:{id})
     b. Se miss -> GET :3000/auth/me/permissions (com o cookie)
   - Se tiver a permission -> 200
   - Se nao tiver -> 403

=========================================================================
FLUXO DE CONVITE / RESET DE SENHA (no starter-kit)
=========================================================================

Convite (admin cria user no Porteiro, email vai pro starter-kit):

1. Admin cria user no Porteiro admin-panel (:3001)
2. Admin clica em "Convidar"
3. Porteiro gera token 'invite', monta URL:
   {tenant.starterKitUrl}/set-password?token=xxx
   (fallback: STARTER_KIT_URL do .env = http://localhost:4001)
4. Porteiro envia email (driver console em dev -> logs/mail.log)
5. User clica no link -> cai em starter-web /set-password?token=xxx
6. User define nova senha
7. starter-web chama apiAuth('/auth/set-password') no Porteiro
8. Porteiro valida token, atualiza senha, revoga sessoes,
   marca User.emailVerified = now()
9. User loga com a nova senha

Reset de senha (user esquecido):
1. User clica em "Esqueci minha senha" no /login do starter-web
2. Vai pra /forgot-password
3. Digita email -> POST :3000/auth/forgot-password
4. Porteiro gera token 'reset', envia email
5. User clica -> /set-password?token=xxx (mesma tela)
6. Define nova senha, loga

Trocar senha (logado):
1. User clica no proprio nome no rodape do sidebar (UserMenu)
2. Dropdown -> "Alterar senha"
3. Abre ChangePasswordModal (3 campos: atual, nova, confirmar)
4. Chama POST :3000/auth/change-password
5. Sucesso -> toast + logout automatico + redirect /login

=========================================================================
CREDENCIAIS DE TESTE
=========================================================================

O starter-kit NAO TEM seed de usuario proprio.
Os usuarios vem do Porteiro.

Exemplos:
  admin@plataforma.com / 123456   (admin da plataforma)
  joao@stark.com / 123456          (usuario do tenant Stark)

Para criar um usuario:
  1. Abre o admin-panel do Porteiro (:3001)
  2. Loga como admin da plataforma
  3. Seleciona o tenant desejado
  4. Cria o usuario
  5. Atribui uma role
  6. Marca as permissions da role
  7. Clica em "Convidar" (envia email)

=========================================================================
COMO CRIAR UM NOVO PROJETO A PARTIR DO STARTER
=========================================================================

1. Copia ~/projetos/starter-kit para ~/projetos/novo-produto
2. Renomeia:
   - starter-kit/api    -> novo-produto/api
   - starter-kit/web    -> novo-produto/web
3. Ajusta as portas em:
   - api/package.json       (start:dev na porta X000)
   - api/.env               (PORT=X000, POSTGRES_DB=novo_produto)
   - web/package.json       (dev na porta X001)
   - web/.env.local         (URLs com as novas portas)
   - start-all.sh / stop-all.sh
4. Ajusta o docker-compose.yml (nome do container, nome do banco)
5. Cria o tenant no Porteiro (admin-panel :3001)
6. Cria os usuarios e roles no Porteiro
7. Marca as permissions necessarias
8. Configura tenant.starterKitUrl (ou STARTER_KIT_URL no .env do Porteiro)
   pra o link do convite apontar pro novo cliente
9. Roda npx prisma migrate deploy && npx prisma db seed
10. Sobe com ./start-all.sh

PENDENCIA: adicionar :4002 no ORIGIN_TO_PREFIX do Porteiro
(cookie-prefix.ts) quando criar starter-kit-2. Precisa de prefixo
proprio (sk2_) pra nao conflitar com starter_ do starter-kit-1.

=========================================================================
DEBITOS TECNICOS DO STARTER-KIT
=========================================================================

1. Schema do starter tem tabelas IAM duplicadas
   (User, Role, Permission, UserRole, RolePermission, Session, Tenant)
   Motivo: copia do Porteiro pra facilitar o setup.
   Ideal futuro: manter SO Product e Category no schema do starter.

2. Seed do starter cria admin@plataforma.com
   Esse user nao existe no starter (existe no Porteiro).
   Nao usado na pratica. Ideal: seed vazio ou so products/categories.

3. README com diagrama ASCII feio (o dev optou por deixar).

4. Login com admin@plataforma.com / 123456 pre-preenchido no
   frontend. Remover em producao.

5. roleName no PermissionsProvider sempre "". Popular.

6. Nao tem UI de tenants, users, roles, sessions (foi removido de
   proposito - o starter so tem Dashboard + Catalogo).

7. Rate limit nao aplicado nos controllers de negocio (products,
   categories). Aplicar @UseGuards(UserThrottlerGuard) quando precisar.

8. Modulos IAM no starter-api (roles, tenants, users, permissions,
   user-roles, sessions) consultam banco local que NAO tem os dados.
   Endpoints nunca funcionam. O starter-web nao os usa. Codigo morto.
   Limpar quando fizer refactor.

9. Validacao de AuthService.validateTokenPayload foi removida do
   guard. Restos do metodo podem existir. Limpar quando fizer refactor.

10. Starter-web nao aplica o tema exatamente igual ao admin-panel.
    Pode ser o bug do userMode (usar resolvedTheme do next-themes).
    Investigar (nao e urgente - "esta bom").

=========================================================================
PROXIMAS TAREFAS DO STARTER-KIT
=========================================================================

1. Limpar IAM do backend do starter (schema + modulos)
   - Remover User, Role, Permission, UserRole, RolePermission, Session
   - Remover modulos auth/users/roles/permissions/user-roles/tenants/sessions
   - Criar JwtAuthGuard local (so valida JWT)
   - Criar PermissionsResolverService local (so Redis + fetch Porteiro)
   - Criar PermissionGuard local
   - Ajustar seed (so products/categories exemplo)

2. Tela de dashboard com metricas (opcional)

3. Aplicar rate limit nos controllers de negocio

4. Corrigir tema do starter-web (usar resolvedTheme)

5. Testes automatizados

6. Commit no GitHub

=========================================================================
COMO O STARTER-KIT SE RELACIONA COM O PORTEIRO
=========================================================================

O starter-kit depende do Porteiro estar rodando.

  - Login -> Porteiro :3000/auth/login
  - OAuth -> Porteiro :3000/auth/oauth/google
  - Permissions -> Porteiro :3000/auth/me/permissions OU
                   Redis do Porteiro (perms:user:{id})
  - Tenants -> Porteiro :3000/tenants
  - Tenant/theme -> Porteiro :3000/tenants/:id/theme
  - Me -> Porteiro :3000/auth/me
  - Convite/Reset -> Porteiro :3000/auth/set-password
  - Trocar senha -> Porteiro :3000/auth/change-password

Se o Porteiro cair, o starter-web mostra erro de login
(e o interceptor redireciona pra /login).

O JWT_SECRET deve ser IDENTICO nos dois.
O Redis do Porteiro e COMPARTILHADO (e tem senha).
O REDIS_PASSWORD deve ser IDENTICO nos dois.

=========================================================================
O QUE MUDOU NO PORTEIRO POR CAUSA DO STARTER
=========================================================================

1. main.ts do auth-api: CORS le de CORS_ORIGINS no .env
   origin: ['http://localhost:3001', 'http://localhost:4001'] (default)

2. O starter-api tambem tem CORS com as duas origens (le de .env).

3. O campo starterKitUrl foi adicionado no model Tenant (Porteiro)
   pra permitir que cada tenant aponte pro seu cliente.

4. Cookie com prefixo 'starter_' (starter-web) e 'admin_' (admin-panel).

5. O modulo oauth/ no Porteiro hardcoda 'starter_' no callback
   (OAuth so existe no starter-web por enquanto).

=========================================================================
PARA UMA IA CONTINUAR O STARTER-KIT
=========================================================================

Passos sugeridos:

1. Ler este arquivo + CONTEXTO-COMUM.md + SISTEMA-DE-TEMAS.md (se for tema)
2. Perguntar ao dev o que ele quer fazer hoje
3. Se for mexer no backend do starter (limpar IAM), avisar que
   isso e refactor grande (~4-6h) e que o estado atual funciona
4. Se for so adicionar feature de negocio, seguir o padrao de
   Products/Categories
5. Sempre pedir arquivo antes de alterar
6. Sempre testar via curl antes de mexer no frontend
7. Se o markdown quebrar, mandar em texto puro pra colar no VS Code

Lembretes importantes:
  - O starter-kit NAO autentica. Ele CONSOME o Porteiro.
  - O JwtAuthGuard do starter NAO consulta banco local (monta user
    do payload do JWT).
  - Duas URLs no frontend: NEXT_PUBLIC_AUTH_URL (Porteiro) e
    NEXT_PUBLIC_API_URL (starter-api)
  - O Redis e COMPARTILHADO com o Porteiro (chave perms:user:{id})
    e tem senha (REDIS_PASSWORD).
  - O JWT_SECRET e o MESMO do Porteiro
  - O link de convite vem do tenant.starterKitUrl (fallback .env do Porteiro)
  - Os 3 endpoints de senha (set, forgot, change) apontam pro Porteiro
  - O starter-web usa cookies com prefixo 'starter_'
  - O starter-web tem o botao "Entrar com Google" (link, nao fetch)