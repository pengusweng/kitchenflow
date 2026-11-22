@backend @integration @units
Feature: Measurement unit HTTP contracts

  @IT-UNIT-001
  Scenario: Creates a unit
    Given a valid body
    When a unit is created
    Then pass it to the service and return 201

  @IT-UNIT-002
  Scenario: Rejects an invalid create body
    Given an invalid body
    When a unit is created
    Then reject it before the service

  @IT-UNIT-003
  Scenario: Reports a duplicate unit code
    Given a duplicate code
    When a unit is created
    Then return 409

  @IT-UNIT-004
  Scenario: Lists units with filters
    Given filters
    When units are listed
    Then pass the parsed query to the service

  @IT-UNIT-005
  Scenario: Rejects an invalid list query
    Given an invalid query
    When units are listed
    Then reject it before the service

  @IT-UNIT-006
  Scenario: Returns one unit by code
    Given a unit code
    When one unit is fetched
    Then return it

  @IT-UNIT-007
  Scenario: Reports an unknown unit
    Given an unknown unit
    When it is fetched, updated, or deleted
    Then return 404

  @IT-UNIT-008
  Scenario: Updates a unit
    Given a partial body
    When a unit is updated
    Then pass the code and changes to the service

  @IT-UNIT-009
  Scenario: Rejects an invalid update body
    Given an invalid body
    When a unit is updated
    Then reject it before the service

  @IT-UNIT-010
  Scenario: Deletes an unused unit
    Given an unused unit
    When it is deleted
    Then return the deleted unit

  @IT-UNIT-011
  Scenario: Refuses to delete a unit in use
    Given a unit used by recipe ingredients
    When it is deleted
    Then return 409

  @IT-UNIT-012
  Scenario: Allows non-cashier roles to read units
    Given a non-cashier role
    When units are read
    Then allow both read endpoints

  @IT-UNIT-013
  Scenario: Denies cashiers from reading units
    Given a cashier
    When units are read
    Then deny both read endpoints without calling the service

  @IT-UNIT-014
  Scenario: Allows recipe managers and superadmins to change units
    Given a recipe manager or superadmin
    When units are changed
    Then allow create, update, and delete

  @IT-UNIT-015
  Scenario: Denies other roles from changing units
    Given any other role
    When units are changed
    Then deny create, update, and delete without calling the service

  @IT-UNIT-016
  Scenario: Audits a created unit with its values
    Given a recipe manager
    When a unit is created
    Then audit UNIT_CREATED with the new unit's code, name, dimension and conversion as after data

  @IT-UNIT-017
  Scenario: Audits only the changed fields of an updated unit
    Given a renamed unit
    When it is updated
    Then audit UNIT_UPDATED with only the changed fields before and after

  @IT-UNIT-018
  Scenario: Audits rejected unit creations without snapshots
    Given a duplicate code and a supervisor
    When units are created
    Then audit the conflict and the denial without storing any unit values
