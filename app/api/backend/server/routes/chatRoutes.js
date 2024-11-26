const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const Chat = require('../models/chatModels');
const Message = require('../models/messageModel');

const router = express.Router();

// Middleware validator
const validateMiddleware = (middleware, name) => (req, res, next) => {
    if (typeof middleware !== 'function') {
        console.error(`${name} middleware is not a function:`, middleware);
        return res.status(500).json({ error: 'Server configuration error' });
    }
    return middleware(req, res, next);
};

// Wrap controller methods in try-catch blocks
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

class ChatController {
    // Get all chats for the authenticated user
    static async getAllChats(req, res) {
        try {
            const userId = req.user.id;
            const chats = await Chat.find({
                participants: userId
            }).populate('participants', 'name email');

            res.json({ success: true, data: chats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Initialize a new chat
    static async initializeChat(req, res) {
        try {
            const { participantId } = req.body;
            const userId = req.user.id;

            const newChat = await Chat.create({
                participants: [userId, participantId],
                createdBy: userId
            });

            res.status(201).json({ success: true, data: newChat });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Send a message in a chat
    static async sendMessage(req, res) {
        try {
            const { chatId, content } = req.body;
            const userId = req.user.id;

            const message = await Message.create({
                chat: chatId,
                sender: userId,
                content
            });

            res.status(201).json({ success: true, data: message });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get messages for a chat room
    static async getChatMessages(req, res) {
        try {
            const { chatRoomId } = req.params;
            const messages = await Message.find({ chat: chatRoomId })
                .populate('sender', 'name email')
                .sort({ createdAt: 1 });

            res.json({ success: true, data: messages });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Mark all messages in a chat room as read
    static async markAsRead(req, res) {
        try {
            const { chatRoomId } = req.params;
            const userId = req.user.id;

            await Message.updateMany(
                { chat: chatRoomId, reader: { $ne: userId } },
                { $addToSet: { readBy: userId } }
            );

            res.json({ success: true, message: 'Messages marked as read' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Archive a chat
    static async archiveChat(req, res) {
        try {
            const { chatRoomId } = req.params;
            const userId = req.user.id;

            const chat = await Chat.findByIdAndUpdate(
                chatRoomId,
                { $addToSet: { archivedBy: userId } },
                { new: true }
            );

            res.json({ success: true, data: chat });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Search for chats
    static async searchChats(req, res) {
        try {
            const { query } = req.query;
            const userId = req.user.id;

            const chats = await Chat.find({
                participants: userId,
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { lastMessage: { $regex: query, $options: 'i' } }
                ]
            }).populate('participants', 'name email');

            res.json({ success: true, data: chats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

// Create a controller instance
const chatController = new ChatController();

// Apply authentication middleware globally
router.use(validateMiddleware(authenticateUser, 'authenticateUser'));

// Define routes using the bound controller methods
router.get('/', asyncHandler(ChatController.getAllChats.bind(ChatController)));
router.post('/initialize', asyncHandler(ChatController.initializeChat.bind(ChatController)));
router.post('/send', asyncHandler(ChatController.sendMessage.bind(ChatController)));
router.get('/:chatRoomId/messages', asyncHandler(ChatController.getChatMessages.bind(ChatController)));
router.patch('/:chatRoomId/read', asyncHandler(ChatController.markAsRead.bind(ChatController)));
router.patch('/:chatRoomId/archive', asyncHandler(ChatController.archiveChat.bind(ChatController)));
router.get('/search', asyncHandler(ChatController.searchChats.bind(ChatController)));

// Error handling middleware
router.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

module.exports = router;