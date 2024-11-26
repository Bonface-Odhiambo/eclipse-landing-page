// utils/notifications.js
const UserModel = require('../models/userModels');
const Notification = require('../models/notificationModels');  // Assuming this is your notification model
const socketManager = require('./socketManager');
const emailService = require('../services/emailService');
const Order = require('../models/orderModels');

class NotificationManager {
    constructor() {
        this.notificationTypes = {
            ORDER: {
                NEW_ORDER: 'new_order',
                ORDER_ASSIGNED: 'order_assigned',
                ORDER_COMPLETED: 'order_completed',
                REVISION_REQUESTED: 'revision_requested',
                DEADLINE_APPROACHING: 'deadline_approaching',
                PAYMENT_RECEIVED: 'payment_received',
                ORDER_CANCELLED: 'order_cancelled',
                BID_RECEIVED: 'bid_received',
                WORK_SUBMITTED: 'work_submitted'
            },
            ACCOUNT: {
                LOGIN_ALERT: 'login_alert',
                PROFILE_UPDATE: 'profile_update',
                SUBSCRIPTION_EXPIRING: 'subscription_expiring',
                ACCOUNT_VERIFICATION: 'account_verification',
                PASSWORD_CHANGED: 'password_changed',
                EMAIL_CHANGED: 'email_changed'
            },
            CHAT: {
                NEW_MESSAGE: 'new_message',
                MENTION: 'mention',
                GROUP_INVITE: 'group_invite'
            },
            PAYMENT: {
                PAYMENT_SUCCESS: 'payment_success',
                PAYMENT_FAILED: 'payment_failed',
                REFUND_PROCESSED: 'refund_processed',
                WALLET_CREDIT: 'wallet_credit',
                WITHDRAWAL_SUCCESS: 'withdrawal_success'
            },
            CLAIM: {
                CLAIM_FILED: 'claim_filed',
                CLAIM_UPDATE: 'claim_update',
                CLAIM_RESOLVED: 'claim_resolved',
                DISPUTE_RESPONSE: 'dispute_response'
            }
        };
    }

    async send({ 
        userId, 
        type, 
        title, 
        message, 
        data = {}, 
        priority = 'normal',
        channels = ['inapp', 'email']
    }) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error(`User not found with ID: ${userId}`);
            }

            // Create notification document
            const notification = new Notification({
                user: userId,
                type,
                title,
                message,
                data,
                priority,
                channels,
                createdAt: new Date()
            });
            await notification.save();

            // Send through selected channels
            const sendPromises = [];

            // In-app notification via Socket.IO
            if (channels.includes('inapp')) {
                sendPromises.push(
                    this.sendInAppNotification(user, notification)
                        .catch(error => console.error('In-app notification failed:', error))
                );
            }

            // Email notification - check user preferences
            if (channels.includes('email') && 
                user.notificationPreferences?.email?.[type] !== false) {
                sendPromises.push(
                    this.sendEmailNotification(user, notification)
                        .catch(error => console.error('Email notification failed:', error))
                );
            }

            // Wait for all notifications to be sent
            await Promise.allSettled(sendPromises);
            return notification;

        } catch (error) {
            console.error('Notification sending failed:', error);
            throw error;
        }
    }

    async sendInAppNotification(user, notification) {
        try {
            const socket = socketManager.getSocketByUserId(user._id);
            if (socket) {
                socket.emit('notification', {
                    id: notification._id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    createdAt: notification.createdAt,
                    priority: notification.priority,
                    read: false
                });
            }
            return true;
        } catch (error) {
            console.error('In-app notification failed:', error);
            return false;
        }
    }

    async sendEmailNotification(user, notification) {
        try {
            const emailTemplate = this.getEmailTemplate(notification.type);
            return await emailService.sendEmail({
                to: user.email,
                subject: notification.title,
                template: emailTemplate,
                context: {
                    userName: `${user.profile.firstName} ${user.profile.lastName}`,
                    message: notification.message,
                    data: notification.data,
                    actionUrl: this.getActionUrl(notification)
                }
            });
        } catch (error) {
            console.error('Email notification failed:', error);
            throw error;
        }
    }

    getEmailTemplate(type) {
        const templates = {
            [this.notificationTypes.ORDER.NEW_ORDER]: 'new-order-template',
            [this.notificationTypes.ORDER.ORDER_COMPLETED]: 'order-completed-template',
            [this.notificationTypes.PAYMENT.PAYMENT_SUCCESS]: 'payment-success-template',
            [this.notificationTypes.CLAIM.CLAIM_FILED]: 'claim-filed-template',
            default: 'default-notification-template'
        };
        return templates[type] || templates.default;
    }

    getActionUrl(notification) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrls = {
            [this.notificationTypes.ORDER.NEW_ORDER]: `/orders/${notification.data.orderId}`,
            [this.notificationTypes.CHAT.NEW_MESSAGE]: `/chat/${notification.data.chatId}`,
            [this.notificationTypes.CLAIM.CLAIM_FILED]: `/claims/${notification.data.claimId}`,
            default: '/notifications'
        };
        return `${baseUrl}${actionUrls[notification.type] || actionUrls.default}`;
    }

    // Utility methods for common notifications
    async notifyOrderAssignment(orderId, writerId) {
        try {
            const order = await Order.findById(orderId);
            if (!order) throw new Error(`Order not found with ID: ${orderId}`);

            await this.send({
                userId: writerId,
                type: this.notificationTypes.ORDER.ORDER_ASSIGNED,
                title: 'New Order Assignment',
                message: `You have been assigned to order: ${order.title}`,
                data: { orderId, orderTitle: order.title },
                priority: 'high'
            });
        } catch (error) {
            console.error('Order assignment notification failed:', error);
            throw error;
        }
    }

    async notifyDeadlineApproaching(orderId, userId) {
        try {
            const order = await Order.findById(orderId);
            if (!order) throw new Error(`Order not found with ID: ${orderId}`);

            const hoursLeft = Math.ceil((order.deadline - new Date()) / (1000 * 60 * 60));

            await this.send({
                userId,
                type: this.notificationTypes.ORDER.DEADLINE_APPROACHING,
                title: 'Deadline Approaching',
                message: `Deadline for order "${order.title}" is in ${hoursLeft} hours`,
                data: { orderId, orderTitle: order.title, hoursLeft },
                priority: 'high'
            });
        } catch (error) {
            console.error('Deadline notification failed:', error);
            throw error;
        }
    }

    async notifyPaymentReceived(userId, amount, currency, paymentId) {
        try {
            await this.send({
                userId,
                type: this.notificationTypes.PAYMENT.PAYMENT_SUCCESS,
                title: 'Payment Received',
                message: `Payment of ${amount} ${currency} has been credited to your account`,
                data: { amount, currency, paymentId },
                priority: 'normal'
            });
        } catch (error) {
            console.error('Payment notification failed:', error);
            throw error;
        }
    }

    // Database operations
    async markAsRead(userId, notificationIds) {
        try {
            const result = await Notification.updateMany(
                {
                    _id: { $in: notificationIds },
                    user: userId
                },
                {
                    $set: { 
                        read: true, 
                        readAt: new Date() 
                    }
                }
            );

            const socket = socketManager.getSocketByUserId(userId);
            if (socket) {
                socket.emit('notifications_read', { notificationIds });
            }

            return result;
        } catch (error) {
            console.error('Mark as read failed:', error);
            throw error;
        }
    }

    async getUnreadNotifications(userId) {
        try {
            return await Notification.find({
                user: userId,
                read: false
            })
            .sort('-createdAt')
            .limit(100);
        } catch (error) {
            console.error('Get unread notifications failed:', error);
            throw error;
        }
    }

    async clearAllNotifications(userId) {
        try {
            const result = await Notification.deleteMany({ user: userId });
            
            const socket = socketManager.getSocketByUserId(userId);
            if (socket) {
                socket.emit('notifications_cleared');
            }

            return result;
        } catch (error) {
            console.error('Clear notifications failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new NotificationManager();