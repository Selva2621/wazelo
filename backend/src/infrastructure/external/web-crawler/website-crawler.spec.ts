import { extractPage, normalizeUrl } from './website-crawler';

describe('normalizeUrl', () => {
  it('drops hash, tracking params and trailing slash', () => {
    expect(normalizeUrl('https://shop.in/menu/?utm_source=fb&id=2#top')?.toString()).toBe('https://shop.in/menu?id=2');
  });

  it('resolves relative links and rejects non-http', () => {
    expect(normalizeUrl('/about', new URL('https://shop.in/x'))?.toString()).toBe('https://shop.in/about');
    expect(normalizeUrl('mailto:a@b.in')).toBeNull();
    expect(normalizeUrl('javascript:void(0)')).toBeNull();
  });
});

describe('extractPage', () => {
  const html = `<html><head><title>Bloom Bakery | Delivery</title><script>var x=1</script></head>
    <body><nav>Home Menu About</nav><main><h1>Delivery</h1><p>We deliver within 5 km of Anna Nagar.</p>
    <ul><li>Cakes</li><li>Cookies</li></ul><a href="/menu">Menu</a></main><footer>© 2026</footer></body></html>`;

  it('keeps main content as lines, drops nav/footer/scripts', () => {
    const page = extractPage(html, new URL('https://bloom.in/delivery'));
    expect(page.title).toBe('Bloom Bakery | Delivery');
    expect(page.text).toContain('We deliver within 5 km of Anna Nagar.');
    expect(page.text).toContain('Cakes\nCookies');
    expect(page.text).not.toMatch(/var x|© 2026|Home Menu About/);
    expect(page.links).toContain('/menu');
  });

  it('does not glue words across <br> and inline tags', () => {
    const page = extractPage(
      '<body><main><h1>WhatsApp CRM for<br>freelancers</h1><p><span>Fast</span><span>setup</span> in <b>4</b>steps</p></main></body>',
      new URL('https://x.in'),
    );
    expect(page.text).toContain('WhatsApp CRM for\nfreelancers');
    expect(page.text).toContain('Fast setup in 4 steps');
  });
});
