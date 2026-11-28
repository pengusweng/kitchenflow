import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

const userProfileExample = {
  user_id: '00000000-0000-4000-8000-000000000001',
  username: 'supervisor',
  first_name: 'Maria',
  last_name: 'Santos',
  role: 'SUPERVISOR',
  is_active: true,
  created_at: '2026-10-31T08:00:00.000Z',
  modified_at: '2026-10-31T08:00:00.000Z',
};

export function AuthDocs() {
  return applyDecorators(
    ApiTags('Auth'),
    ApiResponse({ status: 400, description: 'Invalid request.' }),
  );
}

export function LoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Log in and create a 24-hour session.',
      description:
        'Available to active users of any role. Superadmins must also send their four-digit X-Action-Pin header; other roles do not need it. A superadmin who has no PIN yet gets 403 PIN_SETUP_REQUIRED after a correct password, and sets one up through POST /api/auth/pin-setup. Returns token, expires_at, and user. Use the token as Authorization: Bearer <token>. The user profile excludes password_hash and has no brand assignment. The response uses Cache-Control: no-store.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Bearer token, expiration timestamp, and current user profile. The token is an opaque string, not a JWT.',
      content: {
        'application/json': {
          example: {
            token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            expires_at: '2026-11-01T08:00:00.000Z',
            user: userProfileExample,
          },
        },
      },
    }),
    ApiHeader({
      name: 'X-Action-Pin',
      required: false,
      description:
        'Four-digit PIN. Required only when the account is a superadmin; ignored for other roles.',
    }),
    ApiResponse({
      status: 401,
      description:
        'Invalid username or password, or inactive account (INVALID_CREDENTIALS). For superadmins, a missing PIN (PIN_REQUIRED) or a wrong PIN (INVALID_PIN).',
    }),
    ApiResponse({
      status: 403,
      description:
        'The superadmin has no PIN set up (PIN_SETUP_REQUIRED). No session is created; set one up through POST /api/auth/pin-setup.',
    }),
    ApiResponse({
      status: 429,
      description:
        'The superadmin PIN is locked after too many wrong attempts (PIN_LOCKED, with locked_until).',
    }),
  );
}

export function PinSetupDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Set up a superadmin’s first PIN and sign in.',
      description:
        'For a superadmin whose login returned 403 PIN_SETUP_REQUIRED. Send the username, the account password to confirm the change, and the new four-digit PIN. The PIN is saved and a 24-hour session is created, with the same response as login. Only creates a first PIN: it never replaces an existing one. The response uses Cache-Control: no-store.',
    }),
    ApiResponse({
      status: 200,
      description:
        'PIN saved. Bearer token, expiration timestamp, and current user profile, as for login.',
      content: {
        'application/json': {
          example: {
            token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            expires_at: '2026-11-01T08:00:00.000Z',
            user: { ...userProfileExample, role: 'SUPERADMIN' },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description:
        'Invalid username or password, or inactive account (INVALID_CREDENTIALS). No PIN is saved.',
    }),
    ApiResponse({
      status: 403,
      description:
        'The account is not a superadmin (PIN_SETUP_NOT_ALLOWED). Other roles set up their PIN after signing in, through POST /api/pin.',
    }),
    ApiResponse({
      status: 409,
      description:
        'The account already has a PIN (EXISTING_PIN_FOUND). Sign in with it, or ask a superadmin to reset it.',
    }),
  );
}

export function MeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the current user profile.',
      description:
        'Available to any authenticated role. Returns the active user, without password_hash. The response uses Cache-Control: no-store.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Current user profile without brand assignments or password hashes.',
      content: { 'application/json': { example: userProfileExample } },
    }),
    ApiResponse({
      status: 401,
      description:
        'Bearer token missing, invalid, revoked, or expired; or the account is inactive.',
    }),
    ApiBearerAuth(),
  );
}

export function LogoutDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'End the current session.',
      description:
        'Requires a valid bearer token. Revokes only the current session; other sessions remain valid. Returns no response body.',
    }),
    ApiResponse({
      status: 204,
      description: 'Session ended; no response body.',
    }),
    ApiResponse({
      status: 401,
      description:
        'Bearer token missing, invalid, revoked, or expired; or the account is inactive.',
    }),
    ApiBearerAuth(),
  );
}

export function LogoutAllDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'End all sessions for the current user.',
      description:
        'Requires a valid bearer token. Revokes every session for that user, including the current one. Returns no response body.',
    }),
    ApiResponse({
      status: 204,
      description: 'All sessions ended; no response body.',
    }),
    ApiResponse({
      status: 401,
      description:
        'Bearer token missing, invalid, revoked, or expired; or the account is inactive.',
    }),
    ApiBearerAuth(),
  );
}
