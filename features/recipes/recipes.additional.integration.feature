@backend @integration @recipes
Feature: Additional recipes integration coverage
  Feature ID: FEAT-RCP-IT-ADDITIONAL
  Requirement ID: FR-RCP-001

  As a backend maintainer,
  I want the recipes behavior documented alongside its executable tests,
  So that each result can be traced to its preconditions, action, and expected outcome.

  Parameterized Jest cases share a scenario; each report entry retains the executed
  Jest name and its concrete parameter values.

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-001
  Scenario: Deny unapproved recipe reads and writes with safe audit records
    Test Case ID: IT-RCP-001
    Given an authenticated role without an approved recipe grant and forged authority headers
    When recipe reads and writes are requested
    Then access is denied before recipe queries and safe denial audit entries are recorded

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-002
  Scenario: Allow recipe reads and writes under approved grants
    Test Case ID: IT-RCP-002
    Given an authenticated role with an approved recipe grant
    When recipe read and write operations are requested
    Then the recipe can be read and updated without denial audit entries

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-003
  Scenario: Reject invalid or revoked recipe delegation
    Test Case ID: IT-RCP-003
    Given an invalid or revoked recipe delegation
    When recipe reads and writes are requested
    Then access is denied without writing recipes or recording attempted secret content in audit

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-004
  Scenario: Reject recipe grants whose approver authority has been revoked
    Test Case ID: IT-RCP-004
    Given the grant approver no longer has valid authority
    When recipe reads and writes are requested
    Then access is denied without recipe writes

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-005
  Scenario: Keeps read and write capabilities independent
    Test Case ID: IT-RCP-005
    Given a grant allows only one of read and write
    When recipe read and write operations are requested
    Then each capability is authorized independently

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-006
  Scenario: Looks up the requested recipe scope, ignoring forged scope in the body
    Test Case ID: IT-RCP-006
    Given a request body forges role, brand, department, or write permission
    When a recipe update is requested
    Then authorization uses the requested recipe scope and denies the forged authority

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-007
  Scenario: Denies malformed IDs before validation and does not audit untrusted ID text
    Test Case ID: IT-RCP-007
    Given a recipe identifier is malformed and contains untrusted text
    When the recipe is requested
    Then access is denied and the audit entity ID is null instead of the untrusted value

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-008
  Scenario: Rejects expired or inactive authority
    Test Case ID: IT-RCP-008
    Given the authenticated authority is expired or inactive
    When the recipe is requested
    Then access is denied

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Confidential recipes HTTP authorization
  @IT-RCP-009
  Scenario: Still denies when audit storage fails
    Test Case ID: IT-RCP-009
    Given denial audit persistence fails
    When an unauthorized recipe read is requested
    Then the response remains a sanitized RECIPE_ACCESS_DENIED

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Recipe status changes
  @IT-RCP-010
  Scenario: Deactivates a recipe
    Test Case ID: IT-RCP-010
    Given a recipe manager
    When a recipe is deleted
    Then deactivate it and return 200

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Recipe status changes
  @IT-RCP-011
  Scenario: Reactivates a recipe
    Test Case ID: IT-RCP-011
    Given a recipe manager
    When a recipe is reactivated
    Then reactivate it and return 200

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Recipe status changes
  @IT-RCP-012
  Scenario: Rejects malformed IDs on status changes
    Test Case ID: IT-RCP-012
    Given a malformed recipe id
    When its status is changed
    Then reject both routes before the service

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Recipe status changes
  @IT-RCP-013
  Scenario: Reports unknown recipes on status changes
    Test Case ID: IT-RCP-013
    Given an unknown recipe
    When its status is changed
    Then return 404 from both routes

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Recipe status changes
  @IT-RCP-014
  Scenario: Denies status changes to other roles
    Test Case ID: IT-RCP-014
    Given a role other than recipe manager or superadmin
    When a recipe status is changed
    Then deny both routes without calling the service

  # Jest: server/src/modules/recipe/recipes/tests/recipes.http.spec.ts
  # Context: Recipe status changes
  @IT-RCP-015
  Scenario: Allows recipe managers and superadmins to change status
    Test Case ID: IT-RCP-015
    Given a recipe manager or superadmin
    When a recipe status is changed
    Then allow both routes
