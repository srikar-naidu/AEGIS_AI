import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Realtime AEGIS Socket Server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚡ Disconnected from Socket Server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket Connection Error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Common emitters
  submitReport(reportData: any) {
    if (this.socket) {
      this.socket.emit('report:submit', reportData);
    }
  }
}

const socketService = new SocketService();
export default socketService;
export { socketService };
