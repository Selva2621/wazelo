import { Injectable } from '@nestjs/common';

/**
 * CSAT surveys are sent manually by agents via POST /csat/send.
 * There is no automatic trigger on conversation close — agents decide
 * when to send the survey based on the conversation context.
 */
@Injectable()
export class CsatEventsHandler {}
