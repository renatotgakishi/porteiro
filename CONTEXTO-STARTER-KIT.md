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
  - O MESMO Redis do Porteiro (cache de permissions)
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
  Redis:           6379   <- COMPARTILHADO
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
      |
      v
  Porteiro (:3000) -> responde
      |
      | Set-Cookie: access_token (httpOnly, Path=/)
      | Set-Cookie: refresh_token (httpOnly, Path=/)
      |
      v
  starter-web (guarda user + permissions no Zustand)
      |
      | 5. products/categories -> starter-api :4000
      | 6. cookie vai automaticamente
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

=========================================================================
ESTRUTURA DO BACKEND (starter-kit/api/src/)
=========================================================================

O starter-api tem os MESMOS modulos do Porteiro (copia), por decisao
para facilitar o setup:

  auth/          (copia do Porteiro, mas veja observacao abaixo)
  users/         (copia - nao usado na pratica)
  roles/         (copia - nao usado na pratica)
  permissions/   (copia - nao usado na pratica)
  user-roles/    (copia - nao usado na pratica)
  tenants/       (copia - nao usado na pratica)
  sessions/      (copia - nao usado na pratica)
  products/      (negocio real - CRUD)
  categories/    (negocio real - CRUD)
  redis/         (cliente do Redis do Porteiro)
  prisma/        (conexao com starter-postgres)
  logger/
  generated/prisma/

IMPORTANTE - o que muda no starter-api vs Porteiro:

1. JwtAuthGuard (jwt-auth.guard.ts)
   - NAO consulta banco local
   - Confia no payload do JWT: { id: payload.sub, tenantId: payload.tenantId }
   - Motivo: o user vive no Porteiro, nao no starter

2. PermissionsResolverService (permissions-resolver.service.ts)
   - NAO consulta prisma.permission.findMany (banco local)
   - Le do Redis do Porteiro (chave perms:user:{userId})
   - Se miss -> chama GET :3000/auth/me/permissions com o cookie
   - Assinatura: resolve(userId: string, cookie?: string)

3. PermissionGuard (permission.guard.ts)
   - Passa o cookie pro resolve
   - Le request.cookies?.access_token

4. .env
   - REDIS_PORT=6379   (Porteiro, nao 6380)
   - PORTEIRO_URL=http://localhost:3000

5. docker-compose.yml
   - SO tem postgres (:5433)
   - NAO tem redis (usa o do Porteiro)

=========================================================================
ESTRUTURA DO FRONTEND (starter-kit/web/)
=========================================================================

app/
  layout.tsx         Providers globais
  (auth)/login/      Tela de login
  (dashboard)/
    layout.tsx       Guard + bootstrap + sidebar
    dashboard/
      page.tsx       Dashboard
      products/      CRUD de produtos
      categories/    CRUD de categorias

components/
  layout/            Sidebar, TopBar, TenantSwitcher
  shared/            Combobox, ConfirmDialog, CanButton, CrudModal
  products/          Componentes de produtos
  categories/        Componentes de categorias

hooks/               use-products, use-categories
lib/
  api.ts             Dois clients: apiAuth (Porteiro), api (starter-api)
  api/
    products.ts
    categories.ts
  permission-context.tsx
  confirm-context.tsx
stores/
  useAuthStore.ts    Zustand (auth via Porteiro)

O starter-web NAO TEM:
  - Tela de Tenants, Roles, Users, Sessions
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

=========================================================================
ENDPOINTS DO STARTER-API
=========================================================================

Auth (copia - mas na pratica o frontend usa direto do Porteiro):

  POST /auth/login         (existe, mas frontend chama :3000)
  POST /auth/refresh       (idem)
  POST /auth/logout        (idem)
  GET  /auth/me            (idem)
  GET  /auth/me/permissions (idem)

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
  - Imprime resumo

~/projetos/starter-kit/stop-all.sh
  - Mata as 4 sessoes tmux
  - Derruba containers (com --remove-orphans)

Comando:
  cd ~/projetos/starter-kit
  ./start-all.sh                    # sem observability
  ./start-all.sh --with-observability  # com Loki/Grafana/Prometheus

=========================================================================
COMO FUNCIONA A AUTENTICACAO (passo a passo)
=========================================================================

1. Usuario digita email + senha no starter-web
2. starter-web chama apiAuth('/auth/login') -> Porteiro :3000
3. Porteiro:
   - Valida email/senha
   - Emite JWT (15 min) + refresh (7 dias)
   - Seta cookies httpOnly
   - Resolve permissions e grava no Redis (perms:user:{id})
   - Devolve { user, permissions }
4. starter-web:
   - setSession({ user, permissions }) no Zustand
   - router.push('/dashboard')
5. Zustand tem: user, permissions, selectedTenantId, availableTenants
6. Quando o user acessa Produtos:
   - starter-web chama api('/products') -> starter-api :4000
   - Cookie vai automaticamente (mesmo dominio localhost)
   - JwtAuthGuard valida o JWT
   - PermissionGuard le @RequirePermissions('catalog.products.read')
   - PermissionsResolverService:
     a. Le do Redis do Porteiro (perms:user:{id})
     b. Se miss -> GET :3000/auth/me/permissions (com o cookie)
   - Se tiver a permission -> 200
   - Se nao tiver -> 403

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
8. Roda npx prisma migrate deploy && npx prisma db seed
9. Sobe com ./start-all.sh

=========================================================================
DEBITOS TECNICOS DO STARTER-KIT
=========================================================================

1. Schema do starter tem tabelas IAM duplicadas
   (User, Role, Permission, UserRole, RolePermission, Session, Tenant)
   Motivo: copia do Porteiro pra facilitar o setup.
   Ideal futuro: manter SO Product e Category no schema do starter.

2. Seed do starter cria admin@plataforma.com
   Esse user nao existe no starter (existe no Porteiro).
   Nao usado na pratica. Ideal: seed vazio ou so products/categories
   de exemplo.

3. O wait_http do start-all.sh foi ajustado (tem `--max-time 3`),
   mas se algum servico nao subir, o script ainda espera 120s por
   ele antes de desistir.

4. README com diagrama ASCII feio (o dev optou por deixar).

5. Login com admin@plataforma.com / 123456 pre-preenchido no
   frontend. Remover em producao.

6. `roleName` no PermissionsProvider sempre "". Popular.

7. Nao tem UI de tenants, users, roles, sessions (foi removido de
   proposito - o starter so tem Dashboard + Catalogo).

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

3. Adicionar `lastUsedAt` (depende do Porteiro)

4. Testes automatizados

5. Commit no GitHub (3 repos: porteiro/auth-api,
   porteiro/admin-panel, starter-kit)

=========================================================================
COMO O STARTER-KIT SE RELACIONA COM O PORTEIRO
=========================================================================

O starter-kit depende do Porteiro estar rodando.

  - Login -> Porteiro :3000/auth/login
  - Permissions -> Porteiro :3000/auth/me/permissions OU
                   Redis do Porteiro (perms:user:{id})
  - Tenants -> Porteiro :3000/tenants
  - Me -> Porteiro :3000/auth/me

Se o Porteiro cair, o starter-web mostra erro de login
(e o interceptor redireciona pra /login).

O JWT_SECRET deve ser IDENTICO nos dois.
O Redis do Porteiro e COMPARTILHADO.

=========================================================================
O QUE MUDOU NO PORTEIRO POR CAUSA DO STARTER
=========================================================================

1. main.ts do auth-api: CORS agora aceita multiplas origens
   origin: ['http://localhost:3001', 'http://localhost:4001']

2. Isso e importante: sem isso, o starter-web nao consegue
   chamar o Porteiro direto (CORS bloqueia).

=========================================================================
PARA UMA IA CONTINUAR O STARTER-KIT
=========================================================================

Passos sugeridos:

1. Ler este arquivo + CONTEXTO-COMUM.md
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
  - O PermissionsResolverService do starter NAO consulta banco local.
    Ele le do Redis do Porteiro ou chama a API do Porteiro.
  - Duas URLs no frontend: NEXT_PUBLIC_AUTH_URL (Porteiro) e
    NEXT_PUBLIC_API_URL (starter-api)
  - O Redis e COMPARTILHADO com o Porteiro (chave perms:user:{id})
  - O JWT_SECRET e o MESMO do Porteiro