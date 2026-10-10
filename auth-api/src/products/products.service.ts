import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateProductDto,
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return this.prisma.product.create({
      data: {
        ...data,
        tenantId: user.tenantId,
        userId: user.id,
      },
    });
  }

  async findAll(
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        deleted: false,
      },
      include: {
        category: true,
      },
      orderBy: {
        dateAt: 'desc',
      },
    });
  }

  async findByCategory(
    page = 1,
    limit = 10,
    search?: string,
    categoryId?: number,
    user?: { id: string; tenantId: string | null },
  ) {
    if (!user?.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const skip = (page - 1) * limit;

    return this.prisma.product.findMany({
      skip,
      take: limit,
      where: {
        tenantId: user.tenantId,
        deleted: false,

        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }),

        ...(categoryId && {
          categoryId,
        }),
      },
      include: {
        category: true,
      },
      orderBy: {
        dateAt: 'desc',
      },
    });
  }

  async findOne(
    id: number,
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deleted: false,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }

  async update(
    id: number,
    data: UpdateProductDto,
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deleted: false,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        ...data,
        userId: user.id,
        dateAt: new Date(),
      },
    });
  }

  async remove(
    id: number,
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deleted: false,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        userId: user.id,
        dateAt: new Date(),
        deleted: true,
      },
    });
  }
}