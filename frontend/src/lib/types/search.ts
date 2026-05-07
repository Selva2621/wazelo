export interface SearchContactResult {
  id: string;
  name: string | null;
  phoneNumber: string;
  email: string | null;
  leadStatus: string;
  source: string;
}

export interface SearchConversationResult {
  id: string;
  contactId: string | null;
  contactPhone: string;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  status: string;
}

export interface SearchCampaignResult {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
}

export interface SearchResponse {
  contacts: SearchContactResult[];
  conversations: SearchConversationResult[];
  campaigns: SearchCampaignResult[];
}
