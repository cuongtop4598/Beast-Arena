// WebSocket service — connects to Golang game server

const WS_BASE = __DEV__
  ? 'ws://localhost:8080'
  : 'wss://api.beastarena.game';

type MessageHandler = (data: any) => void;

class GameSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${WS_BASE}/ws/game?token=${token}`);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.emit(msg.type, msg.payload);
      } catch {
        console.warn('[WS] Invalid message:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code);
      this.emit('disconnected', { code: event.code });
      // Auto-reconnect after 3s
      this.reconnectTimer = setTimeout(() => this.connect(token), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(type: string, payload: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Not connected, dropping message:', type);
      return;
    }
    this.ws.send(JSON.stringify({ type, payload }));
  }

  // Send player input (used during gameplay)
  sendInput(input: { action: string; frame: number; data?: any }): void {
    this.send('input', input);
  }

  on(event: string, handler: MessageHandler): () => void {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
    // Return unsubscribe function
    return () => {
      const h = this.handlers.get(event) || [];
      this.handlers.set(event, h.filter((fn) => fn !== handler));
    };
  }

  private emit(event: string, data: any): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((h) => h(data));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const gameSocket = new GameSocket();
