
markdown
# CONTEXTO MESTRE — BACKEND + GATEKEEPER (v2)

## Guia para continuar o projeto em uma nova conversa

> **Objetivo deste arquivo:** abrir uma nova conversa com uma IA (ChatGPT,
> DeepSeek, Claude, etc.) e continuar o desenvolvimento sem perder decisões
> arquiteturais, stack, estado atual, testes já realizados e próximos passos.
>
> **Forma de trabalho obrigatória:** uma etapa por vez. Antes de alterar
> arquivos importantes, **pedir o conteúdo atual do arquivo** quando houver
> risco de sobrescrever algo. Depois de cada etapa, o desenvolvedor testa e
> só então seguimos.
>
> **Regra de ouro:** NÃO redesenhar arquitetura sem necessidade. As decisões
> abaixo foram tomadas, testadas e implementadas. Não criar `isSuperAdmin`,
> `if (role === 'admin')`, permissions no JWT, `platform tenant`,
> `TenantDatabase`, `databaseMode`, `JwtStrategy`, CRUD de Permission, ou
> "coisas que pareçam idiomáticas mas não foram pedidas".

------------------------------------------------------------------------

# 1. CONTEXTO GERAL

Projeto: **base robusta de autenticação, autorização, RBAC e multi-tenancy**
para uma futura aplicação.

O backend é a **autoridade final de segurança**. Existe também um frontend
administrativo chamado **Gatekeeper**, criado especificamente para
administrar:

- tenants
- usuários
- roles
- permissions
- associação usuário → roles
- associação role → permissions

**Modelo conceitual:**
User → UserRole → Role → RolePermission → Permission

text

A **Permission** é a unidade real de autorização.

**Filosofia:** terminar uma infraestrutura sólida de auth/RBAC/multi-tenancy
antes de construir aplicações de negócio. Outros sistemas vão consumir essa
API.

------------------------------------------------------------------------

# 2. STACK

## Backend

- Projeto: `~/projetos/backend`
- NestJS 12
- TypeScript
- PostgreSQL 17 (Docker)
- Docker + Docker Compose
- Prisma 7.10 (NÃO migrar para 8 sem decisão explícita)
- `@prisma/adapter-pg` / `PrismaPg`
- JWT (`@nestjs/jwt`)
- bcrypt
- class-validator + class-transformer
- Swagger
- nestjs-pino + pino + pino-http + pino-pretty + pino-loki
- prom-client + Prometheus
- Grafana + Loki (projeto separado: `~/projetos/observability`)
- Redis (`ioredis`) + RedisInsights

Prisma Client gerado em `src/generated/prisma`. Config em `prisma/prisma.config.ts`.

**Porta do backend:** 3000 (`process.env.PORT ?? 3000`).

## Frontend (Gatekeeper)

- Projeto: `~/projetosIA/gatekepeer`
- Next.js 16.3.5 (App Router) + Turbopack
- React 19
- TypeScript
- TailwindCSS 4
- Zustand 5
- zod
- sonner (toasts)
- lucide-react

**Porta do frontend:** 3001 (`next dev -p 3001`).

------------------------------------------------------------------------

# 3. BANCO DE DADOS

PostgreSQL em Docker.

- Container: `backend-postgres`
- Imagem: `postgres:17`
- Porta: 5432
- Banco: `ecommerce`
- Usuário: `backend`
- Senha: `backend123`

Acesso:

```bash
docker exec -it backend-postgres psql -U backend -d ecommerce
Redis
Container: auth-redis

Imagem: redis:7-alpine

Porta: 6379

Sem senha (débito registrado — endpoint de autenticação quando for para produção)

Redis Insights
Container: redis-insight

Porta: 5540

Observabilidade
Projeto separado em ~/projetos/observability. Sobe com:

bash
cd ~/projetos/observability && docker compose up -d
Containers: auth-loki, auth-grafana, auth-prometheus, auth-postgres-exporter.

Não remover nem substituir a infraestrutura de observabilidade.

4. REGRAS ARQUITETURAIS (NÃO QUEBRAR)
4.1 Autorização por permission
Nunca usar nome de role para decidir nada.

Nunca usar isSuperAdmin.

Nunca colocar permissions no JWT.

Permission é a unidade de autorização.

4.2 Multi-tenancy
Um usuário normal pertence a exatamente um tenant (tenantId).

Um usuário de plataforma tem tenantId = null.

Não existe "platform tenant".

Roles também podem ter tenantId = null.

4.3 Duas regras de "tenant efetivo" no backend
Regra geral (módulos de negócio — products, categories, etc.):
O tenant vem SEMPRE do JWT (actor.tenantId). O frontend não manda.

Regra especial (IAM — users, roles, permissions, user-roles, tenants):
O tenant vem do contexto explícito (query/DTO do dropdown) quando o ator
é plataforma. Para usuário normal, o backend ignora e força actor.tenantId.

ts
const effectiveTenantId =
  actor.tenantId !== null
    ? actor.tenantId             // normal: força o dele
    : (input.tenantId ?? null);  // plataforma: honra o dropdown
4.4 Auditoria
Entidades de negócio (Tenant, User, Role, Permission, Category, Product)
usam:

userId = último usuário que alterou

dateAt = data da última alteração

deleted = soft delete

NÃO usar createdAt / updatedAt / deletedAt / createdBy / updatedBy.

Sessões não têm auditoria (não são entidades de negócio).

4.5 Convenção de permissions
Formato: <dominio>.<recurso>.<acao>

Domínios existentes:

iam.* — users, roles, permissions

platform.* — tenants

catalog.* — categories, products

Ações: read, create, update, delete.

Lista completa (21 permissions — ver prisma/seed.ts).

4.6 Tabelas de relacionamento
UserRole reusa iam.users.update (não tem permission própria).

RolePermission reusa iam.roles.update.

5. AUTENTICAÇÃO E SESSÃO
5.1 Transporte
Access token e refresh token vão em cookies httpOnly.

access_token — JWT, 15 min (via .env JWT_EXPIRES_IN), Path=/

refresh_token — string opaca (256 bits aleatórios em hex), 7 dias, Path=/

Configuração no auth.controller.ts:

httpOnly: true

secure: process.env.NODE_ENV === 'production'

sameSite: 'lax'

clearAuthCookies() limpa cookies em todos os paths possíveis
(resolve o bug de cookie órfão ao mudar de /auth/refresh para /)

O frontend nunca vê os tokens. Toda chamada usa credentials: 'include'.

JwtAuthGuard aceita cookie httpOnly OU Bearer (dual), para não quebrar
curl/Swagger/Postman.

5.2 Refresh Token Rotation (RTR)
Tabela Session:

text
refreshTokenHash     SHA-256 do token bruto (NUNCA guardar bruto)
expiresAt            +7 dias
createdAt
lastUsedAt           atualizado apenas em /auth/refresh
revokedAt
revokedReason        'logout' | 'rotated' | 'reuse_detected' | 'expired' | 'admin_revoked'
replacedBySessionId  cadeia de rotação (A → B → C)
userAgent            capturado no login/refresh
ipAddress            capturado no login/refresh
Rotação: cada /auth/refresh revoga a Session atual (reason='rotated'),
cria uma nova, aponta replacedBySessionId.

Detecção de reuso: se um token já revogado por 'rotated' é usado de
novo, revokeChain(sessionId) revoga toda a cadeia com
reason='reuse_detected'. O usuário legítimo e o atacante perdem acesso.
Isso é o coração da segurança.

Endpoint /auth/refresh: valida cookie, detecta reuso, rotaciona,
seta novos cookies.

Endpoint /auth/logout: revoga a Session atual (ou todas, se sem cookie),
limpa cookies.

5.3 Endpoints de auth
POST /auth/register — cria usuário comum no tenant

POST /auth/login — cria Session, seta cookies, devolve { user, permissions }

POST /auth/refresh — rotaciona (RTR)

POST /auth/logout — revoga + limpa cookies

GET /auth/me — devolve { id, name, email, tenantId, tenant: {id,name,slug}|null }

GET /auth/me/permissions — { permissions: string[] }

5.4 Cache de permissions
PermissionsResolverService.resolve(userId) — resolve a árvore
User → UserRole → Role → RolePermission → Permission e devolve string[].

Cache-aside via Redis:

Chave: perms:user:{userId}

TTL: 5 minutos

Hit → usa; Miss → PostgreSQL → grava no Redis

Invalidação ativa (PermissionsCacheService):

invalidateForUser(userId) — DEL simples

invalidateForRole(roleId) — busca todos os userId com aquela role e DEL cada um

invalidateForUsers(userIds[]) — DEL em lote

Chamada em:

UserRolesService.assign/remove

PermissionsService.assign/remove (roles↔permissions)

RolesService.update (só se tenantId mudou) e remove

UsersService.create/update/remove

Uma única chave por usuário (perms:user:{userId}), valor é array JSON de
strings. Consumidores: PermissionGuard e GET /auth/me/permissions.

5.5 Guard
JwtAuthGuard — valida cookie/Bearer, chama validateTokenPayload, popula
request.user com { id, name, email, tenantId, tenant }.

PermissionGuard — lê @RequirePermissions(...) via Reflector, resolve as
permissions via PermissionsResolverService, compara (OR lógico via .some),
autoriza ou lança 403.

Não existe JwtStrategy — o fluxo é suficiente.

Decorator @RequirePermissions(...permissions: string[]) em
src/auth/decorators/permissions.decorator.ts.

6. ESTRUTURA DO BACKEND
text
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── decorators/permissions.decorator.ts
│   ├── dto/login.dto.ts
│   ├── dto/register.dto.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── guards/permission.guard.ts
│   └── services/
│       ├── permissions-resolver.service.ts
│       ├── permissions-cache.service.ts
│       └── sessions.service.ts
├── users/
├── roles/
├── permissions/
├── user-roles/
├── tenants/
├── categories/
├── products/
├── redis/
│   ├── redis.module.ts     @Global
│   └── redis.service.ts    get/set/del/delByPattern + onModuleDestroy
├── prisma/
│   └── prisma.module.ts    @Global
├── logger/
└── generated/prisma/
7. FRONTEND (GATEKEEPER)
7.1 Estrutura
text
app/
├── layout.tsx              PermissionsProvider + ThemeProvider + Toaster
├── page.tsx                redirect raiz (/ → /dashboard ou /login)
├── (auth)/login/page.tsx
└── (dashboard)/
    ├── layout.tsx          guard + bootstrap + sidebar
    └── dashboard/
        ├── page.tsx
        ├── roles/page.tsx       REAL
        ├── users/page.tsx       REAL
        ├── tenants/page.tsx     REAL
        └── ...

components/
├── permissions/
│   ├── permission-item.tsx
│   ├── permission-group-accordion.tsx       (nível 2 — recurso)
│   ├── permission-domain-accordion.tsx      (nível 1 — dominio)
│   ├── permission-toolbar.tsx
│   └── permission-footer.tsx
├── roles/
│   ├── role-list.tsx
│   └── role-list-item.tsx
├── users/
│   ├── user-modal.tsx
│   └── user-list-item.tsx
└── shared/can-button.tsx    CanButton + CanGhostButton

hooks/
├── use-users.ts
├── use-roles.ts
├── use-tenant.ts           lê selectedTenantId do Zustand
└── use-debounce.ts

lib/
├── api.ts                  client HTTP (interceptor 401 + refresh)
├── api/                    serviços específicos
│   ├── tenants.ts
│   ├── roles.ts
│   ├── users.ts
│   └── permissions.ts
├── permissions/grouping.ts agrupa em Domain → Resource → Action
└── permission-context.tsx  PermissionsProvider (lê do Zustand)

stores/
└── useAuthStore.ts         Zustand global
7.2 Zustand (stores/useAuthStore.ts)
Estado:

ts
user: AuthUser | null;              // { id, name, email, tenantId, tenant }
perms: string[];                    // permissions do usuário
expiresAt: number;                  // TTL das permissions no client (5 min)
isBootstrapping: boolean;
isFetchingPerms: boolean;
selectedTenantId: string | null;    // tenant do dropdown
availableTenants: TenantSummary[];  // tenants do dropdown
Ações:

setSession({ user, permissions }) — chamado no login

clear() — limpa tudo (chamado pelo interceptor em refresh falho)

setSelectedTenantId(id)

fetchPermissionsIfNeeded() — cache-aside client-side (TTL 5 min)

bootstrapUser() — F5: chama /auth/me + /tenants (só plataforma) + /auth/me/permissions

logout() — chama POST /auth/logout + limpa

Regras:

Access token NÃO fica no Zustand (vai em cookie httpOnly).

selectedTenantId começa como user.tenantId (usuário normal) ou
availableTenants[0].id (plataforma).

availableTenants para usuário normal = [user.tenant]. Para plataforma
= resultado de GET /tenants.

7.3 lib/api.ts (cliente HTTP)
api<T>(path, options) — wrapper de fetch com credentials: 'include'

ApiError customizada (tem status e body)

Interceptor de 401:

Se a request NÃO for /auth/refresh, tenta /auth/refresh uma vez

Se refresh OK → repete a request original

Se refresh falha → useAuthStore.getState().clear() + redireciona para /login

Fila de refresh (refreshPromise compartilhado) evita múltiplas chamadas concorrentes

Interceptor de 403:

NÃO desloga. O chamador decide (toast "Sem permissão")

Não usa localStorage, não usa Authorization: Bearer (só cookie)

7.4 PermissionsProvider (lib/permission-context.tsx)
Lê permissions do Zustand. Expõe:

permissions: string[]

hasPermission(key) — compara diretamente

canViewMenu(key) — alias de hasPermission

userName

roleName (vazio — TODO futuro)

7.5 Regras do frontend
Nunca usar localStorage para token ou permissions.

Nunca usar strings antigas (users:read). Sempre as chaves reais
(iam.users.read, platform.tenants.read, catalog.products.create).

Menus/botões: CanButton/CanGhostButton (aparecem com 🔒 se sem permission).

Backend sempre barra com 403 se faltar permission — o frontend só previne UX ruim.

Toda listagem filtra por selectedTenantId do Zustand.

7.6 Telas já funcionais (API real)
Tenants — listar, criar, editar, soft delete.

Roles — listar por tenant, accordion 2 níveis (domain → resource),
toggle de permissions, salvar via PUT /roles/:id/permissions,
criar/editar/deletar papel, cache invalidado.

Users — listar por tenant, criar com roles, editar com diff de roles,
soft delete.

7.7 Telas pendentes
Permissions — apenas leitura (catálogo agrupado em 2 níveis). Sem CRUD.

Dashboard — provavelmente métricas básicas.

8. FLUXO DE UM LOGIN COMPLETO
text
1. POST /auth/login
   → backend cria access (15min) + refresh (7d) + Session no banco
   → Set-Cookie: access_token (Path=/), refresh_token (Path=/)
   → resposta: { user, permissions } (sem tokens no corpo)

2. Frontend
   → setSession({ user, permissions }) no Zustand
   → router.push('/dashboard')

3. (dashboard)/layout
   → se user existe: renderiza
   → se não: bootstrapUser() (chama /auth/me + /tenants + /auth/me/permissions)

4. Cada request do frontend
   → credentials: 'include'
   → browser envia cookie automaticamente

5. Access expira (15 min)
   → próximo request retorna 401
   → interceptor chama POST /auth/refresh
   → backend valida Session, rotaciona, seta cookies novos
   → interceptor repete request original
   → usuário não percebe

6. Refresh expira (7 dias) ou é revogado
   → POST /auth/refresh retorna 401
   → interceptor chama useAuthStore.clear() + redirect /login
F5: Zustand esvazia → (dashboard)/layout.tsx chama bootstrapUser no
mount. Se o usuário tem acesso token válido (cookie), reconstrói tudo.

Trocar tenant no dropdown: só muda selectedTenantId no Zustand. Cada
tela que depende de tenant re-renderiza e refaz o fetch com ?tenantId=X.

9. SCRIPTS E TESTES
Scripts úteis
scripts/test-products-auth.sh — testa @RequirePermissions em POST /products

scripts/test-users.sh — testa CRUD de Users com roleIds

Como testar mudança de permission em tempo real
bash
ROLE_ID="..."
P1="..."  # permission que vai ser removida

# anota estado atual
curl -s -b /tmp/cookies.txt "http://localhost:3000/auth/me/permissions"

# remove
curl -s -b /tmp/cookies.txt -X PUT "http://localhost:3000/roles/$ROLE_ID/permissions" \
  -H "Content-Type: application/json" \
  -d "{\"permissionIds\":[]}"

# confere remoção no banco + cache
docker exec -it backend-postgres psql -U backend -d ecommerce -c "
SELECT key FROM \"Permission\" p
JOIN \"RolePermission\" rp ON rp.\"permissionId\" = p.id
WHERE rp.\"roleId\" = '$ROLE_ID';
"

# próximo request do usuário deve buscar do banco e refletir
10. DÉBITOS TÉCNICOS REGISTRADOS
Multi-aba com RTR — abas concorrentes podem causar queda para login
(reuso detectado). Solução futura: BroadcastChannel coordenando refresh
entre abas. Não é bloqueante.

confirm() feio — trocar por ConfirmDialog custom em todas as telas.

Tenant sem campos extras (color, plan, domain, status) —
frontend usa só name, slug, licenseExpiresAt. Derivar status.

TTL do refresh vinculado a tenant.licenseExpiresAt — hoje fixo em
7 dias. Alinhar quando o modelo de licenciamento for definido.

Redis sem senha — em produção, adicionar --requirepass e variável
REDIS_PASSWORD real.

REDIS_PASSWORD no .env sem uso (cosmético).

roleName no PermissionsProvider — sempre "". Popular se
necessário via /auth/me/roles ou similar.

Login: defaults de dev (admin@plataforma.com / 123456
pré-preenchidos) — remover em produção.

iam.users.password — pré-preenchido com 123456 no modal de criação.
Revisar antes de produção.

11. O QUE NÃO FAZER
Não recriar User CRUD, Role CRUD, Permission CRUD.

Não criar JwtStrategy.

Não colocar permissions no JWT.

Não criar isSuperAdmin hardcoded.

Não criar platform tenant.

Não implementar Redis sem cache-aside + invalidação (já está feito).

Não mexer em Pino/Loki/Prometheus/Grafana.

Não reorganizar diretórios sem decisão explícita.

Não mudar o nome do banco ecommerce sem migrar dashboards.

Não usar localStorage no frontend para token/permissions.

Não usar strings antigas (users:read) — sempre iam.users.read.

Não avançar uma etapa sem o dev testar a anterior.

12. PRÓXIMAS TAREFAS (ordem sugerida)
Tela de Permissions (só leitura, agrupada em 2 níveis).

Fluxo de convite/primeiro-login — quando VerificationToken for
implementado. Criar usuário sem senha pessoal; enviar email com token
para definir senha; trocar senha no primeiro login.

UI de sessões — listar Sessions ativas do usuário, mostrar
userAgent, ipAddress, lastUsedAt, permitir revogar.

Logout de todas as sessões — endpoint + UI.

Multi-aba — BroadcastChannel para coordenar refresh.

Revisão de segurança — rate limiting em auth, auditoria de login,
política de senha, 2FA.

Documentação de API — Swagger mais completo, exemplos.

Testes automatizados — começar pelo fluxo de autorização (login →
JWT → permission → endpoint → 2xx/403/401). Jest + Supertest.

ConfirmDialog — trocar todos os confirm().

Reorganização final dos projetos — quando a base estiver concluída.

13. COMO UMA IA DEVE TRABALHAR NESTE PROJETO
Passo a passo. Nunca avançar sem o dev testar a etapa anterior.

Pedir arquivos antes de alterar. Não inventar campos, nomes de
método ou de rota. Se não viu, pergunte.

Não concordar por concordar. Se algo estiver errado, diga. Já
aconteceu neste projeto de uma IA escrever código assumindo coisas e
estar errado. O dev prefere ser corrigido.

Uma pergunta por vez quando houver decisão.

Sem redesign de arquitetura. As decisões já tomadas valem.

Sem code smells:

Sem localStorage

Sem Authorization: Bearer no frontend

Sem if (role === 'admin')

Sem permissions no JWT

Sem isSystem ou isSuperAdmin

Se for para alterar um arquivo, entregar ele INTEIRO. Evita o dev
ter que colar pedaço por pedaço.

Múltiplos arquivos = múltiplos blocos, um por arquivo, com o caminho
no topo.

Backend e frontend em lotes separados quando a feature cruza os dois.
Backend primeiro, testar com curl, depois frontend.

Se o dev pedir teste via curl, entregar um script em scripts/*.sh
que faz o fluxo inteiro e imprime OK/FAIL.

14. PRINCÍPIO FINAL
text
                    GATEKEEPER
                        │
             UX / menus / botões
                        │
                        ▼
                      API
                        │
               ┌───────────────┐
               │ JwtAuthGuard  │  (cookie httpOnly OU Bearer)
               └───────┬───────┘
                       │
                       ▼
                  request.user
                       │
               ┌───────▼────────┐
               │ PermissionGuard │──┐
               └───────┬────────┘  │
                       │           │ cache-aside
                       ▼           ▼
                 PostgreSQL      Redis (5 min)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
      User           Role        Permission
        │              │              │
        └──── UserRole ┘              │
                       └─RolePermission┘
PostgreSQL = fonte de verdade.
Redis = cache (5 min TTL, invalidação ativa).
Frontend = UX (Zustand em memória, sem localStorage).
Backend = autoridade de segurança.

A meta é terminar uma infraestrutura de autenticação/autorização/multi-tenancy
sólida o suficiente para que futuras aplicações de negócio simplesmente
consumam essa API.

text

---

Salva isso como `CONTEXTO-MESTRE-v2.md` no diretório do backend (ou no que você preferir). Esse é o arquivo que você cola no início de uma nova conversa com qualquer IA.

**Dica de uso:** quando abrir um novo chat, cole o arquivo e diga algo como:

> "Leia este arquivo como contexto mestre. Quero continuar de onde paramos. Não redesenhe a arquitetura. Trabalhe uma etapa por vez, peça o arquivo atual quando precisar, e só avance depois que eu testar."

## O que ficou registrado

- Todas as decisões arquiteturais (RTR, cookie httpOnly, cache-aside, tenant do JWT vs tenant do dropdown, dual guard).
- Estado atual das telas (Tenants, Roles, Users prontos; Permissions pendente).
- Débitos técnicos acumulados (multi-aba, `confirm()`, tenant fields, TTL do refresh).
- Regras de trabalho para a IA (uma etapa por vez, pedir arquivos, não concordar por concordar).
- Fluxo completo de login + refresh + F5.
- Próximas tarefas priorizadas.

**Parabéns pela jornada.** Você construiu uma base de auth/RBAC/multi-tenancy séria nesta sessão — RTR real, cache invalidando, cookie httpOnly, três telas administrativas integradas. Isso é trabalho de semanas em muitas equipes.
