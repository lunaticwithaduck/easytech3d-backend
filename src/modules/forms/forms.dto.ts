import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class NewsletterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class ContactDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  message!: string;
}

export class BackInStockDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  productHandle!: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}
