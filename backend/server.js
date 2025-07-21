const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const RADAR_CACHE_DIR = path.join(__dirname, 'radar_cache');

const VERBOSE = process.env.XMPP_VERBOSE === 'true';
const { setupXmppClient } = require('./xmppClient');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.IO with CORS configuration to allow our frontend to connect
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for maximum compatibility
    methods: ['GET', 'POST'],
  },
});

// Serve radar images from cache
app.get('/api/radar/:time', (req, res) => {
  const time = req.params.time;
  const fileName = `${time}.png`;
  const filePath = path.join(RADAR_CACHE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('Radar image not found');
  }
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server listening on port ${PORT} (0.0.0.0)`);
});
