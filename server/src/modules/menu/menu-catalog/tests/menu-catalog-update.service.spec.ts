import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { StorageService } from '../../../../shared/storage/storage.service';
import { BrandsRepository } from '../../../brands/brands.repository';
import { RecipesRepository } from '../../../recipe/recipes/recipes.repository';
import { MenuChannelsRepository } from '../../menu-channels/menu-channels.repository';
import { MenuItemModifiersRepository } from '../../menu-item-modifiers/menu-item-modifiers.repository';
import { MenuItemsRepository } from '../../menu-items/menu-items.repository';
import { ModifiersRepository } from '../../modifiers/modifiers.repository';
import { UpdateMenuCatalogDTO } from '../dto/update-menu-catalog.dto';
import { MenuCatalogRepository } from '../menu-catalog.repository';
import { MenuCatalogService } from '../menu-catalog.service';

describe('MenuCatalogService update', () => {
  const menuItemId = '00000000-0000-4000-8000-000000000001';
  const tx = { marker: 'tx' } as unknown as Prisma.TransactionClient;
  const menuItem = {
    menu_item_id: menuItemId,
    code: 'GC-RICE',
    name: 'Rice',
    img_url: 'uploads/rice.jpg',
    is_active: true,
  };

  // Existing children of the menu item.
  const grab = '00000000-0000-4000-8000-000000000011';
  const panda = '00000000-0000-4000-8000-000000000012';
  const egg = '00000000-0000-4000-8000-000000000021';
  const cheese = '00000000-0000-4000-8000-000000000022';
  const eggModifier = '00000000-0000-4000-8000-000000000031';
  const cheeseModifier = '00000000-0000-4000-8000-000000000032';
  const newModifier = '00000000-0000-4000-8000-000000000033';
  const unknownId = '00000000-0000-4000-8000-000000000099';
  const currentChannels = [
    { menu_item_channel_id: grab, order_channel: 'GRABFOOD', price: '120' },
    { menu_item_channel_id: panda, order_channel: 'FOODPANDA', price: '125' },
  ];
  const currentModifiers = [
    { menu_item_modifier_id: egg, modifier_id: eggModifier },
    { menu_item_modifier_id: cheese, modifier_id: cheeseModifier },
  ];
  const finalChannels = [{ marker: 'final channels' }];
  const finalModifiers = [{ marker: 'final modifiers' }];
  const asUpdate = (value: object) => value as UpdateMenuCatalogDTO;

  let prisma: { $transaction: jest.Mock };
  let items: jest.Mocked<
    Pick<MenuItemsRepository, 'findOneMenuItemByUID' | 'updateMenuItem'>
  >;
  let channels: jest.Mocked<
    Pick<
      MenuChannelsRepository,
      'findManyByMenuItem' | 'create' | 'updateOverride' | 'deletePermanently'
    >
  >;
  let assignments: jest.Mocked<
    Pick<
      MenuItemModifiersRepository,
      'findManyForMenuItem' | 'createMany' | 'update' | 'delete'
    >
  >;
  let modifiers: jest.Mocked<Pick<ModifiersRepository, 'findOne'>>;
  let recipes: jest.Mocked<Pick<RecipesRepository, 'findOne'>>;
  let service: MenuCatalogService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    prisma = {
      $transaction: jest.fn(
        (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    items = {
      findOneMenuItemByUID: jest.fn().mockResolvedValue(menuItem),
      updateMenuItem: jest.fn().mockResolvedValue(menuItem),
    };
    channels = {
      findManyByMenuItem: jest
        .fn()
        .mockResolvedValueOnce(currentChannels)
        .mockResolvedValue(finalChannels),
      create: jest.fn(),
      updateOverride: jest.fn(),
      deletePermanently: jest.fn(),
    };
    assignments = {
      findManyForMenuItem: jest
        .fn()
        .mockResolvedValueOnce(currentModifiers)
        .mockResolvedValue(finalModifiers),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    modifiers = {
      findOne: jest.fn().mockResolvedValue({ is_active: true }),
    };
    recipes = {
      findOne: jest.fn().mockResolvedValue({ is_active: true }),
    };
    service = new MenuCatalogService(
      {} as MenuCatalogRepository,
      {} as BrandsRepository,
      modifiers as unknown as ModifiersRepository,
      {
        createDownloadUrl: jest.fn((key: string) =>
          Promise.resolve(`https://files.example.test/${key}`),
        ),
      } as unknown as StorageService,
      prisma as unknown as PrismaService,
      items as unknown as MenuItemsRepository,
      channels as unknown as MenuChannelsRepository,
      assignments as unknown as MenuItemModifiersRepository,
      recipes as unknown as RecipesRepository,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  function expectNoChildWrites() {
    expect(channels.create).not.toHaveBeenCalled();
    expect(channels.updateOverride).not.toHaveBeenCalled();
    expect(channels.deletePermanently).not.toHaveBeenCalled();
    expect(assignments.createMany).not.toHaveBeenCalled();
    expect(assignments.update).not.toHaveBeenCalled();
    expect(assignments.delete).not.toHaveBeenCalled();
  }

  it('UT-MCAT-017: Given only menu item field changes, When the entry is updated, Then save them in one transaction and return the item with its children', async () => {
    const result = await service.update(
      menuItemId,
      asUpdate({ menu_item: { name: 'Garlic Rice' } }),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(items.findOneMenuItemByUID).toHaveBeenCalledWith(
      menuItemId,
      true,
      tx,
    );
    expect(items.updateMenuItem).toHaveBeenCalledWith(
      menuItemId,
      { name: 'Garlic Rice' },
      tx,
    );
    expect(recipes.findOne).not.toHaveBeenCalled();
    expectNoChildWrites();
    expect(result).toEqual({
      ...menuItem,
      img_url: 'https://files.example.test/uploads/rice.jpg',
      menuChannels: finalChannels,
      menuItemModifiers: finalModifiers,
    });
  });

  it('UT-MCAT-018: Given only child changes, When the entry is updated, Then still touch the menu item so its modified time moves', async () => {
    await service.update(
      menuItemId,
      asUpdate({ menu_channel: { delete: [panda] } }),
    );

    expect(items.updateMenuItem).toHaveBeenCalledWith(menuItemId, {}, tx);
  });

  it.each([
    {},
    { menu_item: {} },
    { menu_item: { name: undefined } },
    { menu_channel: { create: [], update: [], delete: [] } },
    { menu_item_modifier: {} },
  ])(
    'UT-MCAT-019: Given no changes %j, When the entry is updated, Then throw NO_MENU_CATALOG_CHANGES without opening a transaction',
    async (dto) => {
      await expect(
        service.update(menuItemId, asUpdate(dto)),
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'NO_MENU_CATALOG_CHANGES' },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('UT-MCAT-020: Given a missing or inactive menu item, When it is updated, Then throw MENU_ITEM_NOT_FOUND without reading or writing its children', async () => {
    items.findOneMenuItemByUID.mockResolvedValue(null);

    await expect(
      service.update(menuItemId, asUpdate({ menu_item: { name: 'X' } })),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'MENU_ITEM_NOT_FOUND' },
    });
    expect(items.updateMenuItem).not.toHaveBeenCalled();
    expect(channels.findManyByMenuItem).not.toHaveBeenCalled();
    expect(assignments.findManyForMenuItem).not.toHaveBeenCalled();
  });

  it('UT-MCAT-021: Given a new recipe that is missing or inactive, When the entry is updated, Then throw RECIPE_NOT_FOUND before saving', async () => {
    recipes.findOne.mockResolvedValue(null);

    await expect(
      service.update(
        menuItemId,
        asUpdate({ menu_item: { recipe_id: unknownId } }),
      ),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'RECIPE_NOT_FOUND' },
    });
    expect(recipes.findOne).toHaveBeenCalledWith(unknownId, true, false, tx);
    expect(items.updateMenuItem).not.toHaveBeenCalled();
  });

  it('UT-MCAT-022: Given channel create, update and delete, When the entry is updated, Then delete, update, then create them with the same transaction', async () => {
    const order: string[] = [];
    channels.deletePermanently.mockImplementation(() => {
      order.push('delete');
      return Promise.resolve({} as never);
    });
    channels.updateOverride.mockImplementation(() => {
      order.push('update');
      return Promise.resolve({} as never);
    });
    channels.create.mockImplementation(() => {
      order.push('create');
      return Promise.resolve({} as never);
    });

    const result = await service.update(
      menuItemId,
      asUpdate({
        menu_channel: {
          // FOODPANDA is removed and added back with a new price.
          delete: [panda],
          update: [{ menu_item_channel_id: grab, is_available: false }],
          create: [{ order_channel: 'FOODPANDA', price: 130 }],
        },
      }),
    );

    expect(order).toEqual(['delete', 'update', 'create']);
    expect(channels.findManyByMenuItem).toHaveBeenNthCalledWith(
      1,
      menuItemId,
      false,
      undefined,
      tx,
    );
    expect(channels.deletePermanently).toHaveBeenCalledWith(panda, tx);
    expect(channels.updateOverride).toHaveBeenCalledWith(
      grab,
      { is_available: false },
      tx,
    );
    expect(channels.create).toHaveBeenCalledWith(
      { order_channel: 'FOODPANDA', price: 130, menu_item_id: menuItemId },
      tx,
    );
    expect(result.menuChannels).toBe(finalChannels);
  });

  it.each([
    { update: [{ menu_item_channel_id: unknownId, price: 1 }] },
    { delete: [unknownId] },
  ])(
    'UT-MCAT-023: Given a channel ID that does not belong to the item %j, When the entry is updated, Then throw MENU_ITEM_CHANNEL_NOT_FOUND without writing',
    async (menu_channel) => {
      await expect(
        service.update(menuItemId, asUpdate({ menu_channel })),
      ).rejects.toMatchObject({
        status: 404,
        response: { code: 'MENU_ITEM_CHANNEL_NOT_FOUND' },
      });
      expectNoChildWrites();
    },
  );

  it('UT-MCAT-024: Given the same channel updated and deleted, When the entry is updated, Then throw CONFLICTING_CHANNEL_MUTATIONS without writing', async () => {
    await expect(
      service.update(
        menuItemId,
        asUpdate({
          menu_channel: {
            update: [{ menu_item_channel_id: grab, price: 1 }],
            delete: [grab],
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'CONFLICTING_CHANNEL_MUTATIONS' },
    });
    expectNoChildWrites();
  });

  it.each(['DINE_IN', 'TAKEAWAY'])(
    'UT-MCAT-025: Given a new %s override, When the entry is updated, Then throw INVALID_ORDER_CHANNEL without writing',
    async (order_channel) => {
      await expect(
        service.update(
          menuItemId,
          asUpdate({ menu_channel: { create: [{ order_channel, price: 1 }] } }),
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'INVALID_ORDER_CHANNEL' },
      });
      expectNoChildWrites();
    },
  );

  it('UT-MCAT-026: Given a new override for a channel the item already has, When the entry is updated, Then throw DUPLICATE_ORDER_CHANNEL without writing', async () => {
    await expect(
      service.update(
        menuItemId,
        asUpdate({
          menu_channel: { create: [{ order_channel: 'GRABFOOD', price: 1 }] },
        }),
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'DUPLICATE_ORDER_CHANNEL' },
    });
    expectNoChildWrites();
  });

  it('UT-MCAT-027: Given modifier create, update and delete, When the entry is updated, Then check only newly referenced modifiers and delete, update, then create with the same transaction', async () => {
    const order: string[] = [];
    assignments.delete.mockImplementation(() => {
      order.push('delete');
      return Promise.resolve({} as never);
    });
    assignments.update.mockImplementation(() => {
      order.push('update');
      return Promise.resolve({} as never);
    });
    assignments.createMany.mockImplementation(() => {
      order.push('create');
      return Promise.resolve([] as never);
    });
    const create = [{ modifier_id: newModifier, additional_price: 15 }];

    const result = await service.update(
      menuItemId,
      asUpdate({
        menu_item_modifier: {
          delete: [cheese],
          update: [{ menu_item_modifier_id: egg, additional_price: 25 }],
          create,
        },
      }),
    );

    expect(order).toEqual(['delete', 'update', 'create']);
    expect(modifiers.findOne).toHaveBeenCalledTimes(1);
    expect(modifiers.findOne).toHaveBeenCalledWith(
      { modifier_id: newModifier },
      true,
      tx,
    );
    expect(assignments.delete).toHaveBeenCalledWith(cheese, tx);
    expect(assignments.update).toHaveBeenCalledWith(
      egg,
      { additional_price: 25 },
      tx,
    );
    expect(assignments.createMany).toHaveBeenCalledWith(menuItemId, create, tx);
    expect(result.menuItemModifiers).toBe(finalModifiers);
  });

  it('UT-MCAT-028: Given a replacement modifier, When the entry is updated, Then check it is active before saving', async () => {
    modifiers.findOne.mockResolvedValue(null);

    await expect(
      service.update(
        menuItemId,
        asUpdate({
          menu_item_modifier: {
            update: [{ menu_item_modifier_id: egg, modifier_id: newModifier }],
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 404,
      response: { code: 'MODIFIER_NOT_FOUND' },
    });
    expect(modifiers.findOne).toHaveBeenCalledWith(
      { modifier_id: newModifier },
      true,
      tx,
    );
    expectNoChildWrites();
  });

  it.each([
    {
      name: 'a new assignment of a modifier the item has',
      menu_item_modifier: { create: [{ modifier_id: eggModifier }] },
    },
    {
      name: 'a replacement that matches another assignment',
      menu_item_modifier: {
        update: [{ menu_item_modifier_id: egg, modifier_id: cheeseModifier }],
      },
    },
  ])(
    'UT-MCAT-029: Given $name, When the entry is updated, Then throw DUPLICATE_MENU_ITEM_MODIFIER without writing',
    async ({ menu_item_modifier }) => {
      await expect(
        service.update(menuItemId, asUpdate({ menu_item_modifier })),
      ).rejects.toMatchObject({
        status: 400,
        response: { code: 'DUPLICATE_MENU_ITEM_MODIFIER' },
      });
      expectNoChildWrites();
    },
  );

  it('UT-MCAT-030: Given a modifier removed and re-added in one request, When the entry is updated, Then accept it', async () => {
    await service.update(
      menuItemId,
      asUpdate({
        menu_item_modifier: {
          delete: [egg],
          create: [{ modifier_id: eggModifier, additional_price: 30 }],
        },
      }),
    );

    expect(assignments.delete).toHaveBeenCalledWith(egg, tx);
    expect(assignments.createMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: 'an assignment ID that does not belong to the item',
      menu_item_modifier: { delete: [unknownId] },
      code: 'MENU_ITEM_MODIFIER_NOT_FOUND',
      status: 404,
    },
    {
      name: 'the same assignment updated twice',
      menu_item_modifier: {
        update: [
          { menu_item_modifier_id: egg, additional_price: 1 },
          { menu_item_modifier_id: egg, additional_price: 2 },
        ],
      },
      code: 'CONFLICTING_MODIFIER_MUTATIONS',
      status: 400,
    },
  ])(
    'UT-MCAT-031: Given $name, When the entry is updated, Then throw $code without writing',
    async ({ menu_item_modifier, code, status }) => {
      await expect(
        service.update(menuItemId, asUpdate({ menu_item_modifier })),
      ).rejects.toMatchObject({ status, response: { code } });
      expectNoChildWrites();
    },
  );
});

describe('MenuChannelsRepository catalog overrides', () => {
  const update = jest.fn().mockResolvedValue({});
  const remove = jest.fn().mockResolvedValue({});
  const repository = new MenuChannelsRepository({
    menuItemChannel: { update, delete: remove },
  } as unknown as PrismaService);

  it('UT-MCAT-032: updates price and availability of any override, available or not', async () => {
    await repository.updateOverride('channel-id', {
      price: 120,
      is_available: false,
    });

    expect(update).toHaveBeenCalledWith({
      where: { menu_item_channel_id: 'channel-id' },
      data: {
        price: 120,
        is_available: false,
        modified_at: expect.any(Date) as Date,
      },
    });
  });

  it('UT-MCAT-033: permanently deletes an override', async () => {
    await repository.deletePermanently('channel-id');

    expect(remove).toHaveBeenCalledWith({
      where: { menu_item_channel_id: 'channel-id' },
    });
  });
});
