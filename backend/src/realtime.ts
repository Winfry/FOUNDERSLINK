// Live delivery (TEAM_DECISIONS D2). Messages are sent over the REST
// API and stored first. This socket only pushes what was stored to the
// members who are online, so nothing is lost if nobody is listening.
//
// A browser cannot set headers on a WebSocket, so the client proves who
// it is with its first message: {"type": "auth", "token": "<jwt>"}. That
// keeps the token out of the URL, where it would end up in logs.
//
// Anyone signed in may connect, because someone waiting to be vetted
// still gets notifications, such as the decision on her application.
// Chat messages are pushed only to members who are approved.

import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma } from "./shared/db.js";
import { verifyToken } from "./shared/token.js";

const AUTH_TIMEOUT_MS = 5000;
const UNAUTHORIZED = 4401;

interface Connection {
  socket: WebSocket;
  approved: boolean;
}

const connections = new Map<string, Set<Connection>>();

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    let userId: string | null = null;
    let connection: Connection | null = null;
    const timer = setTimeout(() => socket.close(UNAUTHORIZED, "Send an auth message first"), AUTH_TIMEOUT_MS);

    socket.on("message", async (raw) => {
      // After auth the socket is push-only: anything else sent is ignored.
      if (userId) return;
      try {
        const message = JSON.parse(String(raw));
        if (message.type !== "auth") throw new Error("expected auth");
        const { sub, stage } = verifyToken(message.token);
        // A token waiting for an authenticator code is not a session.
        if (stage) throw new Error("not a session token");
        const user = await prisma.user.findUnique({ where: { id: sub }, select: { approval_status: true } });
        if (!user) throw new Error("no such user");

        userId = sub;
        connection = { socket, approved: user.approval_status === "approved" };
        clearTimeout(timer);
        if (!connections.has(sub)) connections.set(sub, new Set());
        connections.get(sub)!.add(connection);
        socket.send(JSON.stringify({ type: "ready" }));
      } catch {
        socket.close(UNAUTHORIZED, "Unauthorized");
      }
    });

    socket.on("close", () => {
      clearTimeout(timer);
      if (!userId || !connection) return;
      connections.get(userId)?.delete(connection);
      if (connections.get(userId)?.size === 0) connections.delete(userId);
    });
  });

  return wss;
}

// Sends an event to every open socket a person has. Does nothing if she
// is offline. With `approvedOnly`, it reaches her only while approved.
export function pushTo(userId: string, event: object, options: { approvedOnly?: boolean } = {}) {
  for (const { socket, approved } of connections.get(userId) ?? []) {
    if (!options.approvedOnly || approved) socket.send(JSON.stringify(event));
  }
}

// Called when a member's approval changes, so her open sockets start or
// stop receiving chat messages at once, without her reconnecting.
export function setApproved(userId: string, approved: boolean) {
  for (const connection of connections.get(userId) ?? []) connection.approved = approved;
}

// Closes a person's sockets, e.g. when her account is deleted.
export function disconnect(userId: string) {
  for (const { socket } of connections.get(userId) ?? []) socket.close(UNAUTHORIZED, "Signed out");
}
