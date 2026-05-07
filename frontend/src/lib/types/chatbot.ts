export type ChatbotNodeType =
  | "SEND_MESSAGE"
  | "ASK_QUESTION"
  | "CONDITION"
  | "DELAY"
  | "ASSIGN_AGENT"
  | "SET_TAG"
  | "API_CALL"
  | "AI_REPLY"
  | "INTENT_DETECT"
  | "CAROUSEL";

export type ChatbotTriggerType = "KEYWORD" | "FIRST_MESSAGE" | "BUTTON_REPLY";

export interface ChatbotTrigger {
  type: ChatbotTriggerType;
  value?: string;
}

export interface ChatbotNode {
  id: string;
  flowId: string;
  type: ChatbotNodeType;
  data: Record<string, unknown>;
  position: { x: number; y: number };
  nextNodes: { condition?: string; nodeId: string }[];
}

export interface ChatbotFlow {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  trigger: ChatbotTrigger;
  isActive: boolean;
  aiEnabled: boolean;
  aiSystemPrompt: string | null;
  useKnowledgeBase: boolean;
  version: number;
  nodes: ChatbotNode[];
  createdAt: string;
  updatedAt: string;
  _count?: { sessions: number };
}

export interface ChatbotFlowAnalytics {
  total: number;
  completed: number;
  abandoned: number;
  handedOff: number;
  completionRate: number;
}

export interface CreateFlowRequest {
  name: string;
  description?: string;
  trigger: ChatbotTrigger;
  nodes?: Omit<ChatbotNode, "id" | "flowId">[];
  aiEnabled?: boolean;
  aiSystemPrompt?: string;
  useKnowledgeBase?: boolean;
}

export interface UpdateFlowRequest {
  name?: string;
  description?: string;
  trigger?: ChatbotTrigger;
  isActive?: boolean;
  aiEnabled?: boolean;
  aiSystemPrompt?: string;
  useKnowledgeBase?: boolean;
}

export interface SaveNodesRequest {
  nodes: {
    id?: string;
    type: ChatbotNodeType;
    data: Record<string, unknown>;
    position: { x: number; y: number };
    nextNodes: { condition?: string; nodeId: string }[];
  }[];
}

export interface SimulateFlowRequest {
  messageBody: string;
  contactPhone?: string;
}

export interface SimulateFlowReply {
  nodeId: string;
  nodeType: string;
  message: string;
}

export interface SimulateFlowResponse {
  replies: SimulateFlowReply[];
  stepsExecuted: number;
  variables: Record<string, unknown>;
  truncated: boolean;
}
