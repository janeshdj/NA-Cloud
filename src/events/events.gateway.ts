import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Small-Event Pattern: Emit minimal event payload (~100 bytes)
   * notifying frontend subscribers of resource changes without heavy payload overhead.
   */
  emitEvent(eventName: string, entityId: string, version: number = 1, extraData?: Record<string, any>) {
    const payload = {
      event: eventName,
      id: entityId,
      version,
      timestamp: new Date().toISOString(),
      ...extraData,
    };
    this.server.emit(eventName, payload);
    this.logger.debug(`Emitted small event '${eventName}' for ID: ${entityId}`);
  }
}
