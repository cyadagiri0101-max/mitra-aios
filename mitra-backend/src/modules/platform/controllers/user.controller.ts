import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.findAll(user.tenantId ?? undefined, q.page ?? 1, q.limit ?? 20);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.findOne(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  async create(
    @Body() body: CreateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    // FIX H-3: Force the new user's tenantId from the JWT payload, never
    // from the client-supplied request body. Without this, an ADMIN from
    // Tenant-A can POST { tenantId: "tenant-b-uuid" } to plant a user
    // in a different tenant, breaking multi-tenant isolation.
    return this.userService.create(
      { ...body, tenantId: user.tenantId ?? undefined },
      user.id,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.update(id, body, user.id, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.remove(id, user.id, user.tenantId);
  }
}