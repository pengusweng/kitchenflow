@backend @unit @discounts
Feature: Senior citizen and PWD discounts

  @UT-DSC-001
  Scenario Outline: Remove VAT, then take 20% off
    Given a VAT-inclusive subtotal of <subtotal> pesos
    When the senior citizen or PWD discount is computed
    Then the VAT exemption is <vat_exempt>, the discount is <discount> and the amount due is <total>
    Examples:
      | subtotal | vat_exempt | discount | total  |
      | 560.00   | 60.00      | 100.00   | 400.00 |
      | 189.00   | 20.25      | 33.75    | 135.00 |
      | 250.00   | 26.79      | 44.64    | 178.57 |
      | 0.00     | 0.00       | 0.00     | 0.00   |

  @UT-DSC-002
  Scenario Outline: Keep every centavo of the subtotal
    Given a VAT-inclusive subtotal of <subtotal> pesos
    When the discount is computed
    Then the amount due, the VAT exemption and the discount add back up to exactly <subtotal>
    Examples:
      | subtotal |
      | 0.01     |
      | 99.99    |
      | 333.33   |
      | 1234.57  |

  @UT-DSC-003
  Scenario Outline: Apply a discount and save the new total together
    Given a confirmed, unpaid dine-in order with a subtotal of 560 pesos
    When a <type> discount is applied
    Then one transaction saves the discount with a VAT exemption of 60 and a discount of 100, and sets the order total to 400
    Examples:
      | type           |
      | SENIOR_CITIZEN |
      | PWD            |

  @UT-DSC-004
  Scenario Outline: Accept a discount any time before payment
    Given an unpaid order whose status is <status>
    When a discount is applied
    Then the discount is saved
    Examples:
      | status    |
      | CONFIRMED |
      | PREPARING |
      | COMPLETED |

  @UT-DSC-005
  Scenario: Reject a discount for a missing order
    Given no order exists with the requested order ID
    When a discount is applied
    Then the service returns ORDER_NOT_FOUND without saving a discount or a total

  @UT-DSC-006
  Scenario Outline: Reject a discount for an order that cannot take one
    Given an order with <state>
    When a discount is applied
    Then the service returns <code> without saving a discount or a total
    Examples:
      | state                     | code                     |
      | status DRAFT              | ORDER_NOT_CONFIRMED      |
      | status CANCELLED          | ORDER_CANCELLED          |
      | payment status PAID       | ORDER_ALREADY_PAID       |
      | payment status REFUNDED   | ORDER_ALREADY_REFUNDED   |
      | a discount already        | ORDER_ALREADY_DISCOUNTED |

  @UT-DSC-007
  Scenario Outline: Reject a discount for a platform order
    Given a confirmed <channel> order
    When a discount is applied
    Then the service returns DISCOUNT_NOT_ALLOWED_FOR_PLATFORM without saving a discount or a total
    Examples:
      | channel   |
      | GRABFOOD  |
      | FOODPANDA |
