import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeStepsRepository } from './recipe-steps.repository';

@Module({
  imports: [PrismaModule, RecipesModule],
  providers: [RecipeStepsRepository],
  exports: [RecipeStepsRepository],
})
export class RecipeStepsModule {}
