import { Injectable } from '@nestjs/common';

interface SimNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  nextNodes: { condition?: string; nodeId: string }[];
}

export interface SimulateFlowResult {
  replies: { nodeId: string; nodeType: string; message: string }[];
  stepsExecuted: number;
  variables: Record<string, unknown>;
  truncated: boolean;
}

const MAX_STEPS = 20;

@Injectable()
export class SimulateChatbotFlowUseCase {
  execute(
    flow: { nodes: unknown[] },
    messageBody: string,
  ): SimulateFlowResult {
    const nodes = flow.nodes as SimNode[];

    if (nodes.length === 0) {
      return { replies: [], stepsExecuted: 0, variables: {}, truncated: false };
    }

    const replies: { nodeId: string; nodeType: string; message: string }[] = [];
    const variables: Record<string, unknown> = {};
    let steps = 0;

    const findNode = (nodeId: string): SimNode | null => nodes.find((n) => n.id === nodeId) ?? null;
    const nextNode = (n: SimNode): SimNode | null => {
      const ref = n.nextNodes[0];
      return ref ? findNode(ref.nodeId) : null;
    };

    const referencedIds = new Set(nodes.flatMap((n) => n.nextNodes.map((nn) => nn.nodeId)));
    let currentNode: SimNode | null = nodes.find((n) => !referencedIds.has(n.id)) || nodes[0] || null;

    while (currentNode && steps < MAX_STEPS) {
      steps++;
      const cn: SimNode = currentNode;

      if (cn.type === 'SEND_MESSAGE') {
        const message = String(cn.data.message || '');
        if (message) replies.push({ nodeId: cn.id, nodeType: cn.type, message });
        currentNode = nextNode(cn);

      } else if (cn.type === 'ASK_QUESTION') {
        const question = String(cn.data.question || '');
        if (question) {
          replies.push({ nodeId: cn.id, nodeType: cn.type, message: `[Question] ${question}` });
          const varName = String(cn.data.variableName || 'lastAnswer');
          variables[varName] = messageBody;
        }
        currentNode = nextNode(cn);

      } else if (cn.type === 'CONDITION') {
        const field = String(cn.data.field || '');
        const operator = String(cn.data.operator || 'equals');
        const value = String(cn.data.value || '');
        const fieldValue = String(variables[field] || messageBody).toLowerCase();
        const compareValue = value.toLowerCase();

        let matched = false;
        if (operator === 'equals') matched = fieldValue === compareValue;
        else if (operator === 'contains') matched = fieldValue.includes(compareValue);
        else if (operator === 'not_equals') matched = fieldValue !== compareValue;

        replies.push({
          nodeId: cn.id,
          nodeType: cn.type,
          message: `[Condition] ${field} ${operator} "${value}" → ${matched ? 'TRUE' : 'FALSE'}`,
        });

        const branch =
          cn.nextNodes.find((nn: SimNode['nextNodes'][number]) => {
            if (matched && (!nn.condition || nn.condition === 'true')) return true;
            if (!matched && nn.condition === 'false') return true;
            return false;
          }) || cn.nextNodes[0];

        currentNode = branch ? findNode(branch.nodeId) : null;

      } else if (cn.type === 'DELAY') {
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: `[Delay] ${cn.data.seconds ?? 5}s` });
        currentNode = nextNode(cn);

      } else if (cn.type === 'ASSIGN_AGENT') {
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: '[Handoff] Assigned to human agent' });
        currentNode = null;

      } else if (cn.type === 'SET_TAG') {
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: `[Tag] Added tag: ${cn.data.tagName}` });
        currentNode = nextNode(cn);

      } else if (cn.type === 'API_CALL') {
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: `[API Call] ${cn.data.method || 'GET'} ${cn.data.url}` });
        currentNode = nextNode(cn);

      } else if (cn.type === 'AI_REPLY') {
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: '[AI Reply] (AI-generated response in production)' });
        currentNode = nextNode(cn);

      } else if (cn.type === 'INTENT_DETECT') {
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: `[Intent Detect] Classifying: "${messageBody}"` });
        currentNode = nextNode(cn);

      } else if (cn.type === 'CAROUSEL') {
        const items = (cn.data.items as { title: string }[]) || [];
        replies.push({ nodeId: cn.id, nodeType: cn.type, message: `[Carousel] ${items.map((i) => i.title).join(', ')}` });
        currentNode = nextNode(cn);

      } else {
        currentNode = nextNode(cn);
      }
    }

    return {
      replies,
      stepsExecuted: steps,
      variables,
      truncated: steps >= MAX_STEPS,
    };
  }
}
