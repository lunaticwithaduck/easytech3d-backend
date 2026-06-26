import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ShopOrder } from '../checkout/checkout.types';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';
import { bearer } from './auth.controller';

@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountService,
  ) {}

  @Get('orders')
  async orders(@Headers('authorization') authz?: string): Promise<ShopOrder[]> {
    const customerId = await this.auth.customerIdFromToken(bearer(authz));
    if (!customerId) throw new UnauthorizedException();
    return this.account.getOrders(customerId);
  }
}
