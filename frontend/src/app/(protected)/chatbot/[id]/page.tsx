"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Clock,
  UserPlus,
  Tag,
  Globe,
  Trash2,
  Sparkles,
  Bot,
  Upload,
  FileText,
  BookOpen,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Plus,
  SendHorizonal,
  LayoutTemplate,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useChatbotFlow,
  useSaveChatbotNodes,
  useUpdateChatbotFlow,
  useActivateChatbotFlow,
  useDeactivateChatbotFlow,
  useSimulateChatbotFlow,
} from "@/hooks/use-chatbot";
import { useKbDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/use-knowledge-base";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { ChatbotNodeType } from "@/lib/types/chatbot";

// ─── Node type metadata ───────────────────────────────────────────────────────

const NODE_META: Record<ChatbotNodeType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  SEND_MESSAGE:   { label: "Send Message",   icon: MessageSquare, color: "#6366f1", bg: "#6366f115" },
  ASK_QUESTION:   { label: "Ask Question",   icon: HelpCircle,    color: "#3b82f6", bg: "#3b82f615" },
  CONDITION:      { label: "Condition",      icon: GitBranch,     color: "#f59e0b", bg: "#f59e0b15" },
  DELAY:          { label: "Delay",          icon: Clock,         color: "#8b5cf6", bg: "#8b5cf615" },
  ASSIGN_AGENT:   { label: "Assign Agent",   icon: UserPlus,      color: "#22c55e", bg: "#22c55e15" },
  SET_TAG:        { label: "Set Tag",        icon: Tag,           color: "#ec4899", bg: "#ec489915" },
  API_CALL:       { label: "API Call",       icon: Globe,         color: "#06b6d4", bg: "#06b6d415" },
  AI_REPLY:       { label: "AI Reply",       icon: Sparkles,      color: "#f97316", bg: "#f9731615" },
  INTENT_DETECT:  { label: "Intent Detect",  icon: GitBranch,     color: "#a855f7", bg: "#a855f715" },
  CAROUSEL:       { label: "Carousel",       icon: LayoutTemplate, color: "#14b8a6", bg: "#14b8a615" },
};

const NODE_TYPE_LIST = Object.entries(NODE_META) as [ChatbotNodeType, (typeof NODE_META)[ChatbotNodeType]][];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateNode(type: ChatbotNodeType, data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (type === "SEND_MESSAGE" && !String(data.message || "").trim()) errors.push("Message is empty");
  if (type === "ASK_QUESTION" && !String(data.question || "").trim()) errors.push("Question is empty");
  if (type === "ASK_QUESTION" && !String(data.variableName || "").trim()) errors.push("Variable name is empty");
  if (type === "CONDITION" && !String(data.field || "").trim()) errors.push("Condition field is empty");
  if (type === "SET_TAG" && !String(data.tagName || "").trim()) errors.push("Tag name is empty");
  if (type === "API_CALL" && !String(data.url || "").trim()) errors.push("URL is empty");
  return errors;
}

// ─── Default data per type ────────────────────────────────────────────────────

function defaultData(type: ChatbotNodeType): Record<string, unknown> {
  switch (type) {
    case "SEND_MESSAGE":    return { message: "" };
    case "ASK_QUESTION":    return { question: "", variableName: "" };
    case "CONDITION":       return { field: "", operator: "equals", value: "" };
    case "DELAY":           return { seconds: 5 };
    case "ASSIGN_AGENT":    return { strategy: "round_robin" };
    case "SET_TAG":         return { tagName: "" };
    case "API_CALL":        return { url: "", method: "GET", headers: "{}", body: "", responseVar: "" };
    case "AI_REPLY":        return { systemPrompt: "You are a helpful customer support agent. Be concise and friendly.", maxTokens: 500 };
    case "INTENT_DETECT":   return { intents: ["order_status", "pricing", "support", "other"], description: "" };
    case "CAROUSEL":        return { headerText: "Please select an option:", items: [{ title: "Option 1", description: "" }, { title: "Option 2", description: "" }] };
    default:                return {};
  }
}

// ─── Node preview text ────────────────────────────────────────────────────────

function nodePreview(type: ChatbotNodeType, data: Record<string, unknown>): string {
  switch (type) {
    case "SEND_MESSAGE":   return String(data.message || "").slice(0, 60) || "No message set";
    case "ASK_QUESTION":   return String(data.question || "").slice(0, 60) || "No question set";
    case "CONDITION":      return data.field ? `If ${data.field} ${data.operator} "${data.value}"` : "Not configured";
    case "DELAY":          return `Wait ${data.seconds ?? 5}s`;
    case "ASSIGN_AGENT":   return `Strategy: ${data.strategy ?? "round_robin"}`;
    case "SET_TAG":        return String(data.tagName || "") || "No tag set";
    case "API_CALL":       return String(data.url || "").slice(0, 50) || "No URL set";
    case "AI_REPLY":       return String(data.systemPrompt || "").slice(0, 60) || "AI reply";
    case "INTENT_DETECT":  return Array.isArray(data.intents) ? (data.intents as string[]).join(", ").slice(0, 60) : "No intents set";
    case "CAROUSEL":       return String(data.headerText || "").slice(0, 60) || "Carousel options";
    default:               return "";
  }
}

// ─── Custom Node Component ─────────────────────────────────────────────────────

interface FlowNodeData {
  nodeType: ChatbotNodeType;
  nodeData: Record<string, unknown>;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

function FlowNode({ id, data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const meta = NODE_META[d.nodeType];
  if (!meta) return null;
  const Icon = meta.icon;
  const preview = nodePreview(d.nodeType, d.nodeData);
  const errors = validateNode(d.nodeType, d.nodeData);
  const hasError = errors.length > 0;

  return (
    <div
      onClick={() => d.onSelect(id)}
      className="relative cursor-pointer group"
      style={{ minWidth: 200 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !bg-white"
        style={{ borderColor: meta.color }}
      />

      <div
        className="rounded-xl border-2 transition-all shadow-sm"
        style={{
          borderColor: selected ? meta.color : hasError ? "#ef444430" : "rgba(0,0,0,0.08)",
          backgroundColor: "#ffffff",
          boxShadow: selected ? `0 0 0 3px ${meta.color}30` : "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
          style={{ backgroundColor: meta.bg }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta.color + "25" }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
          </div>
          <span className="text-[12px] font-semibold flex-1" style={{ color: meta.color }}>
            {meta.label}
          </span>
          {hasError && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          <button
            onMouseDown={(e) => { e.stopPropagation(); d.onDelete(id); }}
            className="p-0.5 rounded hover:bg-red-50 transition-colors"
            style={{ color: "#ef4444" }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-3 py-2">
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{preview}</p>
          {hasError && (
            <p className="text-[10px] text-amber-500 mt-1">{errors[0]}</p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !bg-white"
        style={{ borderColor: meta.color }}
      />

      {d.nodeType === "CONDITION" && (
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="!w-3 !h-3 !border-2 !bg-white"
          style={{ borderColor: "#ef4444", top: "60%" }}
        />
      )}
    </div>
  );
}

const nodeTypes = { chatbotNode: FlowNode };

// ─── Left Panel ───────────────────────────────────────────────────────────────

interface LeftPanelProps {
  triggerType: string;
  setTriggerType: (v: string) => void;
  triggerValue: string;
  setTriggerValue: (v: string) => void;
  aiEnabled: boolean;
  setAiEnabled: (v: boolean) => void;
  aiSystemPrompt: string;
  setAiSystemPrompt: (v: string) => void;
  useKnowledgeBase: boolean;
  setUseKnowledgeBase: (v: boolean) => void;
  selectedProductIds: string[];
  setSelectedProductIds: (v: string[]) => void;
  flowId: string;
  onAddNode: (type: ChatbotNodeType) => void;
}

function LeftPanel({
  triggerType, setTriggerType,
  triggerValue, setTriggerValue,
  aiEnabled, setAiEnabled,
  aiSystemPrompt, setAiSystemPrompt,
  useKnowledgeBase, setUseKnowledgeBase,
  selectedProductIds, setSelectedProductIds,
  flowId, onAddNode,
}: LeftPanelProps) {
  const { data: documents } = useKbDocuments(flowId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const { data: availableProducts } = useProducts();

  return (
    <div className="w-[220px] shrink-0 border-r border-outline-variant bg-surface-container-low flex flex-col overflow-y-auto">
      <div className="p-3 space-y-4">
        {/* Trigger */}
        <section className="space-y-2">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Trigger</p>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline text-[12px] text-on-surface bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="KEYWORD">Keyword Match</option>
            <option value="FIRST_MESSAGE">First Message</option>
            <option value="BUTTON_REPLY">Button Reply</option>
          </select>
          {triggerType === "KEYWORD" && (
            <input
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              placeholder="e.g. hello, hi, start"
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline text-[12px] text-on-surface bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
        </section>

        {/* AI Toggle */}
        <section className="border-t border-outline-variant pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">AI Mode</p>
            </div>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${aiEnabled ? "bg-primary" : "bg-surface-container-highest"}`}
            >
              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${aiEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          {aiEnabled && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-on-surface-variant">System Prompt</label>
              <textarea
                value={aiSystemPrompt}
                onChange={(e) => setAiSystemPrompt(e.target.value)}
                rows={4}
                placeholder="You are a helpful customer support agent for [Company]. Be concise and friendly."
                className="w-full px-2.5 py-2 rounded-lg border border-outline bg-surface-container text-[11px] text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
        </section>

        {/* Product scope */}
        {aiEnabled && availableProducts && availableProducts.filter((p) => p.status === "ACTIVE").length > 0 && (
          <section className="border-t border-outline-variant pt-3 space-y-2">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Product Scope</p>
            <p className="text-[10px] text-on-surface-variant">Leave empty for all products</p>
            {availableProducts.filter((p) => p.status === "ACTIVE").map((p) => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedProductIds([...selectedProductIds, p.id]);
                    else setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                  }}
                  className="rounded h-3.5 w-3.5"
                />
                <span className="text-[12px] text-on-surface">{p.name}</span>
              </label>
            ))}
          </section>
        )}

        {/* Knowledge Base */}
        {aiEnabled && (
          <section className="border-t border-outline-variant pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Product Docs</p>
              </div>
              <button
                onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                className={`relative w-9 h-5 rounded-full transition-colors ${useKnowledgeBase ? "bg-primary" : "bg-surface-container-highest"}`}
              >
                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${useKnowledgeBase ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            {useKnowledgeBase && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-outline hover:border-primary/40 cursor-pointer transition-colors">
                  <Upload className="h-3.5 w-3.5 text-on-surface-variant" />
                  <span className="text-[11px] text-on-surface-variant">
                    {uploadDoc.isPending ? "Uploading..." : "Upload PDF / TXT"}
                  </span>
                  <input type="file" accept=".pdf,.txt,.csv,.md" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { uploadDoc.mutate({ file, flowId }); e.target.value = ""; }
                    }}
                  />
                </label>
                {documents && documents.length > 0 && (
                  <div className="space-y-1">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-container text-[11px]">
                        <FileText className="h-3 w-3 shrink-0 text-on-surface-variant" />
                        <span className="flex-1 truncate text-on-surface">{doc.title}</span>
                        {doc.status === "READY"      && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                        {doc.status === "PROCESSING" && <Loader2 className="h-3 w-3 text-yellow-500 shrink-0 animate-spin" />}
                        {doc.status === "FAILED"     && <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                        <button onClick={() => deleteDoc.mutate(doc.id)} className="p-0.5 rounded hover:bg-red-50 text-on-surface-variant hover:text-red-400 transition-colors shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Node palette */}
        {!aiEnabled && (
          <section className="border-t border-outline-variant pt-3 space-y-1.5">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Add Node</p>
            <p className="text-[10px] text-on-surface-variant mb-2">Drag onto canvas or click to add</p>
            {NODE_TYPE_LIST.map(([type, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => onAddNode(type)}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("nodeType", type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-container transition-colors text-left cursor-grab active:cursor-grabbing"
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>
                  <span className="text-[12px] font-medium text-on-surface">{meta.label}</span>
                </button>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Right config panel ───────────────────────────────────────────────────────

interface RightPanelProps {
  nodeId: string;
  nodeType: ChatbotNodeType;
  nodeData: Record<string, unknown>;
  allNodes: Node[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

function RightPanel({ nodeId, nodeType, nodeData, onUpdate, onClose }: RightPanelProps) {
  const meta = NODE_META[nodeType];
  const [headersText, setHeadersText] = useState(
    typeof nodeData.headers === "object"
      ? JSON.stringify(nodeData.headers, null, 2)
      : String(nodeData.headers ?? "{}")
  );
  const [headersError, setHeadersError] = useState("");

  function field(label: string, children: React.ReactNode) {
    return (
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">{label}</label>
        {children}
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 rounded-lg border border-outline text-[12px] text-on-surface bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20";
  const textareaCls = `${inputCls} resize-none`;

  const errors = validateNode(nodeType, nodeData);

  return (
    <div className="w-[280px] shrink-0 border-l border-outline-variant bg-surface-container-low flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: `2px solid ${meta.color}20` }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
            <meta.icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
          </div>
          <span className="text-[13px] font-semibold text-on-surface">{meta.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 space-y-0.5">
          {errors.map((e, i) => (
            <p key={i} className="text-[11px] text-amber-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {e}
            </p>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {nodeType === "SEND_MESSAGE" && (
          field("Message", (
            <>
              <textarea
                value={String(nodeData.message ?? "")}
                onChange={(e) => onUpdate(nodeId, { message: e.target.value })}
                rows={5}
                placeholder="Type your message here..."
                className={textareaCls}
              />
              <p className="text-[10px] text-on-surface-variant">Use {"{{contact.name}}"} or {"{{variable_name}}"} for personalization</p>
            </>
          ))
        )}

        {nodeType === "ASK_QUESTION" && (
          <>
            {field("Question", (
              <textarea
                value={String(nodeData.question ?? "")}
                onChange={(e) => onUpdate(nodeId, { question: e.target.value })}
                rows={3}
                placeholder="Ask the user something..."
                className={textareaCls}
              />
            ))}
            {field("Save answer to variable", (
              <input
                value={String(nodeData.variableName ?? "")}
                onChange={(e) => onUpdate(nodeId, { variableName: e.target.value })}
                placeholder="e.g. customer_name"
                className={inputCls}
              />
            ))}
            <p className="text-[10px] text-on-surface-variant">Access in later nodes as {"{{customer_name}}"}</p>
          </>
        )}

        {nodeType === "CONDITION" && (
          <>
            {field("Variable", (
              <input value={String(nodeData.field ?? "")} onChange={(e) => onUpdate(nodeId, { field: e.target.value })} placeholder="e.g. customer_name" className={inputCls} />
            ))}
            {field("Operator", (
              <select value={String(nodeData.operator ?? "equals")} onChange={(e) => onUpdate(nodeId, { operator: e.target.value })} className={inputCls}>
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="not_equals">Not Equals</option>
              </select>
            ))}
            {field("Value", (
              <input value={String(nodeData.value ?? "")} onChange={(e) => onUpdate(nodeId, { value: e.target.value })} placeholder="Expected value" className={inputCls} />
            ))}
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-700 space-y-1">
              <p className="font-medium">Two outputs:</p>
              <p>• Bottom handle → True (condition met)</p>
              <p>• Right handle → False (condition not met)</p>
            </div>
          </>
        )}

        {nodeType === "DELAY" && (
          field("Delay (seconds)", (
            <input
              type="number"
              value={String(nodeData.seconds ?? 5)}
              onChange={(e) => onUpdate(nodeId, { seconds: parseInt(e.target.value) || 1 })}
              min={1}
              className={inputCls}
            />
          ))
        )}

        {nodeType === "ASSIGN_AGENT" && (
          field("Assignment Strategy", (
            <select value={String(nodeData.strategy ?? "round_robin")} onChange={(e) => onUpdate(nodeId, { strategy: e.target.value })} className={inputCls}>
              <option value="round_robin">Round Robin</option>
            </select>
          ))
        )}

        {nodeType === "SET_TAG" && (
          field("Tag Name", (
            <input value={String(nodeData.tagName ?? "")} onChange={(e) => onUpdate(nodeId, { tagName: e.target.value })} placeholder="e.g. hot-lead, interested" className={inputCls} />
          ))
        )}

        {nodeType === "API_CALL" && (
          <>
            {field("URL", (
              <input value={String(nodeData.url ?? "")} onChange={(e) => onUpdate(nodeId, { url: e.target.value })} placeholder="https://api.example.com/webhook" className={inputCls} />
            ))}
            {field("Method", (
              <select value={String(nodeData.method ?? "GET")} onChange={(e) => onUpdate(nodeId, { method: e.target.value })} className={inputCls}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            ))}
            {field("Headers (JSON)", (
              <>
                <textarea
                  value={headersText}
                  rows={3}
                  onChange={(e) => {
                    setHeadersText(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value);
                      onUpdate(nodeId, { headers: parsed });
                      setHeadersError("");
                    } catch {
                      setHeadersError("Invalid JSON");
                    }
                  }}
                  placeholder={'{\n  "Authorization": "Bearer token"\n}'}
                  className={`${textareaCls} font-mono text-[11px]`}
                />
                {headersError && <p className="text-[11px] text-error">{headersError}</p>}
              </>
            ))}
            {field("Request Body (JSON or plain)", (
              <textarea
                value={String(nodeData.body ?? "")}
                rows={3}
                onChange={(e) => onUpdate(nodeId, { body: e.target.value })}
                placeholder={"{\n  \"phone\": \"{{contact.phone}}\"\n}"}
                className={`${textareaCls} font-mono text-[11px]`}
              />
            ))}
            {field("Save response as variable", (
              <input
                value={String(nodeData.responseVar ?? "")}
                onChange={(e) => onUpdate(nodeId, { responseVar: e.target.value })}
                placeholder="e.g. api_result (optional)"
                className={inputCls}
              />
            ))}
            <p className="text-[10px] text-on-surface-variant">Use {"{{variable_name}}"} in URL, body, and headers. Response stored in variable.</p>
          </>
        )}

        {nodeType === "AI_REPLY" && (
          <>
            {field("System Prompt", (
              <textarea
                value={String(nodeData.systemPrompt ?? "")}
                onChange={(e) => onUpdate(nodeId, { systemPrompt: e.target.value })}
                rows={6}
                placeholder="You are a helpful support agent for [Company]. Be concise, friendly, and professional."
                className={textareaCls}
              />
            ))}
            {field("Max Tokens", (
              <input
                type="number"
                value={String(nodeData.maxTokens ?? 500)}
                onChange={(e) => onUpdate(nodeId, { maxTokens: parseInt(e.target.value) || 500 })}
                min={50}
                max={4000}
                className={inputCls}
              />
            ))}
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-[11px] text-orange-700 space-y-1">
              <p className="font-medium">AI will generate a reply using:</p>
              <p>• The system prompt above</p>
              <p>• Last 20 messages as context</p>
              <p>• Session variables for personalization</p>
            </div>
          </>
        )}

        {nodeType === "INTENT_DETECT" && (
          <>
            {field("Intents (one per line)", (
              <>
                <textarea
                  value={Array.isArray(nodeData.intents) ? (nodeData.intents as string[]).join("\n") : ""}
                  onChange={(e) => onUpdate(nodeId, { intents: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  rows={5}
                  placeholder={"order_status\npricing\nsupport\nother"}
                  className={textareaCls}
                />
                <p className="text-[10px] text-on-surface-variant">AI will classify the customer message into one of these intents. Connect each intent to a different next node using the edge label.</p>
              </>
            ))}
            <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-[11px] text-purple-700 space-y-1">
              <p className="font-medium">How to wire intent branches:</p>
              <p>• Connect output edges and set the label to the intent name</p>
              <p>• Add a "default" edge for unmatched intents</p>
            </div>
          </>
        )}

        {nodeType === "CAROUSEL" && (
          <>
            {field("Header Text", (
              <input
                value={String(nodeData.headerText ?? "")}
                onChange={(e) => onUpdate(nodeId, { headerText: e.target.value })}
                placeholder="Please select an option:"
                className={inputCls}
              />
            ))}
            {field("Items", (
              <div className="space-y-2">
                {(nodeData.items as { title: string; description?: string }[] ?? []).map((item, i) => (
                  <div key={i} className="rounded-lg border border-outline-variant/20 p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-on-surface-variant w-4">{i + 1}.</span>
                      <input
                        value={item.title}
                        onChange={(e) => {
                          const items = [...(nodeData.items as { title: string; description?: string }[])];
                          items[i] = { ...items[i], title: e.target.value };
                          onUpdate(nodeId, { items });
                        }}
                        placeholder="Option title"
                        className={`${inputCls} text-[11px]`}
                      />
                      <button
                        onClick={() => {
                          const items = (nodeData.items as { title: string; description?: string }[]).filter((_, j) => j !== i);
                          onUpdate(nodeId, { items });
                        }}
                        className="p-0.5 text-on-surface-variant/40 hover:text-error transition-colors shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      value={item.description ?? ""}
                      onChange={(e) => {
                        const items = [...(nodeData.items as { title: string; description?: string }[])];
                        items[i] = { ...items[i], description: e.target.value };
                        onUpdate(nodeId, { items });
                      }}
                      placeholder="Optional description"
                      className={`${inputCls} text-[11px] ml-5`}
                    />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const items = [...(nodeData.items as { title: string; description?: string }[] ?? []), { title: "", description: "" }];
                    onUpdate(nodeId, { items });
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Add item
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Test Mode Panel ──────────────────────────────────────────────────────────

interface TestPanelProps {
  flowId: string;
  onClose: () => void;
  nodeCount: number;
  validationErrors: { nodeId: string; errors: string[] }[];
}

function TestPanel({ flowId, onClose, nodeCount, validationErrors }: TestPanelProps) {
  const [testMessage, setTestMessage] = useState("");
  const [log, setLog] = useState<{ role: "user" | "bot" | "system"; text: string; nodeType?: string }[]>([]);
  const simulate = useSimulateChatbotFlow();

  function runSimulation() {
    const msg = testMessage.trim();
    if (!msg) return;
    setLog((prev) => [...prev, { role: "user", text: msg }]);
    setTestMessage("");

    simulate.mutate(
      { flowId, messageBody: msg },
      {
        onSuccess: (result) => {
          if (result.replies.length === 0) {
            setLog((prev) => [...prev, { role: "system", text: "No replies generated. Check your flow has connected nodes." }]);
          } else {
            result.replies.forEach((r) => {
              setLog((prev) => [...prev, { role: "bot", text: r.message, nodeType: r.nodeType }]);
            });
          }
          if (result.truncated) {
            setLog((prev) => [...prev, { role: "system", text: "⚠️ Simulation truncated at 20 steps to prevent loops." }]);
          }
        },
      }
    );
  }

  return (
    <div className="w-[280px] shrink-0 border-l border-outline-variant bg-surface-container-low flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold text-on-surface">Test Mode</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Flow summary */}
      <div className="px-4 py-3 border-b border-outline-variant/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-on-surface-variant">Nodes</span>
          <span className="text-[11px] font-medium text-on-surface">{nodeCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-on-surface-variant">Validation</span>
          {validationErrors.length === 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              All good
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {validationErrors.length} issue{validationErrors.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Validation issues list */}
      {validationErrors.length > 0 && (
        <div className="px-4 py-3 border-b border-outline-variant/10 space-y-1.5">
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Issues</p>
          {validationErrors.map(({ nodeId, errors }) =>
            errors.map((err, i) => (
              <div key={`${nodeId}-${i}`} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chat log */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {log.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <FlaskConical className="h-8 w-8 text-on-surface-variant/30 mx-auto" />
            <p className="text-[12px] text-on-surface-variant/50">
              Send a test message to simulate the flow. The server will walk through your nodes and return the bot replies.
            </p>
          </div>
        )}
        {log.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-[12px] space-y-0.5 ${
              m.role === "user"
                ? "bg-primary text-white"
                : m.role === "system"
                ? "bg-amber-50 border border-amber-100 text-amber-700"
                : "bg-surface-container text-on-surface"
            }`}>
              {m.nodeType && m.role === "bot" && (
                <p className="text-[9px] font-semibold uppercase tracking-wide opacity-50">{m.nodeType.replace("_", " ")}</p>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {simulate.isPending && (
          <div className="flex justify-start">
            <div className="bg-surface-container px-3 py-2 rounded-xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-on-surface-variant" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-outline-variant/20">
        {log.length > 0 && (
          <button
            onClick={() => setLog([])}
            className="w-full text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant mb-2 text-center"
          >
            Clear chat
          </button>
        )}
        <div className="flex gap-2">
          <input
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) runSimulation(); }}
            placeholder="Type a test message…"
            className="flex-1 px-3 py-2 rounded-lg border border-outline text-[12px] text-on-surface bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={simulate.isPending}
          />
          <button
            onClick={runSimulation}
            disabled={!testMessage.trim() || simulate.isPending}
            className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <SendHorizonal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor (inner, needs ReactFlow context) ─────────────────────────────

function ChatbotEditorInner() {
  const params = useParams();
  const router = useRouter();
  const flowId = params.id as string;

  const { data: flow, isLoading } = useChatbotFlow(flowId);
  usePageTitle(flow?.name || "Flow Editor");

  const saveNodes = useSaveChatbotNodes();
  const updateFlow = useUpdateChatbotFlow();
  const activateFlow = useActivateChatbotFlow();
  const deactivateFlow = useDeactivateChatbotFlow();

  // ReactFlow state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Flow meta state
  const [flowName, setFlowName] = useState("");
  const [triggerType, setTriggerType] = useState("KEYWORD");
  const [triggerValue, setTriggerValue] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from API
  useEffect(() => {
    if (!flow || initialized) return;
    setFlowName(flow.name);
    setTriggerType(flow.trigger.type);
    setTriggerValue(flow.trigger.value || "");
    setAiEnabled(flow.aiEnabled ?? false);
    setAiSystemPrompt(flow.aiSystemPrompt ?? "");
    setUseKnowledgeBase(flow.useKnowledgeBase ?? false);
    setSelectedProductIds((flow as unknown as Record<string, unknown>).productIds as string[] ?? []);

    const nodes: Node[] = flow.nodes.map((n) => ({
      id: n.id,
      type: "chatbotNode",
      position: n.position,
      data: {
        nodeType: n.type,
        nodeData: n.data,
        selected: false,
        onSelect: () => {},
        onDelete: () => {},
      },
    }));

    const edges: Edge[] = [];
    flow.nodes.forEach((n) => {
      n.nextNodes.forEach((nn, i) => {
        edges.push({
          id: `${n.id}-${nn.nodeId}-${i}`,
          source: n.id,
          target: nn.nodeId,
          sourceHandle: nn.condition === "false" ? "false" : undefined,
          label: nn.condition ? nn.condition : undefined,
          type: "smoothstep",
          style: { stroke: "#6b7280", strokeWidth: 2 },
          labelStyle: { fontSize: 10, fill: "#6b7280" },
          animated: false,
        });
      });
    });

    setRfNodes(nodes);
    setRfEdges(edges);
    setInitialized(true);
  }, [flow, initialized, setRfNodes, setRfEdges]);

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId((prev) => (prev === id ? null : id));
    setShowTestPanel(false);
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    setRfNodes((nds) => nds.filter((n) => n.id !== id));
    setRfEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId((prev) => (prev === id ? null : prev));
  }, [setRfNodes, setRfEdges]);

  useEffect(() => {
    setRfNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          selected: n.id === selectedNodeId,
          onSelect: handleSelectNode,
          onDelete: handleDeleteNode,
        },
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, handleSelectNode, handleDeleteNode]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setRfEdges((eds) =>
        addEdge({
          ...connection,
          type: "smoothstep",
          style: { stroke: "#6b7280", strokeWidth: 2 },
          animated: false,
        }, eds)
      );
    },
    [setRfEdges],
  );

  const addNodeToCanvas = useCallback((type: ChatbotNodeType) => {
    const id = crypto.randomUUID();
    const newNode: Node = {
      id,
      type: "chatbotNode",
      position: { x: 300 + Math.random() * 100, y: 100 + rfNodes.length * 140 },
      data: {
        nodeType: type,
        nodeData: defaultData(type),
        selected: false,
        onSelect: handleSelectNode,
        onDelete: handleDeleteNode,
      },
    };
    setRfNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
  }, [rfNodes.length, handleSelectNode, handleDeleteNode, setRfNodes]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("nodeType") as ChatbotNodeType;
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: e.clientX - bounds.left - 100,
        y: e.clientY - bounds.top - 30,
      };

      const id = crypto.randomUUID();
      const newNode: Node = {
        id,
        type: "chatbotNode",
        position,
        data: {
          nodeType: type,
          nodeData: defaultData(type),
          selected: false,
          onSelect: handleSelectNode,
          onDelete: handleDeleteNode,
        },
      };
      setRfNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [handleSelectNode, handleDeleteNode, setRfNodes],
  );

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setRfNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, nodeData: { ...(n.data.nodeData as Record<string, unknown>), ...data } } }
          : n,
      ),
    );
  }, [setRfNodes]);

  // Auto-layout: simple top-to-bottom dagre-like manual layout
  const handleAutoLayout = useCallback(() => {
    if (rfNodes.length === 0) return;
    // Build adjacency from edges
    const childrenOf = new Map<string, string[]>();
    const parentCount = new Map<string, number>();
    rfNodes.forEach((n) => { childrenOf.set(n.id, []); parentCount.set(n.id, 0); });
    rfEdges.forEach((e) => {
      childrenOf.get(e.source)?.push(e.target);
      parentCount.set(e.target, (parentCount.get(e.target) ?? 0) + 1);
    });

    // BFS layering
    const roots = rfNodes.filter((n) => (parentCount.get(n.id) ?? 0) === 0).map((n) => n.id);
    const layerOf = new Map<string, number>();
    const queue = roots.map((id) => ({ id, layer: 0 }));
    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      if (layerOf.has(id)) continue;
      layerOf.set(id, layer);
      (childrenOf.get(id) ?? []).forEach((child) => queue.push({ id: child, layer: layer + 1 }));
    }

    const layerNodes = new Map<number, string[]>();
    rfNodes.forEach((n) => {
      const l = layerOf.get(n.id) ?? 0;
      if (!layerNodes.has(l)) layerNodes.set(l, []);
      layerNodes.get(l)!.push(n.id);
    });

    const GAP_X = 250;
    const GAP_Y = 160;
    const newPositions = new Map<string, { x: number; y: number }>();

    layerNodes.forEach((ids, layer) => {
      const totalWidth = (ids.length - 1) * GAP_X;
      ids.forEach((id, i) => {
        newPositions.set(id, { x: i * GAP_X - totalWidth / 2 + 400, y: layer * GAP_Y + 80 });
      });
    });

    setRfNodes((nds) =>
      nds.map((n) => ({
        ...n,
        position: newPositions.get(n.id) ?? n.position,
      }))
    );
  }, [rfNodes, rfEdges, setRfNodes]);

  const handleSave = () => {
    const backendNodes = rfNodes.map((n) => {
      const d = n.data as FlowNodeData;
      const outEdges = rfEdges.filter((e) => e.source === n.id);
      const nextNodes = outEdges.map((e) => ({
        nodeId: e.target,
        condition: e.sourceHandle === "false" ? "false" : (e.label ? String(e.label) : undefined),
      }));
      return {
        id: n.id,
        type: d.nodeType,
        data: d.nodeData,
        position: n.position,
        nextNodes,
      };
    });

    updateFlow.mutate({
      flowId,
      name: flowName,
      trigger: { type: triggerType as "KEYWORD" | "FIRST_MESSAGE" | "BUTTON_REPLY", value: triggerValue || undefined },
      aiEnabled,
      aiSystemPrompt: aiSystemPrompt || undefined,
      useKnowledgeBase,
    } as Parameters<typeof updateFlow.mutate>[0]);

    saveNodes.mutate({ flowId, nodes: backendNodes });
  };

  // Compute validation errors for all nodes
  const validationErrors = rfNodes
    .map((n) => {
      const d = n.data as FlowNodeData;
      return { nodeId: n.id, errors: validateNode(d.nodeType, d.nodeData) };
    })
    .filter((v) => v.errors.length > 0);

  const selectedRfNode = rfNodes.find((n) => n.id === selectedNodeId);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <p className="text-on-surface-variant text-[14px]">Flow not found</p>
      </div>
    );
  }

  const isSaving = saveNodes.isPending || updateFlow.isPending;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] bg-surface">
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-outline-variant bg-surface-container-low z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chatbot")}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="text-[15px] font-semibold text-on-surface bg-transparent border-none outline-none w-[220px] focus:ring-0"
          />
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${flow.isActive ? "bg-green-100 text-green-700" : "bg-surface-container-highest text-on-surface-variant"}`}>
            {flow.isActive ? "Active" : "Draft"}
          </span>
          {aiEnabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-600">
              <Sparkles className="h-3 w-3" />
              AI Mode
            </span>
          )}
          {validationErrors.length > 0 && !aiEnabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {validationErrors.length} issue{validationErrors.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!aiEnabled && rfNodes.length > 1 && (
            <button
              onClick={handleAutoLayout}
              title="Auto-layout nodes"
              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <LayoutTemplate className="h-4 w-4" />
            </button>
          )}
          {!aiEnabled && (
            <button
              onClick={() => {
                setShowTestPanel((v) => !v);
                setSelectedNodeId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                showTestPanel ? "bg-primary/10 text-primary" : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Test
            </button>
          )}
          {flow.isActive ? (
            <Button variant="secondary" size="sm" onClick={() => deactivateFlow.mutate(flowId)} disabled={isSaving}>
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Deactivate
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => activateFlow.mutate(flowId)} disabled={isSaving}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Activate
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <LeftPanel
          triggerType={triggerType}
          setTriggerType={setTriggerType}
          triggerValue={triggerValue}
          setTriggerValue={setTriggerValue}
          aiEnabled={aiEnabled}
          setAiEnabled={setAiEnabled}
          aiSystemPrompt={aiSystemPrompt}
          setAiSystemPrompt={setAiSystemPrompt}
          useKnowledgeBase={useKnowledgeBase}
          setUseKnowledgeBase={setUseKnowledgeBase}
          selectedProductIds={selectedProductIds}
          setSelectedProductIds={setSelectedProductIds}
          flowId={flowId}
          onAddNode={addNodeToCanvas}
        />

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 min-w-0 bg-surface-container-lowest"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {aiEnabled ? (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-sm text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-orange-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-on-surface">AI Auto-Reply Mode</h3>
                  <p className="text-[13px] text-on-surface-variant mt-1.5 leading-relaxed">
                    AI will reply to every incoming message automatically. No flow nodes needed.
                  </p>
                </div>
                <div className="bg-surface-container rounded-xl border border-outline-variant p-4 text-left space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-[12px] text-on-surface">AI Auto-Reply is enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiSystemPrompt.trim() ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                    <span className="text-[12px] text-on-surface">
                      {aiSystemPrompt.trim() ? "System prompt configured" : "No system prompt — set one in the left panel"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={2}
              defaultEdgeOptions={{
                type: "smoothstep",
                style: { stroke: "#9ca3af", strokeWidth: 2 },
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
              <Controls className="[&>button]:border-outline-variant [&>button]:bg-surface-container [&>button]:text-on-surface [&>button:hover]:bg-surface-container-high" />
              <MiniMap
                nodeColor={(n) => {
                  const d = n.data as FlowNodeData;
                  return d ? (NODE_META[d.nodeType]?.color ?? "#6b7280") : "#6b7280";
                }}
                className="!bg-surface-container !border !border-outline-variant !rounded-xl"
              />

              {rfNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-2">
                    <p className="text-[15px] text-on-surface-variant font-medium">Drag nodes here or click from the left panel</p>
                    <p className="text-[12px] text-on-surface-variant/60">Connect nodes by dragging from the bottom handle to the top handle of another node</p>
                  </div>
                </div>
              )}
            </ReactFlow>
          )}
        </div>

        {/* Right config panel */}
        {selectedRfNode && !aiEnabled && (
          <RightPanel
            nodeId={selectedRfNode.id}
            nodeType={(selectedRfNode.data as FlowNodeData).nodeType}
            nodeData={(selectedRfNode.data as FlowNodeData).nodeData}
            allNodes={rfNodes}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNodeId(null)}
          />
        )}

        {/* Test panel */}
        {showTestPanel && !aiEnabled && (
          <TestPanel
            flowId={flowId}
            onClose={() => setShowTestPanel(false)}
            nodeCount={rfNodes.length}
            validationErrors={validationErrors}
          />
        )}
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function ChatbotEditorPage() {
  return (
    <ReactFlowProvider>
      <ChatbotEditorInner />
    </ReactFlowProvider>
  );
}
