import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertExists } from '../../shared/assertions/assert-exists';
import { assertValidPagination } from '../../shared/assertions/assert-valid-pagination';
import { CreateUnitDTO } from './dto/create-unit.dto';
import { FindUnitsDTO } from './dto/find-units.dto';
import { UpdateUnitDTO } from './dto/update-unit.dto';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);
  constructor(private readonly unitsRepository: UnitsRepository) {}

  async create(dto: CreateUnitDTO, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Creating unit ${dto.code}`);

    const unit = await this.unitsRepository.create(dto, tx);
    this.logger.log(`Created unit ${unit.code}`);

    return unit;
  }

  async findAll(query: FindUnitsDTO, tx?: Prisma.TransactionClient) {
    const { page, limit, search, dimension } = query;

    this.logger.log(
      `Listing units: page=${page}, limit=${limit}, dimension=${dimension ?? 'any'}, search=${search ? 'yes' : 'no'}`,
    );

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    const { units, total } = await this.unitsRepository.findAll(
      skip,
      limit,
      { search, dimension },
      tx,
    );

    this.logger.log(
      `Listed units: page=${page}, returned=${units.length}, total=${total}`,
    );

    return {
      data: units,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(code: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Finding unit ${code}`);

    const unit = await this.unitsRepository.findOne(code, tx);
    assertExists(unit, 'Unit', code, this.logger);

    this.logger.log(`Unit ${unit.code} found`);
    return unit;
  }

  async update(
    code: string,
    dto: UpdateUnitDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Updating unit ${code}`);

    const unit = await this.unitsRepository.findOne(code, tx);
    assertExists(unit, 'Unit', code, this.logger);

    const updated = await this.unitsRepository.update(code, dto, tx);
    this.logger.log(`Updated unit ${updated.code}`);

    return updated;
  }

  async delete(code: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Deleting unit ${code}`);

    const unit = await this.unitsRepository.findOne(code, tx);
    assertExists(unit, 'Unit', code, this.logger);

    const ingredients = await this.unitsRepository.countIngredients(code, tx);
    if (ingredients > 0) {
      this.logger.warn(
        `Unit ${code} is used by ${ingredients} recipe ingredients`,
      );
      throw new ConflictException({
        code: 'UNIT_IN_USE',
        message: 'Unit is used by recipe ingredients and cannot be deleted.',
      });
    }

    const deleted = await this.unitsRepository.delete(code, tx);
    this.logger.log(`Deleted unit ${deleted.code}`);

    return deleted;
  }
}
