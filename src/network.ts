import Peer, { DataConnection } from 'peerjs';
import type { Player, WeaponState } from './types';

/** Network message types */
type MessageType =
  | 'player_state'    // Player position, health, etc.
  | 'weapon_fire'     // Weapon fired
  | 'player_hit'      // Player was hit
  | 'game_start'      // Game is starting
  | 'ping'            // Latency check
  | 'pong';           // Latency response

interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  data: any;
}

interface PlayerState {
  posX: number;
  posY: number;
  dirX: number;
  dirY: number;
  health: number;
  armor: number;
  weaponType: string;
  isFiring: boolean;
}

type ConnectionCallback = (connected: boolean, error?: string) => void;
type MessageCallback = (message: NetworkMessage) => void;

/**
 * Network manager for peer-to-peer multiplayer
 */
export class NetworkManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private isHost: boolean = false;
  private roomCode: string = '';
  private onConnectionChange: ConnectionCallback | null = null;
  private onMessage: MessageCallback | null = null;
  private latency: number = 0;
  private lastPingTime: number = 0;

  /**
   * Generate a random room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Host a new game session
   */
  async hostGame(onConnection: ConnectionCallback, onMessage: MessageCallback): Promise<string> {
    this.isHost = true;
    this.onConnectionChange = onConnection;
    this.onMessage = onMessage;
    this.roomCode = this.generateRoomCode();

    return new Promise((resolve, reject) => {
      // Create peer with room code as ID
      this.peer = new Peer(`textdoom-${this.roomCode}`, {
        debug: 0, // Minimal logging
      });

      this.peer.on('open', () => {
        console.log('Host ready, room code:', this.roomCode);
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        console.log('Guest connected');
        this.connection = conn;
        this.setupConnection();
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Room code already in use, generate new one
          this.roomCode = this.generateRoomCode();
          this.peer?.destroy();
          this.hostGame(onConnection, onMessage).then(resolve).catch(reject);
        } else {
          reject(err.message);
        }
      });
    });
  }

  /**
   * Join an existing game session
   */
  async joinGame(roomCode: string, onConnection: ConnectionCallback, onMessage: MessageCallback): Promise<void> {
    this.isHost = false;
    this.onConnectionChange = onConnection;
    this.onMessage = onMessage;
    this.roomCode = roomCode.toUpperCase();

    return new Promise((resolve, reject) => {
      // Create peer with random ID
      this.peer = new Peer({
        debug: 0,
      });

      this.peer.on('open', () => {
        console.log('Connecting to room:', this.roomCode);

        // Connect to host
        const conn = this.peer!.connect(`textdoom-${this.roomCode}`, {
          reliable: true,
        });

        conn.on('open', () => {
          console.log('Connected to host');
          this.connection = conn;
          this.setupConnection();
          resolve();
        });

        conn.on('error', (err) => {
          reject(`Failed to connect: ${err}`);
        });

        // Timeout if connection doesn't open
        setTimeout(() => {
          if (!this.connection) {
            reject('Connection timeout - check room code');
          }
        }, 10000);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        reject(err.message);
      });
    });
  }

  /**
   * Set up connection handlers
   */
  private setupConnection(): void {
    if (!this.connection) return;

    this.connection.on('open', () => {
      this.onConnectionChange?.(true);
      this.startPingLoop();
    });

    this.connection.on('data', (data) => {
      const message = data as NetworkMessage;

      // Handle ping/pong internally
      if (message.type === 'ping') {
        this.send({ type: 'pong', timestamp: message.timestamp, data: null });
        return;
      }
      if (message.type === 'pong') {
        this.latency = Date.now() - message.timestamp;
        return;
      }

      this.onMessage?.(message);
    });

    this.connection.on('close', () => {
      console.log('Connection closed');
      this.onConnectionChange?.(false, 'Connection lost');
    });

    this.connection.on('error', (err) => {
      console.error('Connection error:', err);
      this.onConnectionChange?.(false, `Connection error: ${err}`);
    });

    // Notify connection established
    this.onConnectionChange?.(true);
  }

  /**
   * Start ping loop for latency measurement
   */
  private startPingLoop(): void {
    setInterval(() => {
      if (this.connection?.open) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping', timestamp: this.lastPingTime, data: null });
      }
    }, 2000);
  }

  /**
   * Send a message to the other player
   */
  send(message: NetworkMessage): void {
    if (this.connection?.open) {
      this.connection.send(message);
    }
  }

  /**
   * Send player state update
   */
  sendPlayerState(player: Player, weapon: WeaponState): void {
    const state: PlayerState = {
      posX: player.pos.x,
      posY: player.pos.y,
      dirX: player.dir.x,
      dirY: player.dir.y,
      health: player.health,
      armor: player.armor,
      weaponType: weapon.type,
      isFiring: weapon.isFiring,
    };

    this.send({
      type: 'player_state',
      timestamp: Date.now(),
      data: state,
    });
  }

  /**
   * Send weapon fire event
   */
  sendWeaponFire(weaponType: string): void {
    this.send({
      type: 'weapon_fire',
      timestamp: Date.now(),
      data: { weaponType },
    });
  }

  /**
   * Apply received player state to remote player
   */
  applyPlayerState(player: Player, weapon: WeaponState, state: PlayerState): void {
    player.pos.x = state.posX;
    player.pos.y = state.posY;
    player.dir.x = state.dirX;
    player.dir.y = state.dirY;
    player.health = state.health;
    player.armor = state.armor;

    // Update plane based on direction
    player.plane.x = -state.dirY * 0.66;
    player.plane.y = state.dirX * 0.66;

    weapon.type = state.weaponType as any;
    weapon.isFiring = state.isFiring;
  }

  /**
   * Get current latency in ms
   */
  getLatency(): number {
    return this.latency;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection?.open ?? false;
  }

  /**
   * Check if this peer is the host
   */
  getIsHost(): boolean {
    return this.isHost;
  }

  /**
   * Get room code
   */
  getRoomCode(): string {
    return this.roomCode;
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.connection?.close();
    this.peer?.destroy();
    this.connection = null;
    this.peer = null;
  }
}

// Singleton instance
export const networkManager = new NetworkManager();
