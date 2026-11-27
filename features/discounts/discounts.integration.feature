@backend @integration @discounts
Feature: Senior citizen and PWD discounts against PostgreSQL

  # Jest: server/src/modules/orders/orders/tests/orders.http.spec.ts
  @IT-DSC-001
  Scenario: Discount a takeaway order, then pay the discounted total
    Given a confirmed takeaway order with a subtotal of 250 pesos
    When a cashier applies a senior citizen discount with a padded ID number and name
    Then the response is 201 with the trimmed holder details, a VAT exemption of 26.79, a discount of 44.64 and a total of 178.57
    And reading the order shows the subtotal, the new total and the discount
    And a payment of 250 is rejected as AMOUNT_DOES_NOT_MATCH_TOTAL while a payment of 178.57 marks the order PAID
    And a second discount after payment is rejected as ORDER_ALREADY_PAID, leaving one discount saved

  # Jest: server/src/modules/orders/orders/tests/orders.http.spec.ts
  @IT-DSC-002
  Scenario: Reject invalid discount requests
    Given a draft, a confirmed takeaway order and a confirmed GrabFood order
    When discounts are requested with an unknown type, a blank ID number, a blank name, an extra field, zero or fractional diners, zero holders, more holders than diners, an invalid order UUID, by kitchen staff, for the draft and for the GrabFood order
    Then each returns 400, 403, ORDER_NOT_CONFIRMED or DISCOUNT_NOT_ALLOWED_FOR_PLATFORM
    And no discount is saved and the confirmed order's total stays 250

  # Jest: server/src/modules/orders/orders/tests/orders.http.spec.ts
  @IT-DSC-003
  Scenario: Discount one senior's share of a bill split by two diners
    Given a confirmed takeaway order with a subtotal of 250 pesos
    When a cashier applies a senior citizen discount for one holder among two diners
    Then the response is 201 with the headcount, a VAT exemption of 13.39, a discount of 22.32 and a total of 214.29
    And the saved order's total is 214.29
