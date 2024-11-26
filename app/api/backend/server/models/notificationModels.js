// models/notificationModels.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        index: true,
        enum: [
            // Order notifications
            'new_order',
            'order_assigned',
            'order_completed',
            'revision_requested',
            'deadline_approaching',
            'payment_received',
            'order_cancelled',
            'bid_received',
            'work_submitted',
            
            // Account notifications
            'login_alert',
            'profile_update',
            'subscription_expiring',
            'account_verification',
            'password_changed',
            'email_changed',
            
            // Chat notifications
            'new_message',
            'mention',
            'group_invite',
            
            // Payment notifications
            'payment_success',
            'payment_failed',
            'refund_processed',
            'wallet_credit',
            'withdrawal_success',
            
            // Claim notifications
            'claim_filed',
            'claim_update',
            'claim_resolved',
            'dispute_response'
        ]
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    channels: [{
        type: String,
        enum: ['inapp', 'email', 'sms'],
        default: ['inapp']
    }],
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'delivered'],
        default: 'pending'
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    failureReason: {
        type: String,
        default: null
    },
    retryCount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        index: true
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Methods
notificationSchema.methods = {
    // Mark notification as read
    markAsRead: async function() {
        if (!this.read) {
            this.read = true;
            this.readAt = new Date();
            await this.save();
        }
        return this;
    },

    // Mark notification as delivered
    markAsDelivered: async function() {
        if (!this.deliveredAt) {
            this.status = 'delivered';
            this.deliveredAt = new Date();
            await this.save();
        }
        return this;
    },

    // Mark notification as failed
    markAsFailed: async function(reason) {
        this.status = 'failed';
        this.failureReason = reason;
        this.retryCount += 1;
        await this.save();
        return this;
    },

    // Format notification for client
    toClientJSON: function() {
        return {
            id: this._id,
            type: this.type,
            title: this.title,
            message: this.message,
            data: this.data,
            priority: this.priority,
            read: this.read,
            readAt: this.readAt,
            createdAt: this.createdAt,
            status: this.status
        };
    }
};

// Static methods
notificationSchema.statics = {
    // Get unread notifications for user
    async getUnreadForUser(userId, limit = 50) {
        return this.find({
            user: userId,
            read: false
        })
        .sort('-createdAt')
        .limit(limit);
    },

    // Get notifications by type
    async getByType(userId, type, { page = 1, limit = 20 } = {}) {
        return this.find({
            user: userId,
            type
        })
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit);
    },

    // Mark multiple notifications as read
    async markManyAsRead(userId, notificationIds) {
        const now = new Date();
        return this.updateMany(
            {
                _id: { $in: notificationIds },
                user: userId,
                read: false
            },
            {
                $set: {
                    read: true,
                    readAt: now
                }
            }
        );
    },

    // Clear old notifications
    async clearOldNotifications(userId, daysOld = 30) {
        const date = new Date();
        date.setDate(date.getDate() - daysOld);
        
        return this.deleteMany({
            user: userId,
            createdAt: { $lt: date }
        });
    },

    // Get notification stats
    async getStats(userId) {
        return this.aggregate([
            { $match: { user: mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    unread: {
                        $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
                    },
                    highPriority: {
                        $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
                    }
                }
            }
        ]).exec();
    }
};

// Middleware
notificationSchema.pre('save', function(next) {
    if (!this.channels || this.channels.length === 0) {
        this.channels = ['inapp'];
    }
    next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;