import { IsString, IsOptional, IsBoolean, MaxLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateResourceDto {
  @IsString()
  @IsNotEmpty({ message: 'Resource name cannot be empty' })
  @MaxLength(255, { message: 'Resource name must not exceed 255 characters' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  status?: boolean;
}
