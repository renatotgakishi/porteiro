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

Existe tambem um DESIGN-SYSTEM.md que descreve o padrao visual do
frontend (cores, componentes, espacamento). Cole junto quando for
mexer em UI.

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
  - O MESMO Redis (cache de permissions)
  - Os MESMOS padroes de codigo (ver abaixo)
  - O MESMO design system (ver DESIGN-SYSTEM.md)

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
  - Redis (ioredis)
  - cookie-parser
  - nodemailer (envio de email)
  - @nestjs/throttler (rate limiting)

Frontend (Next.js 16):
  - App Router + Turbopack
  - React 19
  - TypeScript
  - TailwindCSS 4
  - Zustand 5
  - zod
  - sonner (toasts)
  - lucide-react

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
  platform.* -> tenants
  catalog.*  -> categories, products

Acoes: read, create, update, delete.

=========================================================================
AUTENTICACAO (igual nos dois projetos)
=========================================================================

Transporte:
  - access_token  -> JWT, 15 min, cookie httpOnly, Path=/
  - refresh_token -> string opaca (256 bits hex), 7 dias, cookie httpOnly, Path=/

Frontend NUNCA ve os tokens (cookies httpOnly).
Toda chamada usa credentials: 'include'.

JwtAuthGuard aceita cookie httpOnly OU Bearer (dual).
Motivo: curl/Swagger/Postman precisam funcionar.

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
  8. Backend valida token, atualiza senha, consome token,
     revoga TODAS as sessoes do user
  9. User loga com a nova senha

Mesmo mecanismo serve pra reset de senha (esqueci):
  - type = 'reset' em vez de 'invite'
  - Endpoint POST /auth/forgot-password gera o token

Expiração: VERIFICATION_TOKEN_TTL_HOURS no .env (padrao 24h).
Tokens sao de USO UNICO (consumidos apos validacao).
Um novo token do mesmo user + tipo invalida os anteriores.

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
  POST /auth/login            -> 5 / 1 min   (IP + email)
  POST /auth/register         -> 3 / 1 hora  (IP)
  POST /auth/refresh          -> 30 / 1 min  (IP)
  POST /auth/forgot-password  -> 5 / 15 min  (email)
  POST /auth/set-password     -> 10 / 15 min (IP)
  POST /auth/change-password  -> 5 / 15 min  (user)

DEBITO: os outros controllers (products, categories, users, tenants,
roles, permissions, user-roles, sessions) NAO tem rate limit ainda.
Aplicar manualmente com @UseGuards(ThrottlerGuard) ou
@UseGuards(UserThrottlerGuard) no topo do controller.
Sugestao de limites por controller esta no CONTEXTO-PORTEIRO.md.

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
  - Nao usar classes Tailwind hardcoded (usar as do tema, ver DESIGN-SYSTEM.md)

=========================================================================
DIVISAO DOS ARQUIVOS DE CONTEXTO
=========================================================================

Leia este arquivo (COMUM) SEMPRE.

Depois leia o especifico:
  - CONTEXTO-PORTEIRO.md      -> auth server
  - CONTEXTO-STARTER-KIT.md   -> produto-cliente
  - DESIGN-SYSTEM.md          -> padrao visual (opcional, so se for UI)

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