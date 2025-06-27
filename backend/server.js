const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Toggle verbose backend logging (including Socket.IO connect/disconnect)
const VERBOSE = process.env.XMPP_VERBOSE === 'true';
const { setupXmppClient } = require('./xmppClient');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS configuration to allow our frontend to connect
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Your Vite dev server URL
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  if (VERBOSE) console.log(`Socket.IO client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    if (VERBOSE) console.log(`Socket.IO client disconnected: ${socket.id}`);
  });
});

// --- Start the XMPP Client ---
// We pass the `io` instance to the XMPP client so it can send alerts to the frontend.
setupXmppClient(io);

// --- Start the Express Server ---
server.listen(PORT, () => {
  if (VERBOSE) console.log(`Backend server listening on port ${PORT}`);
});
