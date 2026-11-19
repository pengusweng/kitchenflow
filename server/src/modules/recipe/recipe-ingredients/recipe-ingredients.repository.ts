import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateRecipeIngredientDTO } from './dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDTO } from './dto/update-recipe-ingredient.dto';

@Injectable()
export class RecipeIngredientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateRecipeIngredientDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.create({
      data: dto,
    });
  }

  async findOne(
    recipeIngredientId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.findUnique({
      where: { recipe_ingredient_id: recipeIngredientId },
    });
  }

  async findMany(
    recipeId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.findMany({
      where: { recipe_id: recipeId },
      orderBy: [{ ingredient_name: 'asc' }, { recipe_ingredient_id: 'asc' }],
    });
  }

  async update(
    recipeIngredientId: string,
    dto: UpdateRecipeIngredientDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.update({
      where: { recipe_ingredient_id: recipeIngredientId },
      data: {
        ingredient_name: dto.ingredient_name,
        quantity: dto.quantity,
        unit_code: dto.unit_code,
        note: dto.note,
      },
    });
  }

  async delete(
    recipeIngredientId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.delete({
      where: { recipe_ingredient_id: recipeIngredientId },
    });
  }
}
