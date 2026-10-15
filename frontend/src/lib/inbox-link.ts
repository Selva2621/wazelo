/**
 * Link that opens a specific chat in the inbox. The inbox selects chats by
 * phone; admins and managers also need the owning team member, since their
 * inbox shows one member's conversations at a time.
 */
export function inboxChatHref(chat: {
  contactPhone: string;
  ownerUserId?: string | null;
  ownerName?: string | null;
}): string {
  const params = new URLSearchParams({ phone: chat.contactPhone });
  if (chat.ownerUserId && chat.ownerName) {
    params.set("userId", chat.ownerUserId);
    params.set("userName", chat.ownerName);
  }
  return `/inbox?${params.toString()}`;
}
