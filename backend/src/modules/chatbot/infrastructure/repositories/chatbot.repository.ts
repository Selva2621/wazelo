import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ChatbotSessionStatus } from '@prisma/client';

@Injectable()
export class ChatbotRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ───── Flows ─────

  async createFlow(data: {
    orgId: string;
    name: string;
    description?: string;
    trigger: Record<string, unknown>;
    nodes?: { type: string; data: Record<string, unknown>; position: Record<string, unknown>; nextNodes: unknown[] }[];
    aiEnabled?: boolean;
    aiSystemPrompt?: string;
    useKnowledgeBase?: boolean;
  }) {
    return this.prisma.chatbotFlow.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        description: data.description || null,
        trigger: data.trigger as any,
        aiEnabled: data.aiEnabled ?? false,
        aiSystemPrompt: data.aiSystemPrompt,
        useKnowledgeBase: data.useKnowledgeBase ?? false,
        nodes: data.nodes
          ? { create: data.nodes.map((n) => ({ type: n.type, data: n.data as any, position: n.position as any, nextNodes: n.nextNodes as any })) }
          : undefined,
      },
      include: { nodes: true },
    });
  }

  async findFlowsByOrg(orgId: string) {
    return this.prisma.chatbotFlow.findMany({
      where: { orgId, deletedAt: null },
      include: { nodes: true, _count: { select: { sessions: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findFlowById(id: string, orgId: string) {
    return this.prisma.chatbotFlow.findFirst({
      where: { id, orgId, deletedAt: null },
      include: { nodes: true },
    });
  }

  async updateFlow(id: string, data: {
    name?: string;
    description?: string;
    trigger?: Record<string, unknown>;
    isActive?: boolean;
    aiEnabled?: boolean;
    aiSystemPrompt?: string;
    useKnowledgeBase?: boolean;
  }) {
    return this.prisma.chatbotFlow.update({
      where: { id },
      data: data as any,
      include: { nodes: true },
    });
  }

  async deleteFlow(id: string) {
    return this.prisma.chatbotFlow.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ───── Nodes ─────

  async upsertNodes(flowId: string, nodes: { id?: string; type: string; data: Record<string, unknown>; position: Record<string, unknown>; nextNodes: unknown[] }[]) {
    // Delete existing nodes and recreate
    await this.prisma.chatbotNode.deleteMany({ where: { flowId } });
    if (nodes.length === 0) return [];
    return this.prisma.chatbotNode.createMany({
      data: nodes.map((n) => ({
        id: n.id || undefined,
        flowId,
        type: n.type,
        data: n.data as any,
        position: n.position as any,
        nextNodes: n.nextNodes as any,
      })),
    });
  }

  // ───── Sessions ─────

  async findActiveSession(orgId: string, conversationId: string) {
    return this.prisma.chatbotSession.findFirst({
      where: {
        orgId,
        conversationId,
        status: ChatbotSessionStatus.ACTIVE,
      },
      include: { flow: { include: { nodes: true } } },
    });
  }

  async createSession(data: {
    flowId: string;
    orgId: string;
    contactId: string;
    conversationId: string;
    currentNodeId: string;
  }) {
    return this.prisma.chatbotSession.create({
      data: {
        flowId: data.flowId,
        orgId: data.orgId,
        contactId: data.contactId,
        conversationId: data.conversationId,
        currentNodeId: data.currentNodeId,
      },
    });
  }

  async updateSession(id: string, data: {
    currentNodeId?: string;
    variables?: Record<string, unknown>;
    status?: ChatbotSessionStatus;
    completedAt?: Date;
  }) {
    return this.prisma.chatbotSession.update({
      where: { id },
      data: data as any,
    });
  }

  async findActiveFlowByTrigger(orgId: string, triggerType: string, triggerValue?: string) {
    const flows = await this.prisma.chatbotFlow.findMany({
      where: { orgId, isActive: true, deletedAt: null },
      include: { nodes: true },
    });

    return flows.find((flow) => {
      const trigger = flow.trigger as { type: string; value?: string };
      if (trigger.type !== triggerType) return false;
      if (triggerType === 'KEYWORD' && triggerValue) {
        const keywords = (trigger.value || '').toLowerCase().split(',').map((k) => k.trim());
        return keywords.includes(triggerValue.toLowerCase());
      }
      if (triggerType === 'BUTTON_REPLY' && triggerValue) {
        const buttonIds = (trigger.value || '').split(',').map((k) => k.trim().toLowerCase());
        return buttonIds.includes(triggerValue.toLowerCase());
      }
      return true;
    });
  }

  async getFlowAnalytics(flowId: string, orgId: string) {
    const [total, completed, abandoned, handedOff] = await Promise.all([
      this.prisma.chatbotSession.count({ where: { flowId, orgId } }),
      this.prisma.chatbotSession.count({ where: { flowId, orgId, status: 'COMPLETED' } }),
      this.prisma.chatbotSession.count({ where: { flowId, orgId, status: 'ABANDONED' } }),
      this.prisma.chatbotSession.count({ where: { flowId, orgId, status: 'HANDED_OFF' } }),
    ]);

    return {
      total,
      completed,
      abandoned,
      handedOff,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
