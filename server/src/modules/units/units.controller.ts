import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Authenticated } from '../auth/auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { Audit } from '../../shared/audit/audit.decorator';
import { CreateUnitDTO } from './dto/create-unit.dto';
import { FindUnitsDTO } from './dto/find-units.dto';
import { UpdateUnitDTO } from './dto/update-unit.dto';
import { UnitsService } from './units.service';
import {
  CreateUnitDocs,
  DeleteUnitDocs,
  FindAllUnitsDocs,
  FindOneUnitDocs,
  UnitsDocs,
  UpdateUnitDocs,
} from './docs/units.docs';

@Controller('units')
@UnitsDocs()
@UseGuards(Authenticated, RolesGuard)
@Roles(
  UserRole.SUPERADMIN,
  UserRole.RECIPE_MANAGER,
  UserRole.SUPERVISOR,
  UserRole.KITCHEN_HEAD,
  UserRole.INVENTORY_STAFF,
  UserRole.KITCHEN_STAFF,
)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Audit({ action: 'UNIT_CREATED', entity: 'units' })
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  @CreateUnitDocs()
  create(@Body() dto: CreateUnitDTO) {
    return this.unitsService.create(dto);
  }

  @Get()
  @FindAllUnitsDocs()
  findAll(@Query() query: FindUnitsDTO) {
    return this.unitsService.findAll(query);
  }

  @Get(':code')
  @FindOneUnitDocs()
  findOne(@Param('code') code: string) {
    return this.unitsService.findOne(code);
  }

  @Patch(':code')
  @Audit({ action: 'UNIT_UPDATED', entity: 'units' })
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  @UpdateUnitDocs()
  update(@Param('code') code: string, @Body() dto: UpdateUnitDTO) {
    return this.unitsService.update(code, dto);
  }

  @Delete(':code')
  @Audit({ action: 'UNIT_DELETED', entity: 'units' })
  @Roles(UserRole.SUPERADMIN, UserRole.RECIPE_MANAGER)
  @DeleteUnitDocs()
  delete(@Param('code') code: string) {
    return this.unitsService.delete(code);
  }
}
