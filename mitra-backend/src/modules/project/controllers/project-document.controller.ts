import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectDocumentService } from '../services/project-document.service';
import {
  CreateProjectDocumentDto, UpdateProjectDocumentDto, CreateProjectFolderDto,
  ReleaseProjectDocumentDto, DocumentQueryDto,
} from '../dto/project-document.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';

@ApiTags('project-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/documents')
export class ProjectDocumentController {
  constructor(private readonly service: ProjectDocumentService) {}

  // ── Folders ────────────────────────────────────────────────────────────────

  @Get('/folders')
  @ApiOperation({ summary: 'List project folders (with document counts)' })
  async folders(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findFolders(projectId, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'QUALITY')
  @Permissions('project:document:create')
  @Post('/folders')
  @HttpCode(201)
  async createFolder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectFolderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createFolder(projectId, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:document:delete')
  @Delete('/folders/:folderId')
  @HttpCode(204)
  async removeFolder(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeFolder(folderId, user.id, user.tenantId);
  }

  // ── Documents ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List project documents (paginated, filtered)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() q: DocumentQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findByProject(projectId, q, user.tenantId ?? undefined);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List document versions (newest first)' })
  async versions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.versions(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'QUALITY')
  @Permissions('project:document:create')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a document with its first version (v1)' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(
      projectId,
      dto,
      {
        fileName: dto.fileName,
        filePath: `/projects/${projectId}/documents/${dto.fileName}`,
        mimeType: dto.mimeType ?? null,
        fileSize: dto.fileSize ?? 0,
      },
      user.id,
      user.email,
      user.tenantId,
    );
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'QUALITY')
  @Permissions('project:document:update')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (dto.fileName && (dto.fileName !== undefined)) {
      const doc = await this.service.findOne(id, user.tenantId ?? undefined);
      return this.service.uploadVersion(
        id,
        {
          fileName: dto.fileName,
          filePath: `/projects/${doc.projectId}/documents/v${doc.currentVersion + 1}/${dto.fileName}`,
          mimeType: dto.mimeType ?? null,
          fileSize: dto.fileSize ?? 0,
        },
        user.id,
        dto.notes ?? null,
        user.tenantId,
      );
    }
    return this.service.update(id, dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'QUALITY')
  @Permissions('project:document:update')
  @Post(':id/release')
  @HttpCode(200)
  @ApiOperation({ summary: 'Release the current version of a document' })
  async release(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseProjectDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.release(id, dto.remarks ?? null, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:document:update')
  @Post(':id/archive')
  @HttpCode(200)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.archive(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('project:document:delete')
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }
}
