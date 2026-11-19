import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

/** GET /contacts/pipeline-meta?ids=a,b,c — one pipeline column's cards at a time */
export class PipelineMetaQueryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  ids!: string[];
}
