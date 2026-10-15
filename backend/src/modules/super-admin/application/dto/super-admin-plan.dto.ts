import { IsIn, IsOptional } from 'class-validator';
import { UpdatePlanDto } from '@/modules/billing/application/dto/update-plan.dto';

export const PLAN_EDIT_MODES = ['apply_to_all', 'new_version'] as const;
export type PlanEditMode = (typeof PLAN_EDIT_MODES)[number];

/** Super admin plan edit. `mode` is required once the plan has live subscribers. */
export class SuperAdminUpdatePlanDto extends UpdatePlanDto {
  @IsOptional()
  @IsIn(PLAN_EDIT_MODES)
  mode?: PlanEditMode;
}
