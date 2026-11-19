@backend @integration @recipe-ingredients
Feature: Recipe ingredient HTTP contracts

  @IT-RCPI-001
  Scenario: Lists the ingredients of a recipe
    Given a recipe ID
    When its ingredients are listed
    Then return the ingredients of the recipe

  @IT-RCPI-002
  Scenario: Returns one ingredient
    Given an ingredient ID
    When one ingredient is fetched
    Then return it

  @IT-RCPI-003
  Scenario: Rejects non-UUID IDs
    Given a non-UUID ID
    When either read endpoint is called
    Then return 400 without calling the service

  @IT-RCPI-004
  Scenario: Reports missing recipes and ingredients
    Given a missing recipe or ingredient
    When either read endpoint is called
    Then return 404

  @IT-RCPI-005
  Scenario: Denies cashiers
    Given a cashier
    When recipe ingredients are read
    Then deny both read endpoints without calling the service

  @IT-RCPI-006
  Scenario: Allows every non-cashier role
    Given a non-cashier role
    When recipe ingredients are read
    Then allow both read endpoints

  @IT-RCPI-007
  Scenario: Exposes no write endpoints
    Given a write method
    When it is sent to recipe ingredients
    Then return 404 because only reads are exposed
