@mobile @integration @real_api @orders
Feature: Current mobile order review and real API order lifecycle

  @IT-MOB-ORD-005
  Scenario: Follow one POS order through kitchen fulfillment and availability
    Given a cashier reviews and confirms a two-meal Takeaway order through the real app
    And the confirmation displays the ticket number returned by the API
    When the cashier logs out and a kitchen head logs in through the app
    Then the same order and ticket advance through acknowledgement preparation and QC submission in the UI
    When an external production repository call rejects a portion during the first QC attempt
    Then the board receives the rework state through its live API stream
    When the kitchen head returns rework to QC approves every item and completes the handover checklist in the UI
    Then the persisted order is completed with the same handed-over ticket and two QC attempts
    And the completed ticket disappears from the active board
    And the kitchen head can visit availability and return to the board

  @IT-MOB-ORD-001
  Scenario: Create and confirm an order through the current UI
    Given a staff member logs in and builds a Takeaway cart with two meals
    When the staff member taps Review order from Order details
    Then the mobile flow creates one draft request
    And the API draft has an order code and no kitchen ticket
    When the test calls the real verification endpoint
    Then verification returns current prices without creating a ticket
    When the staff member repeatedly taps Confirm and send through the UI
    Then the API returns one confirmed order with the same code and one queued ticket
    And an API retry preserves the original payment state
    And New order clears the cart

  @IT-MOB-ORD-002
  Scenario: Safe create retries and daily order codes
    Given a logged in staff member and a new order request
    When the same order UUID and payload are submitted twice to the API
    Then the same order and line identities and order code are returned
    When the same UUID is submitted with changed quantities
    Then the API rejects the conflicting request
    When a second order is created
    Then its brand code and daily order number are correct
    And retries and conflicts have not consumed another daily order number

  @IT-MOB-ORD-003
  Scenario: Prevent duplicate platform orders
    Given a logged in staff member creates a GrabFood draft through the API
    When the same request is retried with its original UUID
    Then the existing order is returned
    When a new UUID reuses the same platform store and external reference
    Then the API rejects the duplicate and identifies the existing order
    When the original draft is verified and confirmed through the API
    Then its platform payment state remains settled and paid

  @IT-MOB-ORD-004
  Scenario: Recheck catalog availability and preserve a rejected mobile draft
    Given a staff member has an available meal in the cart and a saved API draft
    When the fixture supervisor marks that meal unavailable through the real API
    Then verification and confirmation reject the stale API draft without a ticket
    And a new API order containing an unavailable meal is rejected
    When the staff member attempts to review the stale mobile cart
    Then Order details remains open with the cart and reference preserved
    And the test restores the fixture availability afterward
