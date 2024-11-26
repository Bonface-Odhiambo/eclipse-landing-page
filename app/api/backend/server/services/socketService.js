class SocketService {
    constructor() {
      this.io = null;
    }
  
    initialize(io) {
      this.io = io;
    }
  
    getIO() {
      if (!this.io) {
        throw new Error('Socket.IO not initialized');
      }
      return this.io;
    }
  
    emitToRoom(roomId, event, data) {
      this.getIO().to(roomId).emit(event, data);
    }
  
    emitToUser(userId, event, data) {
      this.getIO().to(userId).emit(event, data);
    }
  
    broadcastToAll(event, data) {
      this.getIO().emit(event, data);
    }
  }
  
  module.exports = new SocketService();