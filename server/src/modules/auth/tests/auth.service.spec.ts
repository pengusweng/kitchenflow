import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import { AuthRepository } from '../auth.repository';
import { AuthService } from '../auth.service';
import { UsersRepository } from '../../users/users.repository';
import { PinService } from '../../pin/pin.service';

describe('AuthService', () => {
  const now = new Date('2030-01-01T12:00:00Z');
  const user = { user_id: 'user-id', is_active: true };
  const session = {
    session_id: 'session-id',
    user_id: user.user_id,
    created_at: now,
    expires_at: new Date('2030-01-01T20:00:00Z'),
    last_seen_at: now,
  };
  let authRepository: jest.Mocked<
    Pick<
      AuthRepository,
      | 'create'
      | 'findOneSessionByTokenHash'
      | 'updateLastSeen'
      | 'delete'
      | 'deleteMany'
    >
  >;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'findOne'>>;
  let service: AuthService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    authRepository = {
      create: jest.fn().mockResolvedValue(session),
      findOneSessionByTokenHash: jest.fn().mockResolvedValue(session),
      updateLastSeen: jest.fn().mockResolvedValue(session),
      delete: jest.fn().mockResolvedValue(session),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
    };
    usersRepository = { findOne: jest.fn().mockResolvedValue(user) };
    service = new AuthService(
      authRepository as unknown as AuthRepository,
      usersRepository as unknown as UsersRepository,
      {} as PinService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('UT-AUTH-001: creates a session for an active user with a future expiration', async () => {
    const dto = {
      user_id: user.user_id,
      token_hash: 'a'.repeat(64),
      expires_at: session.expires_at,
    };
    await expect(service.createSession(dto)).resolves.toEqual(session);
    expect(authRepository.create).toHaveBeenCalledWith(dto);
  });

  it('UT-AUTH-002: rejects session creation for a missing user', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    await expect(
      service.createSession({
        user_id: user.user_id,
        token_hash: 'a'.repeat(64),
        expires_at: session.expires_at,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(authRepository.create).not.toHaveBeenCalled();
  });

  it.each([now, new Date('invalid')])(
    'UT-AUTH-003: rejects invalid session expiration %s',
    async (expires_at) => {
      await expect(
        service.createSession({
          user_id: user.user_id,
          token_hash: 'a'.repeat(64),
          expires_at,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authRepository.create).not.toHaveBeenCalled();
    },
  );

  it('UT-AUTH-004: hashes the bearer token and records activity only after validation', async () => {
    const token = 'raw-bearer-token';
    await expect(service.validateSession(token)).resolves.toEqual({
      ...session,
      user,
    });
    expect(authRepository.findOneSessionByTokenHash).toHaveBeenCalledWith(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(authRepository.updateLastSeen).toHaveBeenCalledWith(
      session.session_id,
    );
  });

  it('UT-AUTH-005: rejects an empty token without a database lookup', async () => {
    await expect(service.validateSession('')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authRepository.findOneSessionByTokenHash).not.toHaveBeenCalled();
  });

  it.each([null, { ...session, expires_at: now }])(
    'UT-AUTH-006: rejects missing or expired sessions',
    async (storedSession) => {
      authRepository.findOneSessionByTokenHash.mockResolvedValue(storedSession);
      await expect(service.validateSession('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(authRepository.updateLastSeen).not.toHaveBeenCalled();
    },
  );

  it('UT-AUTH-007: accepts an unexpired session regardless of inactivity', async () => {
    authRepository.findOneSessionByTokenHash.mockResolvedValue({
      ...session,
      last_seen_at: new Date('2029-12-31T00:00:00Z'),
    });
    await expect(service.validateSession('token')).resolves.toEqual({
      ...session,
      user,
    });
    expect(authRepository.updateLastSeen).toHaveBeenCalledWith(
      session.session_id,
    );
  });

  it('UT-AUTH-008: rejects session owners not returned by the active-user lookup', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    await expect(service.validateSession('token')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(authRepository.updateLastSeen).not.toHaveBeenCalled();
  });

  it('UT-AUTH-009: rejects a session revoked between lookup and activity update', async () => {
    authRepository.updateLastSeen.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing session', {
        code: 'P2025',
        clientVersion: '7.8.0',
      }),
    );
    await expect(service.validateSession('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('UT-AUTH-010: deletes only the specified session on logout', async () => {
    await expect(service.deleteSession(session.session_id)).resolves.toEqual(
      session,
    );
    expect(authRepository.delete).toHaveBeenCalledWith(session.session_id);
    expect(authRepository.deleteMany).not.toHaveBeenCalled();
  });

  it('UT-AUTH-011: allows repeated logout of an already deleted session', async () => {
    authRepository.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing session', {
        code: 'P2025',
        clientVersion: '7.8.0',
      }),
    );
    await expect(service.deleteSession(session.session_id)).resolves.toBeNull();
  });

  it('UT-AUTH-012: propagates database failures and revokes all sessions for a user', async () => {
    const error = new Error('Database unavailable');
    authRepository.delete.mockRejectedValue(error);
    await expect(service.deleteSession(session.session_id)).rejects.toBe(error);

    await expect(service.deleteUserSessions(user.user_id)).resolves.toEqual({
      count: 2,
    });
    expect(authRepository.deleteMany).toHaveBeenCalledWith(user.user_id);
  });
});

describe('AuthService superadmin PIN setup', () => {
  const password = 'correct-password';
  const superadmin = {
    user_id: '00000000-0000-4000-8000-000000000001',
    username: 'admin',
    first_name: 'Test',
    last_name: 'Admin',
    role: UserRole.SUPERADMIN,
    is_active: true,
    created_at: new Date('2030-01-01T00:00:00Z'),
    modified_at: new Date('2030-01-01T00:00:00Z'),
  };
  let passwordHash: string;
  let usersRepository: {
    findByUsername: jest.Mock;
    findOne: jest.Mock;
  };
  let authRepository: { create: jest.Mock };
  let pinService: {
    hasPin: jest.Mock;
    verifyPin: jest.Mock;
    create: jest.Mock;
  };
  let service: AuthService;

  beforeAll(async () => {
    passwordHash = await argon2.hash(password);
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    usersRepository = {
      findByUsername: jest.fn().mockResolvedValue({
        user_id: superadmin.user_id,
        password_hash: passwordHash,
      }),
      findOne: jest.fn().mockResolvedValue(superadmin),
    };
    authRepository = {
      create: jest.fn((dto: { user_id: string; expires_at: Date }) =>
        Promise.resolve({ session_id: 'session-id', ...dto }),
      ),
    };
    pinService = {
      hasPin: jest.fn().mockResolvedValue(false),
      verifyPin: jest.fn(),
      create: jest.fn().mockResolvedValue({ user_id: superadmin.user_id }),
    };
    service = new AuthService(
      authRepository as unknown as AuthRepository,
      usersRepository as unknown as UsersRepository,
      pinService as unknown as PinService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([undefined, '1234'])(
    'UT-AUTH-017: requires PIN setup before a superadmin without a PIN can sign in: PIN %s',
    async (pin) => {
      await expect(
        service.login({ username: 'admin', password }, pin),
      ).rejects.toMatchObject({
        status: 403,
        response: { code: 'PIN_SETUP_REQUIRED' },
      });
      expect(pinService.hasPin).toHaveBeenCalledWith(superadmin.user_id);
      expect(pinService.verifyPin).not.toHaveBeenCalled();
      expect(authRepository.create).not.toHaveBeenCalled();

      await expect(
        service.login({ username: 'admin', password: 'wrong-password' }, pin),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'INVALID_CREDENTIALS' },
      });
      expect(pinService.hasPin).toHaveBeenCalledTimes(1);
    },
  );

  it('UT-AUTH-018: saves the first superadmin PIN and returns a session after checking the password', async () => {
    const result = await service.setupPinAndLogin({
      username: 'admin',
      password,
      pin: '0123',
    });

    expect(pinService.create).toHaveBeenCalledWith(
      { pin: '0123' },
      superadmin.user_id,
    );
    expect(pinService.create.mock.invocationCallOrder[0]).toBeLessThan(
      authRepository.create.mock.invocationCallOrder[0],
    );
    expect(result).toMatchObject({
      token: expect.any(String) as string,
      user: superadmin,
    });
    expect(authRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: superadmin.user_id,
        token_hash: createHash('sha256').update(result.token).digest('hex'),
      }),
    );
  });

  it.each([
    [
      'a wrong password',
      () => usersRepository.findByUsername,
      UnauthorizedException,
    ],
    [
      'a non-superadmin',
      () =>
        usersRepository.findOne.mockResolvedValue({
          ...superadmin,
          role: UserRole.SUPERVISOR,
        }),
      ForbiddenException,
    ],
    [
      'an existing PIN',
      () =>
        pinService.create.mockRejectedValue(
          new ConflictException({ code: 'EXISTING_PIN_FOUND' }),
        ),
      ConflictException,
    ],
  ])(
    'UT-AUTH-019: refuses PIN setup at sign-in for %s without a session',
    async (scenario, arrange, expected) => {
      arrange();
      const attempt = service.setupPinAndLogin({
        username: 'admin',
        password: scenario === 'a wrong password' ? 'wrong-password' : password,
        pin: '0123',
      });

      await expect(attempt).rejects.toBeInstanceOf(expected);
      expect(authRepository.create).not.toHaveBeenCalled();
      if (scenario !== 'an existing PIN') {
        expect(pinService.create).not.toHaveBeenCalled();
      }
    },
  );
});
