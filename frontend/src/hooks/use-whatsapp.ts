"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { whatsappApi, type WhatsAppSession } from "@/lib/api/whatsapp";
import { useWhatsAppStore } from "@/stores/whatsapp-store";
import { useAuthStore } from "@/stores/auth-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";

// ─── Session Query ───────────────────────────────────────
export function useWhatsAppSession() {
  const setSession = useWhatsAppStore((s) => s.setSession);
  const setStatus = useWhatsAppStore((s) => s.setStatus);

  return useQuery({
    queryKey: ["whatsapp", "session", "me"],
    queryFn: async () => {
      try {
        const session = await whatsappApi.getMySession();
        setSession(session);
        return session;
      } catch (err: unknown) {
        // Axios wraps the status in err.response.status; ApiError uses err.statusCode
        const httpStatus =
          (err as { response?: { status?: number } })?.response?.status ??
          (err as { statusCode?: number })?.statusCode;
        // 404 = no session exists, 403 = permissions not seeded yet — both mean "no session"
        if (httpStatus === 404 || httpStatus === 403) {
          setSession(null);
          return null;
        }
        throw err;
      }
    },
    refetchInterval: 30_000,
    retry: 1,
  });
}

// ─── Initiate Session ────────────────────────────────────
export function useInitiateSession() {
  const queryClient = useQueryClient();
  const setStatus = useWhatsAppStore((s) => s.setStatus);

  return useMutation({
    mutationFn: (idempotencyKey?: string) =>
      whatsappApi.initiateSession(idempotencyKey),
    onMutate: () => setStatus("connecting"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "session"] });
    },
    onError: (err: unknown) => {
      // If backend says a reconnectable session exists, refetch session — it will show disconnected state
      // with the "Reconnect" button instead of creating a duplicate
      const body = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (body) {
        try {
          const parsed = JSON.parse(body);
          if (parsed?.code === "SESSION_RECONNECTABLE") {
            queryClient.invalidateQueries({ queryKey: ["whatsapp", "session"] });
            return;
          }
        } catch { /* not JSON, fall through */ }
      }
      setStatus("no_session");
    },
  });
}

// ─── Disconnect Session ──────────────────────────────────
export function useDisconnectSession() {
  const queryClient = useQueryClient();
  const setSession = useWhatsAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: (reason: string | void) => whatsappApi.disconnect(reason || undefined),
    onSuccess: () => {
      setSession(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "session"] });
    },
  });
}

// ─── Refresh QR ──────────────────────────────────────────
export function useRefreshQr() {
  return useMutation({
    mutationFn: (sessionId: string) => whatsappApi.refreshQr(sessionId),
  });
}

// ─── Reconnect Existing Session (no QR needed if creds intact) ───
export function useReconnectSession() {
  const queryClient = useQueryClient();
  const setStatus = useWhatsAppStore((s) => s.setStatus);

  return useMutation({
    mutationFn: (sessionId: string) => whatsappApi.reconnectSession(sessionId),
    onMutate: () => setStatus("reconnecting"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "session"] });
    },
    onError: () => setStatus("disconnected"),
  });
}

// ─── Admin: List Sessions ────────────────────────────────
export function useAdminSessions(params?: {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["whatsapp", "admin", "sessions", params],
    queryFn: () => whatsappApi.listSessions(params),
    refetchInterval: 15_000,
  });
}

// ─── Admin: Force Disconnect ─────────────────────────────
export function useAdminForceDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      whatsappApi.disconnect(reason, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "admin", "sessions"],
      });
    },
  });
}

// ─── Admin: Force Reconnect (by sessionId) ───────────────
export function useAdminForceReconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => whatsappApi.reconnectSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "admin", "sessions"],
      });
    },
  });
}

// ─── WebSocket: QR & Status Events ───────────────────────
export function useWhatsAppSocket() {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setQr = useWhatsAppStore((s) => s.setQr);
  const clearQr = useWhatsAppStore((s) => s.clearQr);
  const setSession = useWhatsAppStore((s) => s.setSession);
  const setStatus = useWhatsAppStore((s) => s.setStatus);
  const setError = useWhatsAppStore((s) => s.setError);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("whatsapp:qr", (data: { sessionId: string; qrCode: string; expiresAt: string | number }) => {
      const expiresAtMs = typeof data.expiresAt === "string"
        ? new Date(data.expiresAt).getTime()
        : data.expiresAt;
      setQr(data.qrCode, expiresAtMs);
    });

    socket.on("whatsapp:session:connected", () => {
      clearQr();
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "session"] });
    });

    socket.on(
      "whatsapp:session:disconnected",
      (data: { sessionId: string; reason?: string }) => {
        clearQr();
        setStatus("disconnected");
        if (data.reason) setError(data.reason);
        queryClient.invalidateQueries({ queryKey: ["whatsapp", "session"] });
      },
    );

    socket.on("whatsapp:session:reconnecting", () => {
      setStatus("reconnecting");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, setQr, clearQr, setSession, setStatus, setError, queryClient]);

  return socketRef;
}
