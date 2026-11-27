@backend @unit @payments
Feature: Payment creation rules

  @UT-PAY-001
  Scenario: Reject a payment for a missing order
    Given no order exists with the requested order ID
    When a payment is created for that order
    Then the service returns not found without writing a payment

  @UT-PAY-002
  Scenario: Reject a payment received by a missing or inactive user
    Given the order exists but the receiving user does not exist or is inactive
    When a payment is created
    Then the service returns not found without writing a payment

  @UT-PAY-003
  Scenario Outline: Accept cash when the amount tendered covers the amount
    Given a cash payment of 250 pesos
    When the customer tenders <tendered> pesos
    Then the payment is saved with the order and receiving user
    Examples:
      | tendered |
      | 250      |
      | 300      |

  @UT-PAY-004
  Scenario: Reject cash when the amount tendered is short
    Given a cash payment of 250 pesos
    When the customer tenders 200 pesos
    Then the service returns INSUFFICIENT_AMOUNT_TENDERED without writing a payment

  @UT-PAY-005
  Scenario Outline: Accept exact non-cash payments
    Given a <method> payment of 250 pesos with a payment reference for an order that fits the method
    When the amount tendered is 250 pesos
    Then the payment is saved with the order and receiving user
    Examples:
      | method           |
      | CARD             |
      | E_WALLET         |
      | PLATFORM_SETTLED |

  @UT-PAY-006
  Scenario Outline: Reject non-cash payments whose amount tendered differs
    Given a <method> payment of 250 pesos with a payment reference for an order that fits the method
    When the amount tendered is <tendered> pesos
    Then the service returns AMOUNT_TENDERED_MISMATCH without writing a payment
    Examples:
      | method           | tendered |
      | CARD             | 300      |
      | CARD             | 200      |
      | E_WALLET         | 300      |
      | E_WALLET         | 200      |
      | PLATFORM_SETTLED | 300      |
      | PLATFORM_SETTLED | 200      |

  @UT-PAY-007
  Scenario Outline: Find a payment by either unique key
    Given a saved payment for an order
    When the payment is looked up by <key>
    Then the service returns the payment with the receiver's name
    Examples:
      | key        |
      | payment_id |
      | order_id   |

  @UT-PAY-008
  Scenario Outline: Reject a lookup with no matching payment
    Given no payment matches the <key>
    When the payment is looked up
    Then the service returns PAYMENT_NOT_FOUND
    Examples:
      | key        |
      | payment_id |
      | order_id   |

  @UT-PAY-009
  Scenario: List payments with pagination metadata
    Given 25 payments match the filters
    When page 2 is listed with a limit of 10
    Then the service returns that page's payments with page 2, limit 10, total 25 and 3 total pages

  @UT-PAY-010
  Scenario: Return an empty page when nothing matches
    Given no payments match the filters
    When the first page is listed
    Then the service returns no payments, total 0 and 0 total pages

  @UT-PAY-011
  Scenario: Reject a date range that ends before it starts
    Given a from date after the to date
    When payments are listed
    Then the service returns INVALID_DATE_RANGE without querying payments

  @UT-PAY-012
  Scenario Outline: Accept open or same-day date ranges
    Given a from date of <from> and a to date of <to>
    When payments are listed
    Then the service queries payments with those filters
    Examples:
      | from       | to         |
      | 2026-11-27 | 2026-11-27 |
      | 2026-11-01 |            |
      |            | 2026-11-27 |

  @UT-PAY-013
  Scenario: Reject a page beyond the supported offset
    Given a page whose offset exceeds a signed 32-bit integer
    When payments are listed
    Then the service returns PAGINATION_UNSUPPORTED_RANGE without querying payments

  @UT-PAY-014
  Scenario Outline: Reject a payment for an order that is already settled
    Given an order whose payment status is <status>
    When a payment is created for that order
    Then the service returns <code> without writing a payment
    Examples:
      | status   | code                   |
      | PAID     | ORDER_ALREADY_PAID     |
      | REFUNDED | ORDER_ALREADY_REFUNDED |

  @UT-PAY-015
  Scenario Outline: Require a payment reference for non-cash payments
    Given a <method> payment with a <reference> payment reference
    When the payment is created
    Then the service returns PAYMENT_REFERENCE_REQUIRED without writing a payment
    Examples:
      | method           | reference |
      | CARD             | missing   |
      | CARD             | empty     |
      | E_WALLET         | missing   |
      | E_WALLET         | empty     |
      | PLATFORM_SETTLED | missing   |
      | PLATFORM_SETTLED | empty     |

  @UT-PAY-016
  Scenario: Accept cash without a payment reference
    Given a cash payment with no payment reference
    When the payment is created
    Then the payment is saved with the order and receiving user

  @UT-PAY-017
  Scenario: Save the payment and mark the order paid together
    Given a confirmed, unpaid order and no open transaction
    When a payment is created for that order
    Then the service opens one transaction that saves the payment and marks the order PAID

  @UT-PAY-018
  Scenario: Reuse the given transaction
    Given a confirmed, unpaid order and an open transaction
    When a payment is created inside that transaction
    Then the service saves the payment and marks the order PAID without opening another transaction

  @UT-PAY-019
  Scenario Outline: Reject a payment for an order that cannot be paid yet or anymore
    Given an order whose status is <status>
    When a payment is created for that order
    Then the service returns <code> without writing a payment
    Examples:
      | status    | code                |
      | DRAFT     | ORDER_NOT_CONFIRMED |
      | CANCELLED | ORDER_CANCELLED     |

  @UT-PAY-020
  Scenario Outline: Accept a payment any time after confirmation
    Given an unpaid order whose status is <status>
    When a payment is created for that order
    Then the payment is saved and the order is marked PAID
    Examples:
      | status    |
      | CONFIRMED |
      | PREPARING |
      | COMPLETED |

  @UT-PAY-021
  Scenario Outline: Reject a payment method that does not fit the order channel
    Given an unpaid <channel> order
    When a <method> payment is created for that order
    Then the service returns PAYMENT_METHOD_NOT_ALLOWED without writing a payment
    Examples:
      | method           | channel   |
      | CASH             | GRABFOOD  |
      | CARD             | FOODPANDA |
      | PLATFORM_SETTLED | DINE_IN   |
      | PLATFORM_SETTLED | TAKEAWAY  |

  @UT-PAY-022
  Scenario Outline: Reject an amount that differs from the order subtotal
    Given an unpaid order with a subtotal of <subtotal> pesos
    When a payment of 250 pesos is created for that order
    Then the service returns AMOUNT_DOES_NOT_MATCH_SUBTOTAL without writing a payment
    Examples:
      | subtotal |
      | 249.99   |
      | 250.01   |
