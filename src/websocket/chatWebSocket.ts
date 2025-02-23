import { WebSocket, WebSocketServer } from 'ws';
import { ChatService } from '../services/chatService';
import { verifyToken } from '../utils/jwt';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

export class ChatWebSocket {
  private wss: WebSocketServer;
  private chatService: ChatService;
  private connections: Map<string, AuthenticatedWebSocket>;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.chatService = new ChatService();
    this.connections = new Map();
    this.init();
  }

  private init() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      try {
        // Extract token from query string
        const token = new URL(request.url!, `ws://${request.headers.host}`).searchParams.get('token');
        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }

        // Verify token and get userId
        const decoded = await verifyToken(token);
        ws.userId = decoded.userId;
        this.connections.set(decoded.userId, ws);

        ws.on('message', async (data: string) => {
          try {
            const message = JSON.parse(data);
            if (!message.receiverId || !message.content) {
              throw new Error('Invalid message format');
            }

            // Save message to database
            await this.chatService.saveMessage(ws.userId!, message.receiverId, message.content);

            // Send to receiver if online
            const receiverWs = this.connections.get(message.receiverId);
            if (receiverWs?.readyState === WebSocket.OPEN) {
              receiverWs.send(JSON.stringify({
                senderId: ws.userId,
                content: message.content,
                timestamp: new Date()
              }));
            }
          } catch (error) {
            ws.send(JSON.stringify({ error: 'Failed to process message' }));
          }
        });

        ws.on('close', () => {
          if (ws.userId) {
            this.connections.delete(ws.userId);
          }
        });

      } catch (error) {
        ws.close(1008, 'Authentication failed');
      }
    });
  }
}