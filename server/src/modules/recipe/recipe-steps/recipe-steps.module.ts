import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeStepsController } from './recipe-steps.controller';
import { RecipeStepsRepository } from './recipe-steps.repository';
import { RecipeStepsService } from './recipe-steps.service';

@Module({
  imports: [PrismaModule, ConfigModule, RecipesModule],
  controllers: [RecipeStepsController],
  providers: [RecipeStepsService, RecipeStepsRepository],
  exports: [RecipeStepsService, RecipeStepsRepository],
})
export class RecipeStepsModule {}
