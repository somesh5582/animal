import 'dotenv/config';
import { app } from './app.js';
import { pool, initializeSchema } from './db.js';

const requestedPort = Number(process.env.PORT);
const port = Number.isSafeInteger(requestedPort) && requestedPort > 0
  ? requestedPort
  : 4000;

let server;

async function start() {
  await initializeSchema();
  server = app.listen(port, () => {
    console.log(`HerdBook API is running at http://localhost:${port}`);
  });
}

async function shutdown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((error) => {
  console.error('Failed to start HerdBook API:', error.message);
  process.exit(1);
});
