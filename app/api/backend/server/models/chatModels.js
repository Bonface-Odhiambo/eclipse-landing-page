const mongoose = require('mongoose');
const { Schema } = mongoose;

// ChatRoom Schema
const ChatRoomSchema = new Schema({
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    chatType: { type: String, enum: ['user', 'group'], default: 'user' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

ChatRoomSchema.index({ participants: 1 });
ChatRoomSchema.index({ updatedAt: -1 });

// Message Schema
const MessageSchema = new Schema({
    chatRoom: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
    attachments: [{ type: String }],
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

MessageSchema.index({ chatRoom: 1, timestamp: -1 });

const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);
const Message = mongoose.model('Message', MessageSchema);

module.exports = { ChatRoom, Message };
