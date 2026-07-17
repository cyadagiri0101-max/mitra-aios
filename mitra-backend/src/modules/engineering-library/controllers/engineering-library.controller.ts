import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { EngineeringLibraryService } from '../services/engineering-library.service';

@ApiTags('engineering-library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ekl')
export class EngineeringLibraryController {
  constructor(private readonly service: EngineeringLibraryService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    return this.service.search(query ?? '');
  }

  @Get('projects')
  async listProjects() {
    return this.service.listProjects();
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string) {
    return this.service.getProject(id);
  }

  @Get('documents')
  async listDocuments() {
    return this.service.listDocuments();
  }

  @Get('documents/:id')
  async getDocument(@Param('id') id: string) {
    return this.service.getDocument(id);
  }

  @Get('dashboard/widgets')
  async getDashboardWidgets() {
    return this.service.getDashboardWidgets();
  }

  @Post('sync')
  async synchronize() {
    return this.service.synchronize();
  }

  @Get('sync/status')
  async syncStatus() {
    return this.service.getSyncStatus();
  }
}
