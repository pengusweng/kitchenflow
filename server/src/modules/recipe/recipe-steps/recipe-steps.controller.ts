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
import { RecipeStepsService } from './recipe-steps.service';
import {
  FindManyRecipeStepsDocs,
  FindOneRecipeStepDocs,
  RecipeStepsDocs,
} from './docs/recipe-steps.docs';

@Controller('recipe-steps')
@RecipeStepsDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(
  UserRole.SUPERADMIN,
  UserRole.RECIPE_MANAGER,
  UserRole.SUPERVISOR,
  UserRole.KITCHEN_HEAD,
  UserRole.INVENTORY_STAFF,
  UserRole.KITCHEN_STAFF,
)
export class RecipeStepsController {
  constructor(private readonly recipeStepsService: RecipeStepsService) {}

  @Get('recipe/:recipeId')
  @FindManyRecipeStepsDocs()
  findMany(@Param('recipeId', ParseUUIDPipe) recipeId: string) {
    return this.recipeStepsService.findMany(recipeId);
  }

  @Get(':id')
  @FindOneRecipeStepDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipeStepsService.findOne(id);
  }
}
