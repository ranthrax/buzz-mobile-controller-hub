import { RoomState, WSMessage, BuzzerButton } from '../types';

export type MessageListener = (message: WSMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private url: string = '';
  private roomId: string = 'BUZZ1';
  private role: 'host' | 'player' = 'player';
  private playerName?: string;
  private requestedSlot?: number;
  private isExplicitDisconnect = false;

  public isConnected = false;
  public playerId = '';
  public slot = 1;
  public roomState: RoomState | null = null;

  public connect(roomId: string, role: 'host' | 'player', name?: string, slot?: number) {
    this.isExplicitDisconnect = false;
    this.roomId = roomId.toUpperCase().trim() || 'BUZZ1';
    this.role = role;
    this.playerName = name || this.playerName;
    
    if (slot !== undefined) {
      this.requestedSlot = slot;
      this.slot = slot;
    }

    // Retrieve persistent player ID for this room from sessionStorage if available
    if (!this.playerId && typeof window !== 'undefined') {
      try {
        const savedId = sessionStorage.getItem(`buzz_pid_${this.roomId}`);
        if (savedId) this.playerId = savedId;
        const savedSlot = sessionStorage.getItem(`buzz_slot_${this.roomId}`);
        if (savedSlot && !slot) {
          const s = parseInt(savedSlot, 10);
          if (s >= 1 && s <= 8) {
            this.requestedSlot = s;
            this.slot = s;
          }
        }
      } catch {
        // ignore
      }
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Cleanly tear down existing socket before opening a new one to prevent orphaned onclose handlers
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close();
      } catch {
        // ignore
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;

    try {
      const socket = new WebSocket(this.url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.isConnected = true;

        // Send join payload with existing player ID and requested slot
        this.send({
          type: 'join',
          roomId: this.roomId,
          role: this.role,
          name: this.playerName,
          requestedSlot: this.requestedSlot || this.slot,
          existingPlayerId: this.playerId || undefined,
        });

        // Start client-side keepalive heartbeat
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
          if (this.ws === socket && socket.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping', timestamp: Date.now() });
          }
        }, 10000);
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const data = JSON.parse(event.data) as WSMessage;

          if (data.type === 'joined') {
            this.playerId = data.playerId;
            this.slot = data.slot;
            this.requestedSlot = data.slot;
            this.roomState = data.roomState;

            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(`buzz_pid_${this.roomId}`, data.playerId);
                sessionStorage.setItem(`buzz_slot_${this.roomId}`, data.slot.toString());
              } catch {}
            }
          } else if (data.type === 'room_state') {
            this.roomState = data.state;
            if (this.playerId && data.state.players[this.playerId]) {
              const myPlayer = data.state.players[this.playerId];
              this.slot = myPlayer.slot;
              this.requestedSlot = myPlayer.slot;
            }
          } else if (data.type === 'ping') {
            this.send({ type: 'pong', timestamp: data.timestamp, serverTime: Date.now() });
          }

          this.notifyListeners(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.isConnected = false;
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }

        if (!this.isExplicitDisconnect) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect(this.roomId, this.role, this.playerName, this.requestedSlot || this.slot);
          }, 3000);
        }
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (e) {
      console.error('WebSocket init error', e);
    }
  }

  public setSlot(slot: number) {
    this.slot = slot;
    this.requestedSlot = slot;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`buzz_slot_${this.roomId}`, slot.toString());
      } catch {}
    }
    this.send({ type: 'change_slot', slot });
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close();
      } catch {}
    }
    this.isConnected = false;
  }

  public send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public sendInput(button: BuzzerButton, pressed: boolean) {
    this.send({
      type: 'input_change',
      button,
      pressed,
      clientTimestamp: Date.now(),
    });
  }

  public subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(msg: WSMessage) {
    this.listeners.forEach((l) => l(msg));
  }
}

export const wsClient = new WebSocketClient();

