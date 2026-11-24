import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CreateRecipeIngredientDTO } from './dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDTO } from './dto/update-recipe-ingredient.dto';

@Injectable()
export class RecipeIngredientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    recipeId: string,
    dto: CreateRecipeIngredientDTO,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.create({
      data: { ...dto, recipe_id: recipeId },
    });
  }

  async createMany(
    recipeId: string,
    ingredients: CreateRecipeIngredientDTO[],
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.recipeIngredient.createManyAndReturn({
      data: ingredients.map((ingredient) => ({
        recipe_id: recipeId,
        ingredient_name: ingredient.ingredient_name,
        quantity: ingredient.quantity,
        unit_code: ingredient.unit_code,
        note: ingredient.note,
      })),
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
        modified_at: new Date(),
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
