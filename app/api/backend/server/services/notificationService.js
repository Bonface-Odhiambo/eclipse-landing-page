const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User'); // Assuming you have a User model

class NotificationService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // Store user socket mappings
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log('Notification service initialized for socket:', socket.id);
    });
  }

  // Store user socket mapping
  registerUserSocket(userId, socket) {
    this.userSockets.set(userId, socket);
  }

  // Remove user socket mapping
  removeUserSocket(userId) {
    this.userSockets.delete(userId);
  }

  // Send notification to specific user
  async sendToUser(userId, notificationType, payload) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('notification', {
        type: notificationType,
        payload,
        timestamp: new Date()
      });
    }
  }

  // Send notification to all users with specific role
  async sendToRole(role, notificationType, payload) {
    const users = await User.find({ role });
    users.forEach(user => {
      this.sendToUser(user._id, notificationType, payload);
    });
  }

  // Send chat notification
  async sendChatNotification(roomId, senderId, message) {
    try {
      const chatRoom = await ChatRoom.findById(roomId)
        .populate('participants.user', 'role');

      if (!chatRoom) return;

      // Send to all participants except sender
      chatRoom.participants.forEach(participant => {
        if (participant.user._id.toString() !== senderId.toString()) {
          this.sendToUser(participant.user._id, 'new_message', {
            roomId,
            senderId,
            message: message.content,
            timestamp: message.timestamp
          });
        }
      });
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }

  // Send assignment notification
  async sendAssignmentNotification(assignmentId, type, affectedRoles = []) {
    try {
      const notification = {
        type,
        assignmentId,
        timestamp: new Date()
      };

      // Send to specific roles
      for (const role of affectedRoles) {
        await this.sendToRole(role, 'assignment_update', notification);
      }
    } catch (error) {
      console.error('Error sending assignment notification:', error);
    }
  }

  // Send project milestone notification
  async sendMilestoneNotification(projectId, milestone) {
    try {
      const chatRoom = await ChatRoom.findProjectRoom(projectId);
      if (!chatRoom) return;

      chatRoom.participants.forEach(participant => {
        this.sendToUser(participant.user, 'milestone_update', {
          projectId,
          milestone,
          timestamp: new Date()
        });
      });
    } catch (error) {
      console.error('Error sending milestone notification:', error);
    }
  }

  // Send system notification
  async broadcastSystemNotification(message, roles = []) {
    try {
      const notification = {
        message,
        timestamp: new Date()
      };

      if (roles.length === 0) {
        // Broadcast to all connected users
        this.io.emit('system_notification', notification);
      } else {
        // Send to specific roles
        for (const role of roles) {
          await this.sendToRole(role, 'system_notification', notification);
        }
      }
    } catch (error) {
      console.error('Error broadcasting system notification:', error);
    }
  }

  // Handle user typing notification
  async sendTypingNotification(roomId, userId, isTyping) {
    try {
      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom) return;

      chatRoom.participants.forEach(participant => {
        if (participant.user.toString() !== userId.toString()) {
          this.sendToUser(participant.user, 'user_typing', {
            roomId,
            userId,
            isTyping
          });
        }
      });
    } catch (error) {
      console.error('Error sending typing notification:', error);
    }
  }
}

module.exports = NotificationService;