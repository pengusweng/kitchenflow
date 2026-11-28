import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/auth/token_store.dart';
import 'package:mobile/core/models/user_role.dart';

/// Why a sign-in attempt failed, normalized from transport/HTTP errors so
/// the UI never has to inspect [DioException] itself.
enum AuthFailure {
  invalidCredentials,
  network,
  unexpected,
  pinRequired,
  invalidPin,

  /// A superadmin with no PIN yet; they set one up on the web dashboard.
  pinSetupRequired,
}

class AuthException implements Exception {
  const AuthException(this.message, {this.kind = AuthFailure.unexpected});
  final String message;
  final AuthFailure kind;
}

class AuthRepository {
  AuthRepository(this._dio, this._store);

  final Dio _dio;
  final TokenStore _store;
  UserRole? _cachedRole;
  String? _cachedUserId;

  UserRole? get cachedRole => _cachedRole;
  String? get cachedUserId => _cachedUserId;

  /// Signs in and persists the session token.
  ///
  /// Contract: POST /auth/login `{username, password}` ->
  /// 200 `{token, expires_at, user}` |
  /// 401 `{code: 'INVALID_CREDENTIALS', message}` |
  /// 401 `{code: 'PIN_REQUIRED'}` |
  /// 401 `{code: 'INVALID_PIN'}` |
  /// 403 `{code: 'PIN_SETUP_REQUIRED'}`.
  ///
  /// Superadmins must provide their four-digit [pin] (sent via `X-Action-Pin`).
  /// Returns the session token on success. Throws [AuthException] otherwise.
  Future<String> login({
    required String username,
    required String password,
    String? pin,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'username': username, 'password': password},
        options: pin != null && pin.isNotEmpty
            ? Options(headers: {'X-Action-Pin': pin})
            : null,
      );

      final token = res.data?['token'];
      if (token is! String || token.isEmpty) {
        throw const AuthException('Server response did not include a token.');
      }

      await _store.write(token);

      final userMap = res.data?['user'];
      if (userMap is Map<String, dynamic>) {
        final roleStr = userMap['role'] as String?;
        _cachedRole = UserRole.fromApiValue(roleStr);
        if (roleStr != null && roleStr.isNotEmpty) {
          await _store.writeRole(roleStr);
        }

        final userId = userMap['user_id'] as String?;
        if (userId != null && userId.isNotEmpty) {
          _cachedUserId = userId;
          await _store.writeUserId(userId);
        }
      }

      return token;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Returns the signed-in user's assigned brand UUID.
  ///
  /// The POS API authorizes menu access by UUID; display-only brand slugs must
  /// never be used in requests to brand-scoped endpoints.
  Future<String?> getCurrentBrandId() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      final brandId = response.data?['brand_id'];
      if (brandId == null) return null;
      if (brandId is String && brandId.isNotEmpty) return brandId;
      throw const AuthException('Server response has an invalid brand ID.');
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Returns the signed-in user's role.
  Future<UserRole?> getCurrentUserRole() async {
    if (_cachedRole != null) return _cachedRole;

    try {
      final stored = await _store.readRole();
      if (stored != null) {
        _cachedRole = UserRole.fromApiValue(stored);
        if (_cachedRole != null) return _cachedRole;
      }

      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      final roleStr = response.data?['role'] as String?;
      _cachedRole = UserRole.fromApiValue(roleStr);
      if (roleStr != null && roleStr.isNotEmpty) {
        await _store.writeRole(roleStr);
      }
      return _cachedRole;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Returns the signed-in user's UUID.
  Future<String?> getCurrentUserId() async {
    if (_cachedUserId != null) return _cachedUserId;

    try {
      final stored = await _store.readUserId();
      if (stored != null && stored.isNotEmpty) {
        _cachedUserId = stored;
        return _cachedUserId;
      }

      final response = await _dio.get<Map<String, dynamic>>('/auth/me');
      final userId = response.data?['user_id'] as String?;
      if (userId != null && userId.isNotEmpty) {
        _cachedUserId = userId;
        await _store.writeUserId(userId);
      }
      return _cachedUserId;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  /// Ends the server session and clears the stored token.
  ///
  /// Contract: POST /auth/logout `Authorization: Bearer <token>` -> 204.
  ///
  /// [token] is passed explicitly because the session state may be cleared
  /// while this call is still in flight. Never throws: signing out locally
  /// must succeed even when the server is unreachable.
  Future<void> logout(String token) async {
    _cachedRole = null;
    _cachedUserId = null;
    try {
      await _dio.post<void>(
        '/auth/logout',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } on DioException {
      // Offline, or the session was already gone. Sign out locally anyway.
    }

    try {
      await _store.clear();
    } catch (_) {
      // Secure storage failure must not block the sign-out flow.
    }
  }

  AuthException _mapDioException(DioException e) {
    final status = e.response?.statusCode;
    final body = e.response?.data;
    if (status == 403 && body is Map && body['code'] == 'PIN_SETUP_REQUIRED') {
      // The superadmin's password was right but they have no PIN yet. PIN
      // setup happens on the web dashboard, where it is confirmed again with
      // their password.
      return const AuthException(
        'Set up your superadmin PIN on the web dashboard, then sign in here.',
        kind: AuthFailure.pinSetupRequired,
      );
    }

    if (status == 401) {
      final data = e.response?.data;
      final code = data is Map ? data['code'] as String? : null;
      final message = data is Map ? (data['message'] as String?)?.trim() : null;

      if (code == 'PIN_REQUIRED') {
        return AuthException(
          message ?? 'Enter your PIN to sign in.',
          kind: AuthFailure.pinRequired,
        );
      }
      if (code == 'INVALID_PIN') {
        return AuthException(
          message ?? 'Incorrect PIN.',
          kind: AuthFailure.invalidPin,
        );
      }

      return AuthException(
        (message == null || message.isEmpty)
            ? 'Invalid username or password.'
            : message,
        kind: AuthFailure.invalidCredentials,
      );
    }

    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.connectionError => const AuthException(
        'Unable to reach the server.',
        kind: AuthFailure.network,
      ),
      _ => const AuthException('Unexpected sign-in failure.'),
    };
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider), ref.watch(tokenStoreProvider));
});
