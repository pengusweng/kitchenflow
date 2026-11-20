import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../auth/auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RecipeIngredientsService } from './recipe-ingredients.service';
import {
  FindManyRecipeIngredientsDocs,
  FindOneRecipeIngredientDocs,
  RecipeIngredientsDocs,
} from './docs/recipe-ingredients.docs';

@Controller('recipe-ingredients')
@RecipeIngredientsDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(
  UserRole.SUPERADMIN,
  UserRole.RECIPE_MANAGER,
  UserRole.SUPERVISOR,
  UserRole.KITCHEN_HEAD,
  UserRole.INVENTORY_STAFF,
  UserRole.KITCHEN_STAFF,
)
export class RecipeIngredientsController {
  constructor(
    private readonly recipeIngredientsService: RecipeIngredientsService,
  ) {}

  @Get('recipe/:recipeId')
  @FindManyRecipeIngredientsDocs()
  findMany(@Param('recipeId', ParseUUIDPipe) recipeId: string) {
    return this.recipeIngredientsService.findMany(recipeId);
  }

  @Get(':id')
  @FindOneRecipeIngredientDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipeIngredientsService.findOne(id);
  }
}
