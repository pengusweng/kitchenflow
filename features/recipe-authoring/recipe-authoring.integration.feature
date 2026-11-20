@backend @integration @recipe-authoring
Feature: Recipe authoring HTTP contracts

  @IT-RCPA-001
  Scenario: Creates a full recipe
    Given a valid full recipe
    When it is posted
    Then return 201 with the recipe, ingredients and steps

  @IT-RCPA-002
  Scenario: Requires ingredients and steps
    Given missing or empty ingredients or steps
    When the recipe is posted
    Then return 400 without calling the service

  @IT-RCPA-003
  Scenario: Validates nested ingredients and steps
    Given an invalid ingredient or step
    When the recipe is posted
    Then return 400 without calling the service

  @IT-RCPA-004
  Scenario: Validates recipe fields
    Given invalid recipe fields
    When the recipe is posted
    Then return 400 without calling the service

  @IT-RCPA-005
  Scenario: Passes service errors through on create
    Given the service rejects the recipe
    When it is posted
    Then return its 404 or 400 status

  @IT-RCPA-006
  Scenario: Denies recipe creation to other roles
    Given a role other than recipe manager or superadmin
    When a recipe is posted
    Then return 403 without calling the service

  @IT-RCPA-007
  Scenario: Allows recipe managers and superadmins to create
    Given a recipe manager or superadmin
    When a recipe is posted
    Then return 201

  @IT-RCPA-008
  Scenario: Reports duplicate recipe codes as conflicts
    Given a duplicate recipe code
    When a recipe is posted
    Then return 409 DUPLICATE_RESOURCE

  @IT-RCPA-009
  Scenario: Updates a recipe with its mutations
    Given recipe fields and ingredient and step mutations
    When the recipe is patched
    Then return 200 and pass them to the service

  @IT-RCPA-010
  Scenario: Rejects non-UUID recipe IDs on update
    Given a non-UUID recipe ID
    When the recipe is patched
    Then return 400 without calling the service

  @IT-RCPA-011
  Scenario: Validates update mutations
    Given an invalid mutation, an unknown mutation key, a non-object mutation block or an invalid recipe field
    When the recipe is patched
    Then return 400 without calling the service

  @IT-RCPA-012
  Scenario: Passes service errors through on update
    Given the service rejects the edit
    When the recipe is patched
    Then return its 404, 400 or 409 status

  @IT-RCPA-013
  Scenario: Denies recipe updates to other roles
    Given a role other than recipe manager or superadmin
    When a recipe is patched
    Then return 403 without calling the service

  @IT-RCPA-014
  Scenario: Allows recipe managers and superadmins to update
    Given a recipe manager or superadmin
    When a recipe is patched
    Then return 200
