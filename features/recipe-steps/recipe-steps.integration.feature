@backend @integration @recipe-steps
Feature: Recipe step HTTP contracts

  @IT-RCPS-001
  Scenario: Lists the steps of a recipe
    Given a recipe ID
    When its steps are listed
    Then return the steps of the recipe

  @IT-RCPS-002
  Scenario: Returns one step
    Given a step ID
    When one step is fetched
    Then return it

  @IT-RCPS-003
  Scenario: Rejects non-UUID IDs
    Given a non-UUID ID
    When either read endpoint is called
    Then return 400 without calling the service

  @IT-RCPS-004
  Scenario: Reports missing recipes and steps
    Given a missing recipe or step
    When either read endpoint is called
    Then return 404

  @IT-RCPS-005
  Scenario: Denies cashiers
    Given a cashier
    When recipe steps are read
    Then deny both read endpoints without calling the service

  @IT-RCPS-006
  Scenario: Allows every non-cashier role
    Given a non-cashier role
    When recipe steps are read
    Then allow both read endpoints

  @IT-RCPS-007
  Scenario: Exposes no write endpoints
    Given a write method
    When it is sent to recipe steps
    Then return 404 because only reads are exposed
