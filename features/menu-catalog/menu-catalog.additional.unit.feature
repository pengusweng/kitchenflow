@backend @unit @menu-catalog
Feature: Additional menu catalog unit coverage
  Feature ID: FEAT-MCAT-UT-ADDITIONAL
  Requirement ID: FR-MCAT-001

  As a backend maintainer,
  I want the menu catalog behavior documented alongside its executable tests,
  So that each result can be traced to its preconditions, action, and expected outcome.

  Parameterized Jest cases share a scenario; each report entry retains the executed
  Jest name and its concrete parameter values.

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService module wiring
  @UT-MCAT-001
  Scenario: Resolves the service through the application module
    Test Case ID: UT-MCAT-001
    Given the application module and substituted external dependencies
    When the testing module is compiled
    Then the menu catalog service can be resolved

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-002
  Scenario: Checks every active modifier before creating the catalog entry
    Test Case ID: UT-MCAT-002
    Given an active brand and active modifier references
    When a catalog entry is created
    Then every modifier is validated before creating the entry

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-003
  Scenario: Rejects a missing or inactive later modifier without creating anything
    Test Case ID: UT-MCAT-003
    Given a catalog payload whose later modifier is missing or inactive
    When catalog creation is requested
    Then a not-found error is returned without creating any entry

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-004
  Scenario: Allows creation without modifier assignments
    Test Case ID: UT-MCAT-004
    Given a catalog payload without modifier assignments
    When the catalog entry is created
    Then creation succeeds without querying modifiers

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-005
  Scenario: Preserves creation errors for the application exception filters
    Test Case ID: UT-MCAT-005
    Given catalog persistence raises an error
    When a catalog entry is created
    Then the original error is propagated for application exception handling

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-006
  Scenario: Does not create anything when a modifier lookup fails
    Test Case ID: UT-MCAT-006
    Given a modifier lookup raises an error
    When a catalog entry is created
    Then the error is propagated without creating the entry

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-007
  Scenario: Validates the active brand and paginates the mapped catalog
    Test Case ID: UT-MCAT-007
    Given an active brand and catalog rows
    When the brand catalog is listed with pagination
    Then the brand is validated and mapped entries and pagination metadata are returned

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-008
  Scenario: Rejects listing for a missing or inactive brand before querying the catalog
    Test Case ID: UT-MCAT-008
    Given a missing or inactive brand
    When its catalog is listed
    Then a not-found error is returned before querying catalog rows

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-009
  Scenario: Returns an empty catalog with default pagination
    Test Case ID: UT-MCAT-009
    Given an active brand with no catalog rows and no pagination options
    When its catalog is listed
    Then an empty catalog and default pagination metadata are returned

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-010
  Scenario: Rejects pagination overflow before querying the catalog
    Test Case ID: UT-MCAT-010
    Given a requested page whose offset exceeds the database range
    When the catalog is listed
    Then a bad-request error is returned before querying catalog rows

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-011
  Scenario: Preserves catalog lookup errors
    Test Case ID: UT-MCAT-011
    Given the catalog repository raises a lookup error
    When a brand catalog is listed
    Then the lookup error is propagated

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService transactional creation
  @UT-MCAT-012
  Scenario: Return created catalog entries with or without children
    Test Case ID: UT-MCAT-012
    Given a newly created catalog entry with or without child records
    When catalog creation completes
    Then the full saved entry and its available children are returned

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService transactional creation
  @UT-MCAT-013
  Scenario: Preserve checkout restrictions in the menu catalog
    Test Case ID: UT-MCAT-013
    Given an active item with an inactive recipe and a disabled sales channel
    When its brand catalog is loaded
    Then the recipe availability and disabled channel are included

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-014
  Scenario: Return uploaded image keys as download URLs
    Test Case ID: UT-MCAT-014
    Given a catalog item whose image is an uploaded storage key
    When the item is created or the brand's catalog is listed
    Then the response returns the image as a download URL

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService operations
  @UT-MCAT-015
  Scenario: Forward the search to the catalog query
    Test Case ID: UT-MCAT-015
    Given a catalog search for one brand
    When the catalog is listed
    Then the repository receives the search with the page offset and limit

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService transactional creation
  @UT-MCAT-016
  Scenario: Join a caller transaction instead of opening its own
    Test Case ID: UT-MCAT-016
    Given a transaction client supplied by the caller
    When a catalog entry is created and a brand catalog is listed with it
    Then every write and read uses that client without opening a new transaction

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-017
  Scenario: Update only menu item fields
    Test Case ID: UT-MCAT-017
    Given an active menu item and a change to its fields only
    When the catalog entry is updated
    Then the fields are saved in one transaction without touching its channels or modifiers
    And the item is returned with its channels, modifiers and a download URL for an uploaded image

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-018
  Scenario: Touch the menu item when only its children change
    Test Case ID: UT-MCAT-018
    Given an update that only changes channels
    When the catalog entry is updated
    Then the menu item is still written so its modified time moves

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-019
  Scenario: Reject an update with no changes
    Test Case ID: UT-MCAT-019
    Given an update with no item fields and empty mutation lists
    When the catalog entry is updated
    Then NO_MENU_CATALOG_CHANGES is returned before opening a transaction

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-020
  Scenario: Reject updates to a missing or inactive menu item
    Test Case ID: UT-MCAT-020
    Given a menu item that is missing or inactive
    When the catalog entry is updated
    Then MENU_ITEM_NOT_FOUND is returned without reading or writing its children

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-021
  Scenario: Reject a missing or inactive replacement recipe
    Test Case ID: UT-MCAT-021
    Given an update that points the item at a missing or inactive recipe
    When the catalog entry is updated
    Then RECIPE_NOT_FOUND is returned before the item is saved

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-022
  Scenario: Apply channel deletes, updates and creates in order
    Test Case ID: UT-MCAT-022
    Given channel overrides to delete, update and create, including a channel removed and added back
    When the catalog entry is updated
    Then deletes run before updates and updates before creates, all in the same transaction
    And the item is returned with its channels read back after the writes

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-023
  Scenario: Reject channel IDs that do not belong to the item
    Test Case ID: UT-MCAT-023
    Given a channel override ID to update or delete that the menu item does not have
    When the catalog entry is updated
    Then MENU_ITEM_CHANNEL_NOT_FOUND is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-024
  Scenario: Reject a channel targeted twice
    Test Case ID: UT-MCAT-024
    Given the same channel override in both the update and delete lists
    When the catalog entry is updated
    Then CONFLICTING_CHANNEL_MUTATIONS is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-025
  Scenario: Reject overrides for internal channels
    Test Case ID: UT-MCAT-025
    Given a new DINE_IN or TAKEAWAY channel override
    When the catalog entry is updated
    Then INVALID_ORDER_CHANNEL is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-026
  Scenario: Reject a second override for the same channel
    Test Case ID: UT-MCAT-026
    Given a new override for a channel the menu item already has
    When the catalog entry is updated
    Then DUPLICATE_ORDER_CHANNEL is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-027
  Scenario: Apply modifier deletes, updates and creates in order
    Test Case ID: UT-MCAT-027
    Given modifier assignments to delete, update and create
    When the catalog entry is updated
    Then only the newly assigned modifier is checked for being active
    And deletes run before updates and updates before one bulk create, all in the same transaction

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-028
  Scenario: Check a replacement modifier is active
    Test Case ID: UT-MCAT-028
    Given an assignment update that swaps in an inactive or missing modifier
    When the catalog entry is updated
    Then MODIFIER_NOT_FOUND is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-029
  Scenario: Reject assigning the same modifier twice
    Test Case ID: UT-MCAT-029
    Given a new or replacement assignment for a modifier the item already has
    When the catalog entry is updated
    Then DUPLICATE_MENU_ITEM_MODIFIER is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-030
  Scenario: Allow a modifier to be removed and re-added in one request
    Test Case ID: UT-MCAT-030
    Given an assignment deleted and its modifier assigned again
    When the catalog entry is updated
    Then the old assignment is deleted and the new one is created

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-031
  Scenario: Reject unknown or repeated assignment IDs
    Test Case ID: UT-MCAT-031
    Given an assignment ID the item does not have, or the same assignment updated twice
    When the catalog entry is updated
    Then MENU_ITEM_MODIFIER_NOT_FOUND or CONFLICTING_MODIFIER_MUTATIONS is returned without writing

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuChannelsRepository catalog overrides
  @UT-MCAT-032
  Scenario: Update any channel override
    Test Case ID: UT-MCAT-032
    Given a channel override, available or not
    When its price and availability are updated
    Then the change is saved with a new modified time

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuChannelsRepository catalog overrides
  @UT-MCAT-033
  Scenario: Permanently delete a channel override
    Test Case ID: UT-MCAT-033
    Given a channel override
    When it is deleted permanently
    Then the row is removed so the channel can be added again

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-034
  Scenario: Save a photo the editor uploaded
    Test Case ID: UT-MCAT-034
    Given an update whose photo is the key of an image the editor uploaded
    When the catalog entry is updated
    Then the upload is checked to belong to the editor before the key is saved

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog-update.service.spec.ts
  # Context: MenuCatalogService update
  @UT-MCAT-035
  Scenario: Reject a missing or foreign photo upload
    Test Case ID: UT-MCAT-035
    Given a photo key that is missing or was uploaded by someone else
    When the catalog entry is updated
    Then ASSET_NOT_FOUND is returned before opening a transaction

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService cross-brand menu
  @UT-MCAT-036
  Scenario: Count every brand and the chosen brand availability
    Test Case ID: UT-MCAT-036
    Given menu item groups across two brands and a brand filter
    When the cross-brand menu is listed
    Then each brand and "all" report their total and unavailable items
    And availability counts cover only the chosen brand
    And uploaded image keys come back as download URLs

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService cross-brand menu
  @UT-MCAT-037
  Scenario: Count availability across every brand
    Test Case ID: UT-MCAT-037
    Given no brand filter
    When the cross-brand menu is listed
    Then availability counts cover every brand

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogService cross-brand menu
  @UT-MCAT-038
  Scenario: Reject cross-brand pagination overflow
    Test Case ID: UT-MCAT-038
    Given a page number whose offset overflows
    When the cross-brand menu is listed
    Then PAGINATION_UNSUPPORTED_RANGE is returned before querying

  # Jest: server/src/modules/menu/menu-catalog/tests/menu-catalog.service.spec.ts
  # Context: MenuCatalogRepository cross-brand menu
  @UT-MCAT-039
  Scenario: Filter the page but count without brand and availability
    Test Case ID: UT-MCAT-039
    Given brand, status, availability and search filters
    When the repository lists the cross-brand menu
    Then the page and total use every filter, in brand then name order
    And the counts use only status and search
    And each row carries its recipe, channels and modifiers
