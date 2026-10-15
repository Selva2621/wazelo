import { fillContactPlaceholders } from './sequence-step.worker';

describe('fillContactPlaceholders', () => {
  const contact = { name: 'Ravi Kumar', phoneNumber: '+919876543210', email: 'ravi@example.com' };

  it('uses the first name for {{name}}', () => {
    expect(fillContactPlaceholders('Hi {{name}}!', contact)).toBe('Hi Ravi!');
  });

  it('fills phone, email and the contact.* forms', () => {
    expect(fillContactPlaceholders('{{contact.name}} / {{ phone }} / {{email}}', contact)).toBe(
      'Ravi / +919876543210 / ravi@example.com',
    );
  });

  it('falls back to "there" when the contact has no name', () => {
    expect(fillContactPlaceholders('Hi {{name}},', { ...contact, name: null })).toBe('Hi there,');
  });

  it('leaves other placeholders alone', () => {
    expect(fillContactPlaceholders('{{lead.service}}', contact)).toBe('{{lead.service}}');
  });
});
