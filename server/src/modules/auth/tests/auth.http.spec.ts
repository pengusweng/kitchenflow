import { PinGuard } from '../../pin/pin.guard';
import { PinService } from '../../pin/pin.service';
import type { PinVerificationResult } from '../../pin/pin.repository';
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { AuthModule } from '../auth.module';
import { AuthRepository } from '../auth.repository';
import { AuthService } from '../auth.service';
import { CreateSessionDTO } from '../dto/create-session.dto';
import { UsersRepository } from '../../users/users.repository';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { StorageService } from '../../../shared/storage/storage.service';

describe('Auth HTTP endpoints', () => {
  let app: INestApplication;
  let url: string;
  let passwordHash: string;
  const admin = {
    user_id: randomUUID(),
    username: 'admin',
    first_name: 'Test',
    last_name: 'Admin',
    role: UserRole.SUPERADMIN,
    is_active: true,
    created_at: new Date(),
    modified_at: new Date(),
  };
  const staff = {
    ...admin,
    user_id: randomUUID(),
    username: 'staff',
    role: UserRole.KITCHEN_STAFF,
  };
  const users = new Map<string, ReturnType<AuthService['getUserProfile']>>();
  type Session = CreateSessionDTO & {
    session_id: string;
    created_at: Date;
    last_seen_at: Date;
  };
  const sessions = new Map<string, Session>();
  const ADMIN_PIN = '1234';
  const verifyPin = jest.fn(
    (_userId: string, pin: string): Promise<PinVerificationResult> =>
      Promise.resolve({ status: pin === ADMIN_PIN ? 'valid' : 'invalid' }),
  );
  // Users with a PIN credential; the admin has one unless a test removes it.
  const configuredPins = new Set<string>();
  const hasPin = jest.fn((userId: string) =>
    Promise.resolve(configuredPins.has(userId)),
  );
  const createPin = jest.fn(({ pin }: { pin: string }, userId: string) => {
    if (configuredPins.has(userId)) {
      return Promise.reject(
        new ConflictException({
          code: 'EXISTING_PIN_FOUND',
          message: 'User already has existing pin',
        }),
      );
    }
    configuredPins.add(userId);
    return Promise.resolve({ user_id: userId, pin_length: pin.length });
  });
  const safeSession = (session: Session) => ({
    session_id: session.session_id,
    user_id: session.user_id,
    created_at: session.created_at,
    expires_at: session.expires_at,
    last_seen_at: session.last_seen_at,
  });

  beforeAll(async () => {
    passwordHash = await argon2.hash('correct-password');
    const matchingUsers = (where: { is_active?: boolean }) =>
      [...users.values()].filter((user) => {
        return (
          where.is_active === undefined || user.is_active === where.is_active
        );
      });
    const listingRepository = new UsersRepository({
      user: {
        findMany: ({
          where,
          skip,
          take,
        }: {
          where: { is_active?: boolean };
          skip: number;
          take: number;
        }) => Promise.resolve(matchingUsers(where).slice(skip, skip + take)),
        count: ({ where }: { where: { is_active?: boolean } }) =>
          Promise.resolve(matchingUsers(where).length),
      },
      $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
    } as unknown as PrismaService);
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(StorageService)
      .useValue({ createDownloadUrl: jest.fn() })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: ({
            where,
          }: {
            where: { user_id?: string; username?: string };
          }) =>
            Promise.resolve(
              [...users.values()].find((user) =>
                where.user_id
                  ? user.user_id === where.user_id
                  : user.username === where.username,
              ) ?? null,
            ),
        },
      })
      .overrideProvider(UsersRepository)
      .useValue({
        findByUsername: jest.fn((username: string) => {
          const user = [...users.values()].find(
            (user) => user.username === username && user.is_active,
          );
          return Promise.resolve(
            user
              ? { user_id: user.user_id, password_hash: passwordHash }
              : null,
          );
        }),
        findOne: jest.fn((userId: string) => {
          const user = users.get(userId);
          return Promise.resolve(user?.is_active ? user : null);
        }),
        findAll: jest.fn(
          (
            skip: number,
            take: number,
            filters: Parameters<UsersRepository['findAll']>[2],
          ) => listingRepository.findAll(skip, take, filters),
        ),
      })
      .overrideProvider(AuthRepository)
      .useValue({
        create: jest.fn((dto: CreateSessionDTO) => {
          const session = {
            ...dto,
            session_id: randomUUID(),
            created_at: new Date(),
            last_seen_at: new Date(),
          };
          sessions.set(session.session_id, session);
          return Promise.resolve(safeSession(session));
        }),
        findOneSessionByTokenHash: jest.fn((hash: string) => {
          const session = [...sessions.values()].find(
            (session) => session.token_hash === hash,
          );
          return Promise.resolve(session ? safeSession(session) : null);
        }),
        updateLastSeen: jest.fn((sessionId: string) => {
          const session = sessions.get(sessionId)!;
          session.last_seen_at = new Date();
          return Promise.resolve(safeSession(session));
        }),
        delete: jest.fn((sessionId: string) => {
          const session = sessions.get(sessionId)!;
          sessions.delete(sessionId);
          return Promise.resolve(safeSession(session));
        }),
        deleteMany: jest.fn((userId: string) => {
          let count = 0;
          for (const [id, session] of sessions) {
            if (session.user_id === userId) {
              sessions.delete(id);
              count++;
            }
          }
          return Promise.resolve({ count });
        }),
      })
      .overrideProvider(PinService)
      .useValue({ verifyPin, hasPin, create: createPin })
      .overrideGuard(PinGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  beforeEach(() => {
    verifyPin.mockClear();
    hasPin.mockClear();
    createPin.mockClear();
    configuredPins.clear();
    configuredPins.add(admin.user_id);
    sessions.clear();
    users.clear();
    users.set(admin.user_id, { ...admin });
    users.set(staff.user_id, { ...staff });
  });

  afterAll(async () => {
    await app?.close();
  });

  async function postLogin(username: string, pin?: string) {
    return fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(pin ? { 'X-Action-Pin': pin } : {}),
      },
      body: JSON.stringify({ username, password: 'correct-password' }),
    });
  }

  async function login(username = 'admin') {
    const response = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(username === 'admin' ? { 'X-Action-Pin': ADMIN_PIN } : {}),
      },
      body: JSON.stringify({ username, password: 'correct-password' }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    return (await response.json()) as {
      token: string;
      expires_at: string;
      user: ReturnType<AuthService['getUserProfile']>;
    };
  }

  it('IT-AUTH-014: allows superadmins to list and look up users across brands', async () => {
    const unrelated = {
      ...staff,
      user_id: randomUUID(),
      username: 'unrelated',
    };
    users.set(unrelated.user_id, unrelated);
    const { token } = await login();
    const headers = { Authorization: `Bearer ${token}` };
    for (const suffix of ['', '?status=all']) {
      const response = await fetch(`${url}/api/users${suffix}`, { headers });
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: { user_id: string }[];
        meta: { total: number };
      };
      expect(body.data.map((user) => user.user_id).sort()).toEqual(
        [admin.user_id, staff.user_id, unrelated.user_id].sort(),
      );
      expect(body.meta.total).toBe(3);
    }
    const lookup = await fetch(`${url}/api/users/${unrelated.user_id}`, {
      headers,
    });
    expect(lookup.status).toBe(200);
  });

  it('IT-AUTH-001: issues a random token, persists its hash, and returns a safe profile', async () => {
    const body = await login();
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(
      Math.abs(new Date(body.expires_at).getTime() - Date.now() - 86400000),
    ).toBeLessThan(5000);
    expect(body.user).toEqual({
      user_id: admin.user_id,
      username: 'admin',
      first_name: 'Test',
      last_name: 'Admin',
      role: UserRole.SUPERADMIN,
      is_active: admin.is_active,
      created_at: admin.created_at.toISOString(),
      modified_at: admin.modified_at.toISOString(),
    });
    expect(body.user).not.toHaveProperty('password_hash');
    expect(body).not.toHaveProperty('token_hash');
    expect([...sessions.values()][0].token_hash).toBe(
      createHash('sha256').update(body.token).digest('hex'),
    );
  });

  it.each([
    { username: 'unknown', password: 'correct-password' },
    { username: 'admin', password: 'wrong-password' },
  ])(
    'IT-AUTH-002: rejects invalid credentials without creating a session',
    async (credentials) => {
      const response = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
      expect(sessions.size).toBe(0);
    },
  );

  it('IT-AUTH-003: rejects client-supplied session fields', async () => {
    const response = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'correct-password',
        user_id: admin.user_id,
      }),
    });
    expect(response.status).toBe(400);
    expect(sessions.size).toBe(0);
  });

  it.each([undefined, 'Basic abc', 'Bearer', 'Bearer a b', 'Bearer unknown'])(
    'IT-AUTH-004: rejects missing or invalid bearer tokens: %s',
    async (authorization) => {
      const response = await fetch(`${url}/api/auth/me`, {
        headers: authorization ? { Authorization: authorization } : {},
      });
      expect(response.status).toBe(401);
    },
  );

  it('IT-AUTH-005: returns the authenticated user and accepts old activity timestamps', async () => {
    const { token, user } = await login();
    [...sessions.values()][0].last_seen_at = new Date(0);
    const response = await fetch(`${url}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(user);
  });

  it('IT-AUTH-006: returns a profile without brand assignments', async () => {
    const { token, user } = await login();
    expect(user).not.toHaveProperty('brand_id');
    const response = await fetch(`${url}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(user);
  });

  it('IT-AUTH-007: logout invalidates only the current session', async () => {
    const first = await login();
    const second = await login();
    const response = await fetch(`${url}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${first.token}` },
    });
    expect(response.status).toBe(204);
    expect(sessions.size).toBe(1);
    expect(
      (
        await fetch(`${url}/api/auth/me`, {
          headers: { Authorization: `Bearer ${first.token}` },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${url}/api/auth/me`, {
          headers: { Authorization: `Bearer ${second.token}` },
        })
      ).status,
    ).toBe(200);
  });

  it('IT-AUTH-008: logout-all leaves another user’s sessions intact', async () => {
    const first = await login();
    await login();
    const other = await login('staff');
    expect(
      (
        await fetch(`${url}/api/auth/logout-all`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${first.token}` },
        })
      ).status,
    ).toBe(204);
    expect(sessions.size).toBe(1);
    expect(
      (
        await fetch(`${url}/api/auth/me`, {
          headers: { Authorization: `Bearer ${other.token}` },
        })
      ).status,
    ).toBe(200);
  });

  it('IT-AUTH-009: rejects expired sessions', async () => {
    const { token } = await login();
    [...sessions.values()][0].expires_at = new Date(0);
    expect(
      (
        await fetch(`${url}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status,
    ).toBe(401);
  });

  it('IT-AUTH-010: rejects sessions after account deactivation', async () => {
    const { token } = await login();
    users.get(admin.user_id)!.is_active = false;
    expect(
      (
        await fetch(`${url}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status,
    ).toBe(401);
    const response = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'correct-password' }),
    });
    expect(response.status).toBe(401);
  });

  it.each([
    { query: '', total: 2, totalPages: 1, inactiveReturned: false },
    {
      query: '&status=active',
      total: 2,
      totalPages: 1,
      inactiveReturned: false,
    },
    { query: '&status=all', total: 3, totalPages: 2, inactiveReturned: true },
    {
      query: '&status=inactive',
      total: 1,
      totalPages: 1,
      inactiveReturned: false,
    },
  ])(
    'IT-AUTH-011: paginates users with the status filter: $query',
    async ({ query, total, totalPages, inactiveReturned }) => {
      const inactive = {
        ...staff,
        user_id: randomUUID(),
        username: 'inactive',
        is_active: false,
      };
      users.set(inactive.user_id, inactive);
      const { token } = await login();

      const response = await fetch(`${url}/api/users?page=2&limit=2${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        data: inactiveReturned
          ? [
              expect.objectContaining({
                user_id: inactive.user_id,
                is_active: false,
              }),
            ]
          : [],
        meta: {
          page: 2,
          limit: 2,
          total,
          totalPages,
          counts: { all: 3, active: 2, inactive: 1 },
        },
      });
    },
  );

  it.each([
    'status=',
    'status=yes',
    'status=ACTIVE',
    'status=true',
    'status=active&status=all',
    'activeOnly=false',
  ])('IT-AUTH-012: rejects invalid status query values: %s', async (query) => {
    const { token } = await login();

    const response = await fetch(`${url}/api/users?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(400);
  });

  it('IT-AUTH-013: requires superadmin access for user management', async () => {
    expect((await fetch(`${url}/api/users`)).status).toBe(401);
    const member = await login('staff');
    expect(
      (
        await fetch(`${url}/api/users`, {
          headers: { Authorization: `Bearer ${member.token}` },
        })
      ).status,
    ).toBe(403);
    const admin = await login();
    expect(
      (
        await fetch(`${url}/api/users`, {
          headers: { Authorization: `Bearer ${admin.token}` },
        })
      ).status,
    ).toBe(200);
  });

  it('IT-AUTH-018: requires a valid PIN before a superadmin session is created', async () => {
    const missing = await postLogin('admin');
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ code: 'PIN_REQUIRED' });
    expect(verifyPin).not.toHaveBeenCalled();

    for (const pin of ['9999', 'abcd', '12345']) {
      const wrong = await postLogin('admin', pin);
      expect(wrong.status).toBe(401);
      expect(await wrong.json()).toMatchObject({ code: 'INVALID_PIN' });
    }
    expect(verifyPin).toHaveBeenCalledTimes(1);
    expect(verifyPin).toHaveBeenCalledWith(admin.user_id, '9999');

    verifyPin.mockResolvedValueOnce({ status: 'not-configured' });
    expect((await postLogin('admin', ADMIN_PIN)).status).toBe(403);

    const until = new Date(Date.now() + 60_000);
    verifyPin.mockResolvedValueOnce({ status: 'locked', until });
    const locked = await postLogin('admin', ADMIN_PIN);
    expect(locked.status).toBe(429);
    expect(await locked.json()).toMatchObject({
      code: 'PIN_LOCKED',
      locked_until: until.toISOString(),
    });
    expect(sessions.size).toBe(0);

    expect((await postLogin('admin', ADMIN_PIN)).status).toBe(200);
    expect(sessions.size).toBe(1);
  });

  it.each([undefined, '9999'])(
    'IT-AUTH-019: lets non-superadmins log in without checking the PIN header: %s',
    async (pin) => {
      expect((await postLogin('staff', pin)).status).toBe(200);
      expect(verifyPin).not.toHaveBeenCalled();
    },
  );

  async function postPinSetup(body: Record<string, unknown>) {
    return fetch(`${url}/api/auth/pin-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it.each([undefined, ADMIN_PIN])(
    'IT-AUTH-020: asks a superadmin without a PIN to set one up, only after the password is correct: PIN header %s',
    async (pin) => {
      configuredPins.clear();

      const wrong = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'wrong-password' }),
      });
      expect(wrong.status).toBe(401);
      expect(await wrong.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
      expect(hasPin).not.toHaveBeenCalled();

      const response = await postLogin('admin', pin);
      expect(response.status).toBe(403);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toMatchObject({
        code: 'PIN_SETUP_REQUIRED',
      });
      expect(hasPin).toHaveBeenCalledWith(admin.user_id);
      expect(verifyPin).not.toHaveBeenCalled();
      expect(sessions.size).toBe(0);
    },
  );

  it('IT-AUTH-021: sets up a superadmin PIN confirmed by the password and signs them in', async () => {
    configuredPins.clear();

    const response = await postPinSetup({
      username: 'admin',
      password: 'correct-password',
      pin: '0123',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as {
      token: string;
      expires_at: string;
      user: { user_id: string; role: string };
    };
    expect(body.user).toMatchObject({
      user_id: admin.user_id,
      role: UserRole.SUPERADMIN,
    });
    expect(body).not.toHaveProperty('pin');
    expect(createPin).toHaveBeenCalledWith({ pin: '0123' }, admin.user_id);
    expect(sessions.size).toBe(1);

    const me = await fetch(`${url}/api/auth/me`, {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    expect(me.status).toBe(200);
  });

  it.each([
    [
      'a wrong password',
      { username: 'admin', password: 'wrong-password', pin: '0123' },
      401,
      'INVALID_CREDENTIALS',
    ],
    [
      'a non-superadmin',
      { username: 'staff', password: 'correct-password', pin: '0123' },
      403,
      'PIN_SETUP_NOT_ALLOWED',
    ],
    [
      'an existing PIN',
      { username: 'admin', password: 'correct-password', pin: '0123' },
      409,
      'EXISTING_PIN_FOUND',
    ],
  ])(
    'IT-AUTH-022: refuses PIN setup at sign-in for %s without creating a session',
    async (_case, body, status, code) => {
      if (code !== 'EXISTING_PIN_FOUND') configuredPins.clear();

      const response = await postPinSetup(body);

      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code });
      expect(sessions.size).toBe(0);
      if (code === 'EXISTING_PIN_FOUND') {
        expect(createPin).toHaveBeenCalledTimes(1);
      } else {
        expect(createPin).not.toHaveBeenCalled();
      }
    },
  );

  it.each([undefined, null, 123, '', '123', '12345', 'abcd', ' 0123'])(
    'IT-AUTH-023: rejects a PIN setup whose PIN is not four digits: %p',
    async (pin) => {
      configuredPins.clear();

      const response = await postPinSetup({
        username: 'admin',
        password: 'correct-password',
        pin,
      });

      expect(response.status).toBe(400);
      expect(createPin).not.toHaveBeenCalled();
      expect(sessions.size).toBe(0);
    },
  );
});
