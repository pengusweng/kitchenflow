@backend @unit @recipe-ingredients
Feature: Recipe ingredient administration

  @UT-RCPI-001
  Scenario: Creates an ingredient on an active recipe
    Given an active recipe
    When an ingredient is created
    Then check the recipe and persist the ingredient

  @UT-RCPI-002
  Scenario: Rejects creating an ingredient on a missing or inactive recipe
    Given a missing or inactive recipe
    When an ingredient is created
    Then throw RECIPE_NOT_FOUND without writing

  @UT-RCPI-003
  Scenario: Lists the ingredients of an active recipe
    Given an active recipe
    When its ingredients are listed
    Then return the ingredients of the recipe

  @UT-RCPI-004
  Scenario: Rejects listing ingredients of a missing or inactive recipe
    Given a missing or inactive recipe
    When its ingredients are listed
    Then throw RECIPE_NOT_FOUND without querying ingredients

  @UT-RCPI-005
  Scenario: Returns an existing ingredient
    Given an existing ingredient
    When it is fetched
    Then return it

  @UT-RCPI-006
  Scenario: Reports an unknown ingredient
    Given an unknown ingredient
    When it is fetched
    Then throw RECIPE_INGREDIENT_NOT_FOUND

  @UT-RCPI-007
  Scenario: Updates an ingredient of an active recipe
    Given an ingredient of an active recipe
    When it is updated
    Then check its recipe and save the changes

  @UT-RCPI-008
  Scenario: Rejects updating an unknown ingredient
    Given an unknown ingredient
    When it is updated
    Then throw not found without checking the recipe or writing

  @UT-RCPI-009
  Scenario: Rejects updating an ingredient of an inactive recipe
    Given an ingredient of an inactive recipe
    When it is updated
    Then throw RECIPE_NOT_FOUND without writing

  @UT-RCPI-010
  Scenario: Hard deletes an ingredient of an active recipe
    Given an ingredient of an active recipe
    When it is deleted
    Then hard delete and return it

  @UT-RCPI-011
  Scenario: Rejects deleting an unknown ingredient
    Given an unknown ingredient
    When it is deleted
    Then throw not found without checking the recipe or deleting

  @UT-RCPI-012
  Scenario: Rejects deleting an ingredient of an inactive recipe
    Given an ingredient of an inactive recipe
    When it is deleted
    Then throw RECIPE_NOT_FOUND without deleting

  @UT-RCPI-013
  Scenario: Passes the transaction client through
    Given a transaction client
    When every method runs
    Then pass it to every repository call
