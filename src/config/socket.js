import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true, // Reflects the request origin, allowing any frontend origin to connect (useful for cross-origin local dev)
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId.toString());
        console.log(`👤 User ${userId} joined their notification room (${socket.id})`);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected (${socket.id}):`, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Emit event to a specific user
 */
export const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId.toString()).emit(event, data);
    }
};

/**
 * Emit event to all users
 */
export const emitToAll = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};

export default {
  initSocket,
  getIO,
  emitToUser,
  emitToAll
};
