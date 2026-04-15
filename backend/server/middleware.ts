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
  app.use(express.json());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}
