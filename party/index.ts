import type * as Party from "partykit/server";
import type { RoomInfo } from "./lobby";

// Player state within a game room
export interface PlayerState {
  id: string;
  playerNumber: number;
  playerName: string;
  x: number;
  y: number;
  flipX: boolean;
  anim: string;
  isReady: boolean;
}

// Game room state
interface RoomState {
  players: Map<string, PlayerState>;
  hostId: string | null;
  hostName: string;
  roomName: string;
  gameStatus: "waiting" | "playing";
  currentLevel: number;
  createdAt: number;
  // Multiplayer game tracking
  playersAtExit: Set<string>;
  eliminatedPlayers: Set<string>;
}

// Message types from clients
type ClientMessage =
  | { type: "SET_PLAYER_NAME"; name: string }
  | { type: "SET_ROOM_NAME"; name: string }
  | { type: "PLAYER_UPDATE"; x: number; y: number; flipX: boolean; anim: string; velocityY?: number; isAirborne?: boolean }
  | { type: "PLAYER_READY"; isReady: boolean }
  | { type: "START_GAME"; levelId?: number }
  | { type: "GAME_EVENT"; event: string; data: any }
  | { type: "CHAT"; message: string }
  | { type: "RETURN_TO_LOBBY" };

export default class GameRoom implements Party.Server {
  state: RoomState = {
    players: new Map(),
    hostId: null,
    hostName: "Host",
    roomName: "Game Room",
    gameStatus: "waiting",
    currentLevel: 1,
    createdAt: Date.now(),
    playersAtExit: new Set(),
    eliminatedPlayers: new Set(),
  };

  // Track if we've registered with the lobby
  private registeredWithLobby: boolean = false;

  // Store the host URL extracted from first connection
  private partyHost: string = "";

  constructor(readonly room: Party.Room) {}

  // Get the lobby URL for this partykit deployment
  private getLobbyUrl(): string {
    // Use the host extracted from connection, or fall back to env var
    const host = this.partyHost || this.room.env.PARTYKIT_HOST || "localhost:1999";
    const protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}/parties/lobby/main`;
  }

  // Notify lobby of room state changes
  private async notifyLobby(
    type: "ROOM_CREATED" | "ROOM_UPDATED" | "ROOM_CLOSED"
  ) {
    const lobbyUrl = this.getLobbyUrl();
    console.log(`Notifying lobby (${type}): ${lobbyUrl}`);

    try {
      if (type === "ROOM_CLOSED") {
        const response = await fetch(lobbyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ROOM_CLOSED",
            roomId: this.room.id,
          }),
        });
        console.log(`Lobby notification response (${type}):`, response.status);
        this.registeredWithLobby = false;
      } else {
        const roomInfo: RoomInfo = {
          roomId: this.room.id,
          roomName: this.state.roomName,
          hostName: this.state.hostName,
          playerCount: this.state.players.size,
          maxPlayers: 4,
          gameStatus: this.state.gameStatus,
          createdAt: this.state.createdAt,
          updatedAt: Date.now(),
        };

        console.log(`Sending room info to lobby:`, JSON.stringify(roomInfo));

        const response = await fetch(lobbyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            room: roomInfo,
          }),
        });
        console.log(`Lobby notification response (${type}):`, response.status);

        if (response.ok) {
          this.registeredWithLobby = true;
        } else {
          console.error(`Lobby returned error status: ${response.status}`);
        }
      }
    } catch (e) {
      console.error("Failed to notify lobby:", e);
      console.error("Lobby URL was:", lobbyUrl);
      console.error("PartyHost was:", this.partyHost);
    }
  }

  // Assign player number (1-4)
  private getNextPlayerNumber(): number {
    const usedNumbers = new Set(
      Array.from(this.state.players.values()).map((p) => p.playerNumber)
    );
    for (let i = 1; i <= 4; i++) {
      if (!usedNumbers.has(i)) return i;
    }
    return -1; // Room full
  }

  // Check if all players are ready (for starting game)
  private areAllPlayersReady(): boolean {
    if (this.state.players.size === 0) return false;
    return Array.from(this.state.players.values()).every((p) => p.isReady);
  }

  // Get ready count
  private getReadyCount(): number {
    return Array.from(this.state.players.values()).filter((p) => p.isReady)
      .length;
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Extract and store the host from the request URL for lobby communication
    if (!this.partyHost) {
      try {
        const url = new URL(ctx.request.url);
        this.partyHost = url.host;
        console.log("Extracted partyHost:", this.partyHost);
      } catch (e) {
        console.error("Failed to extract host from URL:", e);
      }
    }

    // Check if game already started
    if (this.state.gameStatus === "playing") {
      conn.send(JSON.stringify({ type: "GAME_IN_PROGRESS" }));
      conn.close();
      return;
    }

    // Check if room is full
    if (this.state.players.size >= 4) {
      conn.send(JSON.stringify({ type: "ROOM_FULL" }));
      conn.close();
      return;
    }

    const playerNumber = this.getNextPlayerNumber();
    const isHost = this.state.hostId === null;

    if (isHost) {
      this.state.hostId = conn.id;
    }

    // Extract player name from URL params if provided
    const url = new URL(ctx.request.url);
    const playerName = url.searchParams.get("name") || `Player ${playerNumber}`;

    const playerState: PlayerState = {
      id: conn.id,
      playerNumber,
      playerName,
      x: 100 + (playerNumber - 1) * 50,
      y: 400,
      flipX: false,
      anim: "dino-idle",
      isReady: false,
    };

    this.state.players.set(conn.id, playerState);

    // If first player, set room name and host name
    if (isHost) {
      this.state.hostName = playerName;
      this.state.roomName = `${playerName}'s Game`;
    }

    // Send welcome message to new player
    conn.send(
      JSON.stringify({
        type: "WELCOME",
        playerId: conn.id,
        playerNumber,
        playerName,
        isHost,
        roomId: this.room.id,
        roomName: this.state.roomName,
        hostName: this.state.hostName,
        players: Array.from(this.state.players.values()),
        readyCount: this.getReadyCount(),
        allReady: this.areAllPlayersReady(),
      })
    );

    // Broadcast player joined to all others
    this.room.broadcast(
      JSON.stringify({
        type: "PLAYER_JOINED",
        player: playerState,
        playerCount: this.state.players.size,
        readyCount: this.getReadyCount(),
        allReady: this.areAllPlayersReady(),
      }),
      [conn.id] // Exclude the new player
    );

    // Notify lobby
    if (!this.registeredWithLobby) {
      this.notifyLobby("ROOM_CREATED");
    } else {
      this.notifyLobby("ROOM_UPDATED");
    }
  }

  onClose(conn: Party.Connection) {
    const player = this.state.players.get(conn.id);
    if (!player) return;

    this.state.players.delete(conn.id);

    // Clean up exit/elimination tracking
    this.state.playersAtExit.delete(conn.id);
    this.state.eliminatedPlayers.delete(conn.id);

    // If room is now empty, close it
    if (this.state.players.size === 0) {
      this.notifyLobby("ROOM_CLOSED");
      return;
    }

    // If host left, assign new host
    let newHostId: string | null = null;
    if (conn.id === this.state.hostId) {
      const remainingPlayers = Array.from(this.state.players.values());
      const newHost = remainingPlayers[0];
      if (newHost) {
        this.state.hostId = newHost.id;
        this.state.hostName = newHost.playerName;
        newHostId = newHost.id;

        // Notify new host
        const newHostConn = this.room.getConnection(newHost.id);
        if (newHostConn) {
          newHostConn.send(
            JSON.stringify({
              type: "YOU_ARE_HOST",
              hostName: this.state.hostName,
            })
          );
        }
      }
    }

    // Broadcast player left
    this.room.broadcast(
      JSON.stringify({
        type: "PLAYER_LEFT",
        playerId: conn.id,
        playerNumber: player.playerNumber,
        playerName: player.playerName,
        playerCount: this.state.players.size,
        newHostId,
        hostName: this.state.hostName,
        readyCount: this.getReadyCount(),
        allReady: this.areAllPlayersReady(),
      })
    );

    // Notify lobby of player count change
    this.notifyLobby("ROOM_UPDATED");
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage;
      const player = this.state.players.get(sender.id);

      switch (data.type) {
        case "SET_PLAYER_NAME":
          if (player) {
            player.playerName = data.name;
            // If host, update host name
            if (sender.id === this.state.hostId) {
              this.state.hostName = data.name;
            }
            this.room.broadcast(
              JSON.stringify({
                type: "PLAYER_NAME_CHANGED",
                playerId: sender.id,
                playerNumber: player.playerNumber,
                playerName: data.name,
                hostName: this.state.hostName,
              })
            );
            this.notifyLobby("ROOM_UPDATED");
          }
          break;

        case "SET_ROOM_NAME":
          // Only host can change room name
          if (sender.id === this.state.hostId) {
            this.state.roomName = data.name;
            this.room.broadcast(
              JSON.stringify({
                type: "ROOM_NAME_CHANGED",
                roomName: data.name,
              })
            );
            this.notifyLobby("ROOM_UPDATED");
          }
          break;

        case "PLAYER_UPDATE":
          if (player) {
            player.x = data.x;
            player.y = data.y;
            player.flipX = data.flipX;
            player.anim = data.anim;

            // Broadcast to all OTHER players
            this.room.broadcast(
              JSON.stringify({
                type: "PLAYER_UPDATE",
                playerId: sender.id,
                playerNumber: player.playerNumber,
                x: data.x,
                y: data.y,
                flipX: data.flipX,
                anim: data.anim,
                velocityY: data.velocityY ?? 0,
                isAirborne: data.isAirborne ?? false,
              }),
              [sender.id]
            );
          }
          break;

        case "PLAYER_READY":
          if (player && this.state.gameStatus === "waiting") {
            player.isReady = data.isReady;
            const readyCount = this.getReadyCount();
            const allReady = this.areAllPlayersReady();

            this.room.broadcast(
              JSON.stringify({
                type: "PLAYER_READY_CHANGED",
                playerId: sender.id,
                playerNumber: player.playerNumber,
                isReady: player.isReady,
                readyCount,
                allReady,
              })
            );
          }
          break;

        case "START_GAME":
          // Only host can start, and all players must be ready (or solo)
          if (sender.id === this.state.hostId) {
            const playerCount = this.state.players.size;
            const allReady = this.areAllPlayersReady();

            // Allow start if: solo play OR all players ready
            if (playerCount === 1 || allReady) {
              this.state.gameStatus = "playing";
              this.state.currentLevel = data.levelId || 1;

              // Reset game tracking state
              this.state.playersAtExit.clear();
              this.state.eliminatedPlayers.clear();

              this.room.broadcast(
                JSON.stringify({
                  type: "GAME_START",
                  levelId: this.state.currentLevel,
                  players: Array.from(this.state.players.values()),
                })
              );

              // Notify lobby that game started
              this.notifyLobby("ROOM_UPDATED");
            } else {
              // Not all players ready
              sender.send(
                JSON.stringify({
                  type: "CANNOT_START",
                  reason: "NOT_ALL_READY",
                  readyCount: this.getReadyCount(),
                  totalPlayers: playerCount,
                })
              );
            }
          }
          break;

        case "GAME_EVENT":
          // Handle specific game events with server authority
          console.log(`[GAME-EVENT] ${data.event} from ${sender.id}:`, JSON.stringify(data.data));

          if (data.event === "PLAYER_AT_EXIT") {
            // Server tracks who's at exit
            this.state.playersAtExit.add(sender.id);
            console.log(`[EXIT] Player ${sender.id} at exit. Total: ${this.state.playersAtExit.size}/${this.state.players.size}`);

            // Check if all non-eliminated players are at exit
            const activePlayers = Array.from(this.state.players.keys())
              .filter(id => !this.state.eliminatedPlayers.has(id));
            const allAtExit = activePlayers.every(id => this.state.playersAtExit.has(id));

            if (allAtExit && activePlayers.length > 0) {
              console.log(`[EXIT] All active players at exit! Broadcasting ALL_AT_EXIT`);
              // Broadcast to ALL players (including sender)
              this.room.broadcast(
                JSON.stringify({
                  type: "GAME_EVENT",
                  event: "ALL_AT_EXIT",
                  data: {},
                })
              );
            } else {
              // Just relay to others
              this.room.broadcast(
                JSON.stringify({
                  type: "GAME_EVENT",
                  event: data.event,
                  data: data.data,
                  fromPlayer: sender.id,
                }),
                [sender.id]
              );
            }
          } else if (data.event === "PLAYER_DIED") {
            // Track eliminated players
            if (data.data.livesRemaining <= 0) {
              this.state.eliminatedPlayers.add(sender.id);
              console.log(`[DEATH] Player ${sender.id} eliminated. Total eliminated: ${this.state.eliminatedPlayers.size}/${this.state.players.size}`);

              // Check if all players are eliminated
              if (this.state.eliminatedPlayers.size >= this.state.players.size) {
                console.log(`[DEATH] All players eliminated! Broadcasting ALL_PLAYERS_ELIMINATED`);
                this.room.broadcast(
                  JSON.stringify({
                    type: "GAME_EVENT",
                    event: "ALL_PLAYERS_ELIMINATED",
                    data: {},
                  })
                );
              }
            }

            // Relay death event to others
            this.room.broadcast(
              JSON.stringify({
                type: "GAME_EVENT",
                event: data.event,
                data: data.data,
                fromPlayer: sender.id,
              }),
              [sender.id]
            );
          } else if (data.event === "NEXT_LEVEL") {
            // Reset exit/elimination state for new level
            this.state.playersAtExit.clear();
            this.state.eliminatedPlayers.clear();
            this.state.currentLevel = data.data.levelId;
            console.log(`[LEVEL] Transitioning to level ${data.data.levelId}`);

            // Broadcast to all (including sender for consistency)
            this.room.broadcast(
              JSON.stringify({
                type: "GAME_EVENT",
                event: data.event,
                data: data.data,
                fromPlayer: sender.id,
              }),
              [sender.id]
            );
          } else {
            // Default: broadcast to others
            console.log(`[GAME-EVENT] Broadcasting to ${this.state.players.size - 1} other players`);
            this.room.broadcast(
              JSON.stringify({
                type: "GAME_EVENT",
                event: data.event,
                data: data.data,
                fromPlayer: sender.id,
              }),
              [sender.id]
            );
          }
          break;

        case "CHAT":
          if (player) {
            this.room.broadcast(
              JSON.stringify({
                type: "CHAT",
                playerId: sender.id,
                playerNumber: player.playerNumber,
                playerName: player.playerName,
                message: data.message,
              })
            );
          }
          break;

        case "RETURN_TO_LOBBY":
          // Only host can return everyone to lobby
          if (sender.id === this.state.hostId) {
            this.state.gameStatus = "waiting";
            // Reset all ready states
            for (const p of this.state.players.values()) {
              p.isReady = false;
            }
            this.room.broadcast(
              JSON.stringify({
                type: "RETURNED_TO_LOBBY",
                players: Array.from(this.state.players.values()),
              })
            );
            // Notify lobby that room is available again
            this.notifyLobby("ROOM_UPDATED");
          }
          break;
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  }

  // HTTP endpoint for room info
  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "GET") {
      const roomInfo: RoomInfo = {
        roomId: this.room.id,
        roomName: this.state.roomName,
        hostName: this.state.hostName,
        playerCount: this.state.players.size,
        maxPlayers: 4,
        gameStatus: this.state.gameStatus,
        createdAt: this.state.createdAt,
        updatedAt: Date.now(),
      };

      return new Response(
        JSON.stringify({
          room: roomInfo,
          players: Array.from(this.state.players.values()),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  }
}
