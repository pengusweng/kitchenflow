@mobile @widget @brand-switch @prototype
Feature: Assigned brand picker behavior

  @WT-MOB-BRAND-002
  Scenario: Show only the assigned brand
    Given a cashier assigned to brand A
    When the brand picker opens
    Then brand A is selected and the demo brand is hidden

  @WT-MOB-BRAND-003
  Scenario: Continue with the current brand
    Given a populated cart for brand A
    When the picker continues with brand A
    Then no discard confirmation is displayed and the cart is preserved

  @WT-MOB-BRAND-004
  Scenario: Dismiss the picker
    Given a populated cart and an open brand picker
    When the picker barrier is tapped
    Then the picker closes without changing brand or cart

  @WT-MOB-BRAND-005
  Scenario: Continue with an empty cart
    Given an empty cart for the assigned brand A
    When the cashier continues from the picker
    Then brand A stays selected and no discard confirmation appears

  @WT-MOB-BRAND-006
  Scenario: Reach the brand picker action with enlarged text
    Given a 320 by 900 phone viewport with text scale 2
    When the picker is opened and the continue action is activated
    Then the picker fits and brand A stays selected without a discard confirmation
