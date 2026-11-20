import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipeHistoriesModule } from '../recipe-histories/recipe-histories.module';
import { RecipeIngredientsModule } from '../recipe-ingredients/recipe-ingredients.module';
import { RecipeStepsModule } from '../recipe-steps/recipe-steps.module';
import { RecipesModule } from '../recipes/recipes.module';
import { UnitsModule } from '../../units/units.module';
import { RecipeAuthoringController } from './recipe-authoring.controller';
import { RecipeAuthoringService } from './recipe-authoring.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    RecipesModule,
    RecipeIngredientsModule,
    RecipeStepsModule,
    RecipeHistoriesModule,
    UnitsModule,
  ],
  controllers: [RecipeAuthoringController],
  providers: [RecipeAuthoringService],
})
export class RecipeAuthoringModule {}
