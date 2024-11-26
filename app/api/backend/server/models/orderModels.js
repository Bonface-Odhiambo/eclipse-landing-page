const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true },
    description: { type: String },
    subject: { type: String },
    pages: { type: Number, required: true },
    deadline: { type: Date, required: true },
    price: { type: Number, required: true },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'completed_approved', 'disputed', 'cancelled'],
        default: 'in_progress'
    },
    isPrivate: { type: Boolean, default: false },
    preferredWriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    files: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    writer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    writerPaid: { type: Boolean, default: false },
    editorPaid: { type: Boolean, default: false },
    writerPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    editorPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    autoApproved: { type: Boolean, default: false },
    isLate: { type: Boolean, default: false },
    hoursLate: { type: Number },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    approvedAt: { type: Date },
    isDisputed: { type: Boolean, default: false }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
