import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, Matches } from 'class-validator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { WhatsappVerificationUseCase } from '../../application/use-cases/whatsapp-verification.use-case';

class ConfirmWhatsappCodeDto {
  @IsString()
  @Matches(/^\s*\d{6}\s*$/, { message: 'Enter the 6-digit code' })
  code: string;
}

/** Confirm your own WhatsApp number with a code from Wazelo (optional, at onboarding) */
@Controller('users/me/whatsapp/verification')
export class WhatsappVerificationController {
  constructor(private readonly verification: WhatsappVerificationUseCase) {}

  @Get()
  async status(@CurrentUser() user: JwtPayload) {
    return this.verification.status(user.sub);
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async send(@CurrentUser() user: JwtPayload) {
    return this.verification.send(user.sub);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async confirm(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmWhatsappCodeDto) {
    return this.verification.confirm(user.sub, dto.code);
  }
}
