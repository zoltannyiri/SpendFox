const { Server } = require('socket.io');
const { admin } = require('./firestoreClient');

let io = null;

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers?.authorization;

  if (authToken) {
    return authToken;
  }

  if (!header) {
    return null;
  }

  const [type, token] = header.split(' ');

  return type === 'Bearer' ? token : null;
};

const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        return next(new Error('Missing auth token'));
      }

      socket.auth = await admin.auth().verifyIdToken(token);

      return next();
    } catch (err) {
      return next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.auth.uid);

    socket.join(`user:${userId}`);
    console.log(`[socket] user connected: ${userId}`);
    socket.emit('socket:ready', { userId });
  });

  return io;
};

const emitMessageCreated = (message) => {
  if (!io || !message) {
    return;
  }

  const receiverRoom = `user:${message.receiver_id}`;
  const senderRoom = `user:${message.sender_id}`;

  console.log('[socket] message:created', {
    id: message.id,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
  });

  io.to(receiverRoom).emit('message:created', { message });
  io.to(senderRoom).emit('message:created', { message });
};

module.exports = {
  emitMessageCreated,
  initSocketServer,
};
