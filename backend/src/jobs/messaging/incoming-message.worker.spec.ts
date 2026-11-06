import { AuditAction, MessageDirection, MessageStatus } from "@prisma/client";
import { EVENT_NAMES } from "@/common/constants";
import { IncomingMessageWorker, IncomingMessageJobData } from "./incoming-message.worker";

describe("IncomingMessageWorker", () => {
  it("persists messages sent from the linked phone as outbound without running inbound workflows", async () => {
    const conversation = { id: "conversation-1", unreadCount: 2, assignedToId: null };
    const message = { id: "message-1" };
    const dependencies = {
      queueService: { publishOnce: jest.fn() },
      messageRepo: {
        findByWhatsAppMessageId: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(message),
        setWhatsAppMessageId: jest.fn().mockResolvedValue(undefined),
      },
      conversationRepo: {
        findOrCreate: jest.fn().mockResolvedValue(conversation),
        updateLastMessage: jest.fn().mockResolvedValue(undefined),
      },
      messageEventRepo: { record: jest.fn().mockResolvedValue(undefined) },
      sessionRepo: {
        findById: jest.fn().mockResolvedValue({ orgId: "org-1", userId: "user-1" }),
        updateHeartbeat: jest.fn().mockResolvedValue(undefined),
      },
      auditService: { log: jest.fn().mockResolvedValue(undefined) },
      eventEmitter: { emit: jest.fn() },
      prisma: {},
      autoCreateContact: {
        execute: jest.fn().mockResolvedValue({ contactId: "contact-1" }),
      },
    };
    const worker = new IncomingMessageWorker(
      dependencies.queueService as never,
      dependencies.messageRepo as never,
      dependencies.conversationRepo as never,
      dependencies.messageEventRepo as never,
      dependencies.sessionRepo as never,
      dependencies.auditService as never,
      dependencies.eventEmitter as never,
      dependencies.prisma as never,
      dependencies.autoCreateContact as never,
    );
    const data: IncomingMessageJobData = {
      sessionId: "session-1",
      whatsappMessageId: "wa-message-1",
      contactPhone: "+15551234567",
      type: "TEXT",
      body: "Sent from WhatsApp",
      timestamp: 1_794_000_000,
      fromMe: true,
    };

    await (
      worker as unknown as {
        handle: (jobData: IncomingMessageJobData, jobId: string) => Promise<void>;
      }
    ).handle(data, "job-1");

    expect(dependencies.messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ direction: MessageDirection.OUTBOUND }),
    );
    expect(dependencies.messageEventRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: MessageStatus.SENT }),
    );
    expect(dependencies.conversationRepo.updateLastMessage).toHaveBeenCalledWith(
      "conversation-1",
      "Sent from WhatsApp",
      false,
    );
    expect(dependencies.queueService.publishOnce).not.toHaveBeenCalled();
    expect(dependencies.eventEmitter.emit).toHaveBeenCalledWith(
      EVENT_NAMES.WHATSAPP_MESSAGE_SYNCED,
      expect.objectContaining({ messageId: "message-1" }),
    );
    expect(dependencies.eventEmitter.emit).not.toHaveBeenCalledWith(
      EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED,
      expect.anything(),
    );
    expect(dependencies.auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.WHATSAPP_MESSAGE_SENT }),
    );
  });
});
