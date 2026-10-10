import 'dotenv/config';

import * as bcrypt from 'bcrypt';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const permissions = [
  ['iam.users.read', 'Visualizar usuários'],
  ['iam.users.create', 'Criar usuários'],
  ['iam.users.update', 'Alterar usuários'],
  ['iam.users.delete', 'Excluir usuários'],

  ['iam.roles.read', 'Visualizar roles'],
  ['iam.roles.create', 'Criar roles'],
  ['iam.roles.update', 'Alterar roles'],
  ['iam.roles.delete', 'Excluir roles'],

  ['iam.permissions.read', 'Visualizar permissions'],

  ['platform.tenants.read', 'Visualizar tenants'],
  ['platform.tenants.create', 'Criar tenants'],
  ['platform.tenants.update', 'Alterar tenants'],
  ['platform.tenants.delete', 'Excluir tenants'],

  ['catalog.categories.read', 'Visualizar categorias'],
  ['catalog.categories.create', 'Criar categorias'],
  ['catalog.categories.update', 'Alterar categorias'],
  ['catalog.categories.delete', 'Excluir categorias'],

  ['catalog.products.read', 'Visualizar produtos'],
  ['catalog.products.create', 'Criar produtos'],
  ['catalog.products.update', 'Alterar produtos'],
  ['catalog.products.delete', 'Excluir produtos'],

  ['observabilidade.visaogeral.read', ' Visão geral'],
  ['observabilidade.applicacao.read', 'Visualizar aplicação'],
  ['observabilidade.bancodedados.read', 'Visualizar banco de dados'],
  ['observabilidade.logs.read', 'Visualizar logs']

];

async function main() {
  /*
   * ---------------------------------------------------------
   * 1. PERMISSIONS
   * ---------------------------------------------------------
   */

  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {
        description,
      },
      create: {
        key,
        description,
        userId: 'BOOTSTRAP',
      },
    });
  }

  console.log(`Permissions criadas/atualizadas: ${permissions.length}`);

  /*
   * ---------------------------------------------------------
   * 2. USUÁRIO DE PLATAFORMA
   * ---------------------------------------------------------
   */

  const platformEmail = 'admin@plataforma.com';
  const platformPassword = '123456';

  const passwordHash = await bcrypt.hash(platformPassword, 10);

  let platformUser = await prisma.user.findFirst({
    where: {
      email: platformEmail,
      tenantId: null,
      deleted: false,
    },
  });

  if (!platformUser) {
    platformUser = await prisma.user.create({
      data: {
        name: 'Administrador da Plataforma',
        email: platformEmail,
        password: passwordHash,
        tenantId: null,

        // Bootstrap inicial: ainda não existe usuário autenticado.
        userId: 'BOOTSTRAP',
      },
    });

    console.log(`Usuário de plataforma criado: ${platformUser.email}`);
  } else {
    console.log(`Usuário de plataforma já existe: ${platformUser.email}`);
  }

  /*
   * ---------------------------------------------------------
   * 3. ROLE DE PLATAFORMA
   * ---------------------------------------------------------
   */

  let platformRole = await prisma.role.findFirst({
    where: {
      tenantId: null,
      name: 'platform_admin',
      deleted: false,
    },
  });

  if (!platformRole) {
    platformRole = await prisma.role.create({
      data: {
        name: 'platform_admin',
        tenantId: null,

        // Bootstrap inicial.
        userId: platformUser.id,
      },
    });

    console.log('Role de plataforma criada: platform_admin');
  } else {
    console.log('Role de plataforma já existe: platform_admin');
  }

  /*
   * ---------------------------------------------------------
   * 4. VINCULA TODAS AS PERMISSIONS À ROLE
   * ---------------------------------------------------------
   */

  for (const [key] of permissions) {
    const permission = await prisma.permission.findUnique({
      where: {
        key,
      },
    });

    if (!permission) {
      continue;
    }

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: platformRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: platformRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('Permissions vinculadas à role platform_admin');

  /*
   * ---------------------------------------------------------
   * 5. VINCULA ROLE AO USUÁRIO
   * ---------------------------------------------------------
   */

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: platformUser.id,
        roleId: platformRole.id,
      },
    },
    update: {},
    create: {
      userId: platformUser.id,
      roleId: platformRole.id,
    },
  });

  console.log('Role vinculada ao usuário de plataforma');

  /*
   * ---------------------------------------------------------
   * RESUMO
   * ---------------------------------------------------------
   */

  console.log('');
  console.log('======================================');
  console.log('Bootstrap concluído');
  console.log('======================================');
  console.log(`Usuário: ${platformUser.email}`);
  console.log(`Tenant: ${platformUser.tenantId}`);
  console.log(`Role: ${platformRole.name}`);
  console.log(`Permissões: ${permissions.length}`);
  console.log('======================================');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
