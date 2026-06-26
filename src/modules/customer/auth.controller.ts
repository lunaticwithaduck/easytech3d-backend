import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './customer.dto';
import type { AuthResponse, SafeCustomer } from './customer.types';

export function bearer(authz?: string): string | undefined {
  return authz?.startsWith('Bearer ') ? authz.slice(7) : undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @Post('logout')
  async logout(@Headers('authorization') authz?: string): Promise<{ ok: true }> {
    await this.auth.logout(bearer(authz));
    return { ok: true };
  }

  @Get('me')
  async me(@Headers('authorization') authz?: string): Promise<SafeCustomer> {
    const customer = await this.auth.customerFromToken(bearer(authz));
    if (!customer) throw new UnauthorizedException();
    return customer;
  }
}
