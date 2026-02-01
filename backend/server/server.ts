import { closeDatabase } from '../db/connection.js';
import { initDatabase } from '../db/database.js';
import { closeMongoDB, connectMongoDB } from '../db/mongoConnection.js';
import { app, initializeApp } from './app.js';

const PORT = process.env.PORT || 5000;

try {
  await initDatabase();
  await connectMongoDB();
  await initializeApp();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await closeDatabase();
  await closeMongoDB();
  process.exit(0);
});
