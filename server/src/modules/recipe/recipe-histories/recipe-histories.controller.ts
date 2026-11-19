import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateRecipeHistoryDTO } from './dto/create-recipe-history.dto';
import { RecipeHistoriesService } from './recipe-histories.service';
import {
  CreateRecipeHistoryDocs,
  FindOneRecipeHistoryDocs,
  RecipeHistoriesDocs,
} from './docs/recipe-histories.docs';

@Controller('recipe-histories')
@RecipeHistoriesDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
export class RecipeHistoriesController {
  constructor(
    private readonly recipeHistoriesService: RecipeHistoriesService,
  ) {}

  @Post()
  @Audit({
    action: 'RECIPE_HISTORY_CREATED',
    entity: 'recipe_histories',
    id: fromResult('recipe_history_id'),
  })
  @CreateRecipeHistoryDocs()
  create(@Body() dto: CreateRecipeHistoryDTO) {
    return this.recipeHistoriesService.create(dto);
  }

  @Get(':id')
  @Audit({
    action: 'RECIPE_HISTORY_VIEWED',
    entity: 'recipe_histories',
    id: fromParam('id'),
  })
  @FindOneRecipeHistoryDocs()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipeHistoriesService.findOne(id);
  }
}
