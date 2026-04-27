import cors from 'cors';
import express from 'express';

export function applyErrorMiddleware(app: express.Express) {
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      // next must be declared for Express to recognize this as an error handler
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      next: express.NextFunction
    ) => {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  );
}

export function applyMiddleware(app: express.Express) {
  app.use(
    cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000' })
  );
  app.use(express.json());
}
