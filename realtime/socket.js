import jwt from 'jsonwebtoken';

export const initSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('no_token'));
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      return next();
    } catch {
      return next(new Error('bad_token'));
    }
  });

  io.on('connection', (socket) => {
    const { id } = socket.user;
    socket.join(`user:${id}`);
    socket.on('joinMachine', (machineId) => {
      socket.join(`machine:${machineId}`);
    });
  });
};
