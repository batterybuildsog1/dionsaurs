import PartySocket from "partysocket";
import { PlayerStatsData } from "./PlayerStats";

export interface PlayerState {
  id: string;
  playerNumber: number;
  playerName: string;
  x: number;
  y: number;
  flipX: boolean;
  anim: string;
  isReady: boolean;
  velocityY?: number;    // For jump state detection
  isAirborne?: boolean;  // Ground vs air movement state
}

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

type MessageHandler = (data: any) => void;

class NetworkManager {
  private lobbySocket: PartySocket | null = null;
  private gameSocket: PartySocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  // Lobby state
  public rooms: RoomInfo[] = [];
  public isLobbyConnected: boolean = false;

  // Game room state
  public myPlayerId: string = "";
  public myPlayerNumber: number = 0;
  public myPlayerName: string = "";
  public isHost: boolean = false;
  public roomId: string = "";
  public roomName: string = "";
  public hostName: string = "";
  public players: Map<string, PlayerState> = new Map();
  public isConnected: boolean = false;
  public readyCount: number = 0;
  public allReady: boolean = false;

  // Partykit host
  private partyHost: string = (import.meta as any).env?.VITE_PARTYKIT_HOST || "dino-clash-adventure.batterybuildsog1.partykit.dev";

  constructor() {}

  // ============= LOBBY METHODS =============

  public connectToLobby(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.lobbySocket = new PartySocket({
          host: this.partyHost,
          party: "lobby",
          room: "main",
        });

        this.lobbySocket.addEventListener("open", () => {
          console.log("Connected to lobby");
          this.isLobbyConnected = true;
          resolve();
        });

        this.lobbySocket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "ROOM_LIST") {
              this.rooms = data.rooms;
              this.emit("roomListUpdated", { rooms: this.rooms });
            }
          } catch (e) {
            console.error("Error parsing lobby message:", e);
          }
        });

        this.lobbySocket.addEventListener("close", () => {
          this.isLobbyConnected = false;
          this.emit("lobbyDisconnected", {});
        });

        this.lobbySocket.addEventListener("error", (error) => {
          console.error("Lobby error:", error);
          reject(error);
        });

        setTimeout(() => {
          if (!this.isLobbyConnected) {
            reject(new Error("Lobby connection timeout"));
          }
        }, 10000);
      } catch (e) {
        reject(e);
      }
    });
  }

  public disconnectFromLobby() {
    if (this.lobbySocket) {
      this.lobbySocket.close();
      this.lobbySocket = null;
    }
    this.isLobbyConnected = false;
    this.rooms = [];
  }

  public refreshRoomList() {
    if (this.lobbySocket && this.isLobbyConnected) {
      this.lobbySocket.send(JSON.stringify({ type: "LIST_ROOMS" }));
    }
  }

  // ============= GAME ROOM METHODS =============

  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public createRoom(playerName: string = "Player"): Promise<string> {
    return new Promise((resolve, reject) => {
      const roomId = this.generateRoomCode();
      this.connectToRoom(roomId, playerName)
        .then(() => resolve(roomId))
        .catch(reject);
    });
  }

  public joinRoom(roomId: string, playerName: string = "Player"): Promise<void> {
    return this.connectToRoom(roomId.toUpperCase(), playerName);
  }

  private connectToRoom(roomId: string, playerName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Disconnect from any existing game
        this.disconnectFromGame();

        // Track if WELCOME was received (not just socket open)
        let welcomeReceived = false;
        let connectionRejected = false;

        this.gameSocket = new PartySocket({
          host: this.partyHost,
          party: "game",
          room: roomId,
          query: { name: playerName },
        });

        this.gameSocket.addEventListener("open", () => {
          console.log("[NetworkManager] Socket opened to room:", roomId);
          this.roomId = roomId;
          this.isConnected = true;
        });

        this.gameSocket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);

            // Track WELCOME receipt for timeout logic
            if (data.type === "WELCOME") {
              console.log("[NetworkManager] WELCOME received for player:", data.playerId);
              welcomeReceived = true;
            }

            this.handleGameMessage(data,
              () => {
                if (!connectionRejected) resolve();
              },
              (err) => {
                if (!connectionRejected) {
                  connectionRejected = true;
                  reject(err);
                }
              }
            );
          } catch (e) {
            console.error("[NetworkManager] Error parsing game message:", e);
          }
        });

        this.gameSocket.addEventListener("close", (event) => {
          console.log("[NetworkManager] Socket closed. Code:", event.code, "Reason:", event.reason);
          this.isConnected = false;
          this.emit("disconnected", {});
        });

        this.gameSocket.addEventListener("error", (error) => {
          console.error("[NetworkManager] Socket error:", error);
          if (!connectionRejected) {
            connectionRejected = true;
            reject(error);
          }
        });

        // FIXED: Check if WELCOME was received, not just socket open
        // Also add a longer timeout with retry logic
        const checkWelcome = () => {
          if (connectionRejected) return;

          if (!welcomeReceived) {
            if (!this.isConnected) {
              // Socket never even opened
              connectionRejected = true;
              reject(new Error("Connection timeout - socket failed to open"));
            } else {
              // Socket opened but WELCOME never received
              console.warn("[NetworkManager] WELCOME not received after 10s, socket is open but server may not have responded");
              connectionRejected = true;
              this.disconnectFromGame();
              reject(new Error("Connection timeout - WELCOME message not received. The room may be full or unavailable."));
            }
          }
        };

        setTimeout(checkWelcome, 10000);
      } catch (e) {
        reject(e);
      }
    });
  }

  private handleGameMessage(data: any, resolve?: (value: void) => void, reject?: (reason?: any) => void) {
    switch (data.type) {
      case "WELCOME":
        this.myPlayerId = data.playerId;
        this.myPlayerNumber = data.playerNumber;
        this.myPlayerName = data.playerName;
        this.isHost = data.isHost;
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.hostName = data.hostName;
        this.readyCount = data.readyCount;
        this.allReady = data.allReady;
        this.players.clear();
        data.players.forEach((p: PlayerState) => {
          this.players.set(p.id, p);
        });
        this.emit("welcome", data);
        if (resolve) resolve();
        break;

      case "PLAYER_JOINED":
        this.players.set(data.player.id, data.player);
        this.readyCount = data.readyCount;
        this.allReady = data.allReady;
        this.emit("playerJoined", data);
        break;

      case "PLAYER_LEFT":
        this.players.delete(data.playerId);
        this.readyCount = data.readyCount;
        this.allReady = data.allReady;
        if (data.newHostId === this.myPlayerId) {
          this.isHost = true;
          this.hostName = data.hostName;
        }
        this.emit("playerLeft", data);
        break;

      case "YOU_ARE_HOST":
        this.isHost = true;
        this.hostName = data.hostName;
        this.emit("becameHost", data);
        break;

      case "PLAYER_NAME_CHANGED":
        const namedPlayer = this.players.get(data.playerId);
        if (namedPlayer) {
          namedPlayer.playerName = data.playerName;
        }
        this.hostName = data.hostName;
        this.emit("playerNameChanged", data);
        break;

      case "ROOM_NAME_CHANGED":
        this.roomName = data.roomName;
        this.emit("roomNameChanged", data);
        break;

      case "PLAYER_READY_CHANGED":
        const readyPlayer = this.players.get(data.playerId);
        if (readyPlayer) {
          readyPlayer.isReady = data.isReady;
        }
        this.readyCount = data.readyCount;
        this.allReady = data.allReady;
        this.emit("playerReadyChanged", data);
        break;

      case "PLAYER_UPDATE":
        const updatedPlayer = this.players.get(data.playerId);
        if (updatedPlayer) {
          updatedPlayer.x = data.x;
          updatedPlayer.y = data.y;
          updatedPlayer.flipX = data.flipX;
          updatedPlayer.anim = data.anim;
        }
        this.emit("playerUpdate", data);
        break;

      case "GAME_START":
        this.emit("gameStart", data);
        break;

      case "CANNOT_START":
        this.emit("cannotStart", data);
        break;

      case "GAME_EVENT":
        this.emit("gameEvent", data);
        break;

      case "RETURNED_TO_LOBBY":
        this.players.clear();
        data.players.forEach((p: PlayerState) => {
          this.players.set(p.id, p);
        });
        this.readyCount = 0;
        this.allReady = false;
        this.emit("returnedToLobby", data);
        break;

      case "ROOM_FULL":
        this.emit("roomFull", {});
        if (reject) reject(new Error("Room is full"));
        break;

      case "GAME_IN_PROGRESS":
        this.emit("gameInProgress", {});
        if (reject) reject(new Error("Game already in progress"));
        break;

      case "CHAT":
        this.emit("chat", data);
        break;
    }
  }

  // ============= GAME ACTIONS =============

  public setPlayerName(name: string) {
    this.myPlayerName = name;
    this.send({ type: "SET_PLAYER_NAME", name });
  }

  public setRoomName(name: string) {
    if (this.isHost) {
      this.send({ type: "SET_ROOM_NAME", name });
    }
  }

  public setReady(isReady: boolean) {
    this.send({ type: "PLAYER_READY", isReady });
  }

  public startGame(levelId: number = 1) {
    if (this.isHost) {
      this.send({ type: "START_GAME", levelId });
    }
  }

  public sendPlayerUpdate(
    x: number,
    y: number,
    flipX: boolean,
    anim: string,
    velocityY: number = 0,
    isAirborne: boolean = false
  ) {
    this.send({ type: "PLAYER_UPDATE", x, y, flipX, anim, velocityY, isAirborne });
  }

  public sendGameEvent(event: string, eventData: any) {
    this.send({ type: "GAME_EVENT", event, data: eventData });
  }

  public sendPlayerStats(stats: PlayerStatsData) {
    this.send({ type: "GAME_EVENT", event: "PLAYER_STATS", data: { playerId: this.myPlayerId, stats } });
  }

  public returnToLobby() {
    if (this.isHost) {
      this.send({ type: "RETURN_TO_LOBBY" });
    }
  }

  private send(data: any) {
    if (this.gameSocket && this.isConnected) {
      this.gameSocket.send(JSON.stringify(data));
    }
  }

  // ============= CLEANUP =============

  public disconnectFromGame() {
    if (this.gameSocket) {
      this.gameSocket.close();
      this.gameSocket = null;
    }
    this.isConnected = false;
    this.myPlayerId = "";
    this.myPlayerNumber = 0;
    this.isHost = false;
    this.roomId = "";
    this.roomName = "";
    this.hostName = "";
    this.players.clear();
    this.readyCount = 0;
    this.allReady = false;
  }

  public disconnect() {
    this.disconnectFromLobby();
    this.disconnectFromGame();
  }

  // ============= HELPERS =============

  public getOtherPlayers(): PlayerState[] {
    return Array.from(this.players.values()).filter(p => p.id !== this.myPlayerId);
  }

  public getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  // ============= EVENT SYSTEM =============

  public on(event: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public clearHandlers() {
    this.messageHandlers.clear();
  }

  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

export const networkManager = new NetworkManager();
