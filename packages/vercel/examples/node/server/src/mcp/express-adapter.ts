import { Request, Response } from "express";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import { Readable } from "stream";

/**
 * Adapts Express Request to IncomingMessage for MCP SDK
 */
export function expressToIncomingMessage(req: Request): IncomingMessage {
  const socket = new Socket();
  const readable = new Readable();
  readable._read = (): void => {};

  // Convert body to stream
  const bodyString = JSON.stringify(req.body);
  readable.push(bodyString);
  readable.push(null);

  const incomingMessage = new IncomingMessage(socket);
  incomingMessage.method = req.method;
  incomingMessage.url = req.url;
  incomingMessage.headers = req.headers as any;

  // Copy stream methods
  incomingMessage.push = readable.push.bind(readable);
  incomingMessage.read = readable.read.bind(readable);
  // @ts-expect-error - Binding stream methods
  incomingMessage.on = readable.on.bind(readable);
  incomingMessage.pipe = readable.pipe.bind(readable);

  return incomingMessage;
}

/**
 * Wraps Express Response to work with MCP ServerResponse expectations
 */
export function wrapExpressResponse(res: Response): ServerResponse {
  // Express Response already extends ServerResponse, but we need to ensure
  // proper typing and behavior for the MCP SDK
  return res as unknown as ServerResponse;
}
