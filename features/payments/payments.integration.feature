@backend @integration @payments
Feature: Payment HTTP contracts

  @IT-PAY-001
  Scenario: Records a payment for an order
    Given a valid payment body with a padded payment reference
    When a payment is posted for an order
    Then pass the trimmed body, order ID and session user to the service and return 201

  @IT-PAY-002
  Scenario: Rejects an invalid payment body
    Given an invalid payment body
    When a payment is posted for an order
    Then reject it with 400 before the service

  @IT-PAY-003
  Scenario: Rejects a malformed order ID on create
    Given an order ID that is not a UUID
    When a payment is posted for it
    Then reject it with 400 before the service

  @IT-PAY-004
  Scenario Outline: Returns service errors unchanged on create
    Given the service rejects with <status> and <code>
    When a payment is posted for an order
    Then return <status> with <code>
    Examples:
      | status | code                         |
      | 404    | ORDER_NOT_FOUND              |
      | 400    | INSUFFICIENT_AMOUNT_TENDERED |
      | 400    | AMOUNT_TENDERED_MISMATCH     |

  @IT-PAY-005
  Scenario: Allows cashiers, supervisors and superadmins to record payments
    Given a cashier, supervisor or superadmin session
    When a payment is posted for an order
    Then return 201

  @IT-PAY-006
  Scenario: Denies other roles from recording payments
    Given a session whose role is not cashier, supervisor or superadmin
    When a payment is posted for an order
    Then return 403 without calling the service

  @IT-PAY-007
  Scenario: Lists payments with parsed filters
    Given page, limit, method, receiver, date, search and sort filters
    When payments are listed
    Then pass the parsed query to the service and return 200

  @IT-PAY-008
  Scenario: Rejects an invalid list query
    Given an invalid list query
    When payments are listed
    Then reject it with 400 before the service

  @IT-PAY-009
  Scenario: Gets the payment for an order
    Given an order ID
    When its payment is fetched
    Then look it up by order_id and return 200

  @IT-PAY-010
  Scenario: Gets a payment by its ID
    Given a payment ID
    When the payment is fetched
    Then look it up by payment_id and return 200

  @IT-PAY-011
  Scenario: Rejects a malformed ID on reads
    Given an ID that is not a UUID
    When a payment is fetched by order or by ID
    Then reject it with 400 before the service

  @IT-PAY-012
  Scenario: Returns 404 when no payment matches
    Given the service reports PAYMENT_NOT_FOUND
    When a payment is fetched by order or by ID
    Then return 404 with PAYMENT_NOT_FOUND

  @IT-PAY-013
  Scenario: Allows supervisors and superadmins to read payments
    Given a supervisor or superadmin session
    When payments are listed or fetched
    Then return 200 for every read endpoint

  @IT-PAY-014
  Scenario: Denies cashiers and other roles from reading payments
    Given a session whose role is not supervisor or superadmin
    When payments are listed or fetched
    Then return 403 for every read endpoint without calling the service
