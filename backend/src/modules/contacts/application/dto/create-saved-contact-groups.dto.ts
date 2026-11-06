import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
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

  /** Contacts per group (default: one campaign batch, 100) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000)
  groupSize?: number;

  /** one = a single group with this name; split = groups of groupSize named "<name> N" */
  @IsOptional()
  @IsIn(["one", "split"])
  mode?: "one" | "split";

  /** Leave contacts already in a group where they are (default in the app) */
  @IsOptional()
  @IsBoolean()
  onlyUngrouped?: boolean;
}

export class SplitSavedContactGroupsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000)
  groupSize?: number;

  /** Groups are named "<prefix> 1", "<prefix> 2"… (default "Group") */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  prefix?: string;

  /** one = all ungrouped contacts into a single group named `prefix` */
  @IsOptional()
  @IsIn(["one", "split"])
  mode?: "one" | "split";
}

export class CheckSavedGroupMoveDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10_000)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  contactIds: string[];

  @IsOptional()
  @IsUUID("4")
  groupId?: string;
}

export class MoveSavedGroupContactsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10_000)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  contactIds: string[];

  /** Target group; null removes the contacts from every group */
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  groupId: string | null;
}

export class RenameSavedContactGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
