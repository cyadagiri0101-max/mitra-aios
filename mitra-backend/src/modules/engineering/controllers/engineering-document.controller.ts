import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringDocumentService } from '../services/engineering-document.service';
import {
  CreateEngineeringDocumentDto, DocumentVersionDto, EngineeringQueryDto,
} from '../dto/engineering.dto';
import { ENGINEERING_READ_ROLES, ENGINEERING_WRITE_ROLES } from '../engineering.constants';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/documents')
export class EngineeringDocumentController {
  constructor(private readonly service: EngineeringDocumentService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:document:read')
  @ApiOperation({ summary: 'List engineering documents (pagination, filter by docType/status)' })
  async findAll(@Query() q: EngineeringQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAllAdvanced(user.tenantId, q as unknown as Record<string, any>);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:document:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Get(':id/versions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_READ_ROLES)
  @Permissions('engineering:document:read')
  async listVersions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.listVersions(id, user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:document:create')
  @ApiOperation({ summary: 'Create document (number auto-generated EDOC-YYYY-####)' })
  async create(@Body() dto: CreateEngineeringDocumentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as unknown as Record<string, any>, user.id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:document:update')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, body, user.id, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:document:delete')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @Post(':id/versions')
  @UseGuards(RolesGuard)
  @Roles(...ENGINEERING_WRITE_ROLES)
  @Permissions('engineering:document:version')
  @ApiOperation({ summary: 'Add immutable version to a document' })
  async addVersion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DocumentVersionDto, @CurrentUser() user: AuthUser) {
    return this.service.addVersion(id, dto as unknown as Record<string, any>, user.id, user.tenantId);
  }
}
