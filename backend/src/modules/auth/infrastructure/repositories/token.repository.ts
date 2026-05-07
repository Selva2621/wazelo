import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { VerificationToken, TokenType } from '@prisma/client';

@Injectable()
export class TokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    token: string;
    type: TokenType;
    expiresAt: Date;
  }): Promise<VerificationToken> {
    return this.prisma.verificationToken.create({ data });
  }

  async findValidToken(
    token: string,
    type: TokenType,
  ): Promise<VerificationToken | null> {
    return this.prisma.verificationToken.findFirst({
      where: {
        token,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markUsed(tokenId: string): Promise<VerificationToken> {
    return this.prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllForUser(
    userId: string,
    type: TokenType,
  ): Promise<number> {
    const result = await this.prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    return result.count;
  }

  async countRecentTokens(
    userId: string,
    type: TokenType,
    since: Date,
  ): Promise<number> {
    return this.prisma.verificationToken.count({
      where: {
        userId,
        type,
        createdAt: { gte: since },
      },
    });
  }

  async findMostRecentToken(
    userId: string,
    type: TokenType,
  ): Promise<VerificationToken | null> {
    return this.prisma.verificationToken.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
  }
}
