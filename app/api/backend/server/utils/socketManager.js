const socketIO = require('socket.io');

class SocketManager {
    constructor() {
        this.io = null;
        this.socketsByUserId = new Map();
    }

    initialize(server) {
        this.io = socketIO(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.io.on('connection', (socket) => {
            console.log('New client connected');

            // Handle user authentication
            socket.on('authenticate', (userId) => {
                this.socketsByUserId.set(userId, socket);
                socket.userId = userId;
                socket.join(`user-${userId}`);
                console.log(`User ${userId} authenticated`);
            });

            // Handle joining chat rooms
            socket.on('join_chat', (chatId) => {
                socket.join(`chat-${chatId}`);
                console.log(`Socket joined chat: ${chatId}`);
            });

            // Handle leaving chat rooms
            socket.on('leave_chat', (chatId) => {
                socket.leave(`chat-${chatId}`);
                console.log(`Socket left chat: ${chatId}`);
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                if (socket.userId) {
                    this.socketsByUserId.delete(socket.userId);
                    console.log(`User ${socket.userId} disconnected`);
                }
            });

            // Handle user typing status
            socket.on('typing_start', ({ chatId }) => {
                socket.to(`chat-${chatId}`).emit('user_typing', {
                    userId: socket.userId,
                    chatId: chatId
                });
            });

            socket.on('typing_end', ({ chatId }) => {
                socket.to(`chat-${chatId}`).emit('user_stopped_typing', {
                    userId: socket.userId,
                    chatId: chatId
                });
            });

            // Handle online status
            socket.on('set_online_status', async (status) => {
                if (socket.userId) {
                    this.io.emit('user_status_change', {
                        userId: socket.userId,
                        status: status
                    });
                }
            });
        });
    }

    // Get socket by user ID
    getSocketByUserId(userId) {
        return this.socketsByUserId.get(userId);
    }

    // Send notification to specific user
    sendToUser(userId, eventName, data) {
        const socket = this.socketsByUserId.get(userId);
        if (socket) {
            socket.emit(eventName, data);
        }
    }

    // Send message to chat room
    sendToChat(chatId, eventName, data) {
        this.io.to(`chat-${chatId}`).emit(eventName, data);
    }

    // Broadcast to all connected clients except sender
    broadcast(eventName, data, excludeUserId = null) {
        if (excludeUserId) {
            this.io.except(`user-${excludeUserId}`).emit(eventName, data);
        } else {
            this.io.emit(eventName, data);
        }
    }

    // Send to multiple users
    sendToUsers(userIds, eventName, data) {
        userIds.forEach(userId => {
            this.sendToUser(userId, eventName, data);
        });
    }

    // Check if user is online
    isUserOnline(userId) {
        return this.socketsByUserId.has(userId);
    }

    // Get all online users
    getOnlineUsers() {
        return Array.from(this.socketsByUserId.keys());
    }

    // Disconnect user
    disconnectUser(userId) {
        const socket = this.socketsByUserId.get(userId);
        if (socket) {
            socket.disconnect(true);
            this.socketsByUserId.delete(userId);
        }
    }
}

// Export singleton instance
const socketManager = new SocketManager();
module.exports = socketManager;