import Peer from 'peerjs';

export class NetworkManager {
  private peer: Peer;
  private conn: any; // DataConnection
  private isHost: boolean = false;
  public onDataReceived: ((data: any) => void) | null = null;
  public onConnected: (() => void) | null = null;

  constructor() {
    this.peer = new Peer(); // Generates random ID
  }

  public getPeerId(): Promise<string> {
    return new Promise((resolve) => {
      if (this.peer.id) {
        resolve(this.peer.id);
      } else {
        this.peer.on('open', (id) => {
          resolve(id);
        });
      }
    });
  }

  public hostGame() {
    this.isHost = true;
    this.peer.on('connection', (conn) => {
      this.conn = conn;
      this.setupConnectionEvents();
    });
  }

  public joinGame(hostId: string) {
    this.isHost = false;
    this.conn = this.peer.connect(hostId);
    this.setupConnectionEvents();
  }

  private setupConnectionEvents() {
    this.conn.on('open', () => {
      console.log('Connected to peer');
      if (this.onConnected) this.onConnected();
    });

    this.conn.on('data', (data: any) => {
      if (this.onDataReceived) this.onDataReceived(data);
    });
  }

  public send(data: any) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  public isHostUser() {
    return this.isHost;
  }
}

export const networkManager = new NetworkManager();