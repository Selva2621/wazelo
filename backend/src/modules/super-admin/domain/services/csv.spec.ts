import { buildCsvExport, CSV_EXPORT_MAX_ROWS, csvCell, csvFilename, maskSecretKeys, toCsv, UTF8_BOM } from './csv';

describe('csvCell', () => {
  it('leaves plain values alone and blanks null/undefined', () => {
    expect(csvCell('Acme')).toBe('Acme');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(true)).toBe('true');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('writes dates as ISO strings and objects as JSON', () => {
    expect(csvCell(new Date('2026-10-10T12:00:00Z'))).toBe('2026-10-10T12:00:00.000Z');
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('quotes cells with commas, quotes or line breaks and doubles inner quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('a\r\nb')).toBe('"a\r\nb"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('\tx')).toBe("'\tx");
    expect(csvCell('\rx')).toBe("\"'\rx\"");
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
  });

  it('does not prefix real numbers, even negative ones', () => {
    expect(csvCell(-5)).toBe('-5');
  });

  it('keeps Unicode text as is', () => {
    expect(csvCell('வணக்கம்')).toBe('வணக்கம்');
  });
});

describe('toCsv', () => {
  it('writes a BOM, a header row and CRLF-separated rows', () => {
    const csv = toCsv([{ n: 'A', v: 1 }, { n: 'B, Inc', v: 2 }], [
      { header: 'Name', value: (r) => r.n },
      { header: 'Value', value: (r) => r.v },
    ]);
    expect(csv).toBe(`${UTF8_BOM}Name,Value\r\nA,1\r\n"B, Inc",2\r\n`);
  });

  it('writes only the header for no rows', () => {
    expect(toCsv([], [{ header: 'Name', value: () => '' }])).toBe(`${UTF8_BOM}Name\r\n`);
  });
});

describe('maskSecretKeys', () => {
  it('masks values under secret-looking keys at any depth and keeps the rest', () => {
    expect(
      maskSecretKeys({
        before: { name: 'Pro', password: 'x' },
        after: { name: 'Pro+', items: [{ apiKey: 'k', id: 1 }] },
        totpSecret: 's',
        refreshToken: null,
      }),
    ).toEqual({
      before: { name: 'Pro', password: '[redacted]' },
      after: { name: 'Pro+', items: [{ apiKey: '[redacted]', id: 1 }] },
      totpSecret: '[redacted]',
      refreshToken: null,
    });
  });

  it('passes primitives through', () => {
    expect(maskSecretKeys('a')).toBe('a');
    expect(maskSecretKeys(3)).toBe(3);
    expect(maskSecretKeys(null)).toBeNull();
  });
});

describe('csvFilename', () => {
  it('appends the UTC date', () => {
    expect(csvFilename('organizations', new Date('2026-10-10T23:30:00Z'))).toBe('organizations-2026-10-10.csv');
  });
});

describe('buildCsvExport', () => {
  const columns = [{ header: 'N', value: (r: number) => r }];

  it('is not truncated at or under the cap', () => {
    const rows = Array.from({ length: CSV_EXPORT_MAX_ROWS }, (_, i) => i);
    const out = buildCsvExport('x', rows, columns);
    expect(out.truncated).toBe(false);
    expect(out.csv.trimEnd().split('\r\n')).toHaveLength(CSV_EXPORT_MAX_ROWS + 1);
  });

  it('drops the probe row and flags truncation over the cap', () => {
    const rows = Array.from({ length: CSV_EXPORT_MAX_ROWS + 1 }, (_, i) => i);
    const out = buildCsvExport('x', rows, columns, new Date('2026-01-02T00:00:00Z'));
    expect(out.truncated).toBe(true);
    expect(out.filename).toBe('x-2026-01-02.csv');
    expect(out.csv.trimEnd().split('\r\n')).toHaveLength(CSV_EXPORT_MAX_ROWS + 1);
  });
});
