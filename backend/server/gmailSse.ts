import type { Express, Request, Response } from 'express';

import { AppointmentSuggestion } from '../db/gmailStore.js';

const HEARTBEAT_MS = 25_000;

const sseClients = new Set<Response>();

export function broadcastSuggestionsUpdated(
  suggestions: AppointmentSuggestion[]
): void {
  const line = `data: ${JSON.stringify({ type: 'suggestions_updated', suggestions })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

export function registerGmailSseRoute(app: Express): void {
  app.get('/api/gmail/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    req.socket.setTimeout(0);
    res.flushHeaders();

    sseClients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });
}
