import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSequences,
  getSequence,
  createSequence,
  deleteSequence,
  startSequence,
  pauseSequence,
  resumeSequence,
  cancelSequence,
  getSequenceRecipients,
  getSequenceAnalytics,
  startOutreach,
  generateSequence,
  rewriteSequenceStep,
  updateSequence,
  updateSequenceStep,
  addSequenceStep,
  deleteSequenceStep,
  type SequenceRewriteStyle,
} from "@/lib/api/sequences";
import { toast } from "sonner";
import type { CreateSequenceRequest, SequenceStatus } from "@/lib/types/sequences";

export function useSequences(params?: { status?: SequenceStatus; take?: number; skip?: number }) {
  return useQuery({
    queryKey: ["sequences", params],
    queryFn: () => listSequences(params),
  });
}

export function useSequence(id: string | undefined) {
  return useQuery({
    queryKey: ["sequences", id],
    queryFn: () => getSequence(id!),
    enabled: !!id,
  });
}

export interface SequenceEdits {
  settings?: { name?: string; description?: string; exitOnReply?: boolean };
  /** Existing messages whose fields changed */
  updated: { stepId: string; name?: string; messageBody?: string; delayMinutes?: number }[];
  /** Drafts only */
  removed: string[];
  /** Drafts only, appended in order */
  added: { stepOrder: number; name?: string; messageBody: string; delayMinutes: number }[];
}

/** Save an edited sequence: only the parts that changed, in a safe order. */
export function useSaveSequenceEdits(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (edits: SequenceEdits) => {
      if (edits.settings && Object.keys(edits.settings).length) await updateSequence(id, edits.settings);
      for (const u of edits.updated) {
        const { stepId, ...fields } = u;
        await updateSequenceStep(id, stepId, fields);
      }
      for (const stepId of edits.removed) await deleteSequenceStep(id, stepId);
      for (const a of edits.added) await addSequenceStep(id, { ...a, messageType: "TEXT" });
    },
    onSuccess: () => {
      toast.success("Sequence saved");
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't save the changes. Try again."),
    // Refresh even after a partial failure, so the page shows what was actually saved
    onSettled: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

/** AI: draft a full sequence from a goal (spends AI credits). */
export function useGenerateSequence() {
  return useMutation({
    mutationFn: (req: { prompt: string; stepCount: number }) => generateSequence(req),
    onError: (err: Error) => toast.error(err.message || "Couldn't draft the sequence. Try again."),
  });
}

/** AI: rewrite one step's message in a style (spends AI credits). */
export function useRewriteSequenceStep() {
  return useMutation({
    mutationFn: (req: { message: string; style: SequenceRewriteStyle; goal?: string }) => rewriteSequenceStep(req),
    onError: (err: Error) => toast.error(err.message || "Couldn't rewrite the message. Try again."),
  });
}

export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSequenceRequest) => createSequence(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useDeleteSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useStartSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useStartOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<typeof startOutreach>[0]) => startOutreach(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function usePauseSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pauseSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useResumeSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useCancelSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useSequenceRecipients(id: string | undefined, take = 50, skip = 0) {
  return useQuery({
    queryKey: ["sequences", id, "recipients", take, skip],
    queryFn: () => getSequenceRecipients(id!, take, skip),
    enabled: !!id,
  });
}

// Analytics
export function useSequenceAnalytics(id: string | undefined) {
  return useQuery({
    queryKey: ["sequences", id, "analytics"],
    queryFn: () => getSequenceAnalytics(id!),
    enabled: !!id,
  });
}
