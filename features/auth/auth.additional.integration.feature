@backend @integration @auth
Feature: Additional auth integration coverage
  Feature ID: FEAT-AUTH-IT-ADDITIONAL
  Requirement ID: FR-AUTH-001

  As a backend maintainer,
  I want the auth behavior documented alongside its executable tests,
  So that each result can be traced to its preconditions, action, and expected outcome.

  Parameterized Jest cases share a scenario; each report entry retains the executed
  Jest name and its concrete parameter values.

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  # Context: 
  @IT-AUTH-014
  Scenario: Allow superadmins to list and look up employees globally
    Test Case ID: IT-AUTH-014
    Given an authenticated superadmin and employee accounts without brand assignments
    When global employee listing and individual lookups are requested
    Then users across the fixture data are accessible without brand scoping

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  @IT-AUTH-018
  Scenario: Require a valid PIN before creating a superadmin session
    Test Case ID: IT-AUTH-018
    Given a superadmin account with valid credentials
    When login omits the PIN, sends a wrong or malformed PIN, has no PIN configured, or is PIN-locked
    Then the response is 401 PIN_REQUIRED, 401 INVALID_PIN, 403 PIN_NOT_CONFIGURED, or 429 PIN_LOCKED
    And no session is created until the correct PIN is sent, which returns 200

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  @IT-AUTH-019
  Scenario Outline: Let non-superadmins log in without a PIN check
    Test Case ID: IT-AUTH-019
    Given a kitchen staff account with valid credentials
    When login is sent with PIN header <pin>
    Then the response status is 200 and the PIN is never verified

    Examples:
      | pin       |
      | (none)    |
      | 9999      |

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  @IT-AUTH-020
  Scenario: Ask a superadmin without a PIN to set one up after a correct password
    Test Case ID: IT-AUTH-020
    Given a superadmin account that has no PIN credential
    When login is sent with a wrong password, and then with the correct password with or without a PIN header
    Then the wrong password is 401 INVALID_CREDENTIALS before the PIN status is read
    And the correct password is 403 PIN_SETUP_REQUIRED with Cache-Control no-store, no PIN verification and no session

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  @IT-AUTH-021
  Scenario: Set up a superadmin PIN confirmed by the password and sign in
    Test Case ID: IT-AUTH-021
    Given a superadmin account that has no PIN credential
    When PIN setup is sent with the username, the correct password and the PIN 0123
    Then the PIN is created for that superadmin and the response is 200 with a working session token
    And the response uses Cache-Control no-store and never echoes the PIN

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  @IT-AUTH-022
  Scenario Outline: Refuse PIN setup at sign-in without creating a session
    Test Case ID: IT-AUTH-022
    Given <case>
    When PIN setup is sent with the PIN 0123
    Then the response is <status> <code> and no session is created
    And no PIN is created, or the existing PIN is left in place

    Examples:
      | case              | status | code                  |
      | a wrong password  | 401    | INVALID_CREDENTIALS   |
      | a non-superadmin  | 403    | PIN_SETUP_NOT_ALLOWED |
      | an existing PIN   | 409    | EXISTING_PIN_FOUND    |

  # Jest: server/src/modules/auth/tests/auth.http.spec.ts
  @IT-AUTH-023
  Scenario: Reject a PIN setup whose PIN is not four digits
    Test Case ID: IT-AUTH-023
    Given a superadmin without a PIN and the correct password
    When PIN setup is sent with a missing, non-string, short, long, non-numeric or padded PIN
    Then the response is 400 without creating a PIN or a session
