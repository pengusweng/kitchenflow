@backend @unit @recipe-steps
Feature: Recipe step administration

  @UT-RCPS-001
  Scenario: Creates sequential steps on an active recipe
    Given unordered sequential steps and an active recipe
    When they are created
    Then save them in the order sent

  @UT-RCPS-002
  Scenario: Sorts step numbers numerically
    Given ten shuffled steps
    When they are created
    Then sort the step numbers numerically and accept them

  @UT-RCPS-003
  Scenario: Rejects duplicate step numbers
    Given duplicate step numbers
    When steps are created
    Then throw DUPLICATE_STEP_NO before any query

  @UT-RCPS-004
  Scenario: Rejects non-sequential step numbers
    Given non-sequential step numbers
    When steps are created
    Then throw NON_SEQUENTIAL_STEP_NUMBERS before any query

  @UT-RCPS-005
  Scenario: Rejects creating steps on a missing or inactive recipe
    Given a missing or inactive recipe
    When steps are created
    Then throw RECIPE_NOT_FOUND without writing

  @UT-RCPS-006
  Scenario: Lists the steps of an active recipe
    Given an active recipe
    When its steps are listed
    Then return the steps of the recipe

  @UT-RCPS-007
  Scenario: Rejects listing steps of a missing or inactive recipe
    Given a missing or inactive recipe
    When its steps are listed
    Then throw RECIPE_NOT_FOUND without querying steps

  @UT-RCPS-008
  Scenario: Returns an existing step
    Given an existing step
    When it is fetched
    Then return it

  @UT-RCPS-009
  Scenario: Reports an unknown step
    Given an unknown step
    When it is fetched
    Then throw RECIPE_STEP_NOT_FOUND

  @UT-RCPS-010
  Scenario: Updates a step of an active recipe
    Given a step of an active recipe
    When it is updated
    Then check its recipe and save the changes

  @UT-RCPS-011
  Scenario: Rejects updating an unknown step
    Given an unknown step
    When it is updated
    Then throw not found without checking the recipe or writing

  @UT-RCPS-012
  Scenario: Rejects updating a step of an inactive recipe
    Given a step of an inactive recipe
    When it is updated
    Then throw RECIPE_NOT_FOUND without writing

  @UT-RCPS-013
  Scenario: Hard deletes a step of an active recipe
    Given a step of an active recipe
    When it is deleted
    Then hard delete and return it

  @UT-RCPS-014
  Scenario: Rejects deleting an unknown step
    Given an unknown step
    When it is deleted
    Then throw not found without checking the recipe or deleting

  @UT-RCPS-015
  Scenario: Rejects deleting a step of an inactive recipe
    Given a step of an inactive recipe
    When it is deleted
    Then throw RECIPE_NOT_FOUND without deleting

  @UT-RCPS-016
  Scenario: Passes the transaction client through
    Given a transaction client
    When every method runs
    Then pass it to every repository call
