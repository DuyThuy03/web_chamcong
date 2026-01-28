class WSService {
  socket = null;

  // Map<event, Set<callback>>
  listeners = new Map();

  connect() {
    if (this.socket) return;

    let WS_URL;
    const host = window.location.hostname;
    
    // 1. Localhost
    if (host === "localhost" || host === "127.0.0.1") {
      WS_URL = "ws://localhost:8001/api/v1/ws";
    } 
    // 2. Production Domain
    else if (host === "thuy.vnatechlab.com") {
      WS_URL = "wss://thuy.vnatechlab.com/api/v1/ws";
    } 
    // 3. Local Network / LAN (e.g., 192.168.x.x)
    else {
      // Default to port 8001 on the same host
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      WS_URL = `${protocol}//${host}:8001/api/v1/ws`;
    }

    console.log("Connecting to WS:", WS_URL);
    this.socket = new WebSocket(WS_URL);

    this.socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.emit(msg.type, msg.data);
      } catch (err) {
        console.error("❌ WS parse error", err);
      }
    };

    this.socket.onclose = () => {
      console.log("❌ WebSocket disconnected, reconnecting in 3s...");
      this.socket = null;
      setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (err) => {
      console.error("❌ WS error", err);
      this.socket?.close();
    };
  }

  /**
   * Đăng ký listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);
  }

  /**
   * Gỡ listener (CHỈ gỡ callback được truyền vào)
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    callbacks.delete(callback);

    // nếu không còn listener nào → xoá event
    if (callbacks.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit event cho TẤT CẢ listener
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;

    this.listeners.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`❌ WS listener error (${event})`, err);
      }
    });
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
  }
}

export const wsService = new WSService();
