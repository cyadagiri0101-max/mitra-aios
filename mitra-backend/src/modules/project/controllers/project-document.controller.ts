import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ProjectDocumentService } from '../services/project-document.service';
import {
  CreateProjectDocumentDto, UpdateProjectDocumentDto, CreateProjectFolderDto,
  ReleaseProjectDocumentDto, DocumentQueryDto,
  UploadProjectDocumentDto, UploadProjectDocumentVersionDto,
} from '../dto/project-document.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { MinioService } from '../../storage/minio.service';

const DOCUMENT_READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('project-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/documents')
export class ProjectDocumentController {
  constructor(
    private readonly service: ProjectDocumentService,
    private readonly minio: MinioService,
  ) {}

  // ── Folders ────────────────────────────────────────────────────────────────

  @Get('/folders')
  @UseGuards(RolesGuard)
  @Roles(...DOCUMENT_READ_ROLES)
  @Permissions('project:document:read')
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
  @UseGuards(RolesGuard)
  @Roles(...DOCUMENT_READ_ROLES)
  @Permissions('project:document:read')
  @ApiOperation({ summary: 'List project documents (paginated, filtered)' })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() q: DocumentQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findByProject(projectId, q, user.tenantId ?? undefined);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...DOCUMENT_READ_ROLES)
  @Permissions('project:document:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @Get(':id/versions')
  @UseGuards(RolesGuard)
  @Roles(...DOCUMENT_READ_ROLES)
  @Permissions('project:document:read')
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
  @Post('upload')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document file to storage and register it (multipart)' })
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UploadProjectDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) return { error: 'file is required' };
    const upload = await this.minio.uploadFile(
      file.buffer, file.originalname, file.mimetype, 'mitra-documents', `projects/${projectId}`,
    );
    return this.service.create(projectId, dto, {
      fileName: upload.originalName,
      filePath: upload.key,
      mimeType: upload.contentType,
      fileSize: upload.sizeBytes,
      checksum: upload.checksumSha256,
    }, user.id, user.email, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'QUALITY')
  @Permissions('project:document:update')
  @Post(':id/versions/upload')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new version of a document (multipart)' })
  async uploadVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadProjectDocumentVersionDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) return { error: 'file is required' };
    const doc = await this.service.findOne(id, user.tenantId ?? undefined);
    const upload = await this.minio.uploadFile(
      file.buffer, file.originalname, file.mimetype, 'mitra-documents', `projects/${doc.projectId}/documents/${id}`,
    );
    return this.service.uploadVersion(id, {
      fileName: upload.originalName,
      filePath: upload.key,
      mimeType: upload.contentType,
      fileSize: upload.sizeBytes,
      checksum: upload.checksumSha256,
    }, user.id, dto.notes ?? null, user.tenantId);
  }

  @Get(':id/download')
  @UseGuards(RolesGuard)
  @Roles(...DOCUMENT_READ_ROLES)
  @Permissions('project:document:read')
  @ApiOperation({ summary: 'Get a signed download link for the current version' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.download(id, undefined, user.tenantId ?? undefined);
  }

  @Get(':id/versions/:versionNumber/download')
  @UseGuards(RolesGuard)
  @Roles(...DOCUMENT_READ_ROLES)
  @Permissions('project:document:read')
  @ApiOperation({ summary: 'Get a signed download link for a specific version' })
  async downloadVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.download(id, parseInt(versionNumber, 10), user.tenantId ?? undefined);
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
