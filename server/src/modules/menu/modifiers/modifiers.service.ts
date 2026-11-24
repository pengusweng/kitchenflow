import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ModifiersRepository } from './modifiers.repository';
import { CreateModifierDTO } from './dto/create-modifier.dto';
import { assertExists } from '../../../shared/assertions/assert-exists';
import { isUUID } from 'class-validator';
import { FindAllModifiersDTO } from './dto/find-all-modifiers.dto';
import { UpdateModifierDTO } from './dto/update-modifier.dto';
import { assertValidPagination } from '../../../shared/assertions/assert-valid-pagination';

@Injectable()
export class ModifiersService {
  private readonly logger = new Logger(ModifiersService.name);

  constructor(private readonly modifiersRepository: ModifiersRepository) {}

  async create(dto: CreateModifierDTO, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Creating modifier ${dto.code}`);

    const modifier = await this.modifiersRepository.createModifier(dto, tx);

    this.logger.log(
      `Created modifier ${modifier.modifier_id} with code ${modifier.code}`,
    );

    return modifier;
  }

  async findOne(
    codeOrModifierId: string | { modifier_id: string },
    activeOnly = true,
    tx?: Prisma.TransactionClient,
  ) {
    const identifier =
      typeof codeOrModifierId === 'string'
        ? codeOrModifierId
        : codeOrModifierId.modifier_id;

    this.logger.debug(`Finding modifier ${identifier}`);

    const modifier =
      typeof codeOrModifierId === 'string' && !isUUID(identifier)
        ? await this.modifiersRepository.findOneModifierByCode(
            identifier,
            activeOnly,
            tx,
          )
        : await this.modifiersRepository.findOneModifierByUID(
            identifier,
            activeOnly,
            tx,
          );

    assertExists(modifier, 'Modifier', identifier, this.logger);

    // Where it's offered, so a client can see what a change or deactivation touches.
    const uses = await this.modifiersRepository.findUses(
      modifier.modifier_id,
      tx,
    );

    this.logger.log(
      `Found modifier ${modifier.modifier_id} on ${uses.length} menu items`,
    );
    return { ...modifier, menu_item_modifiers_modifier: uses };
  }

  async findAll(
    {
      page,
      limit,
      status,
      search,
      brand_id,
      sortBy,
      sortOrder,
    }: FindAllModifiersDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(
      `Listing modifiers: page=${page}, limit=${limit}, status=${status}, brand=${brand_id ?? 'any'}, search=${search ? 'yes' : 'no'}, sort=${sortBy ? `${sortBy} ${sortOrder ?? 'asc'}` : 'default'}`,
    );

    const skip = (page - 1) * limit;
    assertValidPagination(skip, this.logger);

    const { modifiers, counts } = await this.modifiersRepository.findAll(
      skip,
      limit,
      { status, search, brand_id, sortBy, sortOrder },
      tx,
    );
    const total = counts[status];

    this.logger.log(
      `Listed modifiers: page=${page}, returned=${modifiers.length}, total=${total}`,
    );

    return {
      data: modifiers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        counts,
      },
    };
  }

  async update(
    modifierId: string,
    dto: UpdateModifierDTO,
    tx?: Prisma.TransactionClient,
  ) {
    this.logger.debug(`Updating modifier ${modifierId}`);

    const modifier = await this.modifiersRepository.findOneModifierByUID(
      modifierId,
      true,
      tx,
    );
    assertExists(modifier, 'Modifier', modifierId, this.logger);

    const updated = await this.modifiersRepository.updateModifier(
      modifier.modifier_id,
      dto,
      tx,
    );

    this.logger.log(`Updated modifier ${modifier.modifier_id}`);
    return updated;
  }

  async reactivate(modifierId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Reactivating modifier ${modifierId}`);

    const modifier = await this.modifiersRepository.findOneModifierByUID(
      modifierId,
      false,
      tx,
    );
    assertExists(modifier, 'Modifier', modifierId, this.logger);

    if (modifier.is_active) {
      this.logger.debug(`Modifier ${modifierId} is already active.`);

      throw new ConflictException({
        code: 'MODIFIER_ALREADY_ACTIVE',
        message: 'Modifier is still active',
      });
    }

    const reactivated = await this.modifiersRepository.reactivateModifier(
      modifier.modifier_id,
      tx,
    );

    this.logger.log(`Reactivated modifier ${modifier.modifier_id}`);
    return reactivated;
  }

  async delete(modifierId: string, tx?: Prisma.TransactionClient) {
    this.logger.debug(`Deactivating modifier ${modifierId}`);

    const modifier = await this.modifiersRepository.findOneModifierByUID(
      modifierId,
      true,
      tx,
    );
    assertExists(modifier, 'Modifier', modifierId, this.logger);

    const deleted = await this.modifiersRepository.deleteModifier(
      modifier.modifier_id,
      tx,
    );

    this.logger.log(`Deactivated modifier ${modifier.modifier_id}`);
    return deleted;
  }
}
