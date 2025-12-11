const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const createSocketHandler = require('./socket-handler');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '/')));

createSocketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Make sure to set MASTER_KEY env var (32 bytes) for secret encryption.`);
});
