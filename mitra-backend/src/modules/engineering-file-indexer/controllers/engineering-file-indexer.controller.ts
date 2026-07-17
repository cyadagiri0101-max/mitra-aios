import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { EngineeringFileIndexerService } from '../services/engineering-file-indexer.service';

@ApiTags('engineering-file-indexer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering-file-indexer')
export class EngineeringFileIndexerController {
  constructor(private readonly service: EngineeringFileIndexerService) {}

  @Post('scan')
  async scan(@Query('toolNo') toolNo?: string, @CurrentUser() user?: AuthUser) {
    return this.service.scanAndIndex(user?.tenantId ?? undefined, { toolNo });
  }

  @Get('browse')
  async browse(
    @Query('toolNo') toolNo?: string,
    @Query('itemType') itemType?: 'folder' | 'file',
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.browse(user?.tenantId ?? undefined, toolNo, itemType);
  }
}

@ApiTags('engineering-file-index')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering-file-index')
export class EngineeringFileIndexController {
  constructor(private readonly service: EngineeringFileIndexerService) {}

  @Get()
  async list(
    @Query('toolNo') toolNo?: string,
    @Query('itemType') itemType?: 'folder' | 'file',
    @CurrentUser() user?: AuthUser,
  ) {
    return this.service.browse(user?.tenantId ?? undefined, toolNo, itemType);
  }
}
