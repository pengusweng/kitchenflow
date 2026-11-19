import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipeIngredientsModule } from '../recipe-ingredients/recipe-ingredients.module';
import { RecipeStepsModule } from '../recipe-steps/recipe-steps.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeHistoriesController } from './recipe-histories.controller';
import { RecipeHistoriesRepository } from './recipe-histories.repository';
import { RecipeHistoriesService } from './recipe-histories.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    RecipesModule,
    RecipeIngredientsModule,
    RecipeStepsModule,
  ],
  controllers: [RecipeHistoriesController],
  providers: [RecipeHistoriesService, RecipeHistoriesRepository],
  exports: [RecipeHistoriesService, RecipeHistoriesRepository],
})
export class RecipeHistoriesModule {}
