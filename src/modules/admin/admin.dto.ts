import { IsEnum } from 'class-validator';

export class OrderStatusDto {
  @IsEnum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'FULFILLED'])
  status!: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'FULFILLED';
}

export class QuoteStatusDto {
  @IsEnum(['NEW', 'QUOTED', 'ACCEPTED', 'REJECTED'])
  status!: 'NEW' | 'QUOTED' | 'ACCEPTED' | 'REJECTED';
}
