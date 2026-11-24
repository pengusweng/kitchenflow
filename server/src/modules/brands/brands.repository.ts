import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBrandDTO } from './dto/create-brand.dto';
import { Prisma } from '@prisma/client';
import { UpdateBrandDTO } from './dto/update-brand.dto';
import type { BrandStatusFilter } from './dto/find-brands.dto';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBrand(
    dto: CreateBrandDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.brand.create({
      data: {
        name: dto.name,
        code: dto.code,
        logo_url: dto.logo_url,
      },
    });
  }

  async findOneBrand(
    brandId: string,
    activeOnly = true,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.brand.findUnique({
      where: {
        brand_id: brandId,
        is_active: activeOnly ? true : undefined,
      },
    });
  }

  async findOneBrandByCode(
    brandCode: string,
    activeOnly = true,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.brand.findUnique({
      where: {
        code: brandCode,
        is_active: activeOnly ? true : undefined,
      },
    });
  }

  async findAllBrands(
    skip: number,
    take: number,
    { status, search }: { status: BrandStatusFilter; search?: string },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    // Everything except status, which the per-status counts below vary.
    const matchesSearch = this.searchWhere(search);
    const where: Prisma.BrandWhereInput = {
      ...matchesSearch,
      is_active: status === 'all' ? undefined : status === 'active',
    };

    const brandsQuery = tx.brand.findMany({
      where,
      skip,
      take,
      orderBy: [{ created_at: 'desc' }, { brand_id: 'asc' }],
    });
    // Per-status counts honour the search but not the status filter, so a
    // client can label every status tab from a single response.
    const activeQuery = tx.brand.count({
      where: { ...matchesSearch, is_active: true },
    });
    const inactiveQuery = tx.brand.count({
      where: { ...matchesSearch, is_active: false },
    });

    const [brands, active, inactive] =
      '$transaction' in tx
        ? await tx.$transaction([brandsQuery, activeQuery, inactiveQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([brandsQuery, activeQuery, inactiveQuery]);

    return { brands, counts: { all: active + inactive, active, inactive } };
  }

  // Every whitespace-separated term must match the name or code, so
  // "king kafe" finds "King Kungs Kafe".
  private searchWhere(search?: string): Prisma.BrandWhereInput {
    const terms = search?.split(/\s+/).filter(Boolean) ?? [];
    if (terms.length === 0) return {};

    return {
      AND: terms.map((term) => ({
        OR: (['name', 'code'] as const).map((field) => ({
          [field]: { contains: term, mode: 'insensitive' },
        })),
      })),
    };
  }

  async updateBrand(
    brandId: string,
    dto: UpdateBrandDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.brand.update({
      where: {
        brand_id: brandId,
        is_active: true,
      },
      data: {
        code: dto.code,
        name: dto.name,
        logo_url: dto.logo_url,
        modified_at: new Date(),
      },
    });
  }

  async deleteBrand(brandId: string) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const brand = await tx.brand.update({
        where: {
          brand_id: brandId,
          is_active: true,
        },
        data: {
          is_active: false,
          modified_at: now,
        },
      });

      await tx.menuItem.updateMany({
        where: {
          brand_id: brandId,
          is_active: true,
        },
        data: {
          is_active: false,
          modified_at: now,
        },
      });

      await tx.recipe.updateMany({
        where: {
          brand_id: brandId,
          is_active: true,
        },
        data: {
          is_active: false,
          modified_at: now,
        },
      });

      return brand;
    });
  }
}
