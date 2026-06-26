import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ShippingAddressDto {
  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  postalCode!: string;

  @IsString()
  @MinLength(1)
  address1!: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  province?: string;
}

export class CheckoutDto {
  @IsString()
  @MinLength(1)
  cartId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @MinLength(3)
  phone!: string;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsEnum(['ECONT', 'SPEEDY'])
  shippingMethod!: 'ECONT' | 'SPEEDY';

  @IsOptional()
  @IsEnum(['ADDRESS', 'OFFICE'])
  deliveryType?: 'ADDRESS' | 'OFFICE';

  @IsOptional()
  @IsString()
  officeCode?: string;

  @IsOptional()
  @IsString()
  officeName?: string;

  @IsEnum(['COD', 'CARD'])
  paymentMethod!: 'COD' | 'CARD';
}
