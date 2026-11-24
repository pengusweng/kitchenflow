@backend @integration @menu-catalog
Feature: Additional menu catalog integration coverage
  Feature ID: FEAT-MCAT-IT-ADDITIONAL
  Requirement ID: FR-MCAT-001

  As a backend maintainer,
  I want the menu catalog behavior documented alongside its executable tests,
  So that each result can be traced to its preconditions, action, and expected outcome.

  Parameterized Jest cases share a scenario; each report entry retains the executed
  Jest name and its concrete parameter values.

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-001
  Scenario: Creates a catalog entry for a superadmin assigned to its nested brand
    Test Case ID: IT-MCAT-001
    Given an authenticated superadmin with a valid PIN and nested catalog payload
    When the catalog entry is created
    Then the response is 201 and the complete entry is returned after PIN verification

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-002
  Scenario: List a brand catalog with default or custom pagination
    Test Case ID: IT-MCAT-002
    Given an authenticated user and default or custom pagination
    When a brand catalog is requested
    Then validated pagination reaches the service and no action PIN is required

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-003
  Scenario: Requires authentication to create and list entries
    Test Case ID: IT-MCAT-003
    Given no authenticated session
    When catalog creation or listing is requested
    Then the response is 401 before calling the service

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-004
  Scenario: Rejects creation by roles that cannot create menu items
    Test Case ID: IT-MCAT-004
    Given a cashier role without menu creation permission
    When catalog creation is requested
    Then the response is 403 without creating an entry

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-005
  Scenario: Creates entries across brands
    Test Case ID: IT-MCAT-005
    Given an authenticated superadmin and a catalog payload for another brand
    When the entry is created
    Then the response is 201 under shared brand access

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-006
  Scenario: Lists any brand
    Test Case ID: IT-MCAT-006
    Given an authenticated employee and another brand identifier
    When that brand's catalog is requested
    Then the response is 200

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-007
  Scenario: Requires an action PIN for creation
    Test Case ID: IT-MCAT-007
    Given an authenticated superadmin without an action PIN
    When catalog creation is requested
    Then the response is 403 before creating an entry

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-008
  Scenario: Require a valid brand in the nested menu item payload
    Test Case ID: IT-MCAT-008
    Given a catalog payload with a missing or invalid nested brand
    When catalog creation is requested
    Then the response is 400

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-009
  Scenario: Validates nested modifier IDs
    Test Case ID: IT-MCAT-009
    Given a catalog payload containing an invalid modifier UUID
    When catalog creation is requested
    Then the response is 400 before creating an entry

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-010
  Scenario: Reject invalid pagination
    Test Case ID: IT-MCAT-010
    Given invalid catalog pagination
    When a brand catalog is requested
    Then the response is 400 before listing entries

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints
  @IT-MCAT-011
  Scenario: Rejects malformed brand IDs
    Test Case ID: IT-MCAT-011
    Given a malformed brand UUID
    When the brand catalog is requested
    Then the response is 400 before calling the service

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints PATCH /menu-catalog/:id
  @IT-MCAT-012
  Scenario: Pass item fields and child mutations to the service
    Test Case ID: IT-MCAT-012
    Given a superadmin and an update with item fields, channel and modifier mutations
    When the catalog entry is patched
    Then the response is 200 and the service receives the menu item ID and the payload

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints PATCH /menu-catalog/:id
  @IT-MCAT-013
  Scenario: Reject malformed catalog updates
    Test Case ID: IT-MCAT-013
    Given a brand change, an order channel change, a child list sent as an array, a malformed delete ID, an update without its ID, or a duplicate channel create
    When the catalog entry is patched
    Then the response is 400 before calling the service

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints PATCH /menu-catalog/:id
  @IT-MCAT-014
  Scenario: Reject a malformed menu item ID on update
    Test Case ID: IT-MCAT-014
    Given a malformed menu item UUID
    When the catalog entry is patched
    Then the response is 400 before calling the service

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.http.spec.ts
  # Context: Menu catalog HTTP endpoints PATCH /menu-catalog/:id
  @IT-MCAT-015
  Scenario: Require a superadmin session to update
    Test Case ID: IT-MCAT-015
    Given no session, or a cashier session
    When the catalog entry is patched
    Then the response is 401 or 403 before calling the service
