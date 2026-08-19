import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { DispatchService } from '../services/dispatch.service';
import { CreateDispatchPlanDto, UpdateDispatchPlanDto, TransitionDispatchPlanDto } from '../dto/dispatch.dto';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly svc: DispatchService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN','MANAGEMENT','SALES','DESIGN','PLANNING','PRODUCTION','QUALITY')
  @ApiOperation({ summary: 'List all dispatch plans' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.svc.findAll(user.tenantId ?? 'default');
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN','MANAGEMENT','SALES','DESIGN','PLANNING','PRODUCTION','QUALITY')
  @ApiOperation({ summary: 'Get a dispatch plan by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.findOne(id, user.tenantId ?? 'default');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN','MANAGEMENT')
  @Permissions('project:transition')
  @ApiOperation({ summary: 'Create dispatch plan' })
  create(@Body() dto: CreateDispatchPlanDto, @CurrentUser() user: AuthUser) {
    return this.svc.create(dto, user.id, user.tenantId ?? 'default');
  }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles('ADMIN','MANAGEMENT','SALES','PRODUCTION','QUALITY')
  @Permissions('project:transition')
  @ApiOperation({ summary: 'Transition dispatch status (PACK, SHIP, DELIVER, CANCEL)' })
  transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDispatchPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.transition(id, user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN','MANAGEMENT')
  @Permissions('project:transition','dispatch:release')
  @ApiOperation({ summary: 'Update dispatch status / tracking' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDispatchPlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.update(id, dto, user.id, user.tenantId ?? 'default');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft-delete dispatch plan' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.remove(id, user.id, user.tenantId ?? 'default');
  }
}
