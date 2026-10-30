import { IsIn, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

export const TOUR_STATUSES = ['completed', 'skipped'] as const;
export type TourStatus = (typeof TOUR_STATUSES)[number];

/** Tour ids are short slugs defined by the app, e.g. "welcome" or "settings-billing" */
export const TOUR_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class DeviceParamDto {
  @IsUUID()
  deviceId!: string;
}

export class TourParamDto extends DeviceParamDto {
  @Matches(TOUR_ID_PATTERN)
  tourId!: string;
}

export class SaveTourProgressDto {
  @IsIn(TOUR_STATUSES)
  status!: TourStatus;

  @IsInt()
  @Min(1)
  @Max(1000)
  version!: number;
}
