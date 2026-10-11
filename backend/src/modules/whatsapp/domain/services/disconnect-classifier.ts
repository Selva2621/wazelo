/**
 * Maps a Baileys disconnect status code to what the platform should do next.
 * Pure — no I/O — so it can be unit-tested and shared by the connection
 * manager and the session-event use case.
 *
 * Codes (Baileys DisconnectReason): 401 loggedOut, 403 forbidden,
 * 408 connectionLost/timedOut, 411 multideviceMismatch, 428 connectionClosed,
 * 440 connectionReplaced, 500 badSession, 503 unavailableService, 515 restartRequired.
 */

export type DisconnectReasonKind =
  | 'RESTART'
  | 'NETWORK'
  | 'LOGGED_OUT'
  | 'BANNED'
  | 'REPLACED'
  | 'BAD_SESSION';

export type DisconnectAction =
  /** Reconnect right away (normal right after a QR scan) */
  | 'reconnect_now'
  /** Reconnect with exponential backoff via the health queue */
  | 'reconnect_backoff'
  /** Never reconnect automatically — the user has to act */
  | 'stop';

export interface DisconnectDecision {
  reason: DisconnectReasonKind;
  action: DisconnectAction;
  /** Stored credentials are dead and must be wiped (new QR scan needed) */
  clearCreds: boolean;
  /** Short, user-facing explanation */
  message: string;
}

export function classifyDisconnect(statusCode: number | undefined): DisconnectDecision {
  switch (statusCode) {
    case 515:
      return {
        reason: 'RESTART',
        action: 'reconnect_now',
        clearCreds: false,
        message: 'WhatsApp asked for a restart',
      };
    case 401:
      return {
        reason: 'LOGGED_OUT',
        action: 'stop',
        clearCreds: true,
        message: 'Logged out from the phone, or the number was restricted by WhatsApp',
      };
    case 403:
      return {
        reason: 'BANNED',
        action: 'stop',
        clearCreds: true,
        message: 'WhatsApp blocked this number',
      };
    case 440:
      return {
        reason: 'REPLACED',
        action: 'stop',
        clearCreds: false,
        message: 'This WhatsApp number was opened in another session',
      };
    case 411:
    case 500:
      return {
        reason: 'BAD_SESSION',
        action: 'stop',
        clearCreds: true,
        message: 'Saved WhatsApp session is invalid — scan the QR code again',
      };
    default:
      return {
        reason: 'NETWORK',
        action: 'reconnect_backoff',
        clearCreds: false,
        message: `Connection lost${statusCode ? ` (code ${statusCode})` : ''}`,
      };
  }
}

/** Reasons that mean the number itself is gone and queued work must be held. */
export function isNumberLost(reason: string | null | undefined): boolean {
  return reason === 'LOGGED_OUT' || reason === 'BANNED';
}
