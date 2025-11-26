import type * as Party from "partykit/server";

// Game room state
interface PlayerState {
  id: string;
  playerNumber: number;
  x: number;
  y: number;
  flipX: boolean;
  anim: string;
  isReady: boolean;
}

interface RoomState {
  players: Map<string, PlayerState>;
  hostId: string | null;
  gameStarted: boolean;
  currentLevel: number;
}

export default class GameRoom implements Party.Server {
  state: RoomState = {
    players: new Map(),
    hostId: null,
    gameStarted: false,
    currentLevel: 1,
  };

  constructor(readonly room: Party.Room) {}

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

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
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

    const playerState: PlayerState = {
      id: conn.id,
      playerNumber,
      x: 100 + (playerNumber - 1) * 50,
      y: 400,
      flipX: false,
      anim: "dino-idle",
      isReady: false,
    };

    this.state.players.set(conn.id, playerState);

    // Send welcome message to new player
    conn.send(
      JSON.stringify({
        type: "WELCOME",
        playerId: conn.id,
        playerNumber,
        isHost,
        roomId: this.room.id,
        players: Array.from(this.state.players.values()),
      })
    );

    // Broadcast player joined to all others
    this.room.broadcast(
      JSON.stringify({
        type: "PLAYER_JOINED",
        player: playerState,
        playerCount: this.state.players.size,
      }),
      [conn.id] // Exclude the new player
    );
  }

  onClose(conn: Party.Connection) {
    const player = this.state.players.get(conn.id);
    if (!player) return;

    this.state.players.delete(conn.id);

    // If host left, assign new host
    if (conn.id === this.state.hostId) {
      const remainingPlayers = Array.from(this.state.players.keys());
      this.state.hostId = remainingPlayers[0] || null;

      if (this.state.hostId) {
        // Notify new host
        const newHostConn = this.room.getConnection(this.state.hostId);
        if (newHostConn) {
          newHostConn.send(JSON.stringify({ type: "YOU_ARE_HOST" }));
        }
      }
    }

    // Broadcast player left
    this.room.broadcast(
      JSON.stringify({
        type: "PLAYER_LEFT",
        playerId: conn.id,
        playerNumber: player.playerNumber,
        playerCount: this.state.players.size,
        newHostId: this.state.hostId,
      })
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "PLAYER_UPDATE":
          // Update player state and broadcast to others
          const player = this.state.players.get(sender.id);
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
              }),
              [sender.id]
            );
          }
          break;

        case "PLAYER_READY":
          const readyPlayer = this.state.players.get(sender.id);
          if (readyPlayer) {
            readyPlayer.isReady = true;
            this.room.broadcast(
              JSON.stringify({
                type: "PLAYER_READY",
                playerId: sender.id,
                playerNumber: readyPlayer.playerNumber,
              })
            );
          }
          break;

        case "START_GAME":
          // Only host can start
          if (sender.id === this.state.hostId) {
            this.state.gameStarted = true;
            this.state.currentLevel = data.levelId || 1;
            this.room.broadcast(
              JSON.stringify({
                type: "GAME_START",
                levelId: this.state.currentLevel,
                players: Array.from(this.state.players.values()),
              })
            );
          }
          break;

        case "GAME_EVENT":
          // Broadcast game events (enemy killed, egg collected, etc.)
          this.room.broadcast(
            JSON.stringify({
              type: "GAME_EVENT",
              event: data.event,
              data: data.data,
              fromPlayer: sender.id,
            }),
            [sender.id]
          );
          break;

        case "CHAT":
          this.room.broadcast(
            JSON.stringify({
              type: "CHAT",
              playerId: sender.id,
              message: data.message,
            })
          );
          break;
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  }
}
