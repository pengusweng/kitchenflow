import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class RecipeHistoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.RecipeHistoryUncheckedCreateInput,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeHistory.create({ data });
  }

  /** Newest version first. */
  async findMany(
    recipeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeHistory.findMany({
      where: { recipe_id: recipeId },
      orderBy: { version: 'desc' },
    });
  }

  async findOne(
    recipeHistoryId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeHistory.findUnique({
      where: { recipe_history_id: recipeHistoryId },
    });
  }
}
