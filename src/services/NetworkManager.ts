import PartySocket from "partysocket";

export interface PlayerState {
  id: string;
  playerNumber: number;
  x: number;
  y: number;
  flipX: boolean;
  anim: string;
  isReady: boolean;
}

export interface GameEventData {
  type: string;
  [key: string]: any;
}

type MessageHandler = (data: any) => void;

class NetworkManager {
  private socket: PartySocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();

  public myPlayerId: string = "";
  public myPlayerNumber: number = 0;
  public isHost: boolean = false;
  public roomId: string = "";
  public players: Map<string, PlayerState> = new Map();
  public isConnected: boolean = false;

  // Partykit host
  // For local dev: "localhost:1999"
  // For production: "dino-clash-adventure.batterybuildsog1.partykit.dev"
  private partyHost: string = (import.meta as any).env?.VITE_PARTYKIT_HOST || "dino-clash-adventure.batterybuildsog1.partykit.dev";

  constructor() {}

  // Generate a simple room code
  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create a new room (host)
  public createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      const roomId = this.generateRoomCode();
      this.connectToRoom(roomId)
        .then(() => resolve(roomId))
        .catch(reject);
    });
  }

  // Join an existing room
  public joinRoom(roomId: string): Promise<void> {
    return this.connectToRoom(roomId.toUpperCase());
  }

  // Connect to a room
  private connectToRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new PartySocket({
          host: this.partyHost,
          room: roomId,
        });

        this.socket.addEventListener("open", () => {
          console.log("Connected to room:", roomId);
          this.roomId = roomId;
          this.isConnected = true;
        });

        this.socket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);

            // Resolve promise on WELCOME message
            if (data.type === "WELCOME") {
              resolve();
            }
          } catch (e) {
            console.error("Error parsing message:", e);
          }
        });

        this.socket.addEventListener("close", () => {
          console.log("Disconnected from room");
          this.isConnected = false;
          this.emit("disconnected", {});
        });

        this.socket.addEventListener("error", (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        });

        // Timeout if no WELCOME received
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Connection timeout"));
          }
        }, 10000);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Handle incoming messages
  private handleMessage(data: any) {
    switch (data.type) {
      case "WELCOME":
        this.myPlayerId = data.playerId;
        this.myPlayerNumber = data.playerNumber;
        this.isHost = data.isHost;
        this.roomId = data.roomId;
        // Initialize players map
        data.players.forEach((p: PlayerState) => {
          this.players.set(p.id, p);
        });
        this.emit("welcome", data);
        break;

      case "PLAYER_JOINED":
        this.players.set(data.player.id, data.player);
        this.emit("playerJoined", data);
        break;

      case "PLAYER_LEFT":
        this.players.delete(data.playerId);
        this.emit("playerLeft", data);
        break;

      case "YOU_ARE_HOST":
        this.isHost = true;
        this.emit("becameHost", {});
        break;

      case "PLAYER_UPDATE":
        const player = this.players.get(data.playerId);
        if (player) {
          player.x = data.x;
          player.y = data.y;
          player.flipX = data.flipX;
          player.anim = data.anim;
        }
        this.emit("playerUpdate", data);
        break;

      case "PLAYER_READY":
        const readyPlayer = this.players.get(data.playerId);
        if (readyPlayer) {
          readyPlayer.isReady = true;
        }
        this.emit("playerReady", data);
        break;

      case "GAME_START":
        this.emit("gameStart", data);
        break;

      case "GAME_EVENT":
        this.emit("gameEvent", data);
        break;

      case "ROOM_FULL":
        this.emit("roomFull", {});
        break;

      case "CHAT":
        this.emit("chat", data);
        break;
    }
  }

  // Send player position/state update
  public sendPlayerUpdate(x: number, y: number, flipX: boolean, anim: string) {
    this.send({
      type: "PLAYER_UPDATE",
      x,
      y,
      flipX,
      anim,
    });
  }

  // Mark player as ready
  public sendReady() {
    this.send({ type: "PLAYER_READY" });
  }

  // Start the game (host only)
  public startGame(levelId: number) {
    if (this.isHost) {
      this.send({
        type: "START_GAME",
        levelId,
      });
    }
  }

  // Send a game event (enemy killed, egg collected, etc.)
  public sendGameEvent(event: string, eventData: any) {
    this.send({
      type: "GAME_EVENT",
      event,
      data: eventData,
    });
  }

  // Send raw message
  public send(data: any) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // Event subscription system
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

  private emit(event: string, data: any) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  // Disconnect
  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.myPlayerId = "";
    this.myPlayerNumber = 0;
    this.isHost = false;
    this.roomId = "";
    this.players.clear();
  }

  // Get other players (excluding self)
  public getOtherPlayers(): PlayerState[] {
    return Array.from(this.players.values()).filter(
      (p) => p.id !== this.myPlayerId
    );
  }

  // Get all players
  public getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  // Get player count
  public getPlayerCount(): number {
    return this.players.size;
  }

  // Get shareable URL for current room
  public getShareableUrl(): string {
    if (!this.roomId) return "";
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?room=${this.roomId}`;
  }
}

export const networkManager = new NetworkManager();
