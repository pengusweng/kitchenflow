import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/data/models/login_status.dart';

void main() {
  group('LoginStatus', () {
    test('UT-MOB-LOGIN-001 only submitting reports isSubmitting', () {
      for (final status in LoginStatus.values) {
        expect(status.isSubmitting, status == LoginStatus.submitting);
      }
    });

    test('UT-MOB-LOGIN-002 error statuses have notice copy and the others have none', () {
      const withNotice = {
        LoginStatus.missingFields,
        LoginStatus.invalidCredentials,
        LoginStatus.networkError,
        LoginStatus.pinSetupRequired,
      };

      for (final status in LoginStatus.values) {
        expect(status.hasNotice, withNotice.contains(status));
        expect(status.noticeTitle.isNotEmpty, withNotice.contains(status));
        expect(status.noticeMessage.isNotEmpty, withNotice.contains(status));
      }
    });

    test('UT-MOB-LOGIN-003 only input problems flag the fields, not network errors', () {
      expect(LoginStatus.missingFields.fieldsInError, isTrue);
      expect(LoginStatus.invalidCredentials.fieldsInError, isTrue);
      expect(LoginStatus.networkError.fieldsInError, isFalse);
      expect(LoginStatus.pinSetupRequired.fieldsInError, isFalse);
      expect(LoginStatus.idle.fieldsInError, isFalse);
      expect(LoginStatus.submitting.fieldsInError, isFalse);
    });
  });
}
