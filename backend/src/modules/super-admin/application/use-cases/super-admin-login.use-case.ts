import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcrypt';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';
import { SuperAdminLoginDto } from '../dto/super-admin-auth.dto';

@Injectable()
export class SuperAdminLoginUseCase {
  constructor(
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly tokenService: SuperAdminTokenService,
  ) {}

  async execute(dto: SuperAdminLoginDto) {
    const superAdmin = await this.superAdminRepo.findByEmail(dto.email);
    if (!superAdmin) {
      // Constant-time defense: hash anyway to prevent timing attacks
      await compare(dto.password, '$2b$12$invalidhashplaceholderfortiming000000000000000000000000');
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await compare(dto.password, superAdmin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.tokenService.generateToken(superAdmin);

    return {
      accessToken,
      superAdmin: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
      },
    };
  }
}
