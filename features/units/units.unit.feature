@backend @unit @units
Feature: Measurement unit administration

  @UT-UNIT-001
  Scenario: Creates a unit
    Given a valid unit
    When it is created
    Then persist and return it

  @UT-UNIT-002
  Scenario: Lists units with pagination meta
    Given page 3 of 10
    When units are listed
    Then pass the offset and filters and return pagination meta

  @UT-UNIT-003
  Scenario: Rejects an unsupported pagination offset
    Given an offset beyond 32 bits
    When units are listed
    Then reject it before querying

  @UT-UNIT-004
  Scenario: Returns an existing unit
    Given an existing unit
    When it is fetched
    Then return it

  @UT-UNIT-005
  Scenario: Reports an unknown unit
    Given an unknown unit
    When it is fetched
    Then throw UNIT_NOT_FOUND

  @UT-UNIT-006
  Scenario: Updates an existing unit
    Given an existing unit
    When it is updated
    Then save and return the changes

  @UT-UNIT-007
  Scenario: Does not update an unknown unit
    Given an unknown unit
    When it is updated
    Then throw not found without writing

  @UT-UNIT-008
  Scenario: Deletes an unused unit
    Given an unused unit
    When it is deleted
    Then remove and return it

  @UT-UNIT-009
  Scenario: Keeps a unit used by recipe ingredients
    Given a unit used by recipe ingredients
    When it is deleted
    Then throw UNIT_IN_USE without deleting

  @UT-UNIT-010
  Scenario: Does not delete an unknown unit
    Given an unknown unit
    When it is deleted
    Then throw not found without deleting

  @UT-UNIT-011
  Scenario: Filters rows and totals identically
    Given a search and dimension
    When units are listed
    Then rows and total share the same filter

  @UT-UNIT-012
  Scenario: Never writes the unit code on update
    Given an update without a code
    When a unit is updated
    Then only write name, dimension, and to_base

  @UT-UNIT-013
  Scenario: Counts recipe ingredients that use a unit
    Given a unit code
    When its ingredient usage is counted
    Then count recipe ingredients by unit code
