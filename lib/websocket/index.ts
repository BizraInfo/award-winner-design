/**
 * Elite WebSocket System with Ihsān Principles
 * 
 * Real-time communication layer featuring:
 * - Auto-reconnection with backoff
 * - Heartbeat/ping-pong
 * - Message queuing during disconnect
 * - Room/channel management
 * - Binary message support
 * - Connection state management
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

export interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  messageQueueSize?: number;
  binaryType?: 'blob' | 'arraybuffer';
}

export type MessageHandler<T = unknown> = (message: WebSocketMessage<T>) => void;
export type StateChangeHandler = (state: ConnectionState, previousState: ConnectionState) => void;
export type ErrorHandler = (error: Error) => void;

interface QueuedMessage {
  data: string | ArrayBuffer | Blob;
  timestamp: number;
}

// ============================================================================
// WebSocket Client
// ============================================================================

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: QueuedMessage[] = [];
  
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private wildcardHandlers: Set<MessageHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  
  constructor(options: WebSocketOptions) {
    this.options = {
      url: options.url,
      protocols: options.protocols || [],
      reconnect: options.reconnect ?? true,
      reconnectAttempts: options.reconnectAttempts ?? 10,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 10000,
      messageQueueSize: options.messageQueueSize ?? 100,
      binaryType: options.binaryType ?? 'arraybuffer'
    };
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      this.setState('connecting');
      
      try {
        this.ws = new WebSocket(
          this.options.url,
          this.options.protocols
        );
        this.ws.binaryType = this.options.binaryType;
        
        const onOpen = (): void => {
          this.reconnectAttempt = 0;
          this.setState('connected');
          this.startHeartbeat();
          this.flushMessageQueue();
          cleanup();
          resolve();
        };
        
        const onError = (event: Event): void => {
          const error = new Error('WebSocket connection error');
          this.notifyError(error);
          cleanup();
          reject(error);
        };
        
        const cleanup = (): void => {
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
        };
        
        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
        
        this.setupEventListeners();
      } catch (error) {
        this.setState('disconnected');
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from WebSocket server
   */
  disconnect(code?: number, reason?: string): void {
    this.stopHeartbeat();
    this.stopReconnect();
    
    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
    
    this.setState('disconnected');
  }
  
  /**
   * Send a message
   */
  send<T>(type: string, payload: T): void {
    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      id: this.generateId()
    };
    
    this.sendRaw(JSON.stringify(message));
  }
  
  /**
   * Send raw data
   */
  sendRaw(data: string | ArrayBuffer | Blob): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      // Queue message for later
      this.queueMessage(data);
    }
  }
  
  /**
   * Subscribe to a message type
   */
  on<T>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)!.add(handler as MessageHandler);
    
    return () => {
      this.messageHandlers.get(type)?.delete(handler as MessageHandler);
    };
  }
  
  /**
   * Subscribe to all messages
   */
  onAny(handler: MessageHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => this.wildcardHandlers.delete(handler);
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }
  
  /**
   * Subscribe to errors
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }
  
  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private setupEventListeners(): void {
    if (!this.ws) return;
    
    this.ws.onmessage = (event) => {
      this.handleMessage(event);
      this.resetHeartbeatTimeout();
    };
    
    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      if (this.state !== 'disconnected') {
        this.setState('disconnected');
        
        if (this.options.reconnect && !event.wasClean) {
          this.scheduleReconnect();
        }
      }
    };
    
    this.ws.onerror = () => {
      this.notifyError(new Error('WebSocket error'));
    };
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      // Handle binary data
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        this.notifyHandlers({ type: 'binary', payload: event.data, timestamp: Date.now() });
        return;
      }
      
      // Handle JSON messages
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Handle heartbeat
      if (message.type === 'pong') {
        this.resetHeartbeatTimeout();
        return;
      }
      
      this.notifyHandlers(message);
    } catch (error) {
      // Not JSON, treat as raw message
      this.notifyHandlers({ type: 'raw', payload: event.data, timestamp: Date.now() });
    }
  }
  
  private notifyHandlers(message: WebSocketMessage): void {
    // Type-specific handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] Handler error:', error);
        }
      });
    }
    
    // Wildcard handlers
    this.wildcardHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('[WebSocket] Wildcard handler error:', error);
      }
    });
  }
  
  private setState(newState: ConnectionState): void {
    const previousState = this.state;
    this.state = newState;
    
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(newState, previousState);
      } catch (error) {
        console.error('[WebSocket] State change handler error:', error);
      }
    });
  }
  
  private notifyError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('[WebSocket] Error handler error:', e);
      }
    });
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.options.reconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }
    
    this.setState('reconnecting');
    
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempt),
      this.options.maxReconnectDelay
    );
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.connect().catch(() => {
        // Will schedule another reconnect on failure
      });
    }, delay);
  }
  
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }
  
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', {});
        this.setHeartbeatTimeout();
      }
    }, this.options.heartbeatInterval);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.resetHeartbeatTimeout();
  }
  
  private setHeartbeatTimeout(): void {
    this.heartbeatTimeoutTimer = setTimeout(() => {
      console.log('[WebSocket] Heartbeat timeout, reconnecting...');
      this.ws?.close();
    }, this.options.heartbeatTimeout);
  }
  
  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
  
  private queueMessage(data: string | ArrayBuffer | Blob): void {
    if (this.messageQueue.length >= this.options.messageQueueSize) {
      this.messageQueue.shift(); // Remove oldest
    }
    
    this.messageQueue.push({ data, timestamp: Date.now() });
  }
  
  private flushMessageQueue(): void {
    const queue = this.messageQueue.splice(0);
    
    for (const { data } of queue) {
      this.sendRaw(data);
    }
  }
  
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================================================
// Room/Channel Manager
// ============================================================================

export class RoomManager {
  private client: WebSocketClient;
  private rooms: Map<string, Set<MessageHandler>> = new Map();
  private joinedRooms: Set<string> = new Set();
  
  constructor(client: WebSocketClient) {
    this.client = client;
    
    // Listen for room messages
    this.client.on('room:message', (message) => {
      const { room, data } = message.payload as { room: string; data: unknown };
      this.notifyRoom(room, data);
    });
    
    // Rejoin rooms on reconnect
    this.client.onStateChange((state) => {
      if (state === 'connected') {
        this.rejoinRooms();
      }
    });
  }
  
  /**
   * Join a room
   */
  async join(room: string): Promise<void> {
    if (this.joinedRooms.has(room)) return;
    
    this.client.send('room:join', { room });
    this.joinedRooms.add(room);
    
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
  }
  
  /**
   * Leave a room
   */
  leave(room: string): void {
    if (!this.joinedRooms.has(room)) return;
    
    this.client.send('room:leave', { room });
    this.joinedRooms.delete(room);
    this.rooms.delete(room);
  }
  
  /**
   * Send message to a room
   */
  send<T>(room: string, data: T): void {
    this.client.send('room:message', { room, data });
  }
  
  /**
   * Subscribe to room messages
   */
  onMessage<T>(room: string, handler: MessageHandler<T>): () => void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    
    this.rooms.get(room)!.add(handler as MessageHandler);
    
    return () => {
      this.rooms.get(room)?.delete(handler as MessageHandler);
    };
  }
  
  /**
   * Get joined rooms
   */
  getJoinedRooms(): string[] {
    return Array.from(this.joinedRooms);
  }
  
  private notifyRoom(room: string, data: unknown): void {
    const handlers = this.rooms.get(room);
    if (!handlers) return;
    
    const message: WebSocketMessage = {
      type: 'room:message',
      payload: data,
      timestamp: Date.now()
    };
    
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`[Room:${room}] Handler error:`, error);
      }
    });
  }
  
  private rejoinRooms(): void {
    for (const room of this.joinedRooms) {
      this.client.send('room:join', { room });
    }
  }
}

// ============================================================================
// Presence Manager
// ============================================================================

export interface PresenceState {
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: number;
  metadata?: Record<string, unknown>;
}

export class PresenceManager {
  private client: WebSocketClient;
  private presence: Map<string, PresenceState> = new Map();
  private handlers: Set<(userId: string, state: PresenceState) => void> = new Set();
  private myUserId: string | null = null;
  private myState: PresenceState = { status: 'online' };
  
  constructor(client: WebSocketClient) {
    this.client = client;
    
    // Listen for presence updates
    this.client.on<{ userId: string; state: PresenceState }>('presence:update', (message) => {
      const { userId, state } = message.payload;
      this.presence.set(userId, state);
      this.notifyHandlers(userId, state);
    });
    
    // Send presence on connect
    this.client.onStateChange((state) => {
      if (state === 'connected' && this.myUserId) {
        this.updatePresence(this.myState);
      }
    });
  }
  
  /**
   * Set current user ID
   */
  setUserId(userId: string): void {
    this.myUserId = userId;
    if (this.client.isConnected()) {
      this.updatePresence(this.myState);
    }
  }
  
  /**
   * Update own presence
   */
  updatePresence(state: Partial<PresenceState>): void {
    this.myState = { ...this.myState, ...state };
    
    if (this.client.isConnected() && this.myUserId) {
      this.client.send('presence:update', {
        userId: this.myUserId,
        state: this.myState
      });
    }
  }
  
  /**
   * Get presence for a user
   */
  getPresence(userId: string): PresenceState | undefined {
    return this.presence.get(userId);
  }
  
  /**
   * Get all presence states
   */
  getAllPresence(): Map<string, PresenceState> {
    return new Map(this.presence);
  }
  
  /**
   * Subscribe to presence changes
   */
  onPresenceChange(handler: (userId: string, state: PresenceState) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  
  /**
   * Subscribe to a specific user's presence
   */
  onUserPresence(userId: string, handler: (state: PresenceState) => void): () => void {
    const wrappedHandler = (uid: string, state: PresenceState): void => {
      if (uid === userId) {
        handler(state);
      }
    };
    
    return this.onPresenceChange(wrappedHandler);
  }
  
  private notifyHandlers(userId: string, state: PresenceState): void {
    this.handlers.forEach(handler => {
      try {
        handler(userId, state);
      } catch (error) {
        console.error('[Presence] Handler error:', error);
      }
    });
  }
}

// ============================================================================
// WebSocket Server Handler (for API routes)
// ============================================================================

export interface ServerWebSocket {
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}

export class WebSocketServerHandler {
  private clients: Map<string, ServerWebSocket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private messageHandlers: Map<string, (clientId: string, payload: unknown) => void> = new Map();
  
  /**
   * Add a client connection
   */
  addClient(clientId: string, ws: ServerWebSocket): void {
    this.clients.set(clientId, ws);
  }
  
  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    
    // Remove from all rooms
    for (const [, members] of this.rooms) {
      members.delete(clientId);
    }
  }
  
  /**
   * Handle incoming message
   */
  handleMessage(clientId: string, data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      
      // Handle built-in message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(clientId, 'pong', {});
          break;
          
        case 'room:join':
          this.joinRoom(clientId, (message.payload as { room: string }).room);
          break;
          
        case 'room:leave':
          this.leaveRoom(clientId, (message.payload as { room: string }).room);
          break;
          
        case 'room:message': {
          const { room, data: msgData } = message.payload as { room: string; data: unknown };
          this.broadcastToRoom(room, 'room:message', { room, data: msgData }, clientId);
          break;
        }

        default: {
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(clientId, message.payload);
          }
        }
      }
    } catch (error) {
      console.error('[WS Server] Message parse error:', error);
    }
  }
  
  /**
   * Register a message handler
   */
  onMessage<T>(type: string, handler: (clientId: string, payload: T) => void): void {
    this.messageHandlers.set(type, handler as (clientId: string, payload: unknown) => void);
  }
  
  /**
   * Send to a specific client
   */
  sendToClient<T>(clientId: string, type: string, payload: T): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === 1) {
      client.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }
  
  /**
   * Broadcast to all clients
   */
  broadcast<T>(type: string, payload: T, excludeClientId?: string): void {
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });
    
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId && client.readyState === 1) {
        client.send(message);
      }
    }
  }
  
  /**
   * Broadcast to room
   */
  broadcastToRoom<T>(room: string, type: string, payload: T, excludeClientId?: string): void {
    const members = this.rooms.get(room);
    if (!members) return;
    
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });
    
    for (const clientId of members) {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === 1) {
          client.send(message);
        }
      }
    }
  }
  
  /**
   * Join a room
   */
  joinRoom(clientId: string, room: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);
  }
  
  /**
   * Leave a room
   */
  leaveRoom(clientId: string, room: string): void {
    this.rooms.get(room)?.delete(clientId);
  }
  
  /**
   * Get room members
   */
  getRoomMembers(room: string): string[] {
    return Array.from(this.rooms.get(room) || []);
  }
  
  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let wsClient: WebSocketClient | null = null;
let wsServerHandler: WebSocketServerHandler | null = null;

export function getWebSocketClient(options?: WebSocketOptions): WebSocketClient {
  if (!wsClient && options) {
    wsClient = new WebSocketClient(options);
  }
  if (!wsClient) {
    throw new Error('WebSocket client not initialized. Provide options on first call.');
  }
  return wsClient;
}

export function getWebSocketServerHandler(): WebSocketServerHandler {
  if (!wsServerHandler) {
    wsServerHandler = new WebSocketServerHandler();
  }
  return wsServerHandler;
}

export default {
  WebSocketClient,
  RoomManager,
  PresenceManager,
  WebSocketServerHandler,
  getWebSocketClient,
  getWebSocketServerHandler
};
