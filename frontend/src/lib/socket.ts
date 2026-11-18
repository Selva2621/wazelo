import { io, type Socket } from "socket.io-client";

import { WS_URL } from "@/lib/env-urls";

let socket: Socket | null = null;

/**
 * Returns a shared Socket.IO instance. Creates one if it doesn't exist
 * or if the auth token has changed.
 */
export function getSocket(accessToken: string): Socket {
  if (socket?.connected && (socket.auth as { token?: string })?.token === accessToken) {
    return socket;
  }

  // Disconnect existing socket if token changed
  if (socket) {
    socket.disconnect();
  }

  socket = io(WS_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

/**
 * Reconnects the shared socket if it gave up (it stops after 10 attempts).
 * Called when the network comes back or the installed app returns to the foreground.
 */
export function reconnectSocketIfNeeded(): void {
  if (socket && !socket.connected) socket.connect();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
