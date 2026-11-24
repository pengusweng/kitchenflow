import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AppModule } from '../../../../app.module';
import { PaginationDTO } from '../../../../shared/dto/pagination.dto';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import { AssetsService } from '../../../assets/assets.service';
import { BrandsRepository } from '../../../brands/brands.repository';
import { ModifiersRepository } from '../../modifiers/modifiers.repository';
import { MenuChannelsRepository } from '../../menu-channels/menu-channels.repository';
import { MenuItemModifiersRepository } from '../../menu-item-modifiers/menu-item-modifiers.repository';
import { MenuItemsRepository } from '../../menu-items/menu-items.repository';
import { RecipesRepository } from '../../../recipe/recipes/recipes.repository';
import { MenuCatalogSetupDTO } from '../dto/menu-catalog-setup.dto';
import { MenuCatalogRepository } from '../menu-catalog.repository';
import { MenuCatalogService } from '../menu-catalog.service';

describe('MenuCatalogService module wiring', () => {
  it('UT-MCAT-001: resolves the service through the application module', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(StorageService)
      .useValue({})
      .compile();

    expect(module.get(MenuCatalogService)).toBeInstanceOf(MenuCatalogService);
    await module.close();
  });
});

describe('MenuCatalogService operations', () => {
  const menuItem = {
    menu_item_id: 'menu-id',
    name: 'Rice',
    img_url: 'https://example.com/rice.jpg',
    menuChannels: [],
    menuItemModifiers: [
      { modifier_id: 'modifier-id', modifier: { name: 'Extra cheese' } },
    ],
  };
  const dto: MenuCatalogSetupDTO = {
    menu_item: {
      brand_id: 'brand-id',
      recipe_id: 'recipe-id',
      img_url: 'https://example.com/rice.jpg',
      code: 'RICE',
      name: 'Rice',
      base_price: 100,
    },
    menu_channel: [],
    menu_item_modifier: [
      { modifier_id: 'modifier-id', additional_price: 10 },
      { modifier_id: 'second-modifier-id', additional_price: 20 },
    ],
  };
  let repository: { create: jest.Mock; findMany: jest.Mock };
  let brands: { findOneBrand: jest.Mock };
  let modifiers: { findOne: jest.Mock };
  let assets: { download: jest.Mock };
  let service: MenuCatalogService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    repository = {
      create: jest.fn().mockResolvedValue(menuItem),
      findMany: jest
        .fn()
        .mockResolvedValue({ menuItems: [menuItem], total: 21 }),
    };
    brands = {
      findOneBrand: jest.fn().mockResolvedValue({ brand_id: 'brand-id' }),
    };
    modifiers = {
      findOne: jest.fn().mockResolvedValue({ is_active: true }),
    };
    assets = { download: jest.fn().mockResolvedValue({}) };
    service = new MenuCatalogService(
      repository as unknown as MenuCatalogRepository,
      brands as unknown as BrandsRepository,
      modifiers as unknown as ModifiersRepository,
      {
        createDownloadUrl: jest.fn((key: string) =>
          Promise.resolve(`https://files.example.test/${key}`),
        ),
      } as unknown as StorageService,
      {} as PrismaService,
      {} as MenuItemsRepository,
      {} as MenuChannelsRepository,
      {} as MenuItemModifiersRepository,
      {} as RecipesRepository,
      assets as unknown as AssetsService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('UT-MCAT-002: checks every active modifier before creating the catalog entry', async () => {
    repository.create.mockImplementation(() => {
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
      return Promise.resolve(menuItem);
    });

    await expect(service.create(dto, 'actor-id')).resolves.toEqual(menuItem);
    expect(repository.create).toHaveBeenCalledWith(dto, undefined);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('UT-MCAT-003: rejects a missing or inactive later modifier without creating anything', async () => {
    modifiers.findOne
      .mockResolvedValueOnce({ is_active: true })
      .mockResolvedValueOnce(null);

    await expect(service.create(dto, 'actor-id')).rejects.toMatchObject({
      status: 404,
      response: { code: 'MODIFIER_NOT_FOUND' },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('UT-MCAT-004: allows creation without modifier assignments', async () => {
    const withoutModifiers = { ...dto, menu_item_modifier: [] };
    await expect(service.create(withoutModifiers, 'actor-id')).resolves.toEqual(
      menuItem,
    );
    expect(modifiers.findOne).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith(withoutModifiers, undefined);
  });

  it('UT-MCAT-005: preserves creation errors for the application exception filters', async () => {
    const error = new Error('Duplicate menu item');
    repository.create.mockRejectedValueOnce(error);
    await expect(service.create(dto, 'actor-id')).rejects.toBe(error);
  });

  it('UT-MCAT-006: does not create anything when a modifier lookup fails', async () => {
    const error = new Error('Database unavailable');
    modifiers.findOne.mockRejectedValueOnce(error);
    await expect(service.create(dto, 'actor-id')).rejects.toBe(error);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('UT-MCAT-007: validates the active brand and paginates the mapped catalog', async () => {
    await expect(
      service.findAll('brand-id', { page: 2, limit: 10 }),
    ).resolves.toEqual({
      data: [menuItem],
      meta: { page: 2, limit: 10, total: 21, totalPages: 3 },
    });
    expect(brands.findOneBrand).toHaveBeenCalledWith(
      'brand-id',
      true,
      undefined,
    );
    expect(repository.findMany).toHaveBeenCalledWith(
      'brand-id',
      10,
      10,
      undefined,
      undefined,
    );
  });

  it('UT-MCAT-008: rejects listing for a missing or inactive brand before querying the catalog', async () => {
    brands.findOneBrand.mockResolvedValue(null);
    await expect(
      service.findAll('brand-id', new PaginationDTO()),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'BRAND_NOT_FOUND' },
    });
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('UT-MCAT-009: returns an empty catalog with default pagination', async () => {
    repository.findMany.mockResolvedValue({ menuItems: [], total: 0 });
    await expect(
      service.findAll('brand-id', new PaginationDTO()),
    ).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    expect(repository.findMany).toHaveBeenCalledWith(
      'brand-id',
      0,
      10,
      undefined,
      undefined,
    );
  });

  it('UT-MCAT-010: rejects pagination overflow before querying the catalog', async () => {
    await expect(
      service.findAll('brand-id', { page: 2_147_483_647, limit: 2 }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'PAGINATION_UNSUPPORTED_RANGE' },
    });
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('UT-MCAT-014: returns uploaded image keys as download URLs', async () => {
    const key = 'uploads/user-id/image.png';
    const uploaded = { ...menuItem, img_url: key };
    repository.create.mockResolvedValue(uploaded);
    repository.findMany.mockResolvedValue({ menuItems: [uploaded], total: 1 });
    const expected = { img_url: `https://files.example.test/${key}` };

    await expect(service.create(dto, 'actor-id')).resolves.toMatchObject(
      expected,
    );
    await expect(
      service.findAll('brand-id', new PaginationDTO()),
    ).resolves.toMatchObject({ data: [expected] });
  });

  it('UT-MCAT-015: forwards the search to the catalog query', async () => {
    await service.findAll('brand-id', { page: 1, limit: 10, search: 'rice' });
    expect(repository.findMany).toHaveBeenCalledWith(
      'brand-id',
      0,
      10,
      'rice',
      undefined,
    );
  });

  it('UT-MCAT-011: preserves catalog lookup errors', async () => {
    const error = new Error('Database unavailable');
    repository.findMany.mockRejectedValueOnce(error);
    await expect(service.findAll('brand-id', new PaginationDTO())).rejects.toBe(
      error,
    );
  });
});

describe('MenuCatalogService transactional creation', () => {
  it('UT-MCAT-013: catalog preserves disabled channels and recipe availability', async () => {
    const item = {
      menu_item_id: 'meal',
      is_active: true,
      is_available: true,
      recipe: { is_active: false },
    };
    const channel = {
      order_channel: 'GRABFOOD',
      is_available: false,
      price: 120,
    };
    const tx = {
      menuItem: {
        findMany: jest.fn().mockResolvedValue([item]),
        count: jest.fn().mockResolvedValue(1),
      },
      menuItemChannel: { findMany: jest.fn().mockResolvedValue([channel]) },
      menuItemModifier: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((work: (client: typeof tx) => unknown) => work(tx)),
    } as unknown as PrismaService;
    const repository = new MenuCatalogRepository(
      prisma,
      new MenuItemsRepository(prisma),
      new MenuChannelsRepository(prisma),
      {} as ModifiersRepository,
      new MenuItemModifiersRepository(prisma),
    );

    const result = await repository.findMany('brand', 0, 100);
    expect(result.menuItems[0]).toMatchObject({
      recipe: { is_active: false },
      menuChannels: [channel],
    });
    expect(tx.menuItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { brand_id: 'brand', is_active: true },
        include: { recipe: { select: { is_active: true } } },
      }),
    );
    expect(tx.menuItemChannel.findMany).toHaveBeenCalledWith({
      where: {
        menu_item_id: 'meal',
        is_available: undefined,
        order_channel: undefined,
      },
    });
  });
  const dto: MenuCatalogSetupDTO = {
    menu_item: {
      brand_id: 'brand-id',
      recipe_id: 'recipe-id',
      img_url: 'https://example.com/rice.jpg',
      code: 'RICE',
      name: 'Rice',
      base_price: 100,
    },
    menu_channel: [
      { order_channel: 'GRABFOOD', price: 120, is_available: false },
    ],
    menu_item_modifier: [{ modifier_id: 'modifier-id', additional_price: 20 }],
  };

  it.each([true, false])(
    'UT-MCAT-012: returns the full created entry with children=%s',
    async (withChildren) => {
      const input = withChildren
        ? dto
        : { ...dto, menu_channel: [], menu_item_modifier: [] };
      const menuItem = { ...dto.menu_item, menu_item_id: 'menu-id' };
      const menuChannels = input.menu_channel.map((channel) => ({
        ...channel,
        menu_item_channel_id: 'channel-id',
        menu_item_id: menuItem.menu_item_id,
      }));
      const modifier = { modifier_id: 'modifier-id', name: 'Extra cheese' };
      const menuItemModifiers = input.menu_item_modifier.map((assignment) => ({
        ...assignment,
        menu_item_modifier_id: 'assignment-id',
        menu_item_id: menuItem.menu_item_id,
        modifier,
      }));
      const recipe = { recipe_id: 'recipe-id', name: 'Rice', is_active: true };
      const tx = {
        menuItem: {
          create: jest.fn().mockResolvedValue(menuItem),
          findUnique: jest.fn().mockResolvedValue({
            ...menuItem,
            recipe,
            menu_item_channels_menu_item: menuChannels,
            menu_item_modifiers_menu_item: menuItemModifiers,
          }),
        },
        menuItemChannel: {
          create: jest.fn().mockResolvedValue(menuChannels[0]),
        },
        menuItemModifier: {
          createManyAndReturn: jest.fn().mockResolvedValue(menuItemModifiers),
        },
      };
      const runTransaction = jest
        .fn()
        .mockImplementation((work: (client: typeof tx) => unknown) => work(tx));
      const prisma = {
        $transaction: runTransaction,
      } as unknown as PrismaService;
      const modifiers = {
        findOne: jest.fn().mockResolvedValue(modifier),
      } as unknown as ModifiersRepository;
      const repository = new MenuCatalogRepository(
        prisma,
        new MenuItemsRepository(prisma),
        new MenuChannelsRepository(prisma),
        modifiers,
        new MenuItemModifiersRepository(prisma),
      );
      const service = new MenuCatalogService(
        repository,
        {} as BrandsRepository,
        modifiers,
        {} as StorageService,
        prisma,
        {} as MenuItemsRepository,
        {} as MenuChannelsRepository,
        {} as MenuItemModifiersRepository,
        {} as RecipesRepository,
        {} as AssetsService,
      );

      await expect(service.create(input, 'actor-id')).resolves.toEqual({
        ...menuItem,
        recipe,
        menuChannels,
        menuItemModifiers,
      });
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(tx.menuItemChannel.create).toHaveBeenCalledTimes(
        input.menu_channel.length,
      );
      expect(tx.menuItemModifier.createManyAndReturn).toHaveBeenCalledTimes(
        input.menu_item_modifier.length > 0 ? 1 : 0,
      );
      expect(tx.menuItem.findUnique).toHaveBeenCalledWith({
        where: { menu_item_id: menuItem.menu_item_id },
        include: expect.objectContaining({
          recipe: expect.anything() as unknown,
        }) as unknown,
      });
    },
  );

  it('UT-MCAT-016: joins a caller transaction instead of opening its own', async () => {
    const menuItem = { ...dto.menu_item, menu_item_id: 'menu-id' };
    const tx = {
      menuItem: {
        create: jest.fn().mockResolvedValue(menuItem),
        findUnique: jest.fn().mockResolvedValue({
          ...menuItem,
          menu_item_channels_menu_item: [],
          menu_item_modifiers_menu_item: [],
        }),
        findMany: jest.fn().mockResolvedValue([menuItem]),
        count: jest.fn().mockResolvedValue(1),
      },
      menuItemChannel: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      menuItemModifier: {
        createManyAndReturn: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const runTransaction = jest.fn();
    const prisma = { $transaction: runTransaction } as unknown as PrismaService;
    const repository = new MenuCatalogRepository(
      prisma,
      new MenuItemsRepository(prisma),
      new MenuChannelsRepository(prisma),
      {} as ModifiersRepository,
      new MenuItemModifiersRepository(prisma),
    );
    const client = tx as unknown as Prisma.TransactionClient;

    await repository.create(dto, client);
    await repository.findMany('brand-id', 0, 10, undefined, client);

    expect(runTransaction).not.toHaveBeenCalled();
    expect(tx.menuItem.create).toHaveBeenCalledTimes(1);
    expect(tx.menuItem.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('MenuCatalogService cross-brand menu', () => {
  const gc = '00000000-0000-4000-8000-0000000000a1';
  const ai = '00000000-0000-4000-8000-0000000000a2';
  const entry = {
    menu_item_id: 'menu-id',
    img_url: 'uploads/owner/photo.jpg',
    menuChannels: [],
    menuItemModifiers: [],
  };
  const groups = [
    { brand_id: gc, is_available: true, count: 3 },
    { brand_id: gc, is_available: false, count: 1 },
    { brand_id: ai, is_available: false, count: 2 },
  ];
  let findCatalog: jest.Mock;
  let service: MenuCatalogService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    findCatalog = jest
      .fn()
      .mockResolvedValue({ entries: [entry], total: 21, groups });
    service = new MenuCatalogService(
      { findCatalog } as unknown as MenuCatalogRepository,
      {} as BrandsRepository,
      {} as ModifiersRepository,
      {
        createDownloadUrl: jest.fn((key: string) =>
          Promise.resolve(`https://files.example.test/${key}`),
        ),
      } as unknown as StorageService,
      {} as PrismaService,
      {} as MenuItemsRepository,
      {} as MenuChannelsRepository,
      {} as MenuItemModifiersRepository,
      {} as RecipesRepository,
      {} as AssetsService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('UT-MCAT-036: counts every brand and, for the chosen brand, each availability', async () => {
    const query = {
      page: 2,
      limit: 20,
      brand_id: gc,
      status: 'active' as const,
      availability: 'all' as const,
    };

    await expect(service.findCatalog(query)).resolves.toEqual({
      data: [
        {
          ...entry,
          img_url: 'https://files.example.test/uploads/owner/photo.jpg',
        },
      ],
      meta: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
        counts: {
          brands: {
            all: { total: 6, unavailable: 3 },
            [gc]: { total: 4, unavailable: 1 },
            [ai]: { total: 2, unavailable: 2 },
          },
          availability: { all: 4, available: 3, unavailable: 1 },
        },
      },
    });
    expect(findCatalog).toHaveBeenCalledWith(query, 20, 20, undefined);
  });

  it('UT-MCAT-037: counts availability across every brand when no brand is chosen', async () => {
    const result = await service.findCatalog({
      page: 1,
      limit: 20,
      status: 'active',
      availability: 'all',
    });

    expect(result.meta.counts.availability).toEqual({
      all: 6,
      available: 3,
      unavailable: 3,
    });
  });

  it('UT-MCAT-038: rejects pagination overflow before querying', async () => {
    await expect(
      service.findCatalog({
        page: 2147483647,
        limit: 100,
        status: 'active',
        availability: 'all',
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'PAGINATION_UNSUPPORTED_RANGE' },
    });
    expect(findCatalog).not.toHaveBeenCalled();
  });
});

describe('MenuCatalogRepository cross-brand menu', () => {
  it('UT-MCAT-039: filters the page by brand and availability but counts without them, in brand then name order', async () => {
    const row = {
      menu_item_id: 'menu-id',
      recipe: { recipe_id: 'recipe-id', name: 'Rice', is_active: true },
      menu_item_channels_menu_item: [{ order_channel: 'GRABFOOD' }],
      menu_item_modifiers_menu_item: [{ modifier_id: 'modifier-id' }],
    };
    const tx = {
      menuItem: {
        findMany: jest.fn().mockResolvedValue([row]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { brand_id: 'brand-id', is_available: false, _count: { _all: 2 } },
          ]),
      },
    };
    const prisma = { $transaction: jest.fn() } as unknown as PrismaService;
    const repository = new MenuCatalogRepository(
      prisma,
      new MenuItemsRepository(prisma),
      {} as MenuChannelsRepository,
      {} as ModifiersRepository,
      {} as MenuItemModifiersRepository,
    );

    const result = await repository.findCatalog(
      {
        page: 1,
        limit: 20,
        brand_id: 'brand-id',
        status: 'active',
        availability: 'unavailable',
        search: 'rice',
      },
      0,
      20,
      tx as unknown as Prisma.TransactionClient,
    );

    const search = {
      AND: [
        {
          OR: [
            { name: { contains: 'rice', mode: 'insensitive' } },
            { code: { contains: 'rice', mode: 'insensitive' } },
          ],
        },
      ],
    };
    const where = {
      is_active: true,
      ...search,
      brand_id: 'brand-id',
      is_available: false,
    };
    expect(tx.menuItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [
          { brand: { name: 'asc' } },
          { name: 'asc' },
          { menu_item_id: 'asc' },
        ],
        skip: 0,
        take: 20,
      }),
    );
    expect(tx.menuItem.count).toHaveBeenCalledWith({ where });
    expect(tx.menuItem.groupBy).toHaveBeenCalledWith({
      by: ['brand_id', 'is_available'],
      where: { is_active: true, ...search },
      _count: { _all: true },
    });
    expect(result).toEqual({
      entries: [
        {
          menu_item_id: 'menu-id',
          recipe: row.recipe,
          menuChannels: row.menu_item_channels_menu_item,
          menuItemModifiers: row.menu_item_modifiers_menu_item,
        },
      ],
      total: 1,
      groups: [{ brand_id: 'brand-id', is_available: false, count: 2 }],
    });
  });
});
