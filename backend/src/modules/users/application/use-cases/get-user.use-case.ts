import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { User } from '@prisma/client';

@Injectable()
export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    userId: string,
    orgId: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findByIdAndOrg(userId, orgId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
