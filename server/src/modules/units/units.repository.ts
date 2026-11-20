import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUnitDTO } from './dto/create-unit.dto';
import { UpdateUnitDTO } from './dto/update-unit.dto';
import { FindUnitsDTO } from './dto/find-units.dto';

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateUnitDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.unit.create({
      data: dto,
    });
  }

  async findAll(
    skip: number,
    take: number,
    { search, dimension }: Pick<FindUnitsDTO, 'search' | 'dimension'>,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const where: Prisma.UnitWhereInput = {
      ...this.searchWhere(search),
      dimension,
    };

    const unitsQuery = tx.unit.findMany({
      where,
      skip,
      take,
      orderBy: [{ dimension: 'asc' }, { to_base: 'asc' }, { code: 'asc' }],
    });
    const totalQuery = tx.unit.count({ where });

    const [units, total] =
      '$transaction' in tx
        ? await tx.$transaction([unitsQuery, totalQuery], {
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          })
        : await Promise.all([unitsQuery, totalQuery]);

    return { units, total };
  }

  private searchWhere(search?: string): Prisma.UnitWhereInput {
    const terms = search?.split(/\s+/).filter(Boolean) ?? [];
    if (terms.length === 0) return {};

    return {
      AND: terms.map((term) => ({
        OR: (['code', 'name'] as const).map((field) => ({
          [field]: { contains: term, mode: 'insensitive' },
        })),
      })),
    };
  }

  async findOne(
    code: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.unit.findUnique({
      where: { code },
    });
  }

  async countIngredients(
    code: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.count({
      where: { unit_code: code },
    });
  }

  async update(
    code: string,
    dto: UpdateUnitDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.unit.update({
      where: { code },
      data: {
        name: dto.name,
        dimension: dto.dimension,
        to_base: dto.to_base,
      },
    });
  }

  async delete(
    code: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.unit.delete({
      where: { code },
    });
  }
}
