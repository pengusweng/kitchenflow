@mobile @widget @orders @cancel
Feature: Cancel order workflow screens
  Design frames 10-15. The demo screens run on sample data and send nothing.
  A live screen (opened with an order UUID) calls
  POST /brands/:brandId/orders/:orderId/cancel and lets the server response
  select the cancelled or denied step.

  The repository tests use a fake HTTP adapter. The widget scenarios use sample
  data or a stubbed repository. Scenarios tagged @planned are specifications
  without a matching executable widget case.

  @demo @WT-MOB-CANCEL-001
  Scenario: Review the cancellation request
    Given the cancel order screen at the review step
    When it is rendered
    Then the reason request and both actions are visible

  @demo @WT-MOB-CANCEL-002
  Scenario: Block cancellation without a reason
    Given the cancel order screen at the review step
    When Cancel order is pressed with an empty reason
    Then the validation step is shown
    And the field reports that a reason is required
    And the order is still marked Not cancelled

  @demo @planned @WT-MOB-CANCEL-003
  Scenario: Move to the pending step with a reason
    Given the cancel order screen at the review step
    When Cancel order is pressed with the sample reason
    Then the pending step is shown
    And no refund or stock reversal is implied
    And no request is sent

  @demo @WT-MOB-CANCEL-004
  Scenario: Submit the sample cancellation
    Given the sample cancel order screen at the review step
    When a reason is entered and Cancel order is pressed
    Then the cancelled outcome and Back to menu action are shown
    And the screen states that no refund or stock change was made

  @demo @planned @WT-MOB-CANCEL-005
  Scenario: Deny the sample outcome
    Given the cancel order screen at the pending step
    When the sample outcome is denied
    Then the denied step is shown
    And the order remains active

  @demo @planned @WT-MOB-CANCEL-006
  Scenario: Require supervisor approval after preparation started
    Given the cancel order screen at the approval step
    Then the restricted action is shown
    And the cancellation action is not available
    And Return to order is the only action

  @demo @planned @WT-MOB-CANCEL-007
  Scenario: Fit the review step on a phone
    Given a 390 by 844 phone viewport
    When the cancel order screen is opened
    Then no layout exception occurs
    And both footer actions remain reachable

  @live @WT-MOB-CANCEL-008
  Scenario: Show the server-confirmed cancellation
    Given the cancel order screen opened with a real order UUID
    When a reason is submitted and the server accepts the cancellation
    Then the server-confirmed outcome is shown
    And the repository receives the selected brand, order ID, and reason

  @live @WT-MOB-CANCEL-009
  Scenario: Show the server rejection
    Given the cancel order screen opened with a real order UUID
    When the server rejects the cancellation
    Then the rejection message from the repository is displayed

  @live @planned @WT-MOB-CANCEL-010
  Scenario: Retry an uncertain cancellation
    Given a live cancellation that failed without a server response
    When the retry action is pressed
    Then the same order and reason are sent again

  @live @planned @WT-MOB-CANCEL-011
  Scenario: Never send a blank reason
    Given the cancel order screen opened with a real order UUID
    When Cancel order is pressed with an empty reason
    Then the validation step is shown
    And no request is sent
