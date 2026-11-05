import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateSavedContactGroupsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10_000)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  contactIds: string[];
}
