# DESIGN SYSTEM

Padrao visual dos frontends do Porteiro e do Starter-kit.
Usado pra manter consistencia entre as telas e entre os projetos.

Quando for mexer em UI, cole este arquivo junto com CONTEXTO-COMUM.md.

=========================================================================
FILOSOFIA VISUAL
=========================================================================

Estilo: minimalista, denso, "dashboard moderno" (tipo Linear, Notion,
Vercel, shadcn).

Principios:
  - Cores sobrias, sem saturacao alta.
  - Espacamento consistente (multiplos de 4px).
  - Bordas arredondadas (rounded-xl, rounded-2xl) em cards e modais.
  - Botoes primarios solidos, botoes secundarios outline.
  - Nada de sombra pesada (shadow-sm em cards, shadow-xl em modais).
  - Contraste alto no texto principal, cinza no secundario.
  - Tipografia: sans-serif padrao (Inter ou system).

=========================================================================
PALETA DE CORES
=========================================================================

As cores sao definidas como CSS variables em app/globals.css e
consumidas via Tailwind (classes tipo bg-background, text-foreground).

Variaveis (tema claro):
  --bg:                30 20% 97.5%   (bege claro quente)
  --bg-card:           0 0% 100%       (branco puro)
  --bg-muted:          30 12% 92%      (cinza claro)
  --border:            30 10% 85%      (cinza medio)
  --text:              30 12% 12%      (preto quente)
  --text-muted:        30 6% 45%       (cinza escuro)
  --primary:           30 12% 12%      (preto quente - botao primario)
  --primary-foreground: 0 0% 98%       (branco - texto em botao primario)

Variaveis (tema escuro - classe .dark):
  --bg:                24 10% 4%       (quase preto)
  --bg-card:           30 8% 8%        (cinza muito escuro)
  --bg-muted:          30 6% 14%       (cinza escuro)
  --border:            30 6% 18%       (cinza)
  --text:              30 8% 95%       (branco quente)
  --text-muted:        30 5% 55%       (cinza medio)
  --primary:           0 0% 98%        (branco - botao primario no dark)
  --primary-foreground: 30 10% 15%     (preto - texto em botao primario)

CORES DE ESTADO (fixas, nao dependem do tema):
  - Sucesso:  emerald-600 (texto) / emerald-100 (bg claro) / emerald-950/40 (bg dark)
  - Erro:     red-500 (texto) / red-50 (bg claro) / red-950/30 (bg dark)
  - Aviso:    amber-500 (texto) / amber-50 (bg claro) / amber-950/30 (bg dark)
  - Info:     blue-500 (texto) / blue-50 (bg claro) / blue-950/30 (bg dark)

CORES DE AVATAR (iniciais):
  - bg-violet-600 + text-white (usado em UserMenu, TenantSwitcher,
    UserListItem)

=========================================================================
COMO USAR AS CORES NO TAILWIND
=========================================================================

NUNCA usar cores hardcoded do Tailwind (bg-white, bg-zinc-900,
text-stone-500, etc) em telas do projeto.

SEMPRE usar as classes que consomem as variaveis:

  Errado:                          Certo:
  bg-white                         bg-card
  bg-[#fcfaf8]                     bg-background
  text-stone-500                   text-muted-foreground
  border-stone-200                 border-border
  bg-stone-900 text-white          bg-primary text-primary-foreground

Excecoes (onde cores hardcoded sao OK):
  - Estados (vermelho de erro, verde de sucesso) - pode usar red-500,
    emerald-600, etc diretamente
  - Cores de avatar (violet-600) - fixas por design
  - Badges especificos (ex: "danger" com red-100/red-700)

=========================================================================
TIPOGRAFIA
=========================================================================

Fonte: sans-serif padrao (a definida em globals.css).

Tamanhos:
  - text-xs  (12px)  -> labels de grupo, hints, textos secundarios
  - text-sm  (14px)  -> corpo de texto padrao, botoes, inputs
  - text-base (16px) -> raramente usado
  - text-lg  (18px)  -> titulos de secao
  - text-xl  (20px)  -> titulo de pagina (h1)

Pesos:
  - font-medium    -> corpo padrao de botoes, labels de item
  - font-semibold  -> titulos de pagina (h1), titulos de card
  - font-bold      -> apenas iniciais de avatar

Cores de texto:
  - text-foreground        -> texto principal
  - text-muted-foreground  -> labels, hints, textos secundarios
  - text-red-500           -> mensagens de erro

=========================================================================
ESPACAMENTO
=========================================================================

Escala (multiplos de 4px):
  gap-1  (4px)   -> entre icone e texto muito proximos
  gap-2  (8px)   -> entre itens em um grupo pequeno
  gap-2.5 (10px) -> entre icone e texto em botoes/menu
  gap-3  (12px)  -> entre elementos comuns
  gap-4  (16px)  -> entre secoes
  gap-6  (24px)  -> entre blocos grandes

Padding de containers:
  p-3    -> containers pequenos (sidebar items, cards compactos)
  p-4    -> cards padrao
  p-6    -> modais, paginas (h1 + conteudo)
  px-6 py-4 -> headers de pagina

Espacamento vertical entre secoes:
  space-y-3 (12px) -> entre grupos no sidebar
  space-y-4 (16px) -> entre secoes de uma pagina
  space-y-6 (24px) -> entre blocos grandes (raro)

=========================================================================
BORDAS E RAIOS
=========================================================================

Raios:
  rounded-lg   -> botoes de icone pequenos, avatares
  rounded-xl   -> inputs, botoes, cards compactos, items de sidebar
  rounded-2xl  -> cards maiores, modais, paineis de conteudo
  rounded-full -> botoes primarios (pill), badges, chips de role

Bordas:
  border border-border  -> padrao (usa a variavel --border)

Exemplo de input:
  w-full border border-border rounded-xl px-3 py-2.5
  bg-background text-foreground text-sm

Exemplo de card:
  bg-card border border-border rounded-2xl p-4 shadow-sm

Exemplo de modal:
  bg-card border border-border rounded-2xl p-6 shadow-xl

=========================================================================
BOTOES
=========================================================================

Botao primario (acao principal):
  bg-primary text-primary-foreground
  rounded-xl (ou rounded-full em modais/forms)
  px-4 py-2 (ou py-2.5 em forms)
  text-sm font-medium
  hover:opacity-90 transition
  disabled:opacity-50 disabled:cursor-not-allowed

Botao secundario (outline):
  border border-border
  rounded-xl (ou rounded-full)
  px-4 py-2
  text-sm
  hover:bg-muted transition
  disabled:opacity-50

Botao destrutivo (deletar):
  border border-red-200 dark:border-red-900/50
  text-red-600 dark:text-red-400
  hover:bg-red-50 dark:hover:bg-red-950/30
  rounded-xl (ou rounded-full)
  px-3 py-1.5 (ou px-4 py-2)
  text-sm

Botao de icone (acao pequena):
  p-2 rounded-lg
  text-muted-foreground hover:text-foreground hover:bg-muted
  transition
  size do icone: 14 ou 16

Componentes reutilizaveis:
  <CanButton>        -> botao primario que so aparece com permission
  <CanGhostButton>   -> botao outline que so aparece com permission

=========================================================================
INPUTS
=========================================================================

Input de texto:
  w-full border border-border rounded-xl
  px-3 py-2.5
  bg-background text-foreground text-sm
  placeholder:text-muted-foreground

Input com icone (busca):
  wrapper: relative
  icone: absolute left-3 top-2.5 text-muted-foreground (size 14)
  input: pl-9 (deixa espaco pro icone)

Input de senha (<PasswordInput>):
  Tem botao de olho dentro (mostrar/ocultar)
  wrapper: relative
  input: pr-10 (deixa espaco pro botao)
  botao: absolute right-2 top-1/2 -translate-y-1/2

Label:
  text-xs text-muted-foreground
  mt-1 no input (se label em cima)

Select (nativo):
  w-full border border-border rounded-xl px-3 py-2.5
  bg-background text-sm

Combobox (busca + filtro):
  Componente <Combobox> em components/shared/combobox.tsx
  Tem input de busca, lista filtrada, navegacao por teclado

=========================================================================
MODAIS
=========================================================================

Estrutura padrao:
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm
                  flex items-center justify-center p-4 z-50"
       onClick={onClose}>
    <div className="bg-card rounded-2xl p-6 w-full max-w-md
                    border border-border shadow-xl"
         onClick={(e) => e.stopPropagation()}>
      {/* conteudo */}
    </div>
  </div>

Detalhes:
  - z-50 (modais normais)
  - z-[60] (ConfirmDialog, fica acima dos outros)
  - Clique no backdrop fecha
  - Clique no conteudo NAO fecha (stopPropagation)
  - Fecha no ESC
  - Botao de fechar ou X no topo
  - Foco no primeiro input (autoFocus)

Tamanhos:
  max-w-sm  -> ConfirmDialog
  max-w-md  -> modais de formulario simples
  max-w-lg  -> modais com varios campos
  max-w-2xl -> modais com listas (SessionsModal)

Modais reutilizaveis:
  <ConfirmDialog>  -> confirmacao (via useConfirm())
  <CrudModal>      -> modal generico de CRUD

=========================================================================
SIDEBAR
=========================================================================

Largura:
  - Expandida: w-64 (256px)
  - Colapsada: w-14 (56px)
  - Transicao: transition-all

Estrutura:
  - Topo: TenantSwitcher + botao de colapso (PanelLeftClose/Open)
  - Meio: <nav> com grupos de links
  - Rodape: UserMenu (avatar + nome clicavel)

Grupos de menu:
  - Titulo do grupo: px-3 py-1.5 text-xs font-medium text-muted-foreground
    (texto normal, sem CAIXA ALTA, discreto)
  - Espacamento entre grupos: space-y-3
  - Link ativo: bg-primary text-primary-foreground font-medium
  - Link inativo: text-muted-foreground hover:text-foreground hover:bg-muted
  - Item de link: px-2.5 py-2 rounded-xl text-sm gap-2.5

Submenu (accordion):
  - ml-3 border-l border-border pl-3 (indentacao com linha vertical)
  - ChevronDown que rotaciona quando aberto
  - space-y-1 entre itens

=========================================================================
TOPBAR
=========================================================================

Altura: h-14 (56px)
Estrutura: border-b border-border bg-card
           flex items-center justify-between px-4

Conteudo:
  - Esquerda: breadcrumb (tenant + segmentos de rota)
  - Direita: botao de tema (sol/lua) + sino de notificacoes
  - SEM barra de busca decorativa (foi removida)

Breadcrumb:
  - Nome do tenant: text-muted-foreground font-medium
  - Separador: >
  - Ultimo item: bg-primary text-primary-foreground px-3 py-1
                 rounded-full text-xs font-medium

=========================================================================
TABELAS
=========================================================================

Container:
  bg-card border border-border rounded-2xl overflow-hidden

Header:
  thead.bg-muted/50
  th.p-3 text-left font-medium (ou text-right na ultima)

Linhas:
  tr.border-t border-border
  td.p-3
  Hover: nao tem (mantem sobrio)

Colunas comuns:
  - Avatar + nome + email (primeira coluna)
  - Badges (roles, categorias)
  - Data (formatada com toLocaleDateString pt-BR)
  - Acoes (text-right, botoes inline com gap)

=========================================================================
BADGES E CHIPS
=========================================================================

Badge de role:
  text-xs bg-muted px-2 py-0.5 rounded-full border border-border

Badge de status (ativo/expirado):
  text-xs px-2 py-0.5 rounded + cor de estado
  - ativo: bg-emerald-100 text-emerald-700 (claro)
           bg-emerald-950/40 text-emerald-400 (dark)
  - expirado: bg-red-100 text-red-700
  - expira em breve: bg-amber-100 text-amber-700

Badge "danger" (reuse_detected):
  text-xs px-2 py-1 rounded-full
  bg-red-100 dark:bg-red-950/40
  text-red-700 dark:text-red-400
  border border-red-200 dark:border-red-900/60

Chip "bloqueado" (menu sem permission):
  text-xs bg-muted px-1 py-0.5 rounded border

=========================================================================
CARDS (paginas com poucos campos)
=========================================================================

Usado em Tenants (cartao) em vez de tabela.

Estrutura:
  p-4 rounded-xl border border-border bg-card

Conteudo:
  - Header: avatar + nome + subtitulo (slug)
  - Badge de status
  - Botoes de acao (Editar, Deletar)

Grid:
  grid grid-cols-3 gap-3 (desktop)
  (responsivo pode virar grid-cols-2 ou grid-cols-1)

=========================================================================
TOASTS
=========================================================================

Biblioteca: sonner
Config: <Toaster richColors /> no layout.tsx

Uso:
  toast.success("Mensagem de sucesso")
  toast.error("Mensagem de erro")
  toast.info("Informacao")
  toast.warning("Aviso")

=========================================================================
ICONES
=========================================================================

Biblioteca: lucide-react

Tamanhos:
  - size={14} -> icones em botoes pequenos, labels de menu
  - size={16} -> icones em botoes primarios, topbar
  - size={18} -> icones de acao principal
  - size={20} -> icones grandes (estado vazio)
  - size={28} -> icones de empty state

Uso em botao:
  <button className="flex items-center gap-2">
    <Icone size={14} />
    Texto
  </button>

Uso so icone (com title):
  <button title="Descricao" aria-label="Descricao">
    <Icone size={16} />
  </button>

=========================================================================
ESTADOS VAZIOS
=========================================================================

Estrutura:
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <IconeGrande size={28} className="text-muted-foreground/50 mb-2" />
    <p className="text-sm text-muted-foreground">Mensagem principal</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Dica opcional</p>
  </div>

Icones comuns:
  - ShieldOff / Package / Tag (estado vazio generico)
  - Loader2 com animate-spin (carregando)

=========================================================================
LOADING
=========================================================================

Spinner:
  <Loader2 size={20} className="animate-spin text-muted-foreground" />

Texto "Carregando...":
  <div className="p-6 text-sm text-muted-foreground">Carregando...</div>

Botao em submit:
  {isSubmitting ? "Salvando..." : "Salvar"}
  com disabled={isSubmitting}

=========================================================================
FORMATACAO DE DADOS
=========================================================================

Data (pt-BR):
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

Data + hora:
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

Tempo relativo (usado em sessoes):
  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `ha ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `ha ${h}h`;
    const d = Math.floor(h / 24);
    return `ha ${d}d`;
  }

Preco (BRL):
  Number(price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

Preco (Decimal do Prisma): vem como string. Sempre converter com Number().

=========================================================================
ACESSIBILIDADE
=========================================================================

  - Botoes so com icone: SEMPRE title="..." e aria-label="..."
  - Inputs: SEMPRE label associado (ou placeholder claro)
  - Modais: foco vai pro primeiro input (autoFocus)
  - Botao "Cancelar" sempre antes de "Confirmar" (ordem visual)
  - ESC fecha modais
  - Clique fora fecha modais

=========================================================================
QUANDO CRIAR UMA TELA NOVA
=========================================================================

1. Ler este DESIGN-SYSTEM.md + CONTEXTO do projeto
2. Seguir o padrao de uma tela existente similar
   (products ou categories sao bons modelos)
3. Usar classes do tema (bg-card, text-foreground, border-border)
   - NAO usar cores hardcoded do Tailwind (exceto estados)
4. Componentes reutilizaveis:
   - <CanButton> / <CanGhostButton> pra acoes com permission
   - <ConfirmDialog> pra acoes destrutivas
   - <Combobox> pra select com busca
   - <PasswordInput> pra campos de senha
5. Testar em tema claro E escuro
6. Testar em tela pequena (responsivo)

=========================================================================
CHECKLIST ANTES DE COMMITAR UI
=========================================================================

  [ ] Nao usei cores hardcoded (bg-white, text-stone-500, etc)
  [ ] Usei bg-card / bg-background / text-foreground / border-border
  [ ] Testei em tema claro E escuro
  [ ] Icones tem title + aria-label (se so icone)
  [ ] Modais fecham com ESC e clique fora
  [ ] Botoes tem disabled quando estao carregando
  [ ] Toasts pra feedback de sucesso/erro
  [ ] Empty state quando lista vazia
  [ ] Loading state enquanto carrega
  [ ] Responsivo (se aplicavel)

=========================================================================
REFERENCIA DE COMPONENTES EXISTENTES
=========================================================================

Para copiar padrao, ver:
  - Pagina de lista: products/page.tsx ou categories/page.tsx
  - Modal de form: product-modal.tsx ou category-modal.tsx
  - Item de lista: product-list-item.tsx ou category-list-item.tsx
  - Modal de sessoes (lista complexa): sessions/sessions-modal.tsx
  - Layout com sidebar: app/(dashboard)/layout.tsx
  - Menu de usuario: layout/user-menu.tsx
  - Combobox: shared/combobox.tsx
  - ConfirmDialog: shared/confirm-dialog.tsx