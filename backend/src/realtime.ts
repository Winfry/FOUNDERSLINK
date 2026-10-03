// Live delivery (TEAM_DECISIONS D2). Messages are sent over the REST
// API and stored first. This socket only pushes what was stored to the
// members who are online, so nothing is lost if nobody is listening.
//
// A browser cannot set headers on a WebSocket, so the client proves who
// it is with its first message: {"type": "auth", "token": "<jwt>"}. That
// keeps the token out of the URL, where it would end up in logs.

import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma } from "./shared/db.js";
import { verifyToken } from "./shared/token.js";

const AUTH_TIMEOUT_MS = 5000;
const UNAUTHORIZED = 4401;

const sockets = new Map<string, Set<WebSocket>>();

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    let userId: string | null = null;
    const timer = setTimeout(() => socket.close(UNAUTHORIZED, "Send an auth message first"), AUTH_TIMEOUT_MS);

    socket.on("message", async (raw) => {
      // After auth the socket is push-only: anything else sent is ignored.
      if (userId) return;
      try {
        const message = JSON.parse(String(raw));
        if (message.type !== "auth") throw new Error("expected auth");
        const { sub } = verifyToken(message.token);
        const user = await prisma.user.findUnique({ where: { id: sub }, select: { approval_status: true } });
        if (user?.approval_status !== "approved") throw new Error("not approved");

        userId = sub;
        clearTimeout(timer);
        if (!sockets.has(sub)) sockets.set(sub, new Set());
        sockets.get(sub)!.add(socket);
        socket.send(JSON.stringify({ type: "ready" }));
      } catch {
        socket.close(UNAUTHORIZED, "Unauthorized");
      }
    });

    socket.on("close", () => {
      clearTimeout(timer);
      if (!userId) return;
      sockets.get(userId)?.delete(socket);
      if (sockets.get(userId)?.size === 0) sockets.delete(userId);
    });
  });

  return wss;
}

// Sends an event to every open socket a member has. Does nothing if she is offline.
export function pushTo(userId: string, event: object) {
  for (const socket of sockets.get(userId) ?? []) socket.send(JSON.stringify(event));
}

// Used when a member is suspended, so she stops receiving at once.
export function disconnect(userId: string) {
  for (const socket of sockets.get(userId) ?? []) socket.close(UNAUTHORIZED, "Account no longer approved");
}
