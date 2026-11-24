import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import { ModifiersController } from '../modifiers.controller';
import { ModifiersRepository } from '../modifiers.repository';
import { ModifiersService } from '../modifiers.service';
import { FindAllModifiersDTO } from '../dto/find-all-modifiers.dto';

describe('ModifiersService', () => {
  it('UT-MOD-001: resolves the service, repository, and controller through the application module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(StorageService)
      .useValue({})
      .compile();

    expect(module.get(ModifiersService)).toBeInstanceOf(ModifiersService);
    expect(module.get(ModifiersRepository)).toBeInstanceOf(ModifiersRepository);
    expect(module.get(ModifiersController)).toBeInstanceOf(ModifiersController);

    await module.close();
  });
});

describe('ModifiersService operations', () => {
  const modifierId = 'f0e05342-1288-4d30-8eb0-5f4273785475';
  const modifier = { modifier_id: modifierId, code: 'EXTRA', is_active: true };
  let repository: {
    createModifier: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
    findUses: jest.Mock;
    updateModifier: jest.Mock;
    reactivateModifier: jest.Mock;
    deleteModifier: jest.Mock;
  };
  const uses = [{ menu_item_modifier_id: 'link' }];
  const counts = { all: 30, active: 21, inactive: 9 };
  let service: ModifiersService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    repository = {
      createModifier: jest.fn().mockResolvedValue(modifier),
      findOne: jest.fn().mockResolvedValue(modifier),
      findAll: jest.fn().mockResolvedValue({ modifiers: [modifier], counts }),
      findUses: jest.fn().mockResolvedValue(uses),
      updateModifier: jest
        .fn()
        .mockResolvedValue({ ...modifier, name: 'Updated' }),
      reactivateModifier: jest.fn().mockResolvedValue(modifier),
      deleteModifier: jest
        .fn()
        .mockResolvedValue({ ...modifier, is_active: false }),
    };
    service = new ModifiersService(
      repository as unknown as ModifiersRepository,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('UT-MOD-002: creates a modifier', async () => {
    const dto = { code: 'EXTRA', name: 'Extra' };
    await expect(service.create(dto)).resolves.toEqual(modifier);
    expect(repository.createModifier).toHaveBeenCalledWith(dto, undefined);
  });

  it.each([
    {
      identifier: modifierId,
      key: { modifier_id: modifierId },
      activeOnly: true,
    },
    { identifier: 'EXTRA', key: { code: 'EXTRA' }, activeOnly: true },
    {
      identifier: { modifier_id: 'explicit-id' },
      key: { modifier_id: 'explicit-id' },
      activeOnly: false,
    },
    {
      identifier: modifierId,
      key: { modifier_id: modifierId },
      activeOnly: false,
    },
    { identifier: 'EXTRA', key: { code: 'EXTRA' }, activeOnly: false },
  ] as const)(
    'UT-MOD-005: finds $identifier by $key with activeOnly=$activeOnly',
    async ({ identifier, key, activeOnly }) => {
      await expect(service.findOne(identifier, activeOnly)).resolves.toEqual({
        ...modifier,
        menu_item_modifiers_modifier: uses,
      });
      expect(repository.findOne).toHaveBeenCalledWith(
        key,
        activeOnly,
        undefined,
      );
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      // Uses are looked up by the found modifier's id, even when found by code.
      expect(repository.findUses).toHaveBeenCalledWith(modifierId, undefined);
    },
  );

  it.each([modifierId, 'MISSING'])(
    'UT-MOD-006: rejects a missing modifier identified by %s',
    async (identifier) => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(identifier)).rejects.toMatchObject({
        status: 404,
        response: { code: 'MODIFIER_NOT_FOUND' },
      });
    },
  );

  it.each([
    { status: 'active', total: 21, totalPages: 3 },
    { status: 'inactive', total: 9, totalPages: 1 },
    { status: 'all', total: 30, totalPages: 3 },
  ] as const)(
    'UT-MOD-009: paginates $status modifiers with their total and every status count',
    async ({ status, total, totalPages }) => {
      await expect(
        service.findAll({ page: 2, limit: 10, status }),
      ).resolves.toEqual({
        data: [modifier],
        meta: { page: 2, limit: 10, total, totalPages, counts },
      });
      expect(repository.findAll).toHaveBeenCalledWith(
        10,
        10,
        {
          status,
          search: undefined,
          brand_id: undefined,
          sortBy: undefined,
          sortOrder: undefined,
        },
        undefined,
      );
    },
  );

  it('UT-MOD-010: returns empty pagination results using the default query', async () => {
    const none = { all: 0, active: 0, inactive: 0 };
    repository.findAll.mockResolvedValue({ modifiers: [], counts: none });
    await expect(service.findAll(new FindAllModifiersDTO())).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0, counts: none },
    });
    expect(repository.findAll).toHaveBeenCalledWith(
      0,
      10,
      {
        status: 'active',
        search: undefined,
        brand_id: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      },
      undefined,
    );
  });

  it('UT-MOD-027: forwards the search, brand and sort to the repository', async () => {
    const filters = {
      status: 'all',
      search: 'extra rice',
      brand_id: 'b9c1d62f-8cd6-4e24-a8c5-4f868c9e1646',
      sortBy: 'name',
      sortOrder: 'desc',
    } as const;
    await service.findAll({ page: 1, limit: 20, ...filters });
    expect(repository.findAll).toHaveBeenCalledWith(0, 20, filters, undefined);
  });

  it('UT-MOD-011: rejects pagination overflow before querying', async () => {
    await expect(
      service.findAll({ page: 2_147_483_647, limit: 2, status: 'active' }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'PAGINATION_UNSUPPORTED_RANGE' },
    });
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it('UT-MOD-012: updates an existing modifier', async () => {
    const dto = { name: 'Updated' };
    await expect(service.update(modifierId, dto)).resolves.toEqual({
      ...modifier,
      name: 'Updated',
    });
    expect(repository.findOne).toHaveBeenCalledWith(
      { modifier_id: modifierId },
      true,
      undefined,
    );
    expect(repository.updateModifier).toHaveBeenCalledWith(
      modifierId,
      dto,
      undefined,
    );
  });

  it('UT-MOD-015: reactivates an inactive modifier', async () => {
    repository.findOne.mockResolvedValue({
      ...modifier,
      is_active: false,
    });
    await expect(service.reactivate(modifierId)).resolves.toEqual(modifier);
    expect(repository.findOne).toHaveBeenCalledWith(
      { modifier_id: modifierId },
      false,
      undefined,
    );
    expect(repository.reactivateModifier).toHaveBeenCalledWith(
      modifierId,
      undefined,
    );
  });

  it('UT-MOD-016: rejects reactivating an already-active modifier', async () => {
    await expect(service.reactivate(modifierId)).rejects.toMatchObject({
      status: 409,
      response: { code: 'MODIFIER_ALREADY_ACTIVE' },
    });
    expect(repository.reactivateModifier).not.toHaveBeenCalled();
  });

  it('UT-MOD-017: soft-deletes an active modifier', async () => {
    await expect(service.delete(modifierId)).resolves.toEqual({
      ...modifier,
      is_active: false,
    });
    expect(repository.findOne).toHaveBeenCalledWith(
      { modifier_id: modifierId },
      true,
      undefined,
    );
    expect(repository.deleteModifier).toHaveBeenCalledWith(
      modifierId,
      undefined,
    );
  });

  const mutations = [
    {
      name: 'updateModifier',
      run: () => service.update(modifierId, { name: 'Updated' }),
    },
    { name: 'reactivateModifier', run: () => service.reactivate(modifierId) },
    { name: 'deleteModifier', run: () => service.delete(modifierId) },
  ] as const;

  it.each(mutations)(
    'UT-MOD-018: $name rejects missing modifiers without writing',
    async ({ run }) => {
      repository.findOne.mockResolvedValue(null);
      await expect(run()).rejects.toMatchObject({
        status: 404,
        response: { code: 'MODIFIER_NOT_FOUND' },
      });
      expect(repository.updateModifier).not.toHaveBeenCalled();
      expect(repository.reactivateModifier).not.toHaveBeenCalled();
      expect(repository.deleteModifier).not.toHaveBeenCalled();
    },
  );

  it.each(mutations)(
    'UT-MOD-019: $name preserves repository failures',
    async ({ name, run }) => {
      repository.findOne.mockResolvedValue({
        ...modifier,
        is_active: false,
      });
      const error = new Error('Database write failed');
      repository[name].mockRejectedValue(error);
      await expect(run()).rejects.toBe(error);
    },
  );
});

describe('Modifiers persistence', () => {
  const modifier = { modifier_id: 'modifier-id', code: 'EXTRA', name: 'Extra' };
  let repository: ModifiersRepository;
  let prisma: {
    modifier: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    menuItemModifier: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  const withUsage = {
    include: { _count: { select: { menu_item_modifiers_modifier: true } } },
  };

  beforeEach(() => {
    prisma = {
      modifier: {
        create: jest.fn().mockResolvedValue(modifier),
        findUnique: jest.fn().mockResolvedValue(modifier),
        findMany: jest.fn().mockResolvedValue([modifier]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(modifier),
      },
      menuItemModifier: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockResolvedValue([[modifier], 3, 1]),
    };
    repository = new ModifiersRepository(prisma as unknown as PrismaService);
  });

  it('UT-MOD-020: creates a modifier', async () => {
    const dto = { code: 'EXTRA', name: 'Extra', description: null };

    await expect(repository.createModifier(dto)).resolves.toEqual(modifier);
    expect(prisma.modifier.create).toHaveBeenCalledWith({ data: dto });
  });

  it.each([undefined, true, false])(
    'UT-MOD-021: applies activeOnly=%s to lookups by id and code',
    async (activeOnly) => {
      const is_active = activeOnly === false ? undefined : true;

      await repository.findOne({ modifier_id: 'modifier-id' }, activeOnly);
      expect(prisma.modifier.findUnique).toHaveBeenLastCalledWith({
        where: { modifier_id: 'modifier-id', is_active },
      });

      await repository.findOne({ code: 'EXTRA' }, activeOnly);
      expect(prisma.modifier.findUnique).toHaveBeenLastCalledWith({
        where: { code: 'EXTRA', is_active },
      });
    },
  );

  it.each([
    { status: 'active', is_active: true },
    { status: 'inactive', is_active: false },
    { status: 'all', is_active: undefined },
  ] as const)(
    'UT-MOD-028: lists $status modifiers newest first with usage and every status count',
    async ({ status, is_active }) => {
      await expect(repository.findAll(10, 5, { status })).resolves.toEqual({
        modifiers: [modifier],
        counts: { all: 4, active: 3, inactive: 1 },
      });
      expect(prisma.modifier.findMany).toHaveBeenLastCalledWith({
        where: { is_active },
        skip: 10,
        take: 5,
        orderBy: [{ created_at: 'desc' }, { modifier_id: 'asc' }],
        ...withUsage,
      });
      // The counts ignore the status filter.
      expect(prisma.modifier.count).toHaveBeenCalledWith({
        where: { is_active: true },
      });
      expect(prisma.modifier.count).toHaveBeenCalledWith({
        where: { is_active: false },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      });
    },
  );

  it('UT-MOD-029: matches every search term, the brand and the sort in rows and counts', async () => {
    const brand_id = 'b9c1d62f-8cd6-4e24-a8c5-4f868c9e1646';
    await repository.findAll(0, 10, {
      status: 'active',
      search: 'extra  rice',
      brand_id,
      sortBy: 'modified_at',
      sortOrder: 'desc',
    });

    const filters = {
      AND: ['extra', 'rice'].map((term) => ({
        OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      })),
      menu_item_modifiers_modifier: { some: { menu_item: { brand_id } } },
    };
    expect(prisma.modifier.findMany).toHaveBeenLastCalledWith({
      where: { ...filters, is_active: true },
      skip: 0,
      take: 10,
      orderBy: [
        { modified_at: 'desc' },
        { name: 'asc' },
        { modifier_id: 'asc' },
      ],
      ...withUsage,
    });
    expect(prisma.modifier.count).toHaveBeenCalledWith({
      where: { ...filters, is_active: false },
    });
  });

  it('UT-MOD-022: lists modifiers using a supplied transaction client', async () => {
    const tx = { modifier: prisma.modifier };

    await expect(
      repository.findAll(
        0,
        10,
        { status: 'all' },
        tx as unknown as Prisma.TransactionClient,
      ),
    ).resolves.toEqual({
      modifiers: [modifier],
      counts: { all: 2, active: 1, inactive: 1 },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UT-MOD-030: lists the menu items offering a modifier with menu-safe fields only', async () => {
    await repository.findUses('modifier-id');

    expect(prisma.menuItemModifier.findMany).toHaveBeenCalledWith({
      where: { modifier_id: 'modifier-id' },
      select: {
        menu_item_modifier_id: true,
        additional_price: true,
        menu_item: {
          select: {
            menu_item_id: true,
            brand_id: true,
            code: true,
            name: true,
            is_active: true,
          },
        },
      },
      orderBy: [
        { menu_item: { name: 'asc' } },
        { menu_item_modifier_id: 'asc' },
      ],
    });
  });

  it.each(['Updated description', null])(
    'UT-MOD-023: updates a modifier and sets its description to %s',
    async (description) => {
      const dto = { name: 'Updated', description };

      await repository.updateModifier('modifier-id', dto);
      expect(prisma.modifier.update).toHaveBeenCalledWith({
        where: { modifier_id: 'modifier-id', is_active: true },
        data: { ...dto, modified_at: expect.any(Date) as Date },
      });
    },
  );

  it('UT-MOD-024: reactivates an inactive modifier and updates its modification timestamp', async () => {
    await expect(repository.reactivateModifier('modifier-id')).resolves.toEqual(
      modifier,
    );

    expect(prisma.modifier.update).toHaveBeenCalledWith({
      where: { modifier_id: 'modifier-id', is_active: false },
      data: { is_active: true, modified_at: expect.any(Date) as Date },
    });
  });

  it('UT-MOD-025: soft deletes an active modifier without removing its references', async () => {
    await repository.deleteModifier('modifier-id');

    expect(prisma.modifier.update).toHaveBeenCalledWith({
      where: { modifier_id: 'modifier-id', is_active: true },
      data: { is_active: false, modified_at: expect.any(Date) as Date },
    });
  });

  it('UT-MOD-026: preserves database errors for the application exception filters', async () => {
    const error = new Error('Unique constraint failed');
    prisma.modifier.update.mockRejectedValueOnce(error);

    await expect(
      repository.updateModifier('modifier-id', { code: 'TAKEN' }),
    ).rejects.toBe(error);
  });
});
