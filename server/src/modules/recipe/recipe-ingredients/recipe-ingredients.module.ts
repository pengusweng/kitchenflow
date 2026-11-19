import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipeIngredientsRepository } from './recipe-ingredients.repository';

@Module({
  imports: [PrismaModule],
  providers: [RecipeIngredientsRepository],
  exports: [RecipeIngredientsRepository],
})
export class RecipeIngredientsModule {}
