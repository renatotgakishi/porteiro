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
  - O MESMO Redis (cache de permissions - ver secoes especificas)
  - Os MESMOS padroes de codigo (ver abaixo)

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

=========================================================================
DIVISAO DOS ARQUIVOS DE CONTEXTO
=========================================================================

Leia este arquivo (COMUM) SEMPRE.

Depois leia o especifico:
  - CONTEXTO-PORTEIRO.md      -> auth server
  - CONTEXTO-STARTER-KIT.md   -> produto-cliente

Cada especifico tem:
  - Estrutura de pastas
  - Portas e endpoints
  - O que ele faz de diferente
  - Debitos tecnicos proprios
  - Proximas tarefas

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