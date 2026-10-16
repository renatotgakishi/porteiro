# CONTEXTO COMUM - PORTEIRO E STARTER-KIT

Documento-base para qualquer IA continuar o desenvolvimento.
Aplica-se a DOIS projetos:
  - PORTEIRO (auth server)
  - STARTER-KIT (template de produto-cliente)

Para cada um, existe um arquivo complementar:
  - CONTEXTO-PORTEIRO.md
  - CONTEXTO-STARTER-KIT.md

Este arquivo (COMUM) deve ser colado SEMPRE. Junto com ele, cole o
arquivo especifico do projeto que voce quer trabalhar.

Existem tambem arquivos de apoio:
  - DESIGN-SYSTEM.md      -> padrao visual (cores, componentes)
  - SISTEMA-DE-TEMAS.md   -> subsistema de temas (schema, endpoints, UI)
  - REGRAS-DE-COMPORTAMENTO.md -> como a IA deve se comportar (se existir)

=========================================================================
REGRA DE OURO: NAO REDESENHAR ARQUITETURA
=========================================================================

Todas as decisoes abaixo foram tomadas, testadas e implementadas.
Nao criar:
  - isSuperAdmin hardcoded
  - if (role === 'admin')
  - permissions dentro do JWT
  - "platform tenant"
  - TenantDatabase, databaseMode, JwtStrategy
  - CRUD de Permission (permissions sao somente leitura)
  - coisas idiomaticas que NAO foram pedidas

Forma de trabalho obrigatoria:
  1. Uma etapa por vez. Nunca avancar sem o dev testar a anterior.
  2. Pedir o conteudo atual do arquivo antes de alterar arquivos importantes.
  3. Entregar arquivos INTEIROS (nao pedacos) quando for alterar.
     - Excecao: se for diff trivial (1-2 linhas), entregar so o diff.
  4. Backend e frontend em lotes separados. Backend primeiro, testar
     por curl, depois frontend.
  5. Se o dev pedir script de teste, entregar como arquivo .sh.
  6. Se o markdown do chat quebrar (problema recorrente), mandar
     conteudo em TEXTO PURO pro dev colar no VS Code.

Nao concordar por concordar. Se algo estiver errado, dizer.
O dev prefere ser corrigido.

=========================================================================
FILOSOFIA
=========================================================================

O PORTEIRO e a AUTORIDADE FINAL de seguranca.
Ele faz autenticacao + autorizacao + multi-tenancy.

O STARTER-KIT e um CLIENTE do Porteiro.
Ele NAO TEM IAM proprio. Toda autenticacao e permissao vem do Porteiro.

Os dois projetos compartilham:
  - A MESMA arquitetura de pastas (NestJS backend + Next.js frontend)
  - O MESMO JWT_SECRET (o Porteiro assina, os clientes validam)
  - O MESMO Redis (cache de permissions) - COM SENHA
  - Os MESMOS padroes de codigo (ver abaixo)
  - O MESMO design system (ver DESIGN-SYSTEM.md)
  - O MESMO sistema de temas (ver SISTEMA-DE-TEMAS.md)

=========================================================================
STACK
=========================================================================

Backend (NestJS 12):
  - TypeScript
  - PostgreSQL 17 (Docker)
  - Prisma 7.10 (NAO migrar para 8 sem decisao explicita)
  - @prisma/adapter-pg / PrismaPg
  - JWT (@nestjs/jwt)
  - bcrypt
  - class-validator + class-transformer
  - Swagger
  - nestjs-pino + pino + pino-http + pino-pretty + pino-loki
  - prom-client + Prometheus
  - Redis (ioredis) - COM SENHA (REDIS_PASSWORD)
  - cookie-parser
  - nodemailer (envio de email)
  - @nestjs/throttler (rate limiting)
  - google-auth-library (OAuth Google)

Frontend (Next.js 16):
  - App Router + Turbopack
  - React 19
  - TypeScript
  - TailwindCSS 4
  - Zustand 5
  - zod
  - sonner (toasts)
  - lucide-react
  - next-themes (light/dark/system)

Prisma Client gerado em src/generated/prisma.
Config em prisma/prisma.config.ts.

=========================================================================
CONVENCOES DE CODIGO
=========================================================================

Auditoria (entidades de negocio):
  - userId    -> ultimo usuario que alterou
  - dateAt    -> data da ultima alteracao
  - deleted   -> soft delete
  NAO USAR: createdAt / updatedAt / deletedAt / createdBy / updatedBy

Sessoes NAO tem auditoria (nao sao entidade de negocio).

Tenant:
  - Coluna tenantId existe em TODA entidade de negocio
  - User normal: pertence a EXATAMENTE 1 tenant
  - User de plataforma: tenantId = null (admin global)
  - NAO EXISTE "platform tenant"
  - Roles tambem podem ter tenantId = null

Formato de permissions:
  <dominio>.<recurso>.<acao>

Dominios:
  iam.*      -> users, roles, permissions
  platform.* -> tenants, themes
  catalog.*  -> categories, products

Acoes: read, create, update, delete.

EMAIL GLOBALMENTE UNICO:
  - User.email e unico GLOBALMENTE, nao por tenant.
  - Regra garantida no banco: @@unique([email]) no model User.
  - Motivo: o login so tem { email, password }. Se o email fosse
    unico por tenant, o login nao saberia qual tenant escolher.
    Exigiria o user informar o tenant (dropdown), o que e ruim de UX.
  - Consequencia: o mesmo email NAO pode existir em tenants diferentes.
  - Checado em:
      * UsersService.assertEmailGloballyUnique (create e update)
      * AuthService.register (checa antes de criar)
      * login (findMany, se achar >1, erro 500 de ambiguidade)
  - Se alguem inserir duplicata direto no banco, a migration falha
    e o login retorna 500. Melhor manter limpo.

=========================================================================
AUTENTICACAO
=========================================================================

Transporte:
  - access_token  -> JWT, 15 min, cookie httpOnly
  - refresh_token -> string opaca (256 bits hex), 7 dias, cookie httpOnly

COOKIES COM PREFIXO POR APLICACAO:

  O browser ignora porta pra cookies. localhost:3001 e localhost:4001
  compartilham cookie jar. Se os dois usam "access_token", um sobrescreve
  o outro. Solucao: cada app tem seu prefixo.

  Prefixos:
    admin_    -> admin-panel (:3001)
    starter_  -> starter-web (:4001)
    ''        -> legado (compatibilidade) + curl/Swagger

  Nomes reais:
    admin_access_token / admin_refresh_token
    starter_access_token / starter_refresh_token
    access_token / refresh_token (legado, sera removido)

  Deteccao: header Origin.
    Origin: http://localhost:3001 -> prefixo admin_
    Origin: http://localhost:4001 -> prefixo starter_
    Sem Origin (curl, Swagger) -> prefixo '' (fallback)

  No OAuth: callback hardcoda starter_ (nao tem Origin em navegacao
  top-level). Se um dia houver OAuth no admin-panel, passar ?client=.

  Arquivo: src/auth/cookie-prefix.ts (Porteiro).

  IMPORTANTE - NAO LIMPAR COOKIE DE OUTRO APP:
    O clearAuthCookies do login limpa APENAS o prefixo do cliente
    atual + o legado ('') . NUNCA limpa o prefixo de outro app.
    Se o starter loga, NAO pode derrubar a sessao do admin.

Frontend NUNCA ve os tokens (cookies httpOnly).
Toda chamada usa credentials: 'include'.

JwtAuthGuard aceita cookie httpOnly OU Bearer (dual).
Motivo: curl/Swagger/Postman precisam funcionar.

No STARTER-API, o JwtAuthGuard NAO consulta banco local.
Ele monta o request.user DIRETO do payload do JWT:
  { id: payload.sub, tenantId: payload.tenantId }
Motivo: o user vive no Porteiro, nao no starter.

Refresh Token Rotation (RTR):
  - Tabela Session guarda SHA-256 do refresh (NUNCA o valor bruto)
  - Cada /auth/refresh revoga a Session atual (reason='rotated'),
    cria uma nova, aponta replacedBySessionId
  - Deteccao de reuso: se token ja revogado por 'rotated' reaparece,
    revokeChain() revoga a cadeia inteira com 'reuse_detected'
  - revokedReason: 'logout' | 'rotated' | 'reuse_detected' | 'expired'
                   | 'admin_revoked' | 'user_revoked'

Cache de permissions:
  - Redis, chave perms:user:{userId}, TTL 5 min
  - invalidacao ativa (DEL) em:
      * UserRolesService.assign/remove
      * PermissionsService.assign/remove (roles <-> permissions)
      * RolesService.update / remove
      * UsersService.create / update / remove

=========================================================================
OAUTH (GOOGLE)
=========================================================================

Cenario B: OAuth SO para users que JA existem no Porteiro.
NAO cria user novo. Se o email verificado do Google nao casar com
nenhum User, rejeita com "voce precisa ser convidado".

Fluxo:
  1. Frontend redireciona o browser (window.location.href) para
     GET /auth/oauth/google no Porteiro.
  2. Porteiro gera state (32 bytes hex), seta cookie oauth_state
     (5 min, httpOnly), redireciona o browser pro Google.
  3. Google volta em GET /auth/oauth/google/callback?code=...&state=...
     (navegacao top-level, sem Origin).
  4. Porteiro valida state (cookie vs query), troca code por id_token,
     valida com google-auth-library (aud, iss, exp, assinatura).
  5. Exige email_verified=true no id_token.
  6. Casa o email com User existente (deleted=false).
  7. Valida tenant/licenca (mesmas regras do login por senha).
  8. Cria Account (provider='google', providerAccountId=sub) se nao
     existir. Se ja existir e apontar pra outro user, rejeita.
  9. Marca User.emailVerified=now() se estava null.
  10. Chama AuthService.issueSessionForUser (MESMA funcao do login).
  11. Seta cookies starter_access_token / starter_refresh_token.
  12. Redireciona pra OAUTH_SUCCESS_REDIRECT.
      Em caso de erro, redireciona pra OAUTH_FAILURE_REDIRECT?error=...

Env no Porteiro:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_CALLBACK_URL="http://localhost:3000/auth/oauth/google/callback"
  OAUTH_SUCCESS_REDIRECT="http://localhost:4001/dashboard"
  OAUTH_FAILURE_REDIRECT="http://localhost:4001/login"

Model Account (reduzida):
  id, userId, provider, providerAccountId, dateAt, deleted
  @@unique([provider, providerAccountId])
  @@index([userId])

NAO guardar access_token/refresh_token/id_token do Google.
Motivo: nao vamos chamar APIs do Google em nome do user. Dado sensivel
parado sem uso.

O callback NUNCA devolve JSON. Sempre redirect HTTP (302).
Motivo: quem navega e o browser, nao o JS. JSON puro nao chega no frontend.

Frontend:
  - Botao "Entrar com Google" no /login do starter-web.
  - E um LINK (window.location.href), NAO fetch.
  - Trata ?error= na URL de retorno (mostra toast, limpa a query).

=========================================================================
2FA / STEP-UP (PLANEJADO - NAO IMPLEMENTADO)
=========================================================================

Escopo: 2FA NAO e no login. E em ACOES CRITICAS especificas.

User loga normal (email + senha). Quando tenta uma acao critica
(ex: deletar registro financeiro), o backend exige prova extra.

Implementacao: @RequireStepUp() como decorator SEPARADO de
@RequirePermissions(). Motivo: manter declaracao explicita no endpoint,
nao depender de sufixo no nome da permission.
  grep @RequireStepUp src/  -> lista todos os endpoints criticos.

Permission = "o que pode". Step-up = "como provar". Coisas diferentes.
NAO criar permissions tipo iam.users.delete.2fa.

Schema (User):
  twoFactorMethod       String?   // null | 'totp' | 'email'
  twoFactorSecret       String?   // so quando method='totp' (unico por user)
  twoFactorCodeHash     String?   // so quando method='email' e codigo pendente
  twoFactorCodeExpires  DateTime? // expiracao do codigo pendente

SEM TABELA NOVA. O codigo temporario (metodo 'email') mora no User.
Nao precisa de historico.

Fluxo do step-up:
  1. User logado tenta acao critica.
  2. StepUpGuard ve que nao tem 'elevated' valido -> 403 STEP_UP_REQUIRED.
  3. Frontend abre modal, mostra metodo ativo ('totp' ou 'email').
  4. User preenche:
     - 'totp': backend valida com otplib.verify(code, user.twoFactorSecret)
     - 'email': backend valida SHA-256(code) contra twoFactorCodeHash +
       twoFactorCodeExpires. Depois limpa os dois campos.
  5. Backend emite elevated token (cookie httpOnly, 5 min).
  6. Frontend refaz a acao.

User sem 2FA configurado:
  - Bloqueado em acoes criticas (StepUpGuard rejeita).
  - Self-service: o user configura 2FA sozinho no perfil (TOTP ou email).

Reset de TOTP (perdeu celular):
  - User clica "Perdi o celular" no modal.
  - Sistema notifica o admin (email).
  - Admin clica em "Resetar TOTP" no admin-panel.
  - Backend: twoFactorMethod = 'email', twoFactorSecret = null.
  - User NAO perde o 2FA. So troca de metodo.
  - Aviso por email pro user.

Nao implementado ainda. Fazer quando virar necessidade.

=========================================================================
MULTI-TENANCY - DUAS REGRAS
=========================================================================

Regra GERAL (modulos de negocio - products, categories):
  O tenant vem SEMPRE do JWT (actor.tenantId).
  O frontend NAO manda tenantId.

Regra ESPECIAL (IAM - users, roles, permissions, user-roles, tenants):
  O tenant vem do contexto explicito (query/DTO) quando o ator
  e de plataforma. Para usuario normal, o backend ignora e forca
  actor.tenantId.

  const effectiveTenantId =
    actor.tenantId !== null
      ? actor.tenantId
      : (input.tenantId ?? null);

=========================================================================
VERIFICATION TOKEN (convite + reset de senha)
=========================================================================

Modelo VerificationToken:
  - id         (cuid)
  - identifier (userId)
  - token      (SHA-256 do token cru, unico)
  - type       ('invite' | 'reset')
  - expires    (data de expiracao)
  - dateAt     (criacao)

Fluxo:
  1. Admin cria user com senha temporaria (123456)
  2. Admin clica em "Convidar" no admin-panel
  3. Backend gera token (raw = 32 bytes hex), grava hash
  4. Backend monta URL: {tenant.starterKitUrl}/set-password?token=xxx
     Se tenant.starterKitUrl nao existir, usa STARTER_KIT_URL do .env
  5. Envia email (driver console em dev, SMTP em prod)
  6. User clica no link -> tela /set-password
  7. User define nova senha -> POST /auth/set-password
  8. Backend valida token, atualiza senha, CONSUME o token,
     revoga TODAS as sessoes do user, e marca
     User.emailVerified = now() (provou que controla o email).
  9. User loga com a nova senha

Mesmo mecanismo serve pra reset de senha (esqueci):
  - type = 'reset' em vez de 'invite'
  - Endpoint POST /auth/forgot-password gera o token

Expiração: VERIFICATION_TOKEN_TTL_HOURS no .env (padrao 24h).
Tokens sao de USO UNICO (consumidos apos validacao).
Um novo token do mesmo user + tipo invalida os anteriores.

Variavel de ambiente correta: STARTER_KIT_URL
(NAO usar STARTER_IT_URL - ja foi corrigido).

=========================================================================
MAIL
=========================================================================

MailService com 2 drivers:
  - console (dev): imprime no stdout do backend E grava em logs/mail.log
  - smtp (prod): usa nodemailer, configurado via .env

Config no .env:
  MAIL_DRIVER=console | smtp
  MAIL_FROM="Porteiro <no-reply@porteiro.local>"
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE

O arquivo logs/mail.log e essencial em dev: o tmux quebra linhas
longas (ex: URL com token de 64 chars), e o arquivo nao quebra.
Sempre ler o link do arquivo: tail -30 logs/mail.log

=========================================================================
RATE LIMITING (auth)
=========================================================================

@nestjs/throttler com storage Redis customizado
(src/common/throttler/throttler-redis.storage.ts).
O storage usa o RedisService (que ja tem a senha).

IMPORTANTE: o ThrottlerGuard global (APP_GUARD) foi REMOVIDO.
Motivo: rodava em paralelo com os guards customizados e gerava
2 chaves no Redis (uma por IP, outra por tracker customizado),
causando bloqueios incorretos.

Cada endpoint declara seu proprio @UseGuards(ThrottlerGuard) ou
um dos guards customizados.

Guards customizados:
  - LoginThrottlerGuard   -> chave = IP + email
  - EmailThrottlerGuard   -> chave = email (fallback IP)
  - UserThrottlerGuard    -> chave = user.id (fallback IP)

Limites atuais (auth.controller.ts):
  POST /auth/register         -> 3 / 1 hora  (IP)
  POST /auth/login            -> 5 / 1 min   (IP + email)
  POST /auth/refresh          -> 30 / 1 min  (IP)
  POST /auth/forgot-password  -> 5 / 15 min  (email)
  POST /auth/set-password     -> 10 / 15 min (IP)
  POST /auth/change-password  -> 5 / 15 min  (user)

HTTP STATUS CORRETO:
  POST /auth/register         -> 201 (cria user)
  POST /auth/login            -> 200 (@HttpCode(200))
  POST /auth/refresh          -> 200
  POST /auth/logout           -> 200
  POST /auth/forgot-password  -> 200
  POST /auth/set-password     -> 200
  POST /auth/change-password  -> 200

DEBITO: os outros controllers (products, categories, users, tenants,
roles, permissions, user-roles, sessions, themes) NAO tem rate limit
e usam 201 indiscriminado em @Post. Aplicar manualmente.

=========================================================================
REDIS
=========================================================================

O Redis tem SENHA (requirepass). Config em:
  - docker-compose.yml (services.redis.command com --requirepass)
  - .env de cada backend: REDIS_PASSWORD

Env obrigatoria (Porteiro + starter-api):
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD="..."

A senha e a MESMA nos dois (usam o mesmo Redis).

RedisInsight (:5540) NAO le .env. Precisa ser configurado manualmente
na UI com host `porteiro-redis`, port `6379` e a senha.

Em prod: NAO expor a porta 5540 do RedisInsight sem protecao.

=========================================================================
CORS
=========================================================================

Nao hardcodar origens. Ler de variavel de ambiente:

  CORS_ORIGINS="http://localhost:3001,http://localhost:4001"

Lista separada por virgula. Cada backend (Porteiro + starter-api) le
do proprio .env. Em prod, trocar pelas origens reais.

Implementado em main.ts de cada backend com a funcao getCorsOrigins().

=========================================================================
O QUE NAO FAZER (vale para os dois projetos)
=========================================================================

  - Nao usar localStorage para token ou permissions
  - Nao usar Authorization: Bearer no frontend (so cookie)
  - Nao usar strings antigas tipo "users:read" (sempre iam.users.read)
  - Nao colocar permissions no JWT
  - Nao criar isSystem / isSuperAdmin
  - Nao mexer em Pino / Loki / Prometheus / Grafana sem pedido explicito
  - Nao reorganizar diretorios sem decisao explicita
  - Nao usar confirm() nativo (usar o <ConfirmDialog> do projeto)
  - Nao usar classes Tailwind hardcoded (usar as do tema)
  - Nao limpar cookies de OUTRO app (prefixo diferente)
  - Nao devolver JSON em callback OAuth (sempre redirect 302)

=========================================================================
DIVISAO DOS ARQUIVOS DE CONTEXTO
=========================================================================

Leia este arquivo (COMUM) SEMPRE.

Depois leia o especifico:
  - CONTEXTO-PORTEIRO.md      -> auth server
  - CONTEXTO-STARTER-KIT.md   -> produto-cliente
  - DESIGN-SYSTEM.md          -> padrao visual (so se for UI)
  - SISTEMA-DE-TEMAS.md       -> subsistema de temas (so se for tema)

=========================================================================
COMO UMA IA DEVE TRABALHAR NESTE PROJETO
=========================================================================

1. Passo a passo. Nunca avancar sem o dev testar.

2. Pedir arquivos antes de alterar. Nao inventar campos, nomes de
   metodo ou de rota. Se nao viu, pergunte.

3. Nao concordar por concordar. Se algo estiver errado, diga.

4. Uma pergunta por vez quando houver decisao.

5. Sem redesign de arquitetura. As decisoes ja tomadas valem.

6. Sem code smells (ver "O que nao fazer").

7. Se for alterar um arquivo, entregar INTEIRO.

8. Multiplos arquivos = multiplos blocos, um por arquivo, com o
   caminho no topo.

9. Backend e frontend em lotes separados. Backend primeiro.

10. Se o dev pedir teste via curl, entregar um script em scripts/*.sh
    que faz o fluxo inteiro e imprime OK/FAIL.

11. Se o markdown do chat quebrar (problema recorrente), mandar
    conteudo em TEXTO PURO, e o dev cola no VS Code.