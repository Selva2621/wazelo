import { extractEmails, isPublicIp, websiteSignals } from './website-email-finder';

describe('websiteSignals', () => {
  it('reads SSL, viewport, Facebook Pixel and Google Analytics', () => {
    const html = `<meta name="viewport" content="width=device-width"><script>fbq('init','1');gtag('config','G-1')</script>`;
    expect(websiteSignals(html, new URL('https://gym.in/'))).toEqual({
      https: true, mobileFriendly: true, hasPixel: true, hasAnalytics: true,
    });
    expect(websiteSignals('<html><body>Hi</body></html>', new URL('http://gym.in/'))).toEqual({
      https: false, mobileFriendly: false, hasPixel: false, hasAnalytics: false,
    });
  });
});

describe('isPublicIp', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])(
    'rejects %s',
    (ip) => expect(isPublicIp(ip)).toBe(false),
  );

  it.each(['8.8.8.8', '172.32.0.1', '2606:4700::1111'])('allows %s', (ip) => expect(isPublicIp(ip)).toBe(true));
});

describe('extractEmails', () => {
  it('drops asset filenames and builder addresses, preferring the site domain', () => {
    const html = `
      <img src="logo@2x.png">
      <a href="mailto:owner@gmail.com">mail</a>
      contact: Hello@FitZone.in. errors: abc@sentry.io
    `;
    expect(extractEmails(html, 'www.fitzone.in')).toEqual(['hello@fitzone.in', 'owner@gmail.com']);
  });
});
