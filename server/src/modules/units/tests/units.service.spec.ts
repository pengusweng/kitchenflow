import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, UnitDimension } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UnitsRepository } from '../units.repository';
import { UnitsService } from '../units.service';

describe('UnitsService', () => {
  const unit = {
    code: 'kg',
    name: 'Kilogram',
    dimension: UnitDimension.MASS,
    to_base: new Prisma.Decimal(1000),
  };
  let units: jest.Mocked<
    Pick<
      UnitsRepository,
      | 'create'
      | 'findAll'
      | 'findOne'
      | 'countIngredients'
      | 'update'
      | 'delete'
    >
  >;
  let service: UnitsService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    units = {
      create: jest.fn().mockResolvedValue(unit),
      findAll: jest.fn().mockResolvedValue({ units: [unit], total: 21 }),
      findOne: jest.fn().mockResolvedValue(unit),
      countIngredients: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ ...unit, name: 'Kilo' }),
      delete: jest.fn().mockResolvedValue(unit),
    };
    service = new UnitsService(units as unknown as UnitsRepository);
  });
  afterEach(() => jest.restoreAllMocks());

  it('UT-UNIT-001: Given a valid unit, When it is created, Then persist and return it', async () => {
    const dto = {
      code: 'kg',
      name: 'Kilogram',
      dimension: UnitDimension.MASS,
      to_base: 1000,
    };

    await expect(service.create(dto)).resolves.toEqual(unit);
    expect(units.create).toHaveBeenCalledWith(dto, undefined);
  });

  it('UT-UNIT-002: Given page 3 of 10, When units are listed, Then pass the offset and filters and return pagination meta', async () => {
    const result = await service.findAll({
      page: 3,
      limit: 10,
      search: 'gram',
      dimension: UnitDimension.MASS,
    });

    expect(units.findAll).toHaveBeenCalledWith(
      20,
      10,
      { search: 'gram', dimension: UnitDimension.MASS },
      undefined,
    );
    expect(result).toEqual({
      data: [unit],
      meta: { page: 3, limit: 10, total: 21, totalPages: 3 },
    });
  });

  it('UT-UNIT-003: Given an offset beyond 32 bits, When units are listed, Then reject it before querying', async () => {
    await expect(
      service.findAll({ page: 2_147_483_647, limit: 100 }),
    ).rejects.toMatchObject({
      response: { code: 'PAGINATION_UNSUPPORTED_RANGE' },
    });
    expect(units.findAll).not.toHaveBeenCalled();
  });

  it('UT-UNIT-004: Given an existing unit, When it is fetched, Then return it', async () => {
    await expect(service.findOne('kg')).resolves.toEqual(unit);
    expect(units.findOne).toHaveBeenCalledWith('kg', undefined);
  });

  it('UT-UNIT-005: Given an unknown unit, When it is fetched, Then throw UNIT_NOT_FOUND', async () => {
    units.findOne.mockResolvedValue(null);

    await expect(service.findOne('zz')).rejects.toMatchObject({
      response: { code: 'UNIT_NOT_FOUND' },
    });
  });

  it('UT-UNIT-006: Given an existing unit, When it is updated, Then save and return the changes', async () => {
    await expect(service.update('kg', { name: 'Kilo' })).resolves.toEqual({
      ...unit,
      name: 'Kilo',
    });
    expect(units.update).toHaveBeenCalledWith(
      'kg',
      { name: 'Kilo' },
      undefined,
    );
  });

  it('UT-UNIT-007: Given an unknown unit, When it is updated, Then throw not found without writing', async () => {
    units.findOne.mockResolvedValue(null);

    await expect(service.update('zz', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(units.update).not.toHaveBeenCalled();
  });

  it('UT-UNIT-008: Given an unused unit, When it is deleted, Then remove and return it', async () => {
    await expect(service.delete('kg')).resolves.toEqual(unit);
    expect(units.delete).toHaveBeenCalledWith('kg', undefined);
  });

  it('UT-UNIT-009: Given a unit used by recipe ingredients, When it is deleted, Then throw UNIT_IN_USE without deleting', async () => {
    units.countIngredients.mockResolvedValue(2);

    const error = await service.delete('kg').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error).toMatchObject({ response: { code: 'UNIT_IN_USE' } });
    expect(units.delete).not.toHaveBeenCalled();
  });

  it('UT-UNIT-010: Given an unknown unit, When it is deleted, Then throw not found without deleting', async () => {
    units.findOne.mockResolvedValue(null);

    await expect(service.delete('zz')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(units.countIngredients).not.toHaveBeenCalled();
    expect(units.delete).not.toHaveBeenCalled();
  });

  describe('unit persistence', () => {
    const tx = {
      unit: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      recipeIngredient: { count: jest.fn() },
    };
    let repository: UnitsRepository;

    beforeEach(() => {
      for (const method of Object.values(tx.unit)) method.mockReset();
      tx.recipeIngredient.count.mockReset();
      repository = new UnitsRepository(tx as unknown as PrismaService);
    });

    it('UT-UNIT-011: Given a search and dimension, When units are listed, Then rows and total share the same filter', async () => {
      tx.unit.findMany.mockResolvedValue([unit]);
      tx.unit.count.mockResolvedValue(1);

      await expect(
        repository.findAll(10, 5, {
          search: 'kilo gram',
          dimension: UnitDimension.MASS,
        }),
      ).resolves.toEqual({ units: [unit], total: 1 });

      const where = {
        AND: ['kilo', 'gram'].map((term) => ({
          OR: [
            { code: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        })),
        dimension: UnitDimension.MASS,
      };
      expect(tx.unit.findMany).toHaveBeenCalledWith({
        where,
        skip: 10,
        take: 5,
        orderBy: [{ dimension: 'asc' }, { to_base: 'asc' }, { code: 'asc' }],
      });
      expect(tx.unit.count).toHaveBeenCalledWith({ where });
    });

    it('UT-UNIT-012: Given an update without a code, When a unit is updated, Then only write name, dimension, and to_base', async () => {
      tx.unit.update.mockResolvedValue(unit);

      await repository.update('kg', {
        to_base: 1000,
        code: 'kilo',
      } as never);

      expect(tx.unit.update).toHaveBeenCalledWith({
        where: { code: 'kg' },
        data: { name: undefined, dimension: undefined, to_base: 1000 },
      });
    });

    it('UT-UNIT-013: Given a unit code, When its ingredient usage is counted, Then count recipe ingredients by unit code', async () => {
      tx.recipeIngredient.count.mockResolvedValue(3);

      await expect(repository.countIngredients('kg')).resolves.toBe(3);
      expect(tx.recipeIngredient.count).toHaveBeenCalledWith({
        where: { unit_code: 'kg' },
      });
    });
  });
});
