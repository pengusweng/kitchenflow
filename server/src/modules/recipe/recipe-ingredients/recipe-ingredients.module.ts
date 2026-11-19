import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { UnitsModule } from '../../units/units.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeIngredientsController } from './recipe-ingredients.controller';
import { RecipeIngredientsRepository } from './recipe-ingredients.repository';
import { RecipeIngredientsService } from './recipe-ingredients.service';

@Module({
  imports: [PrismaModule, ConfigModule, RecipesModule, UnitsModule],
  controllers: [RecipeIngredientsController],
  providers: [RecipeIngredientsService, RecipeIngredientsRepository],
  exports: [RecipeIngredientsRepository],
})
export class RecipeIngredientsModule {}
