import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';
import { AiAction } from '@/modules/billing/domain/services/ai-actions';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';
import { KbAnswerService } from '@/modules/ai/application/services/kb-answer.service';
import { ChatbotRepository } from '../../infrastructure/repositories/chatbot.repository';
import { KbRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb.repository';
import { DocumentProcessorService } from '@/modules/knowledge-base/domain/services/document-processor.service';
import { OutboundMessageService } from '@/modules/messages/application/services/outbound-message.service';
import { EVENT_NAMES } from '@/common/constants';
import { ChatbotSessionStatus } from '@prisma/client';
import { KbMissRepository } from '@/modules/knowledge-base/infrastructure/repositories/kb-miss.repository';
import { BotBehaviorService, HandoffReason } from '../services/bot-behavior.service';
import { wantsHuman } from '../../domain/services/handoff-intent';
import { sanitizePromptInput, UNTRUSTED_DATA_RULE, wrapUntrusted } from '@/common/utils/prompt-sanitizer.util';
import { checkReply } from '@/modules/ai/domain/services/reply-guard';

/** Used when the flow has no prompt of its own. */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful, professional customer support agent. You have access to product documentation that may cover multiple products.

IMPORTANT RULES:
- Identify which product the customer is asking about from their message.
- Answer ONLY using information from the product documentation provided. Do not make up information.
- If the documentation covers multiple products, use only the relevant product's information.
- If you cannot find the answer in the documentation, say: "I don't have specific information about that. Let me connect you with a human agent who can help."
- Keep responses concise (under 150 words), friendly, and professional.
- If the customer hasn't specified a product and you have docs for multiple products, ask which product they need help with.`;

interface FlowNode {
  id: string;
  type: string;
  data: Record<string, any>;
  nextNodes: { condition?: string; nodeId: string }[];
}

const MAX_NODE_DEPTH = 20;

/**
 * The model's reply as the customer should see it: the transcript we send labels
 * lines "Agent:" / "Customer:", and models often echo that label back.
 */
function cleanReply(text: string | undefined): string {
  return (text ?? '').trim().replace(/^(agent|assistant|business)\s*:\s*/i, '').trim();
}

@Injectable()
export class ExecuteChatbotFlowUseCase {
  private readonly logger = new Logger(ExecuteChatbotFlowUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatbotRepo: ChatbotRepository,
    private readonly kbRepo: KbRepository,
    private readonly docProcessor: DocumentProcessorService,
    private readonly aiProvider: AiProviderService,
    private readonly outboundMessage: OutboundMessageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usageTracking: UsageTrackingService,
    private readonly aiCredits: AiCreditsService,
    private readonly messageCrypto: MessageEncryptionService,
    private readonly kbAnswer: KbAnswerService,
    private readonly kbMisses: KbMissRepository,
    private readonly botBehavior: BotBehaviorService,
  ) {}

  /**
   * Plan, super admin override and kill switch all decide — same check as the AI
   * endpoints — and the org must have the AI credits for the action.
   */
  private async aiAllowed(orgId: string, action: AiAction): Promise<boolean> {
    return (await this.usageTracking.isFeatureEnabled(orgId, 'ai')) && this.aiCredits.canAfford(orgId, action);
  }

  /**
   * Execute a chatbot flow for an incoming message.
   * If the flow has aiEnabled, it uses AI to generate a reply.
   * Otherwise, it walks through nodes (SEND_MESSAGE, AI_REPLY, etc.)
   */
  async execute(payload: {
    orgId: string;
    conversationId: string;
    contactId: string;
    contactPhone: string;
    sessionId: string; // WhatsApp session
    messageBody: string;
    messageType: string;
  }) {
    const { orgId, conversationId, contactId, contactPhone, sessionId, messageBody, messageType } = payload;

    // 1. Check for existing active chatbot session
    const session = await this.chatbotRepo.findActiveSession(orgId, conversationId);

    if (session) {
      // The message answers the running flow: handled, even when the flow just ends
      await this.resumeSession(session, payload);
      return { replied: true };
    }

    // 2. Find matching flow by trigger
    // Try KEYWORD first, then BUTTON_REPLY (for interactive messages), then FIRST_MESSAGE
    let flow = await this.chatbotRepo.findActiveFlowByTrigger(orgId, 'KEYWORD', messageBody);
    if (!flow && messageType === 'button_reply') {
      flow = await this.chatbotRepo.findActiveFlowByTrigger(orgId, 'BUTTON_REPLY', messageBody);
    }
    if (!flow) {
      flow = await this.chatbotRepo.findActiveFlowByTrigger(orgId, 'FIRST_MESSAGE');
    }

    if (!flow) {
      this.logger.debug(`No chatbot flow matched for org ${orgId} (conversation ${conversationId})`);
      return null;
    }

    // 3. If AI-enabled flow, use AI to reply directly
    if (flow.aiEnabled) {
      return this.executeAiReply(flow, payload);
    }

    // 4. Otherwise, start node-based flow
    const nodes = flow.nodes as unknown as FlowNode[];
    if (nodes.length === 0) return null;

    // Find the first node (node not referenced by any other node's nextNodes)
    const referencedIds = new Set(nodes.flatMap((n) => n.nextNodes.map((nn) => nn.nodeId)));
    const startNode = nodes.find((n) => !referencedIds.has(n.id)) || nodes[0];

    // Create session
    const newSession = await this.chatbotRepo.createSession({
      flowId: flow.id,
      orgId,
      contactId,
      conversationId,
      currentNodeId: startNode.id,
    });

    // Execute the start node
    await this.executeNode(startNode, nodes, newSession.id, payload, 0);
    // Tells the message pipeline the chatbot handled it, so automations don't reply too
    return { replied: true };
  }

  /**
   * AI-enabled flow: builds conversation context and calls AI provider.
   */
  private async executeAiReply(
    flow: { id: string; aiSystemPrompt: string | null; aiEnabled: boolean; useKnowledgeBase?: boolean },
    payload: { orgId: string; conversationId: string; contactId: string; contactPhone: string; sessionId: string; messageBody: string },
  ) {
    const { orgId, conversationId, contactPhone, sessionId, messageBody } = payload;

    // Someone on the team is handling this chat (they replied, or the bot handed over)
    if (await this.botBehavior.isPaused(conversationId, orgId)) {
      this.logger.debug(`AI flow ${flow.id} quiet: conversation ${conversationId} is with the team`);
      return null;
    }

    // Customer asked for a person: hand over (no AI needed, so no credits)
    if (wantsHuman(messageBody)) {
      return this.handOff(orgId, conversationId, contactPhone, sessionId, 'ASKED_FOR_PERSON');
    }

    // No AI on the plan, switched off, or out of credits: stay quiet so a person replies
    if (!(await this.aiAllowed(orgId, 'chatbot_reply'))) {
      this.logger.log(`AI flow ${flow.id} skipped — AI not enabled or no AI credits left for org ${orgId}`);
      return null;
    }

    // Build conversation context from last 20 messages (bodies are encrypted at rest)
    const messages = this.messageCrypto.decryptBodies(
      await this.prisma.message.findMany({
        where: { conversationId, orgId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { direction: true, body: true, type: true, createdAt: true },
      }),
    );

    // Each message is cleaned on its own, so "ignore previous instructions" is caught
    // at the start of a message, not hidden behind the "Customer:" label
    const chat = messages.reverse().map((m) => ({
      inbound: m.direction === 'INBOUND',
      body: m.body ? sanitizePromptInput(m.body, 1000) : `[${m.type}]`,
    }));
    const context = chat.map((m) => `${m.inbound ? 'Customer' : 'Agent'}: ${m.body}`).join('\n');
    const teamText = chat.filter((m) => !m.inbound).map((m) => m.body).join('\n');
    const customerText = [contactPhone, ...chat.filter((m) => m.inbound).map((m) => m.body)].join('\n');

    // Knowledge on: answer from the org's website pages, documents, articles and profile
    // (the same answers the widget and inbox KB search give)
    if (flow.useKnowledgeBase) {
      const kb = await this.kbAnswer.answer({
        orgId,
        question: messageBody,
        conversation: context,
        flowId: flow.id,
        instructions: flow.aiSystemPrompt,
        teamText,
      });
      if (kb.blocked) {
        return this.handOff(orgId, conversationId, contactPhone, sessionId, 'REPLY_BLOCKED');
      }
      if (kb.answer && kb.found) {
        await this.botBehavior.answered(conversationId);
        return this.sendAiReply(orgId, conversationId, contactPhone, sessionId, kb.answer);
      }

      // Not in the knowledge: log it for the owner, and after two in a row let a person take over
      await this.kbMisses
        .record(orgId, messageBody, 'WHATSAPP', conversationId)
        .catch((err) => this.logger.warn(`Couldn't log unanswered question: ${(err as Error).message}`));
      if (await this.botBehavior.missed(conversationId)) {
        return this.handOff(orgId, conversationId, contactPhone, sessionId, 'UNANSWERED');
      }
      if (kb.answer) {
        // The polite "I'll check with the team" reply
        return this.sendAiReply(orgId, conversationId, contactPhone, sessionId, kb.answer);
      }
      // Nothing to answer from: fall through to a conversation-only reply
    }

    const systemPrompt = `${flow.aiSystemPrompt || DEFAULT_SYSTEM_PROMPT}\n\n${UNTRUSTED_DATA_RULE}`;
    const userPrompt = `Conversation so far:\n${wrapUntrusted('conversation', context)}\n\nReply to the customer's latest message as the agent:`;

    const result = await this.aiProvider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 500,
    });

    const reply = cleanReply(result.text);
    if (reply) {
      const check = checkReply({
        reply,
        // The business's own prompt may hold facts the bot should repeat, so only our fixed text counts as a leak
        ownInstructions: `${flow.aiSystemPrompt ? '' : DEFAULT_SYSTEM_PROMPT}\n${UNTRUSTED_DATA_RULE}`,
        trustedText: `${flow.aiSystemPrompt ?? ''}\n${teamText}`,
        customerText,
      });
      if (!check.ok) {
        this.logger.warn(`AI reply blocked in conversation ${conversationId}: ${check.reason}`);
        return this.handOff(orgId, conversationId, contactPhone, sessionId, 'REPLY_BLOCKED');
      }
    }

    return this.sendAiReply(orgId, conversationId, contactPhone, sessionId, reply);
  }

  /** Tells the customer a person will reply (or when, after hours) and pauses the bot in the chat. */
  private async handOff(
    orgId: string,
    conversationId: string,
    contactPhone: string,
    sessionId: string,
    reason: HandoffReason,
  ) {
    const text = await this.botBehavior.handOff(orgId, conversationId, reason);
    await this.sendReply(orgId, conversationId, contactPhone, sessionId, text);
    return { replied: true, text };
  }

  /** Cleans, charges and sends an AI reply; null when the AI produced nothing. */
  private async sendAiReply(
    orgId: string,
    conversationId: string,
    contactPhone: string,
    sessionId: string,
    text: string | undefined,
  ) {
    const replyText = cleanReply(text);
    if (!replyText) {
      this.logger.warn(`AI returned empty reply for conversation ${conversationId}`);
      return null;
    }
    await this.aiCredits.charge(orgId, 'chatbot_reply');

    // Send the AI reply as a WhatsApp message
    const { messageId } = await this.sendReply(orgId, conversationId, contactPhone, sessionId, replyText);

    this.eventEmitter.emit(EVENT_NAMES.CHATBOT_AI_REPLY_SENT, {
      orgId,
      conversationId,
      messageId,
    });

    this.logger.log(`AI chatbot replied in conversation ${conversationId} (${replyText.length} chars)`);
    return { replied: true, text: replyText };
  }

  /**
   * Resume an existing chatbot session — process the customer's response.
   */
  private async resumeSession(
    session: any,
    payload: { orgId: string; conversationId: string; contactId: string; contactPhone: string; sessionId: string; messageBody: string },
  ) {
    const flow = session.flow;
    if (!flow) return null;

    // If AI-enabled, just do AI reply
    if (flow.aiEnabled) {
      return this.executeAiReply(flow, payload);
    }

    const nodes = flow.nodes as unknown as FlowNode[];
    const currentNode = nodes.find((n) => n.id === session.currentNodeId);
    if (!currentNode) {
      await this.chatbotRepo.updateSession(session.id, { status: ChatbotSessionStatus.COMPLETED, completedAt: new Date() });
      return null;
    }

    // If current node is ASK_QUESTION, store the answer and move to next
    if (currentNode.type === 'ASK_QUESTION') {
      const variables = (session.variables as Record<string, unknown>) || {};
      const varName = currentNode.data.variableName || 'lastAnswer';
      variables[varName as string] = payload.messageBody;
      await this.chatbotRepo.updateSession(session.id, { variables });

      // Move to next node
      const nextNodeRef = currentNode.nextNodes[0];
      if (nextNodeRef) {
        const nextNode = nodes.find((n) => n.id === nextNodeRef.nodeId);
        if (nextNode) {
          await this.chatbotRepo.updateSession(session.id, { currentNodeId: nextNode.id });
          await this.executeNode(nextNode, nodes, session.id, payload, 0);
          return;
        }
      }

      // No next node — complete session
      await this.chatbotRepo.updateSession(session.id, { status: ChatbotSessionStatus.COMPLETED, completedAt: new Date() });
      return;
    }

    // For other node types, try to advance
    const nextNodeRef = currentNode.nextNodes[0];
    if (nextNodeRef) {
      const nextNode = nodes.find((n) => n.id === nextNodeRef.nodeId);
      if (nextNode) {
        await this.chatbotRepo.updateSession(session.id, { currentNodeId: nextNode.id });
        await this.executeNode(nextNode, nodes, session.id, payload, 0);
      }
    }
  }

  /**
   * Execute a single node and advance to the next.
   * depth guards against infinite loops in misconfigured flows.
   */
  private async executeNode(
    node: FlowNode,
    allNodes: FlowNode[],
    sessionId: string,
    payload: { orgId: string; conversationId: string; contactPhone: string; sessionId: string; contactId?: string; messageBody?: string },
    depth: number,
  ) {
    if (depth >= MAX_NODE_DEPTH) {
      this.logger.warn(`Max node depth (${MAX_NODE_DEPTH}) reached for session ${sessionId} at node ${node.id}. Completing session.`);
      await this.chatbotRepo.updateSession(sessionId, {
        status: ChatbotSessionStatus.COMPLETED,
        completedAt: new Date(),
      });
      return;
    }

    const { orgId, conversationId, contactPhone, sessionId: waSessionId } = payload;

    // Fetch current session variables for interpolation
    const sessionData = await this.prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      select: { variables: true },
    });
    const variables = (sessionData?.variables as Record<string, unknown>) || {};

    switch (node.type) {
      case 'SEND_MESSAGE': {
        const message = node.data.message as string;
        if (message) {
          const { messageId } = await this.sendReply(orgId, conversationId, contactPhone, waSessionId, this.interpolate(message, variables));
          this.eventEmitter.emit(EVENT_NAMES.CHATBOT_FLOW_TRIGGERED, {
            orgId,
            conversationId,
            messageId,
          });
        }
        // Auto-advance to next node
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
        break;
      }

      case 'AI_REPLY': {
        // Without AI on the plan (or credits) the step is skipped and the flow carries on
        if (!(await this.aiAllowed(orgId, 'chatbot_reply'))) {
          await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
          break;
        }
        const systemPrompt = (node.data.systemPrompt as string) ||
          'You are a helpful customer support agent. Reply concisely.';
        const maxTokens = (node.data.maxTokens as number) || 500;

        const messages = this.messageCrypto.decryptBodies(
          await this.prisma.message.findMany({
            where: { conversationId, orgId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { direction: true, body: true, type: true },
          }),
        );

        const context = messages
          .reverse()
          .map((m) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body || `[${m.type}]`}`)
          .join('\n');

        const result = await this.aiProvider.complete({
          systemPrompt,
          userPrompt: `Conversation:\n${context}\n\nReply as the agent:`,
          maxTokens,
        });

        const nodeReply = cleanReply(result.text);
        if (nodeReply) {
          await this.aiCredits.charge(orgId, 'chatbot_reply');
          await this.sendReply(orgId, conversationId, contactPhone, waSessionId, nodeReply);
        }
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
        break;
      }

      case 'ASK_QUESTION': {
        const question = node.data.question as string;
        if (question) {
          await this.sendReply(orgId, conversationId, contactPhone, waSessionId, this.interpolate(question, variables));
        }
        // Wait for customer response — don't advance
        await this.chatbotRepo.updateSession(sessionId, { currentNodeId: node.id });
        break;
      }

      case 'ASSIGN_AGENT': {
        // Hand off to human agent
        await this.chatbotRepo.updateSession(sessionId, {
          status: ChatbotSessionStatus.HANDED_OFF,
          completedAt: new Date(),
        });
        break;
      }

      case 'CONDITION': {
        const field = node.data.field as string;
        const operator = node.data.operator as string;
        const value = node.data.value as string;
        const fieldValue = String(variables[field] || '').toLowerCase();
        const compareValue = (value || '').toLowerCase();

        let matched = false;
        if (operator === 'equals') matched = fieldValue === compareValue;
        else if (operator === 'contains') matched = fieldValue.includes(compareValue);
        else if (operator === 'not_equals') matched = fieldValue !== compareValue;

        // Find matching branch
        const matchingNext = node.nextNodes.find((nn) => {
          if (matched && (!nn.condition || nn.condition === 'true')) return true;
          if (!matched && nn.condition === 'false') return true;
          return false;
        }) || node.nextNodes[0];

        if (matchingNext) {
          const nextNode = allNodes.find((n) => n.id === matchingNext.nodeId);
          if (nextNode) {
            await this.chatbotRepo.updateSession(sessionId, { currentNodeId: nextNode.id });
            await this.executeNode(nextNode, allNodes, sessionId, payload, depth + 1);
          }
        }
        break;
      }

      case 'DELAY': {
        // TODO: implement proper async delay via pg-boss scheduled job
        this.logger.warn(`DELAY node in session ${sessionId}: delay of ${node.data.seconds ?? 5}s is not implemented — advancing immediately.`);
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
        break;
      }

      case 'SET_TAG': {
        // Tag the contact — fire event and advance
        const tagName = node.data.tagName as string;
        if (tagName) {
          this.eventEmitter.emit(EVENT_NAMES.CHATBOT_FLOW_TRIGGERED, {
            orgId,
            conversationId,
            action: 'SET_TAG',
            tagName,
            contactId: payload.contactId,
          });
        }
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
        break;
      }

      case 'API_CALL': {
        const url = node.data.url as string;
        const method = ((node.data.method as string) || 'GET').toUpperCase();
        const responseVar = (node.data.responseVar as string) || '';

        if (url) {
          try {
            let headers: Record<string, string> = {};
            if (node.data.headers) {
              headers = typeof node.data.headers === 'string'
                ? JSON.parse(node.data.headers)
                : (node.data.headers as Record<string, string>);
            }

            const fetchOptions: RequestInit = { method, headers };
            if (['POST', 'PUT', 'PATCH'].includes(method) && node.data.body) {
              fetchOptions.body = String(node.data.body);
              headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            }

            const res = await fetch(url, fetchOptions);
            const text = await res.text();

            if (responseVar) {
              let parsed: unknown = text;
              try { parsed = JSON.parse(text); } catch { /* use raw text */ }
              const updatedVars = { ...variables, [responseVar]: parsed };
              await this.chatbotRepo.updateSession(sessionId, { variables: updatedVars });
            }
          } catch (err) {
            this.logger.warn(`API_CALL node failed for url "${url}": ${err.message}`);
          }
        }
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
        break;
      }

      case 'INTENT_DETECT': {
        // Use AI to classify intent from customer message, then route to matching branch
        const intents = (node.data.intents as string[]) || [];
        const defaultNextRef = node.nextNodes.find((nn) => nn.condition === 'default') || node.nextNodes[0];

        // Without AI on the plan (or credits) every message takes the default branch
        if (intents.length === 0 || !payload.messageBody || !(await this.aiAllowed(orgId, 'intent'))) {
          if (defaultNextRef) {
            const nextNode = allNodes.find((n) => n.id === defaultNextRef.nodeId);
            if (nextNode) {
              await this.chatbotRepo.updateSession(sessionId, { currentNodeId: nextNode.id });
              await this.executeNode(nextNode, allNodes, sessionId, payload, depth + 1);
            }
          }
          break;
        }

        const intentListStr = intents.map((intent, i) => `${i + 1}. ${intent}`).join('\n');
        const result = await this.aiProvider.complete({
          systemPrompt: 'You classify customer messages into predefined intents. Reply with ONLY the intent name, nothing else.',
          userPrompt: `Customer message: "${payload.messageBody}"\n\nPossible intents:\n${intentListStr}\n\nWhich intent best matches? Reply with only the intent name.`,
          maxTokens: 50,
        });

        const detectedIntent = result.text?.trim().toLowerCase() || '';
        if (detectedIntent) await this.aiCredits.charge(orgId, 'intent');
        // Find the branch matching detected intent
        const matchingBranch =
          node.nextNodes.find((nn) => nn.condition && detectedIntent.includes(nn.condition.toLowerCase())) ||
          defaultNextRef;

        if (matchingBranch) {
          const nextNode = allNodes.find((n) => n.id === matchingBranch.nodeId);
          if (nextNode) {
            await this.chatbotRepo.updateSession(sessionId, { currentNodeId: nextNode.id });
            await this.executeNode(nextNode, allNodes, sessionId, payload, depth + 1);
          }
        }
        break;
      }

      case 'CAROUSEL': {
        // Send an interactive list/button message
        const items = (node.data.items as { title: string; description?: string; buttonId?: string }[]) || [];
        if (items.length > 0) {
          // Format as a numbered list for now (full interactive buttons require WA Cloud API)
          const listText = items
            .map((item, i) => `${i + 1}. *${this.interpolate(item.title, variables)}*${item.description ? `\n   ${this.interpolate(item.description, variables)}` : ''}`)
            .join('\n\n');
          const headerText = node.data.headerText as string;
          const message = headerText
            ? `${this.interpolate(headerText, variables)}\n\n${listText}`
            : listText;
          await this.sendReply(orgId, conversationId, contactPhone, waSessionId, message);
        }
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
        break;
      }

      default: {
        // Unknown node type, try to advance
        await this.advanceToNext(node, allNodes, sessionId, payload, depth + 1);
      }
    }
  }

  private async advanceToNext(
    currentNode: FlowNode,
    allNodes: FlowNode[],
    sessionId: string,
    payload: { orgId: string; conversationId: string; contactPhone: string; sessionId: string },
    depth: number,
  ) {
    const nextRef = currentNode.nextNodes[0];
    if (!nextRef) {
      await this.chatbotRepo.updateSession(sessionId, {
        status: ChatbotSessionStatus.COMPLETED,
        completedAt: new Date(),
      });
      return;
    }

    const nextNode = allNodes.find((n) => n.id === nextRef.nodeId);
    if (!nextNode) {
      await this.chatbotRepo.updateSession(sessionId, {
        status: ChatbotSessionStatus.COMPLETED,
        completedAt: new Date(),
      });
      return;
    }

    await this.chatbotRepo.updateSession(sessionId, { currentNodeId: nextNode.id });
    await this.executeNode(nextNode, allNodes, sessionId, payload, depth);
  }

  /**
   * Replace {{variableName}} placeholders with session variable values.
   */
  private interpolate(text: string, variables: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] ?? ''));
  }

  /**
   * Send a reply message via OutboundMessageService (single canonical send path).
   */
  private async sendReply(
    orgId: string,
    conversationId: string,
    contactPhone: string,
    sessionId: string,
    text: string,
  ): Promise<{ messageId: string }> {
    return this.outboundMessage.send({
      orgId,
      sessionId,
      conversationId,
      contactPhone,
      body: text,
      metadata: { source: 'chatbot' },
    });
  }
}
