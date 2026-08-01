import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { EnquiryService } from '../services/enquiry.service';
import { CreateEnquiryDto, UpdateEnquiryDto } from '../dto/enquiry.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';

@ApiTags('commercial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commercial/enquiries')
export class EnquiryController {
  constructor(private readonly service: EnquiryService) {}

  @Get()
  @ApiOperation({ summary: 'List enquiries (paginated)' })
  async findAll(
    @Query() q: PaginationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(user.tenantId, q.page, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enquiry by id' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findOne(id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create enquiry (RFQ)' })
  async create(
    @Body() dto: CreateEnquiryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto as unknown as Record<string, unknown>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY')
  @Patch(':id')
  @ApiOperation({ summary: 'Update enquiry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnquiryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto as unknown as Record<string, unknown>, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete enquiry' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/submit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit enquiry for review (DRAFT → SUBMITTED)' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.submit(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark enquiry as under review (SUBMITTED → UNDER_REVIEW)' })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.review(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel enquiry' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancel(id, user.id, user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'SALES')
  @Post(':id/lost')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark enquiry as lost' })
  async markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.markLost(id, body.reason, user.id, user.tenantId);
  }
}