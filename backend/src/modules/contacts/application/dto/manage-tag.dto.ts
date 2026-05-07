import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class AddTagDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Tag name must only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color code (e.g. #FF5733)',
  })
  color?: string;
}
