@backend @unit @recipe-histories
Feature: Recipe history listing (unit)
  Recipe managers read every saved version of a recipe, newest first, including retired recipes.

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.service.spec.ts
  # Context: RecipeHistoriesService listing
  @UT-RCPH-001
  Scenario: List a recipe's snapshots whether the recipe is active or not
    Test Case ID: UT-RCPH-001
    Given a recipe, active or inactive
    When its history is listed
    Then its snapshots are returned

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.service.spec.ts
  # Context: RecipeHistoriesService listing
  @UT-RCPH-002
  Scenario: Reject listing the history of an unknown recipe
    Test Case ID: UT-RCPH-002
    Given a recipe ID that does not exist
    When its history is listed
    Then not found is thrown without reading histories

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.service.spec.ts
  # Context: RecipeHistoriesRepository listing
  @UT-RCPH-003
  Scenario: Read a recipe's histories newest version first
    Test Case ID: UT-RCPH-003
    Given a recipe ID
    When histories are read
    Then only that recipe's rows are queried, ordered by version descending
