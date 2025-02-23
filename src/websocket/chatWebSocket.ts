import { WebSocket, WebSocketServer } from 'ws';
import { ChatService } from '../services/chatService';
import { verifyToken } from '../utils/jwt';
import logger from '../utils/logger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

export class ChatWebSocket {
  private wss: WebSocketServer;
  private chatService: ChatService;
  private connections: Map<string, AuthenticatedWebSocket>;

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/chat' // Add specific path for WebSocket connections
    });
    this.chatService = new ChatService();
    this.connections = new Map();
    this.init();
    logger.info('WebSocket server initialized');
  }

  private init() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      logger.info('New WebSocket connection attempt');
      
      try {
        // Extract token from query string
        const url = new URL(request.url!, `ws://${request.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          logger.warn('WebSocket connection attempt without token');
          ws.close(1008, 'Authentication required');
          return;
        }

        // Verify token and get userId
        const decoded = await verifyToken(token);
        ws.userId = decoded.userId;
        this.connections.set(decoded.userId, ws);
        logger.info(`User ${decoded.userId} connected to WebSocket`);

        // Send confirmation to client
        ws.send(JSON.stringify({
          type: 'connection_established',
          userId: decoded.userId
        }));

        ws.on('message', async (data: string) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (!message.receiverId || !message.content) {
              throw new Error('Invalid message format');
            }

            // Save message to database
            const savedMessage = await this.chatService.saveMessage(
              ws.userId!, 
              message.receiverId, 
              message.content
            );

            // Send to receiver if online
            const receiverWs = this.connections.get(message.receiverId);
            if (receiverWs?.readyState === WebSocket.OPEN) {
              receiverWs.send(JSON.stringify({
                type: 'new_message',
                message: {
                  senderId: ws.userId,
                  content: message.content,
                  timestamp: savedMessage.createdAt
                }
              }));
            }

            // Confirm message receipt to sender
            ws.send(JSON.stringify({
              type: 'message_sent',
              messageId: savedMessage._id
            }));

          } catch (error) {
            logger.error('Error processing message:', error);
            ws.send(JSON.stringify({ 
              type: 'error',
              error: 'Failed to process message'
            }));
          }
        });

        ws.on('error', (error) => {
          logger.error(`WebSocket error for user ${ws.userId}:`, error);
        });

        ws.on('close', (code, reason) => {
          if (ws.userId) {
            this.connections.delete(ws.userId);
            logger.info(`User ${ws.userId} disconnected. Code: ${code}, Reason: ${reason}`);
          }
        });

      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Authentication failed');
      }
    });

    // Handle server errors
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });
  }
}