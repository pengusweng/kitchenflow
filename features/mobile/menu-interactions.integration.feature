@mobile @widget @menu
Feature: Menu interactions and asynchronous states

  @WT-MOB-MENU-001
  Scenario Outline: Respect item availability
    Given a menu card with <availability> availability
    When it is tapped
    Then the cart count is <count>
    And unavailable cards display their matching status badge
    Examples:
      | availability | count |
      | available    | 1     |
      | stockout     | 0     |
      | manualOff    | 0     |
      | inactive     | 0     |

  @WT-MOB-MENU-002
  Scenario: Replace loading skeletons with data
    Given a pending menu load
    When the menu screen is rendered
    Then a loading skeleton is visible
    When the load completes with an item
    Then the skeleton disappears and an item card is visible

  @WT-MOB-MENU-003
  Scenario: Recover from a failed load
    Given the initial menu load fails
    When Try again is tapped
    Then the menu provider loads a second time
    And the recovered item card is displayed

  @WT-MOB-MENU-004
  Scenario: Clear a search with no matches
    Given a loaded menu and a search that matches nothing
    When Clear search is tapped
    Then the search provider and text field are empty
    And the menu cards are restored

  @WT-MOB-MENU-005
  Scenario: Render an empty catalog
    Given a menu load returning no items
    When the menu screen settles
    Then an empty message is displayed without item cards

  @WT-MOB-MENU-006
  Scenario: Show the current brand and channel as the store reference
    Given the active brand is King Kungs Kafe
    And the selected channel is GrabFood
    When the cart panel header renders
    Then Store reference displays "King Kungs Kafe, GrabFood"
    When the selected channel changes to foodpanda
    Then Store reference displays "King Kungs Kafe, foodpanda"

  @WT-MOB-MENU-007
  Scenario: Reflect the store reference on the platform reference screen
    Given the active brand is King Kungs Kafe
    And the selected channel is GrabFood
    When the platform reference screen renders
    Then Store reference displays "King Kungs Kafe, GrabFood" read-only
    And only the external order reference can be edited
    When the external order reference is submitted as "GF-1001"
    Then the merchant store reference is "King Kungs Kafe, GrabFood"

  @WT-MOB-MENU-008
  Scenario: Hide unavailable items with the catalog toggle
    Given the menu has available and unavailable items
    When the Unavailable button is tapped
    Then the unavailable items are hidden
