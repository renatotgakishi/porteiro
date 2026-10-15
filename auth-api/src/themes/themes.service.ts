import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(dto: CreateThemeDto, actor: { id: string }) {
    const slug = dto.slug ? this.generateSlug(dto.slug) : this.generateSlug(dto.name);

    const exists = await this.prisma.theme.findFirst({
      where: { slug, deleted: false },
    });
    if (exists) throw new ConflictException('Já existe um tema com esse slug');

    return this.prisma.theme.create({
      data: {
        name: dto.name,
        slug,
        style: dto.style ?? 'flat',
        density: dto.density ?? 'comfortable',
        status: dto.status ?? 'draft',
        colorsLight: dto.colorsLight,
        colorsDark: dto.colorsDark,
        backgroundLight: dto.backgroundLight,
        backgroundDark: dto.backgroundDark,
        glassConfig: dto.glassConfig ?? null,
        neumorphConfig: (dto as any).neumorphConfig ?? null,
        shadows: dto.shadows ?? null,
        radius: dto.radius ?? null,
        typography: dto.typography ?? null,
        userId: actor.id,
      },
    });
  }

  async findAll() {
    return this.prisma.theme.findMany({
      where: { deleted: false },
      orderBy: { dateAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const theme = await this.prisma.theme.findFirst({
      where: { id, deleted: false },
    });
    if (!theme) throw new NotFoundException('Tema não encontrado');
    return theme;
  }

  async update(id: string, dto: UpdateThemeDto, actor: { id: string }) {
    const theme = await this.prisma.theme.findFirst({
      where: { id, deleted: false },
    });
    if (!theme) throw new NotFoundException('Tema não encontrado');

    if (dto.slug || dto.name) {
      const slugToCheck = dto.slug ? this.generateSlug(dto.slug) : dto.name ? this.generateSlug(dto.name) : theme.slug;
      const dup = await this.prisma.theme.findFirst({
        where: { slug: slugToCheck, deleted: false, NOT: { id } },
      });
      if (dup) throw new ConflictException('Já existe um tema com esse slug');
      if (dto.slug) dto.slug = slugToCheck;
      if (dto.name && !dto.slug) dto.slug = undefined;
    }

    return this.prisma.theme.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: this.generateSlug(dto.slug) }),
        ...(dto.style !== undefined && { style: dto.style }),
        ...(dto.density !== undefined && { density: dto.density }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.colorsLight !== undefined && { colorsLight: dto.colorsLight }),
        ...(dto.colorsDark !== undefined && { colorsDark: dto.colorsDark }),
        ...(dto.backgroundLight !== undefined && { backgroundLight: dto.backgroundLight }),
        ...(dto.backgroundDark !== undefined && { backgroundDark: dto.backgroundDark }),
        ...(dto.glassConfig !== undefined && { glassConfig: dto.glassConfig }),
        ...((dto as any).neumorphConfig !== undefined && { neumorphConfig: (dto as any).neumorphConfig }),
        ...(dto.shadows !== undefined && { shadows: dto.shadows }),
        ...(dto.radius !== undefined && { radius: dto.radius }),
        ...(dto.typography !== undefined && { typography: dto.typography }),
        userId: actor.id,
        dateAt: new Date(),
      },
    });
  }

  async remove(id: string, actor: { id: string }) {
    const theme = await this.prisma.theme.findFirst({
      where: { id, deleted: false },
    });
    if (!theme) throw new NotFoundException('Tema não encontrado');

    await this.prisma.tenant.updateMany({
      where: { themeId: id, deleted: false },
      data: { themeId: null, userId: actor.id, dateAt: new Date() },
    });

    return this.prisma.theme.update({
      where: { id },
      data: { deleted: true, userId: actor.id, dateAt: new Date() },
    });
  }
}