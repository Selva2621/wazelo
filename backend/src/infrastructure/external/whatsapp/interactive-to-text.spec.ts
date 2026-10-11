import { interactiveToText } from './interactive-to-text';

describe('interactiveToText', () => {
  it('renders buttons as numbered options', () => {
    const text = interactiveToText({
      type: 'button',
      body: 'How can we help?',
      buttons: [
        { id: 'pricing', title: 'Pricing' },
        { id: 'portfolio', title: 'Portfolio' },
      ],
      footer: 'Wazelo',
    });

    expect(text).toBe(
      'How can we help?\n\n1. Pricing\n2. Portfolio\n\nReply with the number of your choice.\n\nWazelo',
    );
  });

  it('flattens list sections into one numbered list', () => {
    const text = interactiveToText({
      type: 'list',
      header: 'Services',
      body: 'Pick one',
      sections: [
        { title: 'Web', rows: [{ title: 'Website', description: 'From ₹15k' }] },
        { title: 'Design', rows: [{ title: 'Logo' }] },
      ],
    });

    expect(text).toBe(
      'Services\n\nPick one\n\n1. Website — From ₹15k\n2. Logo\n\nReply with the number of your choice.',
    );
  });
});
