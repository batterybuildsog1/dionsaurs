import Phaser from "phaser";
import { networkManager } from "../services/NetworkManager";

export class NetworkMenuScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private playerListText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Text;
  private roomCodeText!: Phaser.GameObjects.Text;

  constructor() {
    super("NetworkMenuScene");
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Clean up any previous connection
    networkManager.disconnect();

    this.add
      .text(width / 2, 50, "Online Multiplayer", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 90, "Play with 2-4 players!", {
        fontSize: "18px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    // Create Room Button
    const createBtn = this.add
      .text(width / 2, 180, "Create Room", {
        fontSize: "28px",
        color: "#00ff00",
        backgroundColor: "#003300",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Join Room Button
    const joinBtn = this.add
      .text(width / 2, 250, "Join Room", {
        fontSize: "28px",
        color: "#00ffff",
        backgroundColor: "#003333",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Room Code Display
    this.roomCodeText = this.add
      .text(width / 2, 330, "", {
        fontSize: "32px",
        color: "#ffff00",
        backgroundColor: "#333300",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5);

    // Player List
    this.playerListText = this.add
      .text(width / 2, 400, "", {
        fontSize: "18px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // Status Text
    this.statusText = this.add
      .text(width / 2, 480, "", {
        fontSize: "16px",
        color: "#aaaaaa",
        align: "center",
      })
      .setOrigin(0.5);

    // Start Game Button (only visible for host when 2+ players)
    this.startBtn = this.add
      .text(width / 2, 540, "Start Game!", {
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#006600",
        padding: { x: 30, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    // Back Button
    const backBtn = this.add
      .text(50, height - 40, "< Back", {
        fontSize: "20px",
        color: "#ff6666",
      })
      .setInteractive({ useHandCursor: true });

    // Event Handlers
    createBtn.on("pointerdown", () => this.createRoom());
    joinBtn.on("pointerdown", () => this.joinRoom());
    this.startBtn.on("pointerdown", () => this.startGame());
    backBtn.on("pointerdown", () => {
      networkManager.disconnect();
      this.scene.start("MenuScene");
    });

    // Setup network event listeners
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    networkManager.on("welcome", () => {
      this.updateUI();
    });

    networkManager.on("playerJoined", (data) => {
      this.statusText.setText(`Player ${data.player.playerNumber} joined!`);
      this.updateUI();
    });

    networkManager.on("playerLeft", (data) => {
      this.statusText.setText(`Player ${data.playerNumber} left`);
      this.updateUI();
    });

    networkManager.on("becameHost", () => {
      this.statusText.setText("You are now the host!");
      this.updateUI();
    });

    networkManager.on("gameStart", (data) => {
      this.scene.start("GameScene", {
        levelId: data.levelId,
        isMultiplayer: true,
        players: data.players,
      });
    });

    networkManager.on("roomFull", () => {
      this.statusText.setText("Room is full! (max 4 players)");
    });

    networkManager.on("disconnected", () => {
      this.statusText.setText("Disconnected from server");
      this.roomCodeText.setText("");
      this.playerListText.setText("");
      this.startBtn.setVisible(false);
    });
  }

  private async createRoom() {
    this.statusText.setText("Creating room...");

    try {
      const roomId = await networkManager.createRoom();
      this.roomCodeText.setText(`Room: ${roomId}`);
      this.statusText.setText("Share this code with friends!");
      this.updateUI();
    } catch (e) {
      this.statusText.setText("Failed to create room. Try again.");
      console.error(e);
    }
  }

  private joinRoom() {
    const roomId = prompt("Enter Room Code:");
    if (!roomId) return;

    this.statusText.setText("Joining room...");

    networkManager
      .joinRoom(roomId)
      .then(() => {
        this.roomCodeText.setText(`Room: ${roomId.toUpperCase()}`);
        this.statusText.setText("Connected! Waiting for host to start...");
        this.updateUI();
      })
      .catch((e) => {
        this.statusText.setText("Failed to join. Check the code and try again.");
        console.error(e);
      });
  }

  private updateUI() {
    // Update player list
    const players = networkManager.getAllPlayers();
    const playerLines = players.map((p) => {
      const isMe = p.id === networkManager.myPlayerId;
      const isHost = p.playerNumber === 1 || networkManager.isHost && isMe;
      return `Player ${p.playerNumber}${isMe ? " (You)" : ""}${isHost ? " [Host]" : ""}`;
    });
    this.playerListText.setText(
      `Players (${players.length}/4):\n${playerLines.join("\n")}`
    );

    // Show start button only for host with 2+ players
    const canStart = networkManager.isHost && players.length >= 2;
    this.startBtn.setVisible(canStart);
  }

  private startGame() {
    if (networkManager.isHost && networkManager.getPlayerCount() >= 2) {
      networkManager.startGame(1); // Start with level 1
    }
  }
}
