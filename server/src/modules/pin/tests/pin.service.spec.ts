import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { UsersRepository } from '../../users/users.repository';
import { PinRepository, type PinVerificationResult } from '../pin.repository';
import { PinService } from '../pin.service';

jest.mock('argon2', () => ({ verify: jest.fn() }));

describe('PinService', () => {
  const userId = '00000000-0000-4000-8000-000000000001';
  const passwordHash = 'stored-password-hash';
  const credential = {
    user_id: userId,
    failed_attempts: 0,
    locked_until: null,
    created_at: new Date('2030-01-01T00:00:00Z'),
    modified_at: new Date('2030-01-01T00:00:00Z'),
  };
  const createDTO = { pin: '0123' };
  const updateDTO = { pin: '0456', password: 'Password123!' };
  const verifyPassword = jest.mocked(argon2.verify);
  let repository: jest.Mocked<
    Pick<
      PinRepository,
      'findByUserId' | 'create' | 'findOneSafe' | 'verifyPin' | 'update'
    >
  >;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findOne' | 'findCredentialsByUserId'>
  >;
  let service: PinService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    verifyPassword.mockReset().mockResolvedValue(true);
    repository = {
      findByUserId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(credential),
      findOneSafe: jest.fn().mockResolvedValue(credential),
      verifyPin: jest.fn().mockResolvedValue({ status: 'valid' }),
      update: jest.fn().mockResolvedValue(credential),
    };
    usersRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ user_id: userId, is_active: true }),
      findCredentialsByUserId: jest.fn().mockResolvedValue({
        user_id: userId,
        password_hash: passwordHash,
      }),
    };
    service = new PinService(
      repository as unknown as PinRepository,
      usersRepository as unknown as UsersRepository,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('UT-PIN-001: creates a missing PIN and preserves its leading zero', async () => {
    await expect(service.create(createDTO, userId)).resolves.toEqual(
      credential,
    );
    expect(repository.findByUserId).toHaveBeenCalledWith(userId);
    expect(repository.create).toHaveBeenCalledWith(createDTO, userId);
  });

  it('UT-PIN-002: rejects setup when the user already has a PIN', async () => {
    repository.findByUserId.mockResolvedValue({
      ...credential,
      pin_hash: 'existing-pin-hash',
    });

    await expect(service.create(createDTO, userId)).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'EXISTING_PIN_FOUND' },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('UT-PIN-003: reads safe PIN credentials for an existing active user', async () => {
    await expect(service.findOne(userId)).resolves.toEqual(credential);
    expect(usersRepository.findOne).toHaveBeenCalledWith(userId);
    expect(repository.findOneSafe).toHaveBeenCalledWith(userId);
    expect(repository.findByUserId).not.toHaveBeenCalled();
  });

  it('UT-PIN-004: rejects a lookup when the active-user query returns no user', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findOneSafe).not.toHaveBeenCalled();
  });

  it('UT-PIN-005: returns null when an existing user has no PIN configured', async () => {
    repository.findOneSafe.mockResolvedValue(null);

    await expect(service.findOne(userId)).resolves.toBeNull();
  });

  const invalidResult = { status: 'invalid' as const, validAttempts: 3 };
  const verificationResults: PinVerificationResult[] = [
    { status: 'valid' },
    invalidResult,
    { status: 'not-configured' },
    { status: 'locked', until: new Date('2030-01-01T00:05:00Z') },
  ];

  it.each(verificationResults)(
    'UT-PIN-006: returns the $status verification result for the guard to handle',
    async (result) => {
      repository.verifyPin.mockResolvedValue(result);

      await expect(service.verifyPin(userId, '0123')).resolves.toEqual(result);
      expect(repository.verifyPin).toHaveBeenCalledWith(userId, '0123');
    },
  );

  it('UT-PIN-007: propagates verification errors instead of treating them as a valid PIN', async () => {
    const error = new Error('Database unavailable');
    repository.verifyPin.mockRejectedValue(error);

    await expect(service.verifyPin(userId, '0123')).rejects.toBe(error);
  });

  it('UT-PIN-008: updates the PIN after verifying the current account password', async () => {
    await expect(service.updatePin(updateDTO, userId)).resolves.toEqual(
      credential,
    );
    expect(usersRepository.findCredentialsByUserId).toHaveBeenCalledWith(
      userId,
    );
    expect(verifyPassword).toHaveBeenCalledWith(
      passwordHash,
      updateDTO.password,
    );
    expect(repository.update).toHaveBeenCalledWith(updateDTO, userId);
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  it('UT-PIN-009: rejects an incorrect password without changing the PIN', async () => {
    verifyPassword.mockResolvedValue(false);

    await expect(service.updatePin(updateDTO, userId)).rejects.toMatchObject({
      constructor: UnauthorizedException,
      response: { code: 'INVALID_CREDENTIALS' },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('UT-PIN-010: rejects a reset when the active-user credential query returns no user', async () => {
    usersRepository.findCredentialsByUserId.mockResolvedValue(null);

    await expect(service.updatePin(updateDTO, userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('UT-PIN-011: allows repeated resets when the account password is correct', async () => {
    const nextDTO = { ...updateDTO, pin: '0789' };

    await service.updatePin(updateDTO, userId);
    await service.updatePin(nextDTO, userId);

    expect(repository.update).toHaveBeenCalledTimes(2);
    expect(repository.update).toHaveBeenNthCalledWith(1, updateDTO, userId);
    expect(repository.update).toHaveBeenNthCalledWith(2, nextDTO, userId);
    expect(verifyPassword).toHaveBeenCalledTimes(2);
  });

  it('UT-PIN-012: propagates password verification errors without changing the PIN', async () => {
    const error = new Error('Invalid stored password hash');
    verifyPassword.mockRejectedValue(error);

    await expect(service.updatePin(updateDTO, userId)).rejects.toBe(error);
    expect(repository.update).not.toHaveBeenCalled();
  });

  describe('superadmin reset of another user', () => {
    const upsert = jest.fn();

    beforeEach(() => {
      upsert.mockReset().mockResolvedValue(credential);
      Object.assign(repository, { upsert });
    });

    it.each([true, false])(
      'UT-PIN-013: reports whether a PIN is configured without reading its hash: configured=%s',
      async (configured) => {
        repository.findOneSafe.mockResolvedValue(
          configured ? credential : null,
        );

        await expect(service.hasPin(userId)).resolves.toBe(configured);
        expect(repository.findOneSafe).toHaveBeenCalledWith(userId);
        expect(repository.findByUserId).not.toHaveBeenCalled();
      },
    );

    it.each([UserRole.SUPERADMIN])(
      'UT-PIN-014: sets a new PIN for an active %s without asking for their password',
      async (role) => {
        usersRepository.findOne.mockResolvedValue({
          user_id: userId,
          role,
          is_active: true,
        } as never);

        await expect(service.resetPin(userId, '0456')).resolves.toEqual(
          credential,
        );
        expect(usersRepository.findOne).toHaveBeenCalledWith(userId);
        expect(upsert).toHaveBeenCalledWith(userId, '0456');
        expect(verifyPassword).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['a missing or inactive user', null, NotFoundException],
      ...[
        UserRole.SUPERVISOR,
        UserRole.KITCHEN_HEAD,
        UserRole.RECIPE_MANAGER,
        UserRole.CASHIER_STAFF,
      ].map(
        (role) =>
          [
            `a ${role}, who has no PIN`,
            { user_id: userId, role, is_active: true },
            BadRequestException,
          ] as const,
      ),
    ])(
      'UT-PIN-015: refuses to reset the PIN of %s',
      async (_case, user, expected) => {
        usersRepository.findOne.mockResolvedValue(user as never);

        await expect(service.resetPin(userId, '0456')).rejects.toBeInstanceOf(
          expected,
        );
        expect(upsert).not.toHaveBeenCalled();
      },
    );
  });
});
