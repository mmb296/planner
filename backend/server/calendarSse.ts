import type { Express, Request, Response } from 'express';

const HEARTBEAT_MS = 25_000;

const sseClients = new Set<Response>();

export function broadcastCalendarEventsUpdated(): void {
  const line = `data: ${JSON.stringify({ type: 'calendar_updated' })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

export function registerCalendarSseRoute(app: Express): void {
  app.get('/api/calendar/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const socket = req.socket;
    socket.setTimeout(0);

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
