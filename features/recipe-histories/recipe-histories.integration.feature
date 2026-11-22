@backend @integration @recipe-histories
Feature: Recipe history listing endpoint (integration)
  GET /recipe-histories/recipe/:recipeId lists a recipe's snapshots for recipe managers and superadmins, and audits the read.

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.http.spec.ts
  # Context: Recipe histories listing HTTP endpoint
  @IT-RCPH-001
  Scenario: List a recipe's history and audit the read
    Test Case ID: IT-RCPH-001
    Given a recipe manager
    When a recipe's history is listed
    Then the snapshots are returned and RECIPE_HISTORY_LISTED is audited against the recipe

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.http.spec.ts
  # Context: Recipe histories listing HTTP endpoint
  @IT-RCPH-002
  Scenario: Reject a non-UUID recipe ID
    Test Case ID: IT-RCPH-002
    Given a recipe ID that is not a UUID
    When its history is listed
    Then the response is 400 before calling the service

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.http.spec.ts
  # Context: Recipe histories listing HTTP endpoint
  @IT-RCPH-003
  Scenario: Return not found for a missing recipe
    Test Case ID: IT-RCPH-003
    Given a recipe the service cannot find
    When its history is listed
    Then the response is 404

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.http.spec.ts
  # Context: Recipe histories listing HTTP endpoint
  @IT-RCPH-004
  Scenario: Deny roles other than recipe managers and superadmins
    Test Case ID: IT-RCPH-004
    Given a role other than recipe manager or superadmin
    When a recipe's history is listed
    Then the response is 403 before calling the service

  # Jest: server/src/modules/recipe/recipe-histories/tests/recipe-histories.http.spec.ts
  # Context: Recipe histories listing HTTP endpoint
  @IT-RCPH-005
  Scenario: Allow recipe managers and superadmins
    Test Case ID: IT-RCPH-005
    Given a recipe manager or superadmin
    When a recipe's history is listed
    Then the response is 200
