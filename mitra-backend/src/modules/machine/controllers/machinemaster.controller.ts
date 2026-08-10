import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { MachineMasterService } from '../services/machinemaster.service';
import { MachineStatus } from '../entities/machinemaster.entity';
import { BookingStatus } from '../entities/machinebooking.entity';

const CRUD_ROLES = ['ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION'];
const READ_ROLES = ['ADMIN', 'MANAGEMENT', 'SALES', 'DESIGN', 'PLANNING', 'PRODUCTION', 'QUALITY', 'CUSTOMER'];

@ApiTags('manufacturing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/machines')
export class MachineMasterController {
  constructor(private readonly service: MachineMasterService) {}

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get()
  async findAll(@Query() q: PaginationDto & { status?: MachineStatus; machineTypeId?: string }, @CurrentUser() user: AuthUser) {
    return this.service.findAll(q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...CRUD_ROLES)
  @Post()
  async create(@Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(...CRUD_ROLES)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION')
  @Patch(':id/maintenance')
  async setMaintenance(@Param('id', ParseUUIDPipe) id: string, @Body() dto: { maintenance: boolean; plannedDate?: string; remarks?: string }, @CurrentUser() user: AuthUser) {
    return this.service.setMaintenance(id, user, dto);
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id/calendars')
  async listCalendars(@Param('id', ParseUUIDPipe) id: string, @Query() q: { from?: string; to?: string }, @CurrentUser() user: AuthUser) {
    return this.service.listCalendars(id, q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING')
  @Post(':id/calendars')
  async upsertCalendar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.upsertCalendar(id, dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING')
  @Delete('calendars/:calendarId')
  @HttpCode(204)
  async deleteCalendar(@Param('calendarId', ParseUUIDPipe) calendarId: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteCalendar(calendarId, user);
  }

  // ── Bookings ─────────────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id/bookings')
  async listBookings(@Param('id', ParseUUIDPipe) id: string, @Query() q: { from?: string; to?: string; status?: BookingStatus }, @CurrentUser() user: AuthUser) {
    return this.service.listBookings({ ...q, machineId: id }, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION')
  @Post(':id/bookings')
  async createBooking(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.createBooking({ ...dto, machineId: id }, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING', 'PRODUCTION')
  @Patch('bookings/:bookingId')
  async updateBooking(@Param('bookingId', ParseUUIDPipe) bookingId: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: AuthUser) {
    return this.service.updateBooking(bookingId, dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT', 'PLANNING')
  @Delete('bookings/:bookingId')
  @HttpCode(204)
  async deleteBooking(@Param('bookingId', ParseUUIDPipe) bookingId: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteBooking(bookingId, user);
  }

  // ── Shop floor ───────────────────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id/queue')
  async queue(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.queue(id, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id/utilization')
  async utilization(@Param('id', ParseUUIDPipe) id: string, @Query() q: { from?: string; to?: string }, @CurrentUser() user: AuthUser) {
    return this.service.utilization(id, q, user.tenantId ?? undefined);
  }

  @UseGuards(RolesGuard)
  @Roles(...READ_ROLES)
  @Get(':id/next-available')
  async nextAvailable(@Param('id', ParseUUIDPipe) id: string, @Query('durationMinutes') durationMinutes: string, @CurrentUser() user: AuthUser) {
    return this.service.nextAvailable(id, Number(durationMinutes ?? 60), user.tenantId ?? undefined);
  }
}
