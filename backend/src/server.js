const app = require('./app');
const { initFirebase } = require('./config/firebase');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

// Initialize Firebase configuration
initFirebase();

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`  Smart Expense Management System is Running!`);
    console.log(`======================================================`);
    console.log(`👉 Access Frontend Application: http://localhost:${port}`);
    console.log(`👉 Backend Health Endpoint:     http://localhost:${port}/api/v1/health`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${port} is already in use by another process/service.`);
      console.log(`[Server] Automatically switching to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[Server] Fatal server error:', err);
    }
  });

  process.on('SIGTERM', () => {
    console.log('[Express API] SIGTERM signal received: closing server');
    server.close();
  });

  return server;
};

const server = startServer(DEFAULT_PORT);

module.exports = server;
