const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { getProjectAccess } = require('../lib/projectAccess');

module.exports = function setupSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, fullName: true, institutionId: true, isActive: true } });
      if (!user?.isActive) return next(new Error('Invalid or expired token'));
      socket.user = user;
      socket.projectRooms = new Set();
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);

    const verifyProjectRoom = async (projectId) => {
      if (!projectId || !socket.projectRooms.has(projectId)) {
        socket.emit('workspace_error', { message: 'Join this project workspace before sending messages' });
        return false;
      }
      const access = await getProjectAccess(projectId, socket.user);
      if (access.status || !access.allowed) {
        socket.leave(`project:${projectId}`);
        socket.projectRooms.delete(projectId);
        socket.emit('project_access_revoked', { projectId });
        socket.emit('workspace_error', { message: 'You are not allowed to access this project' });
        return false;
      }
      if (access.project.status === 'completed') {
        socket.emit('workspace_error', { message: 'Project is completed and the workspace is read-only' });
        return false;
      }
      return true;
    };

    socket.on('join_project', async (projectId) => {
      try {
        if (!projectId) return socket.emit('workspace_error', { message: 'Project is required' });
        const access = await getProjectAccess(projectId, socket.user);
        if (access.status || !access.allowed) {
          socket.emit('workspace_error', { message: 'You are not allowed to access this project' });
          return;
        }
        socket.join(`project:${projectId}`);
        socket.projectRooms.add(projectId);
        socket.emit('project_joined', { projectId });
      } catch (err) {
        socket.emit('workspace_error', { message: 'Unable to join this project workspace' });
      }
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project:${projectId}`);
      socket.projectRooms.delete(projectId);
    });

    socket.on('send_message', async (data = {}) => {
      const { projectId } = data || {};
      const content = typeof data.content === 'string' ? data.content.trim() : '';
      if (!projectId || !content) return;
      if (content.length > 1000) {
        socket.emit('workspace_error', { message: 'Message must be 1–1000 characters' });
        return;
      }
      try {
        if (!await verifyProjectRoom(projectId)) return;
        const Filter = require('bad-words');
        if (new Filter().isProfane(content)) {
          socket.emit('workspace_error', { message: 'Message contains inappropriate language' });
          return;
        }
        const message = await prisma.message.create({
          data: { projectId, senderId: socket.user.id, content, type: 'team' },
          include: { sender: { select: { id: true, fullName: true, studentProfile: { select: { avatarUrl: true } } } } },
        });
        io.to(`project:${projectId}`).emit('new_message', { message });
      } catch (err) {
        socket.emit('workspace_error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', async ({ projectId } = {}) => {
      try {
        if (!await verifyProjectRoom(projectId)) return;
        socket.to(`project:${projectId}`).emit('user_typing', { userId: socket.user.id, fullName: socket.user.fullName });
      } catch (err) {
        socket.emit('workspace_error', { message: 'Unable to update typing status' });
      }
    });

    socket.on('stop_typing', async ({ projectId } = {}) => {
      try {
        if (!await verifyProjectRoom(projectId)) return;
        socket.to(`project:${projectId}`).emit('user_stopped_typing', { userId: socket.user.id });
      } catch (err) {
        socket.emit('workspace_error', { message: 'Unable to update typing status' });
      }
    });
  });
};
