const socketIO = require('socket.io');

const initializeSocket = (server) => {
    const io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Store active connections
    const activeConnections = new Map();

    io.on('connection', (socket) => {
        console.log('New client connected');

        // Authenticate user and store connection
        socket.on('authenticate', (userId) => {
            activeConnections.set(userId, socket);
            socket.userId = userId;
            socket.join(`user-${userId}`);
            console.log(`User ${userId} authenticated`);
        });

        // Join chat rooms
        socket.on('join_chat', (chatId) => {
            socket.join(`chat-${chatId}`);
            console.log(`Socket joined chat: ${chatId}`);
        });

        // Leave chat rooms
        socket.on('leave_chat', (chatId) => {
            socket.leave(`chat-${chatId}`);
            console.log(`Socket left chat: ${chatId}`);
        });

        // Handle messages
        socket.on('send_message', (data) => {
            io.to(`chat-${data.chatId}`).emit('receive_message', data);
        });

        // Handle typing status
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

        // Handle disconnection
        socket.on('disconnect', () => {
            if (socket.userId) {
                activeConnections.delete(socket.userId);
                console.log(`User ${socket.userId} disconnected`);
            }
        });
    });

    // Utility functions
    const getSocketByUserId = (userId) => activeConnections.get(userId);
    
    const sendToUser = (userId, eventName, data) => {
        const socket = getSocketByUserId(userId);
        if (socket) {
            socket.emit(eventName, data);
        }
    };

    const broadcastToRoom = (room, eventName, data) => {
        io.to(room).emit(eventName, data);
    };

    return {
        io,
        getSocketByUserId,
        sendToUser,
        broadcastToRoom,
        activeConnections
    };
};

module.exports = initializeSocket;