import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeIngredientsRepository } from './recipe-ingredients.repository';
import { RecipeIngredientsService } from './recipe-ingredients.service';

@Module({
  imports: [PrismaModule, RecipesModule],
  providers: [RecipeIngredientsService, RecipeIngredientsRepository],
  exports: [RecipeIngredientsRepository],
})
export class RecipeIngredientsModule {}
