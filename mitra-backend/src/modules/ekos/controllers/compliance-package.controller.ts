import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CompliancePackageService } from '../services/compliance-package.service';
import { GenerateCompliancePackageDto } from '../dto/compliance-package.dto';

@ApiTags('compliance-packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/compliance/packages')
export class CompliancePackageController {
  constructor(
    private readonly complianceService: CompliancePackageService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a governed, tamper-evident compliance audit package' })
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING')
  async generatePackage(
    @Body() dto: GenerateCompliancePackageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.complianceService.generatePackage(
      dto,
      user.tenantId || '',
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get compliance evidence package by ID' })
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING', 'PLANNING')
  async getPackageById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.complianceService.getPackageById(
      id,
      user.tenantId || '',
    );
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export structured audit manifest and evidence items' })
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING')
  async exportPackage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.complianceService.exportPackage(
      id,
      user.tenantId || '',
    );
  }

  @Get(':id/integrity')
  @ApiOperation({ summary: 'Verify cryptographic SHA-256 package integrity' })
  @Roles('ADMIN', 'MANAGEMENT', 'QUALITY', 'ENGINEERING')
  async verifyIntegrity(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.complianceService.verifyPackageIntegrity(
      id,
      user.tenantId || '',
    );
  }
}
