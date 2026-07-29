import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { QuotationService } from '../services/quotation.service';
import { CreateQuotationDto, UpdateQuotationDto, AcceptQuotationDto, RejectQuotationDto } from '../dto/quotation.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ProjectService } from '../../project/services/project.service';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/quotations')
export class QuotationController {
  constructor(
    private readonly service: QuotationService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List quotations (paginated)' })
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAllWithItems(user.tenantId, q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quotation with items' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOneWithItems(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create quotation from RFQ' })
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createFromRfq(dto, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Patch(':id')
  @ApiOperation({ summary: 'Update quotation' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send quotation to customer' })
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.sendQuotation(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept quotation and create project' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    const { quotation, projectData } = await this.service.acceptQuotation(id, dto, user.id, user.tenantId);

    // Create project from accepted quotation
    const project = await this.projectService.create(
      {
        ...projectData,
        name: dto.projectName,
        customerName: dto.customerName ?? projectData.customerName ?? 'Unknown Customer',
        productName: dto.productName ?? projectData.productName ?? dto.projectName,
        moldType: 'INJECTION',
      },
      user.id,
      user.tenantId,
    );

    // Link project back to quotation
    await this.service.linkProject(id, project.id, user.id, user.tenantId);

    return {
      quotation: { ...quotation, projectId: project.id, status: 'ACCEPTED' },
      project: { id: project.id, projectNumber: project.projectNumber, name: project.name },
    };
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject quotation' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectQuotationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.rejectQuotation(id, dto, user.id, user.tenantId);
  }
}
