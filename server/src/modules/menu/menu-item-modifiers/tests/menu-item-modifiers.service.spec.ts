import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../../../app.module';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import { MenuItemsRepository } from '../../menu-items/menu-items.repository';
import { ModifiersRepository } from '../../modifiers/modifiers.repository';
import { FindAllMenuItemModifiersDTO } from '../dto/find-all-menu-item-modifiers.dto';
import { MenuItemModifiersController } from '../menu-item-modifiers.controller';
import { MenuItemModifiersRepository } from '../menu-item-modifiers.repository';
import { MenuItemModifiersService } from '../menu-item-modifiers.service';

describe('MenuItemModifiersService module wiring', () => {
  it('UT-MIM-001: resolves the service, repository, and controller', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(StorageService)
      .useValue({})
      .compile();

    expect(module.get(MenuItemModifiersService)).toBeInstanceOf(
      MenuItemModifiersService,
    );
    expect(module.get(MenuItemModifiersRepository)).toBeInstanceOf(
      MenuItemModifiersRepository,
    );
    expect(module.get(MenuItemModifiersController)).toBeInstanceOf(
      MenuItemModifiersController,
    );
    await module.close();
  });
});

describe('MenuItemModifiersService operations', () => {
  const assignment = {
    menu_item_modifier_id: 'assignment-id',
    menu_item_id: 'menu-id',
    modifier_id: 'modifier-id',
  };
  const create = [
    { modifier_id: 'modifier-id', additional_price: 20 },
    { modifier_id: 'second-modifier-id' },
  ];
  let repository: {
    createMany: jest.Mock;
    findOne: jest.Mock;
    findOneWithModifier: jest.Mock;
    findAll: jest.Mock;
    findManyForMenuItem: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let menuItems: { findOneMenuItemByUID: jest.Mock };
  let modifiers: { findOne: jest.Mock };
  let service: MenuItemModifiersService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    repository = {
      createMany: jest.fn().mockResolvedValue([assignment]),
      findOne: jest.fn().mockResolvedValue(assignment),
      findOneWithModifier: jest.fn().mockResolvedValue({
        ...assignment,
        modifier: { modifier_id: 'modifier-id', is_active: true },
      }),
      findAll: jest
        .fn()
        .mockResolvedValue({ menuItemModifiers: [assignment], total: 21 }),
      findManyForMenuItem: jest.fn().mockResolvedValue([assignment]),
      update: jest
        .fn()
        .mockResolvedValue({ ...assignment, additional_price: 25 }),
      delete: jest.fn().mockResolvedValue(assignment),
    };
    menuItems = {
      findOneMenuItemByUID: jest.fn().mockResolvedValue({
        menu_item_id: 'menu-id',
        is_active: true,
        is_available: false,
      }),
    };
    modifiers = {
      findOne: jest
        .fn()
        .mockResolvedValue({ modifier_id: 'modifier-id', is_active: true }),
    };
    service = new MenuItemModifiersService(
      repository as unknown as MenuItemModifiersRepository,
      menuItems as unknown as MenuItemsRepository,
      modifiers as unknown as ModifiersRepository,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('UT-MIM-002: creates assignments after checking the active menu item and every modifier', async () => {
    await expect(service.createMany('menu-id', create)).resolves.toEqual([
      assignment,
    ]);
    expect(menuItems.findOneMenuItemByUID).toHaveBeenCalledWith(
      'menu-id',
      true,
      undefined,
    );
    expect(modifiers.findOne).toHaveBeenNthCalledWith(
      1,
      { modifier_id: 'modifier-id' },
      true,
      undefined,
    );
    expect(modifiers.findOne).toHaveBeenNthCalledWith(
      2,
      { modifier_id: 'second-modifier-id' },
      true,
      undefined,
    );
    expect(repository.createMany).toHaveBeenCalledWith(
      'menu-id',
      create,
      undefined,
    );
  });

  it('UT-MIM-003: rejects creation when the menu item is missing or inactive', async () => {
    menuItems.findOneMenuItemByUID.mockResolvedValue(null);
    await expect(service.createMany('menu-id', create)).rejects.toMatchObject({
      status: 404,
      response: { code: 'MENU_ITEM_NOT_FOUND' },
    });
    expect(repository.createMany).not.toHaveBeenCalled();
    expect(modifiers.findOne).not.toHaveBeenCalled();
  });

  it('UT-MIM-004: rejects creation when a later modifier is missing or inactive', async () => {
    modifiers.findOne
      .mockResolvedValueOnce({ modifier_id: 'modifier-id', is_active: true })
      .mockResolvedValueOnce(null);
    await expect(service.createMany('menu-id', create)).rejects.toMatchObject({
      status: 404,
      response: { code: 'MODIFIER_NOT_FOUND' },
    });
    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it('UT-MIM-005: preserves duplicate-pair errors for the application exception filter', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Duplicate assignment',
      { code: 'P2002', clientVersion: '7.10.1' },
    );
    repository.createMany.mockRejectedValueOnce(error);
    await expect(service.createMany('menu-id', create)).rejects.toBe(error);
  });

  it('UT-MIM-006: finds an assignment together with its modifier', async () => {
    await expect(service.findOne('assignment-id')).resolves.toEqual({
      ...assignment,
      modifier: { modifier_id: 'modifier-id', is_active: true },
    });
    expect(repository.findOneWithModifier).toHaveBeenCalledWith(
      'assignment-id',
      undefined,
    );
  });

  it('UT-MIM-007: rejects a missing assignment', async () => {
    repository.findOneWithModifier.mockResolvedValue(null);
    await expect(service.findOne('missing-id')).rejects.toMatchObject({
      status: 404,
      response: { code: 'MENU_ITEM_MODIFIER_NOT_FOUND' },
    });
  });

  it('UT-MIM-008: paginates assignments', async () => {
    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
      data: [assignment],
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
    expect(repository.findAll).toHaveBeenCalledWith(10, 10, undefined);
  });

  it('UT-MIM-009: returns empty results with default pagination', async () => {
    repository.findAll.mockResolvedValue({ menuItemModifiers: [], total: 0 });
    await expect(
      service.findAll(new FindAllMenuItemModifiersDTO()),
    ).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    expect(repository.findAll).toHaveBeenCalledWith(0, 10, undefined);
  });

  it('UT-MIM-010: rejects pagination overflow before querying', async () => {
    await expect(
      service.findAll({ page: 2147483647, limit: 2 }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'PAGINATION_UNSUPPORTED_RANGE' },
    });
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it('UT-MIM-011: lists assignments for an active menu item', async () => {
    await expect(service.findManyForMenuItem('menu-id')).resolves.toEqual([
      assignment,
    ]);
    expect(menuItems.findOneMenuItemByUID).toHaveBeenCalledWith(
      'menu-id',
      true,
      undefined,
    );
    expect(repository.findManyForMenuItem).toHaveBeenCalledWith(
      'menu-id',
      undefined,
    );
  });

  it('UT-MIM-012: rejects listing for a missing or inactive menu item', async () => {
    menuItems.findOneMenuItemByUID.mockResolvedValue(null);
    await expect(service.findManyForMenuItem('menu-id')).rejects.toMatchObject({
      status: 404,
      response: { code: 'MENU_ITEM_NOT_FOUND' },
    });
    expect(repository.findManyForMenuItem).not.toHaveBeenCalled();
  });

  it('UT-MIM-013: returns an empty list for a menu item without assignments', async () => {
    repository.findManyForMenuItem.mockResolvedValue([]);
    await expect(service.findManyForMenuItem('menu-id')).resolves.toEqual([]);
  });

  it('UT-MIM-014: updates price after validating the current menu item and modifier', async () => {
    await expect(
      service.update('assignment-id', { additional_price: 25 }),
    ).resolves.toEqual({ ...assignment, additional_price: 25 });
    expect(repository.findOne).toHaveBeenCalledWith('assignment-id', undefined);
    expect(menuItems.findOneMenuItemByUID).toHaveBeenCalledWith(
      'menu-id',
      true,
      undefined,
    );
    expect(modifiers.findOne).toHaveBeenCalledWith(
      { modifier_id: 'modifier-id' },
      true,
      undefined,
    );
    expect(repository.update).toHaveBeenCalledWith(
      'assignment-id',
      {
        additional_price: 25,
      },
      undefined,
    );
  });

  it('UT-MIM-015: validates a replacement modifier instead of the previous modifier', async () => {
    const dto = { modifier_id: 'replacement-id', additional_price: 0 };
    await service.update('assignment-id', dto);
    expect(modifiers.findOne).toHaveBeenCalledWith(
      { modifier_id: 'replacement-id' },
      true,
      undefined,
    );
    expect(modifiers.findOne).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(
      'assignment-id',
      dto,
      undefined,
    );
  });

  it('UT-MIM-018: deletes an assignment even when its parent references are inactive', async () => {
    menuItems.findOneMenuItemByUID.mockResolvedValue(null);
    modifiers.findOne.mockResolvedValue(null);
    await expect(service.delete('assignment-id')).resolves.toEqual(assignment);
    expect(repository.delete).toHaveBeenCalledWith('assignment-id', undefined);
    expect(menuItems.findOneMenuItemByUID).not.toHaveBeenCalled();
    expect(modifiers.findOne).not.toHaveBeenCalled();
  });

  const mutations = [
    {
      name: 'update',
      record: assignment,
      run: () => service.update('assignment-id', { additional_price: 25 }),
    },
    {
      name: 'delete',
      record: assignment,
      run: () => service.delete('assignment-id'),
    },
  ] as const;

  it.each(mutations)(
    'UT-MIM-019: $name rejects missing assignments without writing',
    async ({ run }) => {
      repository.findOne.mockResolvedValue(null);
      await expect(run()).rejects.toMatchObject({
        status: 404,
        response: { code: 'MENU_ITEM_MODIFIER_NOT_FOUND' },
      });
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
      expect(menuItems.findOneMenuItemByUID).not.toHaveBeenCalled();
      expect(modifiers.findOne).not.toHaveBeenCalled();
    },
  );

  it.each(mutations)(
    'UT-MIM-020: $name preserves repository failures',
    async ({ name, record, run }) => {
      repository.findOne.mockResolvedValue(record);
      const error = new Error('Database write failed');
      repository[name].mockRejectedValueOnce(error);
      await expect(run()).rejects.toBe(error);
    },
  );

  const checkedMutations = [
    {
      name: 'update',
      record: assignment,
      run: () =>
        service.update('assignment-id', { modifier_id: 'replacement-id' }),
    },
  ] as const;

  it.each(checkedMutations)(
    'UT-MIM-021: $name rejects a missing or inactive menu item before writing',
    async ({ record, run }) => {
      repository.findOne.mockResolvedValue(record);
      menuItems.findOneMenuItemByUID.mockResolvedValue(null);
      await expect(run()).rejects.toMatchObject({
        status: 404,
        response: { code: 'MENU_ITEM_NOT_FOUND' },
      });
      expect(repository.update).not.toHaveBeenCalled();
      expect(modifiers.findOne).not.toHaveBeenCalled();
    },
  );

  it.each(checkedMutations)(
    'UT-MIM-022: $name rejects a missing or inactive modifier before writing',
    async ({ record, run }) => {
      repository.findOne.mockResolvedValue(record);
      modifiers.findOne.mockResolvedValue(null);
      await expect(run()).rejects.toMatchObject({
        status: 404,
        response: { code: 'MODIFIER_NOT_FOUND' },
      });
      expect(repository.update).not.toHaveBeenCalled();
    },
  );
});

describe('Menu item modifiers persistence', () => {
  const assignment = {
    menu_item_modifier_id: 'assignment-id',
    menu_item_id: 'menu-id',
    modifier_id: 'modifier-id',
  };
  let repository: MenuItemModifiersRepository;
  let prisma: {
    menuItemModifier: {
      createManyAndReturn: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      menuItemModifier: {
        createManyAndReturn: jest.fn().mockResolvedValue([assignment]),
        findUnique: jest.fn().mockResolvedValue(assignment),
        findMany: jest.fn().mockResolvedValue([assignment]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(assignment),
        delete: jest.fn().mockResolvedValue(assignment),
      },
      $transaction: jest.fn().mockResolvedValue([[assignment], 1]),
    };
    repository = new MenuItemModifiersRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('UT-MIM-023: creates assignments in one insert for the menu item and leaves timestamps to database defaults', async () => {
    await expect(
      repository.createMany('menu-id', [
        { modifier_id: 'modifier-id', additional_price: 20 },
        { modifier_id: 'second-modifier-id' },
      ]),
    ).resolves.toEqual([assignment]);
    expect(prisma.menuItemModifier.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          menu_item_id: 'menu-id',
          modifier_id: 'modifier-id',
          additional_price: 20,
        },
        {
          menu_item_id: 'menu-id',
          modifier_id: 'second-modifier-id',
          additional_price: undefined,
        },
      ],
    });
  });

  it('UT-MIM-024: looks up, lists, and counts assignments without an availability filter', async () => {
    await expect(repository.findOne('assignment-id')).resolves.toEqual(
      assignment,
    );
    expect(prisma.menuItemModifier.findUnique).toHaveBeenCalledWith({
      where: { menu_item_modifier_id: 'assignment-id' },
    });

    const assignmentWithModifier = {
      ...assignment,
      modifier: { modifier_id: 'modifier-id', name: 'Extra cheese' },
    };
    prisma.menuItemModifier.findMany.mockResolvedValueOnce([
      assignmentWithModifier,
    ]);
    await expect(repository.findManyForMenuItem('menu-id')).resolves.toEqual([
      assignmentWithModifier,
    ]);
    expect(prisma.menuItemModifier.findMany).toHaveBeenLastCalledWith({
      include: { modifier: true },
      where: { menu_item_id: 'menu-id' },
    });

    await expect(repository.findAll(10, 5)).resolves.toEqual({
      menuItemModifiers: [assignment],
      total: 1,
    });
    expect(prisma.menuItemModifier.findMany).toHaveBeenLastCalledWith({
      skip: 10,
      take: 5,
      orderBy: [{ created_at: 'desc' }, { menu_item_modifier_id: 'asc' }],
    });
    expect(prisma.menuItemModifier.count).toHaveBeenCalledWith();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  });

  it('UT-MIM-025: returns null for a missing assignment', async () => {
    prisma.menuItemModifier.findUnique.mockResolvedValue(null);
    await expect(repository.findOne('missing-id')).resolves.toBeNull();
  });

  it('UT-MIM-026: uses the supplied transaction even when it exposes $transaction', async () => {
    const tx = {
      menuItemModifier: prisma.menuItemModifier,
      $transaction: prisma.$transaction,
    };
    await expect(
      repository.findAll(0, 10, tx as unknown as Prisma.TransactionClient),
    ).resolves.toEqual({ menuItemModifiers: [assignment], total: 1 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.menuItemModifier.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      orderBy: [{ created_at: 'desc' }, { menu_item_modifier_id: 'asc' }],
    });
  });

  it('UT-MIM-027: updates only additional_price and modifier_id, and advances modified_at', async () => {
    const dto = {
      additional_price: 25,
      modifier_id: 'replacement-id',
      menu_item_id: 'different-menu-id',
    };
    await expect(repository.update('assignment-id', dto)).resolves.toEqual(
      assignment,
    );
    expect(prisma.menuItemModifier.update).toHaveBeenCalledWith({
      where: { menu_item_modifier_id: 'assignment-id' },
      data: {
        additional_price: 25,
        modifier_id: 'replacement-id',
        modified_at: expect.any(Date) as Date,
      },
    });
  });

  it.each([{ additional_price: 0 }, { modifier_id: 'replacement-id' }])(
    'UT-MIM-028: accepts a partial update %j',
    async (dto) => {
      await repository.update('assignment-id', dto);
      expect(prisma.menuItemModifier.update).toHaveBeenCalledWith({
        where: { menu_item_modifier_id: 'assignment-id' },
        data: {
          additional_price: undefined,
          modifier_id: undefined,
          ...dto,
          modified_at: expect.any(Date) as Date,
        },
      });
    },
  );

  it('UT-MIM-030: permanently deletes an assignment', async () => {
    await expect(repository.delete('assignment-id')).resolves.toEqual(
      assignment,
    );
    expect(prisma.menuItemModifier.delete).toHaveBeenCalledWith({
      where: { menu_item_modifier_id: 'assignment-id' },
    });
    expect(prisma.menuItemModifier.update).not.toHaveBeenCalled();
  });

  it('UT-MIM-031: uses the supplied transaction client for all non-paginated operations', async () => {
    const tx = {
      menuItemModifier: {
        createManyAndReturn: jest.fn().mockResolvedValue([assignment]),
        findUnique: jest.fn().mockResolvedValue(assignment),
        findMany: jest.fn().mockResolvedValue([assignment]),
        update: jest.fn().mockResolvedValue(assignment),
        delete: jest.fn().mockResolvedValue(assignment),
      },
    };
    const transaction = tx as unknown as Prisma.TransactionClient;
    await repository.createMany(
      'menu-id',
      [{ modifier_id: 'modifier-id' }],
      transaction,
    );
    await repository.findOne('assignment-id', transaction);
    await repository.findManyForMenuItem('menu-id', transaction);
    await repository.update(
      'assignment-id',
      { additional_price: 20 },
      transaction,
    );
    await repository.delete('assignment-id', transaction);
    expect(tx.menuItemModifier.createManyAndReturn).toHaveBeenCalledTimes(1);
    expect(tx.menuItemModifier.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.menuItemModifier.findMany).toHaveBeenCalledTimes(1);
    expect(tx.menuItemModifier.update).toHaveBeenCalledTimes(1);
    expect(tx.menuItemModifier.delete).toHaveBeenCalledTimes(1);
    expect(prisma.menuItemModifier.createManyAndReturn).not.toHaveBeenCalled();
    expect(prisma.menuItemModifier.findUnique).not.toHaveBeenCalled();
    expect(prisma.menuItemModifier.findMany).not.toHaveBeenCalled();
    expect(prisma.menuItemModifier.update).not.toHaveBeenCalled();
    expect(prisma.menuItemModifier.delete).not.toHaveBeenCalled();
  });

  it('UT-MIM-032: preserves database constraint errors for the application filters', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Duplicate menu item modifier',
      { code: 'P2002', clientVersion: '7.10.1' },
    );
    prisma.menuItemModifier.update.mockRejectedValueOnce(error);
    await expect(
      repository.update('assignment-id', { modifier_id: 'duplicate-id' }),
    ).rejects.toBe(error);
  });
});
