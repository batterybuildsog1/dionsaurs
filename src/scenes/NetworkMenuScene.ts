import Phaser from "phaser";
import { networkManager } from "../services/NetworkManager";

export class NetworkMenuScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private playerListText!: Phaser.GameObjects.Text;
  private playBtn!: Phaser.GameObjects.Text;
  private copyLinkBtn!: Phaser.GameObjects.Text;
  private linkText!: Phaser.GameObjects.Text;
  private isJoining: boolean = false;

  constructor() {
    super("NetworkMenuScene");
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Clean up any previous connection
    networkManager.disconnect();

    // Title
    this.add
      .text(width / 2, 40, "Online Multiplayer", {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Status Text (shows connecting/waiting state)
    this.statusText = this.add
      .text(width / 2, 100, "Setting up...", {
        fontSize: "20px",
        color: "#aaaaaa",
        align: "center",
      })
      .setOrigin(0.5);

    // Shareable Link Display
    this.linkText = this.add
      .text(width / 2, 180, "", {
        fontSize: "14px",
        color: "#88ff88",
        backgroundColor: "#002200",
        padding: { x: 10, y: 6 },
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5);

    // Copy Link Button
    this.copyLinkBtn = this.add
      .text(width / 2, 230, "Copy Link to Share", {
        fontSize: "22px",
        color: "#00ffff",
        backgroundColor: "#003333",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    // Player List
    this.playerListText = this.add
      .text(width / 2, 340, "", {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    // Play Now Button - ALWAYS visible once connected
    this.playBtn = this.add
      .text(width / 2, 480, "Play Now!", {
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#006600",
        padding: { x: 40, y: 15 },
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
    this.copyLinkBtn.on("pointerdown", () => this.copyLink());
    this.playBtn.on("pointerdown", () => this.startGame());
    backBtn.on("pointerdown", () => {
      networkManager.disconnect();
      this.scene.start("MenuScene");
    });

    // Setup network event listeners
    this.setupNetworkListeners();

    // Check if joining via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");

    if (roomId) {
      // Joining existing room
      this.isJoining = true;
      this.statusText.setText("Joining game...");
      this.joinRoom(roomId);
    } else {
      // Creating new room
      this.isJoining = false;
      this.statusText.setText("Creating game...");
      this.createRoom();
    }
  }

  private setupNetworkListeners() {
    networkManager.on("welcome", () => {
      this.onConnected();
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
      this.isJoining = false;
      this.updateUI();
    });

    networkManager.on("gameStart", (data) => {
      // Clear room param from URL before starting game
      window.history.replaceState({}, "", window.location.pathname);
      this.scene.start("GameScene", {
        levelId: data.levelId,
        isMultiplayer: true,
        players: data.players,
      });
    });

    networkManager.on("roomFull", () => {
      this.statusText.setText("Room is full! (max 4 players)");
      this.playBtn.setVisible(false);
    });

    networkManager.on("disconnected", () => {
      this.statusText.setText("Disconnected from server");
      this.linkText.setText("");
      this.playerListText.setText("");
      this.playBtn.setVisible(false);
      this.copyLinkBtn.setVisible(false);
    });
  }

  private async createRoom() {
    try {
      await networkManager.createRoom();
      // Connection successful - onConnected will be called via "welcome" event
    } catch (e) {
      this.statusText.setText("Failed to create game. Try again.");
      console.error(e);
    }
  }

  private async joinRoom(roomId: string) {
    try {
      await networkManager.joinRoom(roomId);
      // Connection successful - onConnected will be called via "welcome" event
    } catch (e) {
      this.statusText.setText("Failed to join. Room may not exist.");
      console.error(e);
      // Clear the room param from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  private onConnected() {
    if (this.isJoining) {
      this.statusText.setText("Connected! Waiting for host to start...");
      // Don't show copy link for joiners
      this.copyLinkBtn.setVisible(false);
      this.linkText.setText("");
    } else {
      this.statusText.setText("Waiting for players... (or play solo!)");
      // Show shareable link for host
      const url = networkManager.getShareableUrl();
      this.linkText.setText(url);
      this.copyLinkBtn.setVisible(true);
    }
    this.updateUI();
  }

  private updateUI() {
    // Update player list
    const players = networkManager.getAllPlayers();
    const playerLines = players.map((p) => {
      const isMe = p.id === networkManager.myPlayerId;
      const isHost = p.playerNumber === 1;
      return `Player ${p.playerNumber}${isMe ? " (You)" : ""}${isHost ? " [Host]" : ""}`;
    });
    this.playerListText.setText(
      `Players (${players.length}/4):\n${playerLines.join("\n")}`
    );

    // Show play button for host (can start solo or with others)
    // Non-hosts wait for host to start
    if (networkManager.isHost) {
      this.playBtn.setVisible(true);
      this.playBtn.setText(players.length === 1 ? "Play Solo!" : "Play Now!");
    } else {
      this.playBtn.setVisible(false);
    }
  }

  private copyLink() {
    const url = networkManager.getShareableUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.copyLinkBtn.setText("Copied!");
        this.time.delayedCall(2000, () => {
          this.copyLinkBtn.setText("Copy Link to Share");
        });
      }).catch(() => {
        // Fallback: select the text
        this.statusText.setText("Copy the link above to share!");
      });
    }
  }

  private startGame() {
    if (networkManager.isHost) {
      networkManager.startGame(1); // Start with level 1
    }
  }
}
