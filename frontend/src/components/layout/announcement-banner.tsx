"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";
import apiClient from "@/lib/api/client";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  dismissible: boolean;
}

const KEY = ["announcements", "active"] as const;

const STYLE: Record<Announcement["severity"], { className: string; icon: typeof Info; label: string }> = {
  INFO: { className: "bg-surface-container text-on-surface border-outline-variant", icon: Megaphone, label: "Announcement" },
  WARNING: { className: "bg-warning-container text-on-surface border-warning/40", icon: AlertTriangle, label: "Notice" },
  CRITICAL: { className: "bg-error-container text-on-surface border-error/40", icon: AlertTriangle, label: "Important" },
};

/** Platform announcements from Wazelo, shown at the top of the tenant app until dismissed. */
export function AnnouncementBanner() {
  const qc = useQueryClient();
  // The tenant client unwraps the { success, data } envelope
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<{ announcements: Announcement[] }>("/announcements/active").then((r) => r.data.announcements),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => apiClient.post(`/announcements/${id}/dismiss`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      qc.setQueryData<Announcement[]>(KEY, (prev) => prev?.filter((a) => a.id !== id));
    },
    onError: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  if (!data?.length) return null;

  return (
    <div className="space-y-2 px-4 pt-3" aria-label="Announcements from Wazelo" role="region">
      {data.map((a) => {
        const style = STYLE[a.severity] ?? STYLE.INFO;
        const Icon = style.icon;
        return (
          <div
            key={a.id}
            role={a.severity === "CRITICAL" ? "alert" : "status"}
            className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", style.className)}
          >
            <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-medium">
                <span className="sr-only">{style.label}: </span>
                {a.title}
              </p>
              <p className="text-body text-on-surface-variant whitespace-pre-line">{a.body}</p>
            </div>
            {a.dismissible && (
              <IconButton size="sm" aria-label={`Dismiss "${a.title}"`} onClick={() => dismiss.mutate(a.id)}>
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            )}
          </div>
        );
      })}
    </div>
  );
}
