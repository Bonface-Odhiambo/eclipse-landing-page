const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    writer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    editor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    answerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: false },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: false },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: ['answer_purchase', 'writer_payment', 'editor_payment', 'writer_fee', 'withdrawal'] },
    status: { type: String, required: true, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    details: { type: Object, default: {} },
    description: { type: String, required: false },
    withdrawalMethod: { type: String, required: false },
    processingDetails: { type: Object, default: {} },
    failureReason: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
