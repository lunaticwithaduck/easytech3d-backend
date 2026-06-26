import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { bearer } from '../customer/auth.controller';
import { AuthService } from '../customer/auth.service';
import { CheckoutDto } from './checkout.dto';
import { CheckoutService } from './checkout.service';
import type { ShippingMethodInfo, ShopOrder } from './checkout.types';

@ApiTags('checkout')
@Controller()
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly auth: AuthService,
  ) {}

  @Get('checkout/shipping-methods')
  shippingMethods(@Query('subtotal') subtotal?: string): ShippingMethodInfo[] {
    const n = Number.parseInt(subtotal ?? '0', 10);
    return this.checkout.getShippingMethods(Number.isFinite(n) ? n : 0);
  }

  @Post('checkout')
  async create(
    @Body() dto: CheckoutDto,
    @Headers('authorization') authz?: string,
  ): Promise<ShopOrder> {
    // Link the order to the customer if a valid session is present (guest checkout otherwise).
    const customerId = await this.auth.customerIdFromToken(bearer(authz));
    return this.checkout.checkout(dto, customerId);
  }

  @Get('orders/:id')
  async order(
    @Param('id') id: string,
    @Headers('authorization') authz?: string,
  ): Promise<ShopOrder> {
    // Resolve the caller (if any) so customer-linked orders enforce ownership.
    const requesterId = await this.auth.customerIdFromToken(bearer(authz));
    return this.checkout.getOrder(id, requesterId);
  }
}
