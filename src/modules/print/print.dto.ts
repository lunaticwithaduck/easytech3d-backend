import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CustomerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(3)
  phone!: string;

  @IsEmail()
  email!: string;
}

export class CreatePrintQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  fileNames!: string[];

  @IsInt()
  @Min(1)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number; // лв

  @IsNumber()
  @Min(0)
  totalPrice!: number; // лв

  @IsString()
  material!: string;

  @IsString()
  color!: string;

  @IsInt()
  infill!: number;

  @IsNumber()
  totalVolumeCm3!: number;

  @IsNumber()
  totalWeightG!: number;

  @IsString()
  dims!: string;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
