import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UnitsRepository } from '../../units/units.repository';
import { RecipeHistoriesService } from '../recipe-histories/recipe-histories.service';
import { RecipeIngredientsRepository } from '../recipe-ingredients/recipe-ingredients.repository';
import { RecipeIngredientsService } from '../recipe-ingredients/recipe-ingredients.service';
import { RecipeStepsRepository } from '../recipe-steps/recipe-steps.repository';
import { RecipeStepsService } from '../recipe-steps/recipe-steps.service';
import { RecipesService } from '../recipes/recipes.service';
import { CreateFullRecipeDTO } from './dto/create-full-recipe.dto';
import {
  RecipeIngredientMutationsDTO,
  RecipeStepMutationsDTO,
  UpdateFullRecipeDTO,
} from './dto/update-full-recipe.dto';

@Injectable()
export class RecipeAuthoringService {
  private readonly logger = new Logger(RecipeAuthoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipesService: RecipesService,
    private readonly recipeIngredientsService: RecipeIngredientsService,
    private readonly recipeStepsService: RecipeStepsService,
    private readonly recipeHistoriesService: RecipeHistoriesService,
    private readonly recipeIngredientsRepository: RecipeIngredientsRepository,
    private readonly recipeStepsRepository: RecipeStepsRepository,
    private readonly unitsRepository: UnitsRepository,
  ) {}

  async create(dto: CreateFullRecipeDTO) {
    this.logger.debug(`Authoring recipe ${dto.code}`);

    const { ingredients, steps, ...recipeDto } = dto;
    const result = await this.prisma.$transaction(async (tx) => {
      const recipe = await this.recipesService.create(recipeDto, tx);

      const recipeIngredients = await this.recipeIngredientsService.createMany(
        recipe.recipe_id,
        ingredients,
        tx,
      );

      const recipeSteps = await this.recipeStepsService.createMany(
        recipe.recipe_id,
        steps,
        tx,
      );

      await this.recipeHistoriesService.create(
        { recipe_id: recipe.recipe_id },
        tx,
      );

      return { ...recipe, ingredients: recipeIngredients, steps: recipeSteps };
    });

    this.logger.log(`Authored recipe ${result.code} v${result.version}`);
    return result;
  }

  async update(recipeId: string, dto: UpdateFullRecipeDTO) {
    this.logger.debug(`Editing recipe ${recipeId}`);

    const { ingredients = {}, steps = {}, ...recipeDto } = dto;
    const result = await this.prisma.$transaction(async (tx) => {
      const recipe = await this.recipesService.update(recipeId, recipeDto, tx);

      const recipeIngredients = await this.applyIngredientMutations(
        recipeId,
        ingredients,
        tx,
      );
      const recipeSteps = await this.applyStepMutations(recipeId, steps, tx);

      await this.recipeHistoriesService.create({ recipe_id: recipeId }, tx);

      return { ...recipe, ingredients: recipeIngredients, steps: recipeSteps };
    });

    this.logger.log(`Edited recipe ${result.code} to v${result.version}`);
    return result;
  }

  private async applyIngredientMutations(
    recipeId: string,
    mutations: RecipeIngredientMutationsDTO,
    tx: Prisma.TransactionClient,
  ) {
    const { create = [], update = [], delete: remove = [] } = mutations;
    const current = await this.recipeIngredientsRepository.findMany(
      recipeId,
      tx,
    );

    const targets = [...update.map((i) => i.recipe_ingredient_id), ...remove];
    this.assertDistinctTargets(targets, 'CONFLICTING_INGREDIENT_MUTATIONS');
    const currentById = new Map(
      current.map((i) => [i.recipe_ingredient_id, i]),
    );
    for (const id of targets) {
      assertExists(currentById.get(id), 'RecipeIngredient', id, this.logger);
    }

    const removed = new Set(remove);
    const updates = new Map(update.map((i) => [i.recipe_ingredient_id, i]));
    const finalNames = [
      ...current
        .filter((i) => !removed.has(i.recipe_ingredient_id))
        .map(
          (i) =>
            updates.get(i.recipe_ingredient_id)?.ingredient_name ??
            i.ingredient_name,
        ),
      ...create.map((i) => i.ingredient_name),
    ];
    if (finalNames.length === 0) {
      throw new BadRequestException({
        code: 'RECIPE_INGREDIENTS_REQUIRED',
        message: 'A recipe must keep at least one ingredient',
      });
    }
    this.assertNoDuplicateNames(finalNames);
    await this.assertExistingUnits(
      [...create, ...update]
        .map((i) => i.unit_code)
        .filter((code): code is string => code !== undefined),
      tx,
    );

    for (const id of remove) {
      await this.recipeIngredientsRepository.delete(id, tx);
    }
    for (const { recipe_ingredient_id, ...changes } of update) {
      await this.recipeIngredientsRepository.update(
        recipe_ingredient_id,
        changes,
        tx,
      );
    }
    if (create.length > 0) {
      await this.recipeIngredientsRepository.createMany(recipeId, create, tx);
    }

    return this.recipeIngredientsRepository.findMany(recipeId, tx);
  }

  private async applyStepMutations(
    recipeId: string,
    mutations: RecipeStepMutationsDTO,
    tx: Prisma.TransactionClient,
  ) {
    const { create = [], update = [], delete: remove = [] } = mutations;
    const current = await this.recipeStepsRepository.findMany(recipeId, tx);

    const targets = [...update.map((s) => s.recipe_step_id), ...remove];
    this.assertDistinctTargets(targets, 'CONFLICTING_STEP_MUTATIONS');
    const currentById = new Map(current.map((s) => [s.recipe_step_id, s]));
    for (const id of targets) {
      assertExists(currentById.get(id), 'RecipeStep', id, this.logger);
    }

    // Order the surviving and new steps by their requested numbers, then
    // renumber them 1, 2, 3… so gaps (e.g. after a delete) close automatically.
    const removed = new Set(remove);
    const updates = new Map(update.map((s) => [s.recipe_step_id, s]));
    const ordered = [
      ...current
        .filter((s) => !removed.has(s.recipe_step_id))
        .map((s) => ({
          requested: updates.get(s.recipe_step_id)?.step_no ?? s.step_no,
          existing: s,
          created: undefined,
        })),
      ...create.map((s) => ({
        requested: s.step_no,
        existing: undefined,
        created: s,
      })),
    ].sort((a, b) => a.requested - b.requested);
    if (ordered.length === 0) {
      throw new BadRequestException({
        code: 'RECIPE_STEPS_REQUIRED',
        message: 'A recipe must keep at least one step',
      });
    }
    this.assertNoDuplicateStepNos(ordered.map((s) => s.requested));
    const final = ordered.map((s, index) => ({ ...s, step_no: index + 1 }));

    for (const id of remove) {
      await this.recipeStepsRepository.delete(id, tx);
    }
    const kept = final.flatMap(({ existing, step_no }) =>
      existing ? [{ existing, step_no }] : [],
    );
    // Park moved steps on negative numbers first so swaps never collide
    // with the (recipe_id, step_no) unique index mid-transaction.
    const moved = kept.filter((s) => s.step_no !== s.existing.step_no);
    for (const [index, { existing }] of moved.entries()) {
      await this.recipeStepsRepository.update(
        existing.recipe_step_id,
        { step_no: -(index + 1) },
        tx,
      );
    }
    for (const { existing, step_no } of kept) {
      const instruction = updates.get(existing.recipe_step_id)?.instruction;
      if (step_no === existing.step_no && instruction === undefined) continue;
      await this.recipeStepsRepository.update(
        existing.recipe_step_id,
        { step_no, instruction },
        tx,
      );
    }
    const created = final.flatMap(({ created, step_no }) =>
      created ? [{ ...created, step_no }] : [],
    );
    if (created.length > 0) {
      await this.recipeStepsRepository.createMany(recipeId, created, tx);
    }

    return this.recipeStepsRepository.findMany(recipeId, tx);
  }

  private assertDistinctTargets(ids: string[], code: string) {
    if (new Set(ids).size !== ids.length) {
      this.logger.warn(`Same item targeted more than once: ${code}`);
      throw new BadRequestException({
        code,
        message: 'Each item can be updated or deleted only once per request',
      });
    }
  }

  private assertNoDuplicateNames(names: string[]) {
    const normalized = names.map((name) => name.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      this.logger.warn('Duplicate ingredient name found.');
      throw new BadRequestException({
        code: 'DUPLICATE_INGREDIENT_NAME',
        message: 'Ingredient must be unique',
      });
    }
  }

  private async assertExistingUnits(
    unitCodes: string[],
    tx: Prisma.TransactionClient,
  ) {
    for (const code of new Set(unitCodes)) {
      const unit = await this.unitsRepository.findOne(code, tx);
      if (!unit) {
        throw new BadRequestException({
          code: 'NON_EXISTING_UNIT',
          message: 'Enter an existing unit code',
        });
      }
    }
  }

  // Two steps asking for the same number have no defined order, so reject them.
  private assertNoDuplicateStepNos(stepNos: number[]) {
    if (new Set(stepNos).size !== stepNos.length) {
      this.logger.warn('Duplicate step number detected.');
      throw new BadRequestException({
        code: 'DUPLICATE_STEP_NO',
        message: 'Step numbers must be unique within a recipe',
      });
    }
  }
}
