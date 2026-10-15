import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WhatsAppLinkTokenService } from './whatsapp-link-token.service';

describe('WhatsAppLinkTokenService', () => {
  const jwt = new JwtService({});
  const config = { getOrThrow: () => 'test-refresh-secret' } as unknown as ConfigService;
  const service = new WhatsAppLinkTokenService(jwt, config);
  const payload = { sessionId: 's1', userId: 'u1', orgId: 'o1' };

  it('round-trips a signed link', async () => {
    const token = await service.sign(payload);
    await expect(service.verify(token)).resolves.toEqual(payload);
  });

  it('rejects a tampered token', async () => {
    const token = await service.sign(payload);
    await expect(service.verify(`${token.slice(0, -2)}xx`)).resolves.toBeNull();
  });

  it('rejects a token signed with the plain refresh secret (other token types)', async () => {
    const token = await jwt.signAsync(
      { sid: 's1', sub: 'u1', org: 'o1', typ: 'wa_link' },
      { secret: 'test-refresh-secret' },
    );
    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await service.sign(payload);
    jest.useFakeTimers().setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    try {
      await expect(service.verify(token)).resolves.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
