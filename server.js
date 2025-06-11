const http = require('http');
const app = require('./app');
const socketServer = require('./sockets/socketServer');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketServer(server);

// Start the server


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO server initialized`);
});