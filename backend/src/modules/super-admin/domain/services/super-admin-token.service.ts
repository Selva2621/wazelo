import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdmin } from '@prisma/client';
import type { StringValue } from 'ms';

@Injectable()
export class SuperAdminTokenService {
  private readonly accessSecret: string;
  private readonly accessExpiry: StringValue;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('jwt.superAdminSecret');
    this.accessExpiry = this.configService.get<StringValue>('jwt.accessExpiry', '15m');
  }

  async generateToken(superAdmin: SuperAdmin): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: superAdmin.id,
        email: superAdmin.email,
        orgId: '',
        role: '',
        isSuperAdmin: true,
      },
      { secret: this.accessSecret, expiresIn: this.accessExpiry },
    );
  }
}
