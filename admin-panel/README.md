# admin-panel

Painel administrativo do Porteiro. Interface para gerenciar:

- Tenants (empresas)
- Usuarios
- Papeis (roles)
- Permissoes
- Associacoes usuario-papel
- Sessoes ativas
- Produtos e Categorias (exemplos de entidade de negocio)

## Stack

- Next.js 16 (App Router + Turbopack)
- React 19
- TypeScript
- TailwindCSS 4
- Zustand 5 - estado global
- zod - validacao
- sonner - toasts
- lucide-react - icones

## Como rodar

### 1. Pre-requisitos

O auth-api precisa estar rodando em http://localhost:3000.
Sem ele, o admin-panel nao consegue autenticar.

### 2. Instalar dependencias

npm install

### 3. Variaveis de ambiente

cp .env.example .env.local

O .env.local precisa ter:

NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_PERMISSIONS_TTL_MS=300000

### 4. Rodar

npm run dev

- Painel: http://localhost:3001

### 5. Login

Credenciais padrao (do seed do auth-api):

- Email: admin@plataforma.com
- Senha: 123456

## Estrutura de pastas

app/
  layout.tsx              Providers globais (theme, permissions, confirm)
  page.tsx                Redirect raiz
  (auth)/login/           Tela de login
  (dashboard)/
    layout.tsx            Guard + bootstrap + sidebar
    dashboard/
      page.tsx            Dashboard
      tenants/            Gestao de tenants
      roles/              Gestao de papeis
      users/              Gestao de usuarios
      products/           CRUD de produtos (exemplo)
      categories/         CRUD de categorias (exemplo)

components/
  layout/                 Sidebar, TopBar, TenantSwitcher
  shared/                 Combobox, ConfirmDialog, CanButton, CrudModal
  users/                  Componentes de usuarios
  roles/                  Componentes de papeis
  sessions/               Modal de sessoes
  products/               Componentes de produtos
  categories/             Componentes de categorias

hooks/                    Hooks de dados (use-users, use-products, ...)
lib/
  api.ts                  Cliente HTTP (com interceptor 401/refresh)
  api/                    Servicos por dominio
  permission-context.tsx  Provider de permissions
  confirm-context.tsx     Provider de modais de confirmacao

stores/
  useAuthStore.ts         Estado global (user, permissoes, tenant selecionado)

## Como funciona o login

1. O usuario digita email + senha
2. O admin-panel faz POST /auth/login no auth-api
3. O auth-api devolve { user, permissions } e seta cookies httpOnly:
   - access_token (JWT, 15 min)
   - refresh_token (opaco, 7 dias)
4. O Zustand guarda user e permissions em memoria (nunca em localStorage)
5. Toda requisicao usa credentials: include (o browser manda os cookies)
6. Quando o access expira (401), o interceptor em lib/api.ts chama
   POST /auth/refresh e repete a requisicao original
7. Se o refresh falhar, o interceptor limpa o Zustand e redireciona pra /login

## Como funciona a autorizacao

- O auth-api devolve as permissions no login e em GET /auth/me/permissions
- O PermissionsProvider (via Zustand) expoe hasPermission(key)
- Componentes CanButton permission=... mostram/escondem conforme a permission
- O frontend so previne UX ruim - o backend sempre barra com 403 se faltar permission

## Como criar uma tela nova

Copie o padrao de products/:

1. API client: lib/api/fornecedores.ts (copie products.ts)
2. Hook: hooks/use-fornecedores.ts (copie use-products.ts)
3. Modal: components/fornecedores/fornecedor-modal.tsx
4. Item de lista: components/fornecedores/fornecedor-list-item.tsx
5. Pagina: app/(dashboard)/dashboard/fornecedores/page.tsx
6. Menu: adicione item no components/layout/app-sidebar.tsx
7. Permission: use catalog.fornecedores.* (criadas no seed do auth-api)

Padroes importantes:
- Nunca use localStorage pra token ou permissions
- Use sempre api de lib/api.ts (que ja cuida do interceptor)
- Use ConfirmDialog (via useConfirm) para acoes destrutivas
- Use CanButton / CanGhostButton para esconder acoes sem permission
- Filtre listagens por selectedTenantId do Zustand (quando aplicavel)

## Componentes reutilizaveis

| Componente | Onde | Pra que |
|---|---|---|
| Combobox | components/shared/combobox.tsx | Input com busca e filtro |
| ConfirmDialog | components/shared/confirm-dialog.tsx | Modal de confirmacao |
| CanButton | components/shared/can-button.tsx | Botao que so aparece com permission |
| CrudModal | components/shared/crud-modal.tsx | Modal generico de CRUD |
| SearchInput | components/ui/search-input.tsx | Input de busca com icone |

## Comandos uteis

npm run dev      # dev (Turbopack)
npm run build    # build de producao
npm run start    # rodar build
npm run lint     # lint

## Variaveis de ambiente

| Variavel | Descricao | Padrao |
|---|---|---|
| NEXT_PUBLIC_API_URL | URL do auth-api | http://localhost:3000 |
| NEXT_PUBLIC_PERMISSIONS_TTL_MS | TTL do cache de permissions no client | 300000 (5 min) |
