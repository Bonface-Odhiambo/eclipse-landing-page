
const User = require('../models/userModels');
const Order = require('../models/orderModels');
const { getConnection } = require('../config/database');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'chat.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

class ChatController {
    // Initialize chat metrics collection
    static initializeChatMetrics() {
        try {
            // Collect chat metrics every hour
            setInterval(async () => {
                await ChatController.collectChatMetrics();
            }, 60 * 60 * 1000);

            logger.info('Chat metrics collection initialized');
        } catch (error) {
            logger.error('Failed to initialize chat metrics:', error);
            throw error;
        }
    }

    static async getAllChats(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const { type = 'all', page = 1, limit = 20 } = req.query;
            const skip = (page - 1) * limit;

            // Base query for user's chats
            let query = {
                participants: req.user._id,
                isArchived: false
            };

            if (type !== 'all') {
                query.chatType = type;
            }

            // Get chat rooms with pagination
            const [chatRooms, total] = await Promise.all([
                ChatRoom.find(query, {}, { session })
                    .populate('participants', 'name role avatar isOnline lastSeen')
                    .populate('lastMessage')
                    .populate('order')
                    .sort({ updatedAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                ChatRoom.countDocuments(query, { session })
            ]);

            // Get unread counts for each chat
            const chatsWithUnread = await Promise.all(chatRooms.map(async (room) => {
                const unreadCount = await Message.countDocuments({
                    chatRoom: room._id,
                    sender: { $ne: req.user._id },
                    read: false
                }, { session });

                return {
                    ...room.toObject(),
                    unreadCount
                };
            }));

            await session.commitTransaction();

            res.json({
                chats: chatsWithUnread,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / limit),
                    total
                }
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error in getAllChats:', error);
            res.status(500).json({
                message: 'Error fetching chats',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    static async initializeChat(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const { recipientId, orderId = null } = req.body;

            // Verify recipient exists
            const recipient = await User.findById(recipientId).session(session);
            if (!recipient) {
                return res.status(404).json({ message: 'Recipient not found' });
            }

            // If orderId provided, verify order exists and user has access
            if (orderId) {
                const order = await Order.findById(orderId).session(session);
                if (!order) {
                    return res.status(404).json({ message: 'Order not found' });
                }

                const hasAccess = [order.writer.toString(), order.employer.toString()]
                    .includes(req.user._id.toString());
                if (!hasAccess) {
                    return res.status(403).json({ message: 'Access denied to this order' });
                }
            }

            // Check if chat room already exists
            let chatRoom = await ChatRoom.findOne({
                participants: { $all: [req.user._id, recipientId] },
                orderId: orderId || null
            }).session(session);

            if (!chatRoom) {
                chatRoom = await ChatRoom.create([{
                    participants: [req.user._id, recipientId],
                    chatType: recipient.role.toLowerCase(),
                    orderId,
                    createdBy: req.user._id
                }], { session });
                chatRoom = chatRoom[0];
            }

            // Populate chat room details
            await chatRoom.populate('participants', 'name role avatar isOnline lastSeen');
            await chatRoom.populate('lastMessage');
            if (orderId) {
                await chatRoom.populate('order');
            }

            // Log chat initialization
            await SystemMetrics.create([{
                timestamp: new Date(),
                type: 'chat_initialization',
                details: {
                    chatId: chatRoom._id,
                    initiator: req.user._id,
                    recipient: recipientId,
                    orderId
                }
            }], { session });

            await session.commitTransaction();

            res.json({
                chatRoom,
                recipient: {
                    id: recipient._id,
                    name: recipient.name,
                    role: recipient.role,
                    avatar: recipient.avatar,
                    isOnline: recipient.isOnline,
                    lastSeen: recipient.lastSeen
                }
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error in initializeChat:', error);
            res.status(500).json({
                message: 'Error initializing chat',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    static async sendMessage(req, res) {
        const session = await getConnection().startSession();
        try {
            session.startTransaction();

            const { chatRoomId, content, attachments = [], messageType = 'text' } = req.body;

            // Verify chat room access
            const chatRoom = await ChatRoom.findOne({
                _id: chatRoomId,
                participants: req.user._id
            }).session(session);

            if (!chatRoom) {
                return res.status(403).json({ message: 'Chat room access denied' });
            }

            // Create message
            const [message] = await Message.create([{
                chatRoom: chatRoomId,
                sender: req.user._id,
                content,
                messageType,
                attachments,
                timestamp: new Date()
            }], { session });

            // Update chat room
            await ChatRoom.findByIdAndUpdate(chatRoomId, {
                lastMessage: message._id,
                updatedAt: new Date()
            }, { session });

            await message.populate('sender', 'name role avatar');

            // Send notifications to other participants
            const recipients = chatRoom.participants.filter(
                participant => participant.toString() !== req.user._id.toString()
            );

            await Notification.create(recipients.map(recipientId => ({
                user: recipientId,
                type: 'new_message',
                content: `New message from ${req.user.name}`,
                reference: message._id,
                metadata: {
                    chatRoomId,
                    messageType,
                    sender: req.user._id
                }
            })), { session });

            // Update analytics
            await Analytics.findOneAndUpdate(
                { date: new Date().setHours(0, 0, 0, 0) },
                { $inc: { 'metrics.totalMessages': 1 } },
                { session, upsert: true }
            );

            await session.commitTransaction();

            res.status(201).json({
                message: 'Message sent successfully',
                chatMessage: message
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error in sendMessage:', error);
            await ErrorLog.create({
                type: 'chat_error',
                error: error.message,
                stack: error.stack,
                metadata: {
                    userId: req.user._id,
                    chatRoomId: req.body.chatRoomId
                }
            });
            
            res.status(500).json({
                message: 'Error sending message',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            session.endSession();
        }
    }

    static async getChatMessages(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const { chatRoomId } = req.params;
          const { page = 1, limit = 50 } = req.query;
          const skip = (page - 1) * limit;

          // Verify chat room access
          const chatRoom = await ChatRoom.findOne({
              _id: chatRoomId,
              participants: req.user._id
          }).session(session);

          if (!chatRoom) {
              return res.status(403).json({ message: 'Chat room access denied' });
          }

          // Get messages with pagination
          const [messages, total] = await Promise.all([
              Message.find({ chatRoom: chatRoomId }, {}, { session })
                  .populate('sender', 'name role avatar')
                  .sort({ timestamp: -1 })
                  .skip(skip)
                  .limit(parseInt(limit)),
              Message.countDocuments({ chatRoom: chatRoomId }, { session })
          ]);

          // Mark unread messages as read
          await Message.updateMany(
              {
                  chatRoom: chatRoomId,
                  sender: { $ne: req.user._id },
                  read: false
              },
              {
                  $set: { read: true, readAt: new Date() }
              },
              { session }
          );

          // Update analytics
          await Analytics.findOneAndUpdate(
              { date: new Date().setHours(0, 0, 0, 0) },
              { 
                  $inc: { 'metrics.messageReads': messages.length }
              },
              { session, upsert: true }
          );

          await session.commitTransaction();

          res.json({
              messages: messages.reverse(),
              pagination: {
                  current: parseInt(page),
                  pages: Math.ceil(total / limit),
                  total
              }
          });
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in getChatMessages:', error);
          res.status(500).json({
              message: 'Error fetching messages',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async markAsRead(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const { chatRoomId } = req.params;

          // Verify chat room access
          const chatRoom = await ChatRoom.findOne({
              _id: chatRoomId,
              participants: req.user._id
          }).session(session);

          if (!chatRoom) {
              return res.status(403).json({ message: 'Chat room access denied' });
          }

          // Mark messages as read
          const result = await Message.updateMany(
              {
                  chatRoom: chatRoomId,
                  sender: { $ne: req.user._id },
                  read: false
              },
              {
                  $set: { read: true, readAt: new Date() }
              },
              { session }
          );

          // Update user's chat metrics
          if (result.modifiedCount > 0) {
              await User.findByIdAndUpdate(
                  req.user._id,
                  {
                      $inc: { 'stats.unreadMessages': -result.modifiedCount }
                  },
                  { session }
              );
          }

          await session.commitTransaction();

          res.json({ 
              message: 'Messages marked as read',
              updatedCount: result.modifiedCount
          });
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in markAsRead:', error);
          res.status(500).json({
              message: 'Error marking messages as read',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async archiveChat(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const { chatRoomId } = req.params;

          // Verify and update chat room
          const chatRoom = await ChatRoom.findOneAndUpdate(
              {
                  _id: chatRoomId,
                  participants: req.user._id
              },
              {
                  $set: { 
                      isArchived: true,
                      archivedAt: new Date(),
                      archivedBy: req.user._id
                  }
              },
              { new: true, session }
          );

          if (!chatRoom) {
              return res.status(403).json({ message: 'Chat room access denied' });
          }

          // Log archive action
          await SystemMetrics.create([{
              timestamp: new Date(),
              type: 'chat_archive',
              details: {
                  chatId: chatRoomId,
                  userId: req.user._id
              }
          }], { session });

          await session.commitTransaction();

          res.json({ 
              message: 'Chat archived successfully',
              chatRoom
          });
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in archiveChat:', error);
          res.status(500).json({
              message: 'Error archiving chat',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async searchChats(req, res) {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const { query, type = 'all', page = 1, limit = 20 } = req.query;
          const skip = (page - 1) * limit;

          let searchQuery = {
              participants: req.user._id,
              isArchived: false,
              $or: [
                  { 'participants.name': { $regex: query, $options: 'i' } },
                  { 'lastMessage.content': { $regex: query, $options: 'i' } }
              ]
          };

          if (type !== 'all') {
              searchQuery.chatType = type;
          }

          const [chats, total] = await Promise.all([
              ChatRoom.find(searchQuery, {}, { session })
                  .populate('participants', 'name role avatar isOnline lastSeen')
                  .populate('lastMessage')
                  .populate('order')
                  .sort({ updatedAt: -1 })
                  .skip(skip)
                  .limit(parseInt(limit)),
              ChatRoom.countDocuments(searchQuery, { session })
          ]);

          // Log search metrics
          await Analytics.findOneAndUpdate(
              { date: new Date().setHours(0, 0, 0, 0) },
              { 
                  $inc: { 'metrics.chatSearches': 1 },
                  $push: { 
                      'searchTerms': {
                          $each: [query],
                          $slice: -100
                      }
                  }
              },
              { session, upsert: true }
          );

          await session.commitTransaction();

          res.json({
              chats,
              pagination: {
                  current: parseInt(page),
                  pages: Math.ceil(total / limit),
                  total
              }
          });
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error in searchChats:', error);
          res.status(500).json({
              message: 'Error searching chats',
              error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
      } finally {
          session.endSession();
      }
  }

  static async collectChatMetrics() {
      const session = await getConnection().startSession();
      try {
          session.startTransaction();

          const now = new Date();
          const hourAgo = new Date(now - 60 * 60 * 1000);

          const metrics = {
              timestamp: now,
              type: 'chat_metrics',
              metrics: {
                  activeChats: await ChatRoom.countDocuments({
                      updatedAt: { $gte: hourAgo }
                  }, { session }),
                  totalMessages: await Message.countDocuments({
                      timestamp: { $gte: hourAgo }
                  }, { session }),
                  activeUsers: await User.countDocuments({
                      'meta.lastActive': { $gte: hourAgo }
                  }, { session }),
                  averageResponseTime: await ChatController.calculateAverageResponseTime(hourAgo, session)
              }
          };

          await SystemMetrics.create([metrics], { session });
          await session.commitTransaction();
          
          logger.info('Chat metrics collected successfully');
      } catch (error) {
          await session.abortTransaction();
          logger.error('Error collecting chat metrics:', error);
          throw error;
      } finally {
          session.endSession();
      }
  }

  static async calculateAverageResponseTime(since, session) {
      const messages = await Message.aggregate([
          {
              $match: {
                  timestamp: { $gte: since }
              }
          },
          {
              $group: {
                  _id: '$chatRoom',
                  messages: {
                      $push: {
                          timestamp: '$timestamp',
                          sender: '$sender'
                      }
                  }
              }
          }
      ]).session(session);

      let totalResponseTime = 0;
      let responseCount = 0;

      messages.forEach(chat => {
          for (let i = 1; i < chat.messages.length; i++) {
              if (chat.messages[i].sender !== chat.messages[i-1].sender) {
                  totalResponseTime += chat.messages[i].timestamp - chat.messages[i-1].timestamp;
                  responseCount++;
              }
          }
      });

      return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }
}

// Initialize chat metrics collection when the controller is loaded
try {
  ChatController.initializeChatMetrics();
} catch (error) {
  logger.error('Failed to initialize ChatController:', error);
}

module.exports = ChatController;