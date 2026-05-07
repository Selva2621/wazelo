import { Injectable } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, IsInt, Min, Max } from 'class-validator';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { OrgContextService } from '@/modules/ai/domain/services/org-context.service';
import { sanitizePromptInput } from '@/common/utils/prompt-sanitizer.util';

export class GenerateCampaignCopyDto {
  @IsString()
  @MaxLength(500)
  goal: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  audienceDesc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  variants?: number;
}

export interface GenerateCampaignCopyResult {
  variants: string[];
}

@Injectable()
export class GenerateCampaignCopyUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly orgContext: OrgContextService,
  ) {}

  async execute(
    orgId: string,
    dto: GenerateCampaignCopyDto,
  ): Promise<GenerateCampaignCopyResult> {
    const ctx = await this.orgContext.getContext(orgId);
    const count = dto.variants ?? 3;

    const systemPrompt = ctx
      ? `${ctx}\n\n---\n\nYou are a WhatsApp marketing copywriter. Write concise, engaging WhatsApp campaign messages under 160 characters each. Use {{name}} for name personalization where natural. Return ONLY a valid JSON array of strings, no extra text.`
      : `You are a WhatsApp marketing copywriter. Write concise, engaging WhatsApp messages under 160 characters each. Use {{name}} for name personalization where natural. Return ONLY a valid JSON array of strings, no extra text.`;

    const userPrompt = [
      `Write ${count} different WhatsApp campaign messages for this goal: "${sanitizePromptInput(dto.goal, 500)}".`,
      dto.audienceDesc ? `Target audience: ${sanitizePromptInput(dto.audienceDesc, 300)}.` : '',
      dto.tone ? `Tone: ${sanitizePromptInput(dto.tone, 50)}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 512,
    });

    try {
      const match = result.text.match(/\[[\s\S]*\]/);
      if (match) {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr) && arr.length > 0 && arr.every((v) => typeof v === 'string')) {
          return { variants: arr };
        }
      }
    } catch {
      // fallback below
    }

    // Fallback: treat entire response as a single variant
    return { variants: [result.text.trim()] };
  }
}
