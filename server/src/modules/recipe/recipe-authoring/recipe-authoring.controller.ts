import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../../auth/auth.guard';
import {
  Audit,
  fromParam,
  fromResult,
} from '../../../shared/audit/audit.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import {
  CreateFullRecipeDocs,
  RecipeAuthoringDocs,
  UpdateFullRecipeDocs,
} from './docs/recipe-authoring.docs';
import { CreateFullRecipeDTO } from './dto/create-full-recipe.dto';
import { UpdateFullRecipeDTO } from './dto/update-full-recipe.dto';
import { RecipeAuthoringService } from './recipe-authoring.service';

// Shares the `recipes` prefix with RecipesController, which only has GET routes.
@Controller('recipes')
@RecipeAuthoringDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
export class RecipeAuthoringController {
  constructor(
    private readonly recipeAuthoringService: RecipeAuthoringService,
  ) {}

  @Post()
  @Audit({
    action: 'RECIPE_CREATED',
    entity: 'recipes',
    id: fromResult('recipe_id'),
  })
  @CreateFullRecipeDocs()
  create(@Body() dto: CreateFullRecipeDTO) {
    return this.recipeAuthoringService.create(dto);
  }

  @Patch(':id')
  @Audit({
    action: 'RECIPE_UPDATED',
    entity: 'recipes',
    id: fromParam('id'),
  })
  @UpdateFullRecipeDocs()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFullRecipeDTO,
  ) {
    return this.recipeAuthoringService.update(id, dto);
  }
}
