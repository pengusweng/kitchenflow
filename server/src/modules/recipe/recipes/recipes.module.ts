import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RecipesController } from './recipes.controller';
import { RecipesRepository } from './recipes.repository';
import { RecipesService } from './recipes.service';
import { BrandsModule } from '../../brands/brands.module';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [PrismaModule, ConfigModule, BrandsModule, UsersModule],
  controllers: [RecipesController],
  providers: [RecipesService, RecipesRepository],
  exports: [RecipesRepository],
})
export class RecipesModule {}
