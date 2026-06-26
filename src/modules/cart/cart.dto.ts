import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class AddItemDto {
  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity = 1;
}

export class UpdateItemDto {
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}
