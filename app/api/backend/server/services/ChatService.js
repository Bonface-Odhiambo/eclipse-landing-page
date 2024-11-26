const Chat = require('../models/chat');
const User = require('../models/User');
const socketManager = require('../utils/socketManager');
const NotificationService = require('./notificationService');

class ChatService {
    constructor() {
        this.socket = socketManager;
        this.notificationService = new NotificationService();
    }

    /**
     * Create a new chat or get existing chat between users
     */
    async createOrGetChat(user1Id, user2Id, type = 'direct') {
        try {
            let chat = await Chat.findOne({
                type,
                'participants.user': { $all: [user1Id, user2Id] }
            }).populate('participants.user', 'name email role avatar');

            if (!chat) {
                const [user1, user2] = await Promise.all([
                    User.findById(user1Id),
                    User.findById(user2Id)
                ]);

                chat = await Chat.create({
                    type,
                    participants: [
                        { user: user1Id, role: user1.role },
                        { user: user2Id, role: user2.role }
                    ],
                    metadata: {
                        createdBy: user1Id,
                        createdAt: new Date()
                    }
                });

                await chat.populate('participants.user', 'name email role avatar');
            }

            return chat;
        } catch (error) {
            console.error('Error in createOrGetChat:', error);
            throw error;
        }
    }

    /**
     * Create a group chat
     */
    async createGroupChat(creatorId, title, participantIds, settings = {}) {
        try {
            const participants = await User.find({ _id: { $in: participantIds } });
            
            const participantsData = participants.map(user => ({
                user: user._id,
                role: user.role
            }));

            const chat = await Chat.create({
                type: 'group',
                participants: participantsData,
                metadata: {
                    title,
                    createdBy: creatorId,
                    createdAt: new Date()
                },
                settings: {
                    ...this.getDefaultSettings(),
                    ...settings
                }
            });

            await chat.populate('participants.user', 'name email role avatar');

            // Notify all participants
            participantIds.forEach(userId => {
                if (userId !== creatorId) {
                    this.notificationService.send({
                        userId,
                        type: 'CHAT.GROUP_CREATED',
                        title: 'New Group Chat',
                        message: `You have been added to ${title}`
                    });
                }
            });

            return chat;
        } catch (error) {
            console.error('Error in createGroupChat:', error);
            throw error;
        }
    }

    /**
     * Send a message in a chat
     */
    async sendMessage(chatId, senderId, content, attachments = []) {
        try {
            const chat = await Chat.findById(chatId);
            if (!chat) {
                throw new Error('Chat not found');
            }

            const message = {
                sender: senderId,
                content,
                attachments,
                readBy: [{ user: senderId }],
                createdAt: new Date()
            };

            chat.messages.push(message);
            await chat.save();

            // Populate sender details
            const populatedMessage = await Chat.populate(message, {
                path: 'sender',
                select: 'name email role avatar'
            });

            // Notify other participants via socket
            chat.participants.forEach(participant => {
                if (participant.user.toString() !== senderId) {
                    this.socket.sendToUser(participant.user.toString(), 'new_message', {
                        chatId,
                        message: populatedMessage
                    });

                    // Send push notification
                    this.notificationService.send({
                        userId: participant.user,
                        type: 'CHAT.NEW_MESSAGE',
                        title: 'New Message',
                        message: `New message from ${populatedMessage.sender.name}`
                    });
                }
            });

            return populatedMessage;
        } catch (error) {
            console.error('Error in sendMessage:', error);
            throw error;
        }
    }

    /**
     * Get chat messages with pagination
     */
    async getChatMessages(chatId, userId, page = 1, limit = 50) {
        try {
            const chat = await Chat.findOne({
                _id: chatId,
                'participants.user': userId
            })
            .populate({
                path: 'messages.sender',
                select: 'name email role avatar'
            })
            .slice('messages', [(page - 1) * limit, limit])
            .sort({ 'messages.createdAt': -1 });

            if (!chat) {
                throw new Error('Chat not found or unauthorized');
            }

            return chat.messages;
        } catch (error) {
            console.error('Error in getChatMessages:', error);
            throw error;
        }
    }

    /**
     * Mark messages as read
     */
    async markMessagesAsRead(chatId, userId) {
        try {
            const chat = await Chat.findById(chatId);
            if (!chat) {
                throw new Error('Chat not found');
            }

            let updated = false;
            chat.messages.forEach(message => {
                if (!message.readBy.some(read => read.user.toString() === userId)) {
                    message.readBy.push({
                        user: userId,
                        readAt: new Date()
                    });
                    updated = true;
                }
            });

            if (updated) {
                await chat.save();
                
                // Notify other participants about read status
                this.socket.sendToChat(chatId, 'messages_read', {
                    chatId,
                    userId
                });
            }

            return chat;
        } catch (error) {
            console.error('Error in markMessagesAsRead:', error);
            throw error;
        }
    }

    /**
     * Get user's chats
     */
    async getUserChats(userId) {
        try {
            const chats = await Chat.find({
                'participants.user': userId,
                status: 'active'
            })
            .populate('participants.user', 'name email role avatar')
            .populate('lastMessage')
            .sort('-updatedAt');

            return chats.map(chat => ({
                ...chat.toObject(),
                unreadCount: chat.messages.filter(msg => 
                    !msg.readBy.some(read => read.user.toString() === userId)
                ).length
            }));
        } catch (error) {
            console.error('Error in getUserChats:', error);
            throw error;
        }
    }

    /**
     * Delete a message
     */
    async deleteMessage(chatId, messageId, userId) {
        try {
            const chat = await Chat.findById(chatId);
            if (!chat) {
                throw new Error('Chat not found');
            }

            const message = chat.messages.id(messageId);
            if (!message) {
                throw new Error('Message not found');
            }

            if (message.sender.toString() !== userId) {
                throw new Error('Unauthorized to delete this message');
            }

            message.deletedFor.push(userId);
            await chat.save();

            return chat;
        } catch (error) {
            console.error('Error in deleteMessage:', error);
            throw error;
        }
    }

    /**
     * Update chat settings
     */
    async updateChatSettings(chatId, userId, settings) {
        try {
            const chat = await Chat.findOne({
                _id: chatId,
                'participants.user': userId
            });

            if (!chat) {
                throw new Error('Chat not found or unauthorized');
            }

            chat.settings = {
                ...chat.settings,
                ...settings
            };

            await chat.save();
            return chat;
        } catch (error) {
            console.error('Error in updateChatSettings:', error);
            throw error;
        }
    }

    /**
     * Get default chat settings
     */
    getDefaultSettings() {
        return {
            isEncrypted: true,
            messageRetentionDays: 365,
            allowAttachments: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB
        };
    }

    /**
     * Archive chat
     */
    async archiveChat(chatId, userId) {
        try {
            const chat = await Chat.findOneAndUpdate(
                { _id: chatId, 'participants.user': userId },
                { status: 'archived' },
                { new: true }
            );

            if (!chat) {
                throw new Error('Chat not found or unauthorized');
            }

            return chat;
        } catch (error) {
            console.error('Error in archiveChat:', error);
            throw error;
        }
    }

    /**
     * Get chat statistics
     */
    async getChatStats(chatId, userId) {
        try {
            const chat = await Chat.findOne({
                _id: chatId,
                'participants.user': userId
            });

            if (!chat) {
                throw new Error('Chat not found or unauthorized');
            }

            return {
                totalMessages: chat.messages.length,
                participantsCount: chat.participants.length,
                createdAt: chat.createdAt,
                lastActivity: chat.updatedAt,
                messageStats: {
                    text: chat.messages.filter(m => !m.attachments.length).length,
                    attachments: chat.messages.filter(m => m.attachments.length > 0).length
                }
            };
        } catch (error) {
            console.error('Error in getChatStats:', error);
            throw error;
        }
    }
}

module.exports = new ChatService();