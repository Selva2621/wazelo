import {
  cloudTemplateFromMetadata,
  countTemplateParams,
  renderCloudTemplate,
  templateNeedsHeaderImage,
} from './cloud-template';

const tpl = {
  name: 'villa_welcome',
  language: 'en',
  components: [
    { type: 'HEADER', format: 'IMAGE' },
    { type: 'BODY', text: 'Hi {{1}}, thanks for asking about {{2}}. Call {{1}} back?' },
  ],
};

describe('cloud-template', () => {
  it('counts the numbered slots and spots an image header', () => {
    expect(countTemplateParams(tpl)).toBe(2);
    expect(templateNeedsHeaderImage(tpl)).toBe(true);
    expect(countTemplateParams({ name: 'x', language: 'en', components: [] })).toBe(0);
  });

  it('fills each slot through the variable filler, and the text body too', () => {
    const fill = (s: string) => s.replace('{{name}}', 'Priya');
    const { body, cloudTemplate } = renderCloudTemplate(tpl, ['{{name}}', 'Villa plots'], fill, 'https://x/img.jpg');
    expect(cloudTemplate).toEqual({
      name: 'villa_welcome',
      language: 'en',
      params: ['Priya', 'Villa plots'],
      headerImageUrl: 'https://x/img.jpg',
    });
    expect(body).toBe('Hi Priya, thanks for asking about Villa plots. Call Priya back?');
  });

  it('never sends an empty parameter (Meta rejects those)', () => {
    const { cloudTemplate } = renderCloudTemplate(tpl, ['  '], (s) => s);
    expect(cloudTemplate.params).toEqual(['-', '-']);
  });

  it('reads the ref back from message metadata', () => {
    expect(cloudTemplateFromMetadata({ cloudTemplate: { name: 'a', language: 'ta', params: [1, 'b'] } })).toEqual({
      name: 'a',
      language: 'ta',
      params: ['1', 'b'],
    });
    expect(cloudTemplateFromMetadata({ campaignId: 'c' })).toBeNull();
    expect(cloudTemplateFromMetadata(null)).toBeNull();
  });
});
