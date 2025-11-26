import type * as Party from "partykit/server";

// Room metadata stored in the lobby
export interface RoomInfo {
  roomId: string;
  roomName: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameStatus: "waiting" | "playing";
  createdAt: number;
  updatedAt: number;
}

// Lobby state
interface LobbyState {
  rooms: Map<string, RoomInfo>;
}

// Message types for lobby communication
type LobbyMessage =
  | { type: "LIST_ROOMS" }
  | { type: "ROOM_CREATED"; room: RoomInfo }
  | { type: "ROOM_UPDATED"; room: RoomInfo }
  | { type: "ROOM_CLOSED"; roomId: string };

export default class Lobby implements Party.Server {
  state: LobbyState = {
    rooms: new Map(),
  };

  constructor(readonly room: Party.Room) {}

  // Called when a client connects to the lobby
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current room list to the new connection
    const roomList = Array.from(this.state.rooms.values())
      .filter((r) => r.gameStatus === "waiting") // Only show rooms that are waiting
      .sort((a, b) => b.updatedAt - a.updatedAt); // Most recently updated first

    conn.send(
      JSON.stringify({
        type: "ROOM_LIST",
        rooms: roomList,
      })
    );
  }

  // Handle messages from clients and game rooms
  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as LobbyMessage;

      switch (data.type) {
        case "LIST_ROOMS":
          // Client requesting room list
          const roomList = Array.from(this.state.rooms.values())
            .filter((r) => r.gameStatus === "waiting")
            .sort((a, b) => b.updatedAt - a.updatedAt);
          sender.send(
            JSON.stringify({
              type: "ROOM_LIST",
              rooms: roomList,
            })
          );
          break;

        case "ROOM_CREATED":
          // A new room was created
          this.state.rooms.set(data.room.roomId, data.room);
          this.broadcastRoomList();
          break;

        case "ROOM_UPDATED":
          // Room state changed (player joined/left, status changed)
          if (this.state.rooms.has(data.room.roomId)) {
            this.state.rooms.set(data.room.roomId, data.room);
            this.broadcastRoomList();
          }
          break;

        case "ROOM_CLOSED":
          // Room was closed (empty or game ended)
          if (this.state.rooms.has(data.roomId)) {
            this.state.rooms.delete(data.roomId);
            this.broadcastRoomList();
          }
          break;
      }
    } catch (e) {
      console.error("Lobby: Error parsing message:", e);
    }
  }

  // HTTP endpoint to get room list (for clients that don't want to maintain a WebSocket)
  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "GET") {
      const roomList = Array.from(this.state.rooms.values())
        .filter((r) => r.gameStatus === "waiting")
        .sort((a, b) => b.updatedAt - a.updatedAt);

      return new Response(JSON.stringify({ rooms: roomList }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Handle POST requests from game rooms to update lobby
    if (req.method === "POST") {
      try {
        const data = await req.json();

        if (data.type === "ROOM_CREATED" || data.type === "ROOM_UPDATED") {
          this.state.rooms.set(data.room.roomId, data.room);
          this.broadcastRoomList();
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        if (data.type === "ROOM_CLOSED") {
          this.state.rooms.delete(data.roomId);
          this.broadcastRoomList();
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      } catch (e) {
        console.error("Lobby: Error handling POST:", e);
      }
    }

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  }

  // Broadcast updated room list to all connected clients
  private broadcastRoomList() {
    const roomList = Array.from(this.state.rooms.values())
      .filter((r) => r.gameStatus === "waiting")
      .sort((a, b) => b.updatedAt - a.updatedAt);

    this.room.broadcast(
      JSON.stringify({
        type: "ROOM_LIST",
        rooms: roomList,
      })
    );
  }

  // Cleanup old/stale rooms (can be called periodically)
  private cleanupStaleRooms() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of this.state.rooms) {
      if (now - room.updatedAt > staleThreshold) {
        this.state.rooms.delete(roomId);
      }
    }
  }
}
