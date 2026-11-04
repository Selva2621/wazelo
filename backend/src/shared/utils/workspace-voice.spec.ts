import { inWorkspaceVoice } from './workspace-voice';
import { CONSENT_THANKS, FOLLOW_UP_MESSAGE, NOT_FOUND_MESSAGE } from '@/modules/widget/domain/services/website-chat';

// Stock chatbot settings defaults (prisma BotSettings.handoffMessage / afterHoursMessage)
const HANDOFF_DEFAULT = 'Thanks! Someone from our team will reply to you here shortly.';
const AFTER_HOURS_DEFAULT = "Thanks! Our team is offline right now and will reply when we're back.";

describe('inWorkspaceVoice', () => {
  // If one of these lines is reworded, its first-person version must be updated too
  it.each([CONSENT_THANKS, FOLLOW_UP_MESSAGE, NOT_FOUND_MESSAGE, HANDOFF_DEFAULT, AFTER_HOURS_DEFAULT])(
    'has a first-person version for a freelancer: %s',
    (line) => {
      const solo = inWorkspaceVoice(line, 'FREELANCER');
      expect(solo).not.toBe(line);
      expect(solo).not.toMatch(/\b(we|our team|we're|we'll)\b/i);
    },
  );

  it('leaves team workspaces and text a user wrote unchanged', () => {
    expect(inWorkspaceVoice(FOLLOW_UP_MESSAGE, 'TEAM')).toBe(FOLLOW_UP_MESSAGE);
    expect(inWorkspaceVoice('Back at 9 tomorrow!', 'FREELANCER')).toBe('Back at 9 tomorrow!');
  });
});
