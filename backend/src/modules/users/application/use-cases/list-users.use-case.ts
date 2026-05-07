import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { User } from '@prisma/client';

export interface ListUsersResult {
  users: Omit<User, 'passwordHash'>[];
  total: number;
  take: number;
  skip: number;
}

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    orgId: string,
    query: ListUsersQueryDto,
  ): Promise<ListUsersResult> {
    const { users, total } = await this.userRepository.findByOrgIdPaginated(
      orgId,
      {
        take: query.take,
        skip: query.skip,
        role: query.role,
        status: query.status,
        search: query.search,
      },
    );

    // Strip password hashes from response
    const sanitized = users.map(({ passwordHash, ...rest }) => rest);

    return {
      users: sanitized as Omit<User, 'passwordHash'>[],
      total,
      take: query.take ?? 50,
      skip: query.skip ?? 0,
    };
  }
}
