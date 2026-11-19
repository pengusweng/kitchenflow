import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateRecipeStepDTO } from './dto/create-recipe-step.dto';
import { UpdateRecipeStepDTO } from './dto/update-recipe-step.dto';

@Injectable()
export class RecipeStepsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    recipeId: string,
    dto: CreateRecipeStepDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeStep.create({
      data: {
        recipe_id: recipeId,
        step_no: dto.step_no,
        instruction: dto.instruction,
      },
    });
  }

  async createMany(
    recipeId: string,
    steps: CreateRecipeStepDTO[],
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeStep.createManyAndReturn({
      data: steps.map((step) => ({
        recipe_id: recipeId,
        step_no: step.step_no,
        instruction: step.instruction,
      })),
    });
  }

  async findOne(
    recipeStepId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeStep.findUnique({
      where: { recipe_step_id: recipeStepId },
    });
  }

  async findMany(
    recipeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeStep.findMany({
      where: { recipe_id: recipeId },
      orderBy: { step_no: 'asc' },
    });
  }

  async update(
    recipeStepId: string,
    dto: UpdateRecipeStepDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeStep.update({
      where: { recipe_step_id: recipeStepId },
      data: {
        step_no: dto.step_no,
        instruction: dto.instruction,
      },
    });
  }

  async delete(
    recipeStepId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeStep.delete({
      where: { recipe_step_id: recipeStepId },
    });
  }
}
