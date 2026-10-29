import { maskPhone, sentBy } from './send-log';

describe('send log: who sent a message', () => {
  it('names the feature from the message metadata', () => {
    expect(sentBy({ campaignId: 'c1', batchNumber: 1 })).toBe('campaign c1');
    expect(sentBy({ sequenceId: 's1' })).toBe('sequence s1');
    expect(sentBy({ automationRuleId: 'r1', automationExecutionId: 'e1' })).toBe('automation rule r1');
    expect(sentBy({ scheduledMessageId: 'm1' })).toBe('scheduled message m1');
    expect(sentBy({ source: 'chatbot' })).toBe('chatbot');
    expect(sentBy(null)).toBe('a person (inbox/app)');
  });

  it('never writes a full phone number to the logs', () => {
    expect(maskPhone('+919876543210')).toBe('+91******3210');
    expect(maskPhone('12')).toBe('***');
  });
});
