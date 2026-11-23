@mobile @integration @real_api @pos
Feature: Mobile POS core flow through the real test API

  @IT-MOB-POS-001
  Scenario: Select a provider and build a Dine-in cart
    Given an isolated staff account and a fixture brand with a priced menu
    When the staff member logs in and selects the fixture brand in the catalog
    And adds the available meal twice from the menu
    Then one cart line contains two meals with a Dine-in total of 200 pesos
    When the staff member adds and removes one unit using the cart controls
    Then the quantities and totals update correctly
    When the staff member clears the cart
    Then the cart is empty

  @IT-MOB-POS-002
  Scenario: Reprice an existing cart when changing channels
    Given a logged in staff member with two meals in the Dine-in cart
    When the staff member continues to Order details and selects Takeaway
    Then the order details total changes from 200 to 250 pesos
    And the cart retains its line identity and quantity

  @IT-MOB-POS-003
  Scenario: Unavailable menu items cannot enter the cart
    Given a logged in staff member with a real API menu
    When the staff member taps the unavailable meal
    Then the cart remains empty
    When the staff member searches for and taps the available meal
    Then the cart contains one meal at the Dine-in price of 100 pesos
