import amqp, { Channel, Connection } from 'amqplib';
import logger from '../utils/logger';

let connection: Connection | null = null;
let channel: Channel | null = null;
let reconnectAttempts = 0;

export async function connectRabbitMQ(): Promise<Channel | undefined> {
  try {
    if (!connection) {
      connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      connection.on('error', handleConnectionError);
      connection.on('close', handleConnectionClose);
    }
    if (!channel) {
      channel = await connection.createChannel();
    }
    logger.info('Connected to RabbitMQ');
    reconnectAttempts = 0;
    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', error);
    handleReconnect();
    return undefined;
  }
}

function handleConnectionError(err: Error) {
  logger.error('RabbitMQ connection error', err);
  handleReconnect();
}

function handleConnectionClose() {
  logger.error('RabbitMQ connection closed');
  handleReconnect();
}

function handleReconnect() {
  reconnectAttempts++;
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
  setTimeout(connectRabbitMQ, delay);
}

export function getChannel(): Channel | null {
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
  } catch (error) {
    logger.error('Failed to close RabbitMQ connection', error);
  } finally {
    channel = null;
    connection = null;
  }
}