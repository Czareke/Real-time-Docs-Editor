const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const Document = require('../Models/Document');

// Rate limiting setup
const createRateLimiter = (maxRequests, timeWindow) => {
  const clients = new Map();
  
  return (socket) => {
    const now = Date.now();
    const userId = socket.user._id.toString();
    
    if (!clients.has(userId)) {
      clients.set(userId, []);
    }
    
    const userRequests = clients.get(userId);
    const validRequests = userRequests.filter(timestamp => now - timestamp < timeWindow);
    
    clients.set(userId, validRequests);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    clients.get(userId).push(now);
    return true; // Request allowed
  };
};

// Create rate limiter: 10 requests per 1 second
const rateLimiter = createRateLimiter(10, 1000);

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Attach user info to socket
      socket.user = { _id: decoded.id };
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);
    
    // Join document room
    socket.on('join-document', async (documentId) => {
      try {
        // Validate document access
        const document = await Document.findById(documentId);
        
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }
        
        // Check if user is owner or collaborator
        const userId = socket.user._id.toString();
        const isOwner = document.owner.toString() === userId;
        const isCollaborator = document.collaborators.some(
          collab => collab.toString() === userId
        );
        
        if (!isOwner && !isCollaborator) {
          socket.emit('error', { message: 'Access denied to this document' });
          return;
        }
        
        const roomName = `doc:${documentId}`;
        
        // Join the room
        socket.join(roomName);
        console.log(`User ${socket.user._id} joined document: ${documentId}`);
        
        // Notify others in the room
        socket.to(roomName).emit('user-joined', { userId: socket.user._id });
        
        // Send current document content to the user
        socket.emit('load-document', { content: document.content });
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });
    
    // Handle document changes
    socket.on('send-changes', (data) => {
      try {
        const { documentId, delta } = data;
        
        // Apply rate limiting
        if (!rateLimiter(socket)) {
          socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
          return;
        }
        
        const roomName = `doc:${documentId}`;
        
        // Broadcast changes to others in the room
        socket.to(roomName).emit('receive-changes', {
          delta,
          userId: socket.user._id
        });
      } catch (error) {
        console.error('Error sending changes:', error);
        socket.emit('error', { message: 'Failed to send changes' });
      }
    });
    
    // Save document changes
    socket.on('save-document', async (data) => {
      try {
        const { documentId, content } = data;
        
        // Find and update the document
        const document = await Document.findById(documentId);
        
        if (!document) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }
        
        // Check if user is owner or collaborator
        const userId = socket.user._id.toString();
        const isOwner = document.owner.toString() === userId;
        const isCollaborator = document.collaborators.some(
          collab => collab.toString() === userId
        );
        
        if (!isOwner && !isCollaborator) {
          socket.emit('error', { message: 'Access denied to this document' });
          return;
        }
        
        // Update document content
        document.content = content;
        
        // Add new version to version history
        document.versions.push({
          content,
          author: socket.user._id
        });
        
        await document.save();
        
        socket.emit('document-saved', { success: true });
        console.log(`Document ${documentId} saved by user ${socket.user._id}`);
      } catch (error) {
        console.error('Error saving document:', error);
        socket.emit('error', { message: 'Failed to save document' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
      
      // Get all rooms this socket was in
      const rooms = Array.from(socket.rooms);
      
      // Notify each room about the user leaving
      rooms.forEach(room => {
        if (room.startsWith('doc:')) {
          socket.to(room).emit('user-left', { userId: socket.user._id });
        }
      });
    });
  });

  return io;
};