import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuthService } from '../../../auth/auth.service';
import { MenuCatalogController } from '../menu-catalog.controller';
import { MenuCatalogService } from '../menu-catalog.service';

describe('Menu catalog HTTP endpoints', () => {
  const brandId = '00000000-0000-4000-8000-000000000001';
  const otherBrandId = '00000000-0000-4000-8000-000000000002';
  const user = {
    user_id: '00000000-0000-4000-8000-000000000003',
    brand_id: brandId,
    role: UserRole.SUPERADMIN,
  };
  const dto = {
    menu_item: {
      brand_id: brandId,
      recipe_id: '00000000-0000-4000-8000-000000000004',
      img_url: 'https://example.com/rice.jpg',
      code: 'RICE',
      name: 'Rice',
      base_price: 100,
    },
    menu_channel: [{ order_channel: 'GRABFOOD', price: 120 }],
    menu_item_modifier: [
      { modifier_id: '00000000-0000-4000-8000-000000000005' },
    ],
  };
  const createdEntry = {
    ...dto.menu_item,
    menu_item_id: 'created-item',
    menuChannels: [{ ...dto.menu_channel[0], menu_item_id: 'created-item' }],
    menuItemModifiers: [
      {
        ...dto.menu_item_modifier[0],
        menu_item_id: 'created-item',
        modifier: {
          modifier_id: dto.menu_item_modifier[0].modifier_id,
          name: 'Extra cheese',
        },
      },
    ],
  };
  const service = { create: jest.fn(), findAll: jest.fn(), update: jest.fn() };
  const auth = { validateSession: jest.fn() };
  const brandLookup = jest.fn();
  const headers = {
    authorization: 'Bearer session-token',
    'content-type': 'application/json',
  };
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MenuCatalogController],
      providers: [
        { provide: MenuCatalogService, useValue: service },
        { provide: AuthService, useValue: auth },
        {
          provide: PrismaService,
          useValue: { brand: { findUnique: brandLookup } },
        },
      ],
    }).compile();
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
    url = `${await app.getUrl()}/api/menu-catalog`;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    service.create.mockResolvedValue(createdEntry);
    service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });
    service.update.mockResolvedValue(createdEntry);
    auth.validateSession.mockResolvedValue({ user });
    brandLookup.mockResolvedValue({ brand_id: brandId });
  });

  afterAll(async () => app?.close());

  it('IT-MCAT-001: creates a catalog entry for a superadmin assigned to its nested brand', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(createdEntry);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it.each([
    { query: '', pagination: { page: 1, limit: 10 } },
    { query: '?page=2&limit=5', pagination: { page: 2, limit: 5 } },
    {
      query: '?search=%20rice%20',
      pagination: { page: 1, limit: 10, search: 'rice' },
    },
  ])(
    'IT-MCAT-002: lists a brand catalog with query "$query"',
    async ({ query, pagination }) => {
      const response = await fetch(`${url}/brand/${brandId}${query}`, {
        headers: { authorization: headers.authorization },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: [], meta: { total: 0 } });
      expect(service.findAll).toHaveBeenCalledWith(brandId, pagination);
    },
  );

  it('IT-MCAT-003: requires authentication to create and list entries', async () => {
    const createResponse = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(dto),
    });
    const listResponse = await fetch(`${url}/brand/${brandId}`);

    expect(createResponse.status).toBe(401);
    expect(listResponse.status).toBe(401);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('IT-MCAT-004: rejects creation by roles that cannot create menu items', async () => {
    auth.validateSession.mockResolvedValue({
      user: { ...user, role: UserRole.CASHIER_STAFF },
    });
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    });

    expect(response.status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('IT-MCAT-005: creates entries across brands', async () => {
    brandLookup.mockResolvedValue({ brand_id: otherBrandId });
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...dto,
        menu_item: { ...dto.menu_item, brand_id: otherBrandId },
      }),
    });

    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalled();
  });

  it('IT-MCAT-006: lists any brand', async () => {
    const response = await fetch(`${url}/brand/${otherBrandId}`, { headers });
    expect(response.status).toBe(200);
    expect(service.findAll).toHaveBeenCalled();
  });

  it.each([undefined, null, {}])(
    'IT-MCAT-008: rejects a missing nested brand in menu_item=%j',
    async (menu_item) => {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...dto, menu_item }),
      });

      expect(response.status).toBe(400);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('IT-MCAT-009: validates nested modifier IDs', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...dto,
        menu_item_modifier: [{ modifier_id: 'invalid' }],
      }),
    });

    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it.each(['?page=0', '?limit=101', `?search=${'r'.repeat(101)}`])(
    'IT-MCAT-010: rejects invalid listing filters %s',
    async (query) => {
      const response = await fetch(`${url}/brand/${brandId}${query}`, {
        headers,
      });
      expect(response.status).toBe(400);
      expect(service.findAll).not.toHaveBeenCalled();
    },
  );

  it('IT-MCAT-011: rejects malformed brand IDs', async () => {
    const response = await fetch(`${url}/brand/invalid`, { headers });
    expect(response.status).toBe(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  describe('PATCH /menu-catalog/:id', () => {
    const menuItemId = '00000000-0000-4000-8000-000000000010';
    const channelId = '00000000-0000-4000-8000-000000000011';
    const assignmentId = '00000000-0000-4000-8000-000000000012';
    const patch = (body: unknown, id = menuItemId, reqHeaders = headers) =>
      fetch(`${url}/${id}`, {
        method: 'PATCH',
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
    const update = {
      menu_item: { name: 'Garlic Rice', base_price: 110 },
      menu_channel: {
        create: [{ order_channel: 'FOODPANDA', price: 130 }],
        update: [{ menu_item_channel_id: channelId, is_available: false }],
        delete: [channelId],
      },
      menu_item_modifier: {
        create: [{ modifier_id: dto.menu_item_modifier[0].modifier_id }],
        update: [{ menu_item_modifier_id: assignmentId, additional_price: 15 }],
        delete: [assignmentId],
      },
    };

    it('IT-MCAT-012: passes item fields and child mutations to the service', async () => {
      const response = await patch(update);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(createdEntry);
      expect(service.update).toHaveBeenCalledWith(menuItemId, update);
    });

    it.each([
      { name: 'a brand change', body: { menu_item: { brand_id: brandId } } },
      {
        name: 'an order channel change on an existing override',
        body: {
          menu_channel: {
            update: [
              { menu_item_channel_id: channelId, order_channel: 'GRABFOOD' },
            ],
          },
        },
      },
      {
        name: 'a child list sent as an array',
        body: { menu_channel: [{ order_channel: 'GRABFOOD', price: 1 }] },
      },
      {
        name: 'a malformed delete ID',
        body: { menu_item_modifier: { delete: ['invalid'] } },
      },
      {
        name: 'an update without its ID',
        body: { menu_item_modifier: { update: [{ additional_price: 1 }] } },
      },
      {
        name: 'the same channel created twice',
        body: {
          menu_channel: {
            create: [
              { order_channel: 'GRABFOOD', price: 1 },
              { order_channel: 'GRABFOOD', price: 2 },
            ],
          },
        },
      },
    ])('IT-MCAT-013: rejects $name', async ({ body }) => {
      const response = await patch(body);

      expect(response.status).toBe(400);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('IT-MCAT-014: rejects a malformed menu item ID', async () => {
      const response = await patch(update, 'invalid');

      expect(response.status).toBe(400);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('IT-MCAT-015: requires authentication and the superadmin role', async () => {
      const anonymous = await patch(update, menuItemId, {
        'content-type': 'application/json',
      } as typeof headers);
      auth.validateSession.mockResolvedValue({
        user: { ...user, role: UserRole.CASHIER_STAFF },
      });
      const cashier = await patch(update);

      expect(anonymous.status).toBe(401);
      expect(cashier.status).toBe(403);
      expect(service.update).not.toHaveBeenCalled();
    });
  });
});
