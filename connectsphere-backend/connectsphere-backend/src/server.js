const http = require('http');
const config = require('./config');
const connectDB = require('./config/db');
const app = require('./app');
const { init } = require('./socket');

async function start() {
  await connectDB();

  const server = http.createServer(app);
  init(server); // attach Socket.IO to the same HTTP server

  server.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref(); // force-exit safety net
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
