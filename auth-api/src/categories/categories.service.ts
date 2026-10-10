import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    createCategoryDto: CreateCategoryDto,
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        tenantId: user.tenantId,
        userId: user.id,
      },
    });
  }

  findAll(user: { id: string; tenantId: string | null }) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return this.prisma.category.findMany({
      where: {
        tenantId: user.tenantId,
        deleted: false,
      },
      orderBy: {
        name: 'asc',
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

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deleted: false,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    user: { id: string; tenantId: string | null },
  ) {
    if (!user.tenantId) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deleted: false,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return this.prisma.category.update({
      where: {
        id,
      },
      data: {
        ...updateCategoryDto,
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

    const category = await this.prisma.category.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deleted: false,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    return this.prisma.category.update({
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