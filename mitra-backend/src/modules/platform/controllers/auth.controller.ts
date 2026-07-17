import {
  Controller, Post, Body, Get, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '@common/decorators/current-user.decorator';
import { AUTH_LOGIN_THROTTLE } from '@common/config/throttle.config';

// ── Inline DTOs (auth module owns its own validation) ─────────────────────
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({ example: 'admin@mitra.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'YourPassword123!' })
  @IsString()
  @MinLength(4)
  password: string;
}

class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  lastName: string;
  // tenantId intentionally removed from RegisterDto — tenant assignment is
  // always derived from the authenticated ADMIN's own tenantId, never from
  // client-supplied data. This prevents an ADMIN from Tenant A registering
  // a user into Tenant B's namespace.
}

class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  newPassword: string;
}

class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: AUTH_LOGIN_THROTTLE })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login — 10 attempts per 15 min per IP' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token for new access token' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Current user profile' })
  async me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.id, body.oldPassword, body.newPassword);
  }

  // ── ADMIN-ONLY — prevents anyone from self-registering ──────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user — ADMIN role required' })
  async register(
    @Body() body: RegisterDto,
    @CurrentUser() creator: AuthUser,
  ) {
    // Force the new user into the same tenant as the ADMIN who is registering them.
    return this.authService.register({ ...body, tenantId: creator.tenantId ?? undefined });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — invalidates the stored refresh token' })
  async logout(@CurrentUser() user: AuthUser) {
    await this.authService.logout(user.id);
  }
}
