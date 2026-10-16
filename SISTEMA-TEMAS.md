# SISTEMA DE TEMAS

Subsistema que permite personalizar o visual dos clientes (starter-web)
por tenant. O admin cria temas no Porteiro (admin-panel), vincula a um
tenant, e o starter-web aplica o tema do tenant do user logado.

Toca 3 projetos:
  - Porteiro auth-api     -> modelo Theme, endpoints, schema
  - Porteiro admin-panel  -> CRUD de temas + vincular a tenant
  - Starter-kit web       -> aplica o tema do tenant

=========================================================================
MODELO
=========================================================================

model Theme {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  style           String   @default("flat")  // flat | glass | neumorphism
  colorsLight     Json
  colorsDark      Json
  backgroundLight Json
  backgroundDark  Json
  glassConfig     Json?
  neumorphConfig  Json?
  shadows         Json?
  radius          Json?
  typography      Json?
  density         String   @default("comfortable")
  status          String   @default("draft")  // draft | published
  dateAt          DateTime @default(now())
  userId          String
  deleted         Boolean  @default(false)

  tenants         Tenant[]
}

model Tenant {
  // ...campos existentes
  themeId String?
  theme   Theme? @relation(fields: [themeId], references: [id])
}

Theme e GLOBAL. Nao tem tenantId. E um catalogo.
Cada tenant ESCOLHE um tema do catalogo (via themeId).

=========================================================================
ENDPOINTS (Porteiro)
=========================================================================

CRUD de temas (admin da plataforma):
  GET    /themes          -> lista todos os temas (catalogo)
  GET    /themes/:id      -> detalhe
  POST   /themes          -> criar (permission platform.tenants.create)
  PATCH  /themes/:id      -> editar (permission platform.tenants.update)
  DELETE /themes/:id      -> deletar (permission platform.tenants.delete)

  Obs: as permissions dos temas sao as MESMAS de tenants
  (platform.tenants.*). Foi decisao pra nao criar mais dominios.
  Se um dia quiser separar: platform.themes.*.

Vinculo tenant -> tema:
  GET   /tenants/:id/theme  -> retorna o tema do tenant
  PATCH /tenants/:id/theme  -> seta o tema (body: { themeId })

O GET /tenants/:id/theme e publico pra qualquer user logado
do tenant (o starter-web chama isso pra aplicar o tema).

Delete de tema (ThemesService.remove):
  - Antes de deletar, remove themeId de todos os tenants que apontam
    pra ele (themeId = null).
  - PENDENCIA: os dois updates (updateMany + update) nao estao em
    transacao. Se algo falhar entre os dois, tenants ficam orfaos.
    Envolver em $transaction.

=========================================================================
FLUXO
=========================================================================

1. Admin (voce) no admin-panel:
   - Cria um tema (cores, background, estilo).
   - O tema nasce como `status: 'draft'`.

2. Admin vincula o tema a um tenant:
   - Na tela de Tenants, seleciona o tema.
   - PATCH /tenants/:id/theme com { themeId }.

3. User do tenant loga no starter-web:
   - /auth/me retorna { ..., tenant: { ..., theme: {...} } }.
   - O PorteiroThemeProvider le esse theme.
   - Aplica no <html> via CSS variables + data-theme-style.

4. Admin no admin-panel (preview):
   - O TenantThemeProvider le o tema do tenant ativo (TenantSwitcher).
   - Aplica no <html> igual ao starter-web.

=========================================================================
COMO O TEMA E APLICADO (frontend)
=========================================================================

O tema e aplicado como CSS variables no <html>:
  --bg, --bg-card, --bg-muted, --border, --text, --text-muted
  --primary, --primary-foreground
  --radius-card, --radius-button, --radius-input
  --bg-image (gradient | url | none)
  --glass-opacity, --glass-blur, --glass-saturate
  --neumorph-intensity, --neumorph-blur

E como atributo no <html>:
  data-theme-style="flat" | "glass" | "neumorphism"

O globals.css usa `html[data-theme-style="glass"] ...` pra aplicar
os estilos correspondentes.

Funcao applyThemeToDocument(theme, mode):
  - Escolhe colorsDark ou colorsLight baseado em mode.
  - Escolhe backgroundDark ou backgroundLight.
  - Seta as CSS variables.
  - Adiciona/remove classes (glass, neumorph, neumorph-inset).
  - Seta data-theme-style.

IMPORTANTE: a funcao applyThemeToDocument tem que ser IDENTICA no
admin-panel e no starter-web. Se divergir, os dois mostram o tema
diferente.

=========================================================================
FONTE DE VERDADE DE LIGHT/DARK
=========================================================================

next-themes e a UNICA fonte de verdade de light/dark/system.

NAO usar userMode do useThemeStore (Zustand) pra decidir light/dark.
Esse campo ficou obsoleto. Ele causava conflito (localStorage persistido
do Zustand competia com o next-themes).

A logica correta:
  const { resolvedTheme } = useNextTheme()
  // resolvedTheme ja entrega 'light' ou 'dark' resolvido (leva em
  // conta 'system').

O useThemeStore do admin-panel e starter-web ainda tem o campo
userMode, mas ele NAO deve ser usado. Limpar quando fizer refactor.

=========================================================================
COMPONENTES
=========================================================================

Starter-web: components/porteiro-theme-provider.tsx
  - Busca GET {AUTH_URL}/tenants/{tenantId}/theme.
  - Salva no useThemeStore.
  - Aplica via applyThemeToDocument.

Admin-panel: components/theme/TenantThemeProvider.tsx
  - Mesma logica.
  - Usa o tenant ativo do TenantSwitcher (selectedTenantId).
  - Fallback: user.tenantId ou user.tenant.id.

AUTH_URL no admin-panel:
  O admin-panel usa NEXT_PUBLIC_API_URL (nao NEXT_PUBLIC_AUTH_URL).
  O TenantThemeProvider do admin-panel cai no fallback:
    process.env.NEXT_PUBLIC_AUTH_URL ?? process.env.NEXT_PUBLIC_API_URL

No starter-web:
  NEXT_PUBLIC_AUTH_URL=http://localhost:3000 (Porteiro)
  NEXT_PUBLIC_API_URL=http://localhost:4000 (starter-api, dados de negocio)

No admin-panel:
  NEXT_PUBLIC_API_URL=http://localhost:3000 (Porteiro)

PENDENCIA: padronizar os nomes (IAM_URL / APP_URL). Nao fazer agora.

=========================================================================
ESTRUTURA DO TEMA (JSON)
=========================================================================

colorsLight / colorsDark:
  {
    bg, bgCard, bgMuted, border, text, textMuted,
    primary, primaryForeground
  }
  Valores em formato "hsl(H S% L%)" (sem o hsl()).

backgroundLight / backgroundDark:
  {
    type: 'solid' | 'gradient' | 'image',
    gradient?: { from, to, dir },
    image?: { url }  // base64 ou URL externa
  }

glassConfig:
  { opacityLight, opacityDark, blur, saturate }

neumorphConfig:
  { intensity, inset }

shadows:
  { card, float }

radius:
  { card, button, input }

typography:
  { fontFamily }

=========================================================================
PENDENCIAS DO SISTEMA DE TEMAS
=========================================================================

1. ThemesService.remove: envolver updateMany + update em $transaction.

2. Remover userMode do useThemeStore (admin-panel + starter-web).
   Nao e mais usado. next-themes e a fonte de verdade.

3. Padronizar NEXT_PUBLIC_* nos frontends (IAM_URL / APP_URL).
   API_URL significa coisas diferentes nos dois projetos.

4. Starter-web: aplicar a mesma correcao do admin-panel no
   PorteiroThemeProvider (usar resolvedTheme, nao userMode).
   O tema do starter-web esta "quase igual" ao do admin-panel;
   a diferenca pode ser esse bug. Investigar.

5. Documentar como criar um tema novo (fluxo manual no admin-panel).

=========================================================================
COMO UMA IA DEVE TRABALHAR COM TEMAS
=========================================================================

1. applyThemeToDocument tem que ser IDENTICO nos dois providers.
   Se mexer em um, mexer no outro.

2. A fonte de verdade de light/dark e o next-themes (resolvedTheme).
   NAO usar userMode do Zustand.

3. Se o tema nao aparece:
   - Confere GET /tenants/:id/theme no Network.
   - Confere se o tenant tem themeId setado (SELECT no banco).
   - Confere se o <html> tem data-theme-style e as CSS variables.
   - Confere se o next-themes esta com o mode correto.

4. Quando criar tema novo: testar nos DOIS frontends (admin-panel
   como preview, starter-web como o cliente real).