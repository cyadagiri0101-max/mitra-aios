import { Controller, Get, Post, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EngineeringOutboxRelayService } from '../services/engineering-outbox-relay.service';
import { OutboxService } from '../../platform/services/outbox.service';

@ApiTags('engineering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engineering/outbox')
export class EngineeringOutboxController {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly relayService: EngineeringOutboxRelayService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:outbox:read')
  @ApiOperation({ summary: 'List outbox messages (status/eventType filter)' })
  async list(@Query() q: Record<string, any>) {
    return this.outboxService.findAll(q);
  }

  @Post('relay')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:outbox:retry')
  @HttpCode(200)
  @ApiOperation({ summary: 'Relay pending outbox messages to the event bus' })
  async relay(@Query('maxRows') maxRows?: string) {
    return this.relayService.relay(Number(maxRows ?? 100));
  }

  @Post('retry')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGEMENT')
  @Permissions('engineering:outbox:retry')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-arm FAILED messages and relay again' })
  async retry(@Query('maxRows') maxRows?: string) {
    return this.relayService.retryAndRelay(Number(maxRows ?? 100));
  }
}
