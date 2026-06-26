import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddItemDto, UpdateItemDto } from './cart.dto';
import type { ShopCart } from './cart.types';

@ApiTags('cart')
@Controller('carts')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Post()
  create(): Promise<ShopCart> {
    return this.cart.create();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ShopCart> {
    return this.cart.get(id);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddItemDto): Promise<ShopCart> {
    return this.cart.addItem(id, dto.variantId, dto.quantity);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ): Promise<ShopCart> {
    return this.cart.updateItem(id, itemId, dto.quantity);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string): Promise<ShopCart> {
    return this.cart.removeItem(id, itemId);
  }
}
