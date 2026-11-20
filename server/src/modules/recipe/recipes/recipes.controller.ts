import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  Authenticated,
  type AuthenticatedRequest,
} from '../../auth/auth.guard';
import { FindRecipesDTO } from './dto/find-recipes.dto';
import { RecipesService } from './recipes.service';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Audit, fromParam } from '../../../shared/audit/audit.decorator';
import {
  FindManyRecipesDocs,
  FindOneRecipeDocs,
  RecipesDocs,
} from './docs/recipes.docs';

@Controller('recipes')
@RecipesDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(
  UserRole.SUPERADMIN,
  UserRole.RECIPE_MANAGER,
  UserRole.SUPERVISOR,
  UserRole.KITCHEN_HEAD,
  UserRole.INVENTORY_STAFF,
  UserRole.KITCHEN_STAFF,
)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @FindManyRecipesDocs()
  findMany(
    @Query() query: FindRecipesDTO,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.recipesService.findMany(request.session.user.user_id, query);
  }

  @Get(':id')
  @FindOneRecipeDocs()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.recipesService.findOne(request.session.user.user_id, id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  @Audit({
    action: 'RECIPE_DEACTIVATED',
    snapshot: 'update',
    entity: 'recipes',
    id: fromParam('id'),
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipesService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  @Audit({
    action: 'RECIPE_REACTIVATED',
    snapshot: 'update',
    entity: 'recipes',
    id: fromParam('id'),
  })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipesService.reactivate(id);
  }
}
