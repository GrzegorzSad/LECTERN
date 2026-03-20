import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinChannel')
  handleJoin(@MessageBody() channelId: number, @ConnectedSocket() client: Socket) {
    client.join(`channel:${channelId}`);
  }

  @SubscribeMessage('leaveChannel')
  handleLeave(@MessageBody() channelId: number, @ConnectedSocket() client: Socket) {
    client.leave(`channel:${channelId}`);
  }

  emitNewMessage(channelId: number, message: any) {
    this.server.to(`channel:${channelId}`).emit('newMessage', message);
  }
}