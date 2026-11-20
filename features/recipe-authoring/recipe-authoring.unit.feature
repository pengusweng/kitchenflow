@backend @unit @recipe-authoring
Feature: Recipe authoring in one transaction

  @UT-RCPA-001
  Scenario: Authors a full recipe
    Given a full recipe
    When it is authored
    Then return the recipe with its created ingredients and steps

  @UT-RCPA-002
  Scenario: Keeps child arrays out of the recipe row
    Given a full recipe
    When it is authored
    Then create the recipe row without the ingredients and steps arrays

  @UT-RCPA-003
  Scenario: Shares the recipe ID and transaction across writes
    Given a full recipe
    When it is authored
    Then pass the new recipe ID and the same transaction to every write

  @UT-RCPA-004
  Scenario: Snapshots the history last
    Given a full recipe
    When it is authored
    Then snapshot the history only after the recipe, ingredients and steps exist

  @UT-RCPA-005
  Scenario: Stops when the brand is missing
    Given a missing or inactive brand
    When a recipe is authored
    Then throw without writing ingredients, steps or history

  @UT-RCPA-006
  Scenario: Stops on invalid ingredients
    Given invalid ingredients
    When a recipe is authored
    Then throw from the transaction without writing steps or history

  @UT-RCPA-007
  Scenario: Stops on invalid steps
    Given invalid steps
    When a recipe is authored
    Then throw from the transaction without writing history

  @UT-RCPA-008
  Scenario: Rolls back when the snapshot fails
    Given the history snapshot fails
    When a recipe is authored
    Then throw from the transaction so every write rolls back

  @UT-RCPA-009
  Scenario: Updates recipe fields and snapshots the new version
    Given only recipe field changes
    When the recipe is updated
    Then bump it in one transaction, snapshot it last and return it with its children

  @UT-RCPA-010
  Scenario: Rejects updates without changes
    Given an empty body or only empty mutation lists
    When the recipe is updated
    Then throw NO_RECIPE_CHANGES before opening a transaction

  @UT-RCPA-011
  Scenario: Treats clearing formulation notes as a change
    Given formulation notes set to null
    When the recipe is updated
    Then treat clearing them as a change

  @UT-RCPA-012
  Scenario: Applies ingredient deletes, updates and creates in order
    Given ingredient create, update and delete
    When the recipe is updated
    Then delete, update, then create them with the same transaction

  @UT-RCPA-013
  Scenario: Rejects children that belong to another recipe
    Given an ingredient or step ID from another recipe
    When the recipe is updated
    Then throw RECIPE_INGREDIENT_NOT_FOUND or RECIPE_STEP_NOT_FOUND without writing children or history

  @UT-RCPA-014
  Scenario: Rejects edits that would leave an invalid recipe
    Given conflicting mutations, no remaining ingredients or steps, a duplicate ingredient name or a duplicate step number
    When the recipe is updated
    Then throw the matching 400 code without writing children or history

  @UT-RCPA-015
  Scenario: Rejects unknown unit codes
    Given an unknown unit code
    When an ingredient is changed
    Then throw NON_EXISTING_UNIT without writing

  @UT-RCPA-016
  Scenario: Closes the gap after a step is deleted
    Given steps 1, 2, 3
    When step 2 is deleted
    Then renumber the old step 3 to 2 and leave step 1 alone

  @UT-RCPA-017
  Scenario: Swaps steps without hitting the unique index
    Given steps 1 and 2 swapped
    When the recipe is updated
    Then park both on negative numbers before writing the final numbers

  @UT-RCPA-018
  Scenario: Appends a step with a high number
    Given a new step numbered 99
    When the recipe is updated
    Then create it as the next step number

  @UT-RCPA-019
  Scenario: Keeps the number on instruction-only edits
    Given an instruction-only change
    When the recipe is updated
    Then keep the step number and save the instruction

  @UT-RCPA-020
  Scenario: Stops when the recipe is missing or inactive
    Given a missing or inactive recipe
    When it is updated
    Then throw without reading or writing its children
