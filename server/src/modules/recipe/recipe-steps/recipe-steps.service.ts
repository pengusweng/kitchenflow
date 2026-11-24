import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RecipeStepsRepository } from './recipe-steps.repository';
import { RecipesRepository } from '../recipes/recipes.repository';
import { CreateRecipeStepDTO } from './dto/create-recipe-step.dto';
import { UpdateRecipeStepDTO } from './dto/update-recipe-step.dto';
import { Prisma } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';

@Injectable()
export class RecipeStepsService {
  private readonly logger = new Logger(RecipeStepsService.name);

  constructor(
    private readonly recipeStepsRepository: RecipeStepsRepository,
    private readonly recipesRepository: RecipesRepository,
  ) {}

  async createMany(
    recipeId: string,
    steps: CreateRecipeStepDTO[],
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Creating ${steps.length} recipe steps for recipe ${recipeId}`,
    );

    const stepNos = steps.map((step) => step.step_no).sort((a, b) => a - b);
    this.assertNoDuplicateSteps(stepNos);
    this.assertSequentialSteps(stepNos);

    await this.assertActiveRecipe(recipeId, tx);

    const recipeSteps = await this.recipeStepsRepository.createMany(
      recipeId,
      steps,
      tx,
    );

    this.logger.log(
      `Created ${recipeSteps.length} recipe steps for recipe ${recipeId}`,
    );
    return recipeSteps;
  }

  async findMany(recipeId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Finding recipe steps for recipe ${recipeId}`);

    await this.assertActiveRecipe(recipeId, tx);

    const recipeSteps = await this.recipeStepsRepository.findMany(recipeId, tx);

    this.logger.log(
      `Found ${recipeSteps.length} recipe steps for recipe ${recipeId}`,
    );
    return recipeSteps;
  }

  async findOne(recipeStepId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Finding recipe step ${recipeStepId}`);

    const recipeStep = await this.recipeStepsRepository.findOne(
      recipeStepId,
      tx,
    );
    assertExists(recipeStep, 'RecipeStep', recipeStepId, this.logger);

    this.logger.log(`Recipe step ${recipeStep.recipe_step_id} found`);
    return recipeStep;
  }

  async update(
    recipeStepId: string,
    dto: UpdateRecipeStepDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Updating recipe step ${recipeStepId}`);

    const recipeStep = await this.findOne(recipeStepId, tx);
    await this.assertActiveRecipe(recipeStep.recipe_id, tx);

    const updated = await this.recipeStepsRepository.update(
      recipeStepId,
      dto,
      tx,
    );

    this.logger.log(
      `Updated recipe step ${updated.step_no} for recipe ${updated.recipe_id}`,
    );
    return updated;
  }

  async delete(recipeStepId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Deleting recipe step ${recipeStepId}`);

    const recipeStep = await this.findOne(recipeStepId, tx);
    await this.assertActiveRecipe(recipeStep.recipe_id, tx);

    const deleted = await this.recipeStepsRepository.delete(recipeStepId, tx);

    this.logger.log(
      `Deleted recipe step ${deleted.step_no} from recipe ${deleted.recipe_id}`,
    );
    return deleted;
  }

  private async assertActiveRecipe(
    recipeId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const recipe = await this.recipesRepository.findOne(
      recipeId,
      true,
      false,
      tx,
    );
    assertExists(recipe, 'Recipe', recipeId, this.logger);
    return recipe;
  }

  private assertNoDuplicateSteps(stepNos: number[]) {
    const stepSet = new Set(stepNos);

    if (stepSet.size !== stepNos.length) {
      this.logger.warn(`Duplicate step number detected.`);

      throw new BadRequestException({
        code: 'DUPLICATE_STEP_NO',
        message: 'Step numbers must be unique within a recipe',
      });
    }
  }

  private assertSequentialSteps(stepNos: number[]) {
    const isSequential = stepNos.every((stepNo, index) => stepNo === index + 1);

    if (!isSequential) {
      this.logger.warn(`Step numbers not sequential.`);

      throw new BadRequestException({
        code: 'NON_SEQUENTIAL_STEP_NUMBERS',
        message: 'Step numbers must run 1, 2, 3… with no gaps',
      });
    }
  }
}
