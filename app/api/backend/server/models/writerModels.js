// models/writerModels.js
const mongoose = require('mongoose');

const writerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stats: {
    rating: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    onTimeDelivery: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }
  },
  subscription: {
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive' },
    startDate: Date,
    endDate: Date,
    lastPayment: { type: Number, default: 0 }
  },
  wallet: {
    balance: { type: Number, default: 0 },
    pendingWithdrawal: { type: Number, default: 0 },
    withdrawalHistory: [{
      amount: Number,
      status: { type: String, enum: ['pending', 'completed', 'failed'] },
      mpesaPhone: String,
      mpesaReference: String,
      processAttempts: { type: Number, default: 0 },
      processedAt: Date,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  expertise: [String],
  workload: {
    currentOrders: { type: Number, default: 0 },
    maxOrders: { type: Number, default: 5 }
  },
  bids: [{
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    amount: Number,
    proposal: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const writerAnswerSchema = new mongoose.Schema({
  writer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  content: { type: String, required: true },
  preview: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  price: { type: Number, default: 100 },
  purchaseCount: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  rejectionReason: String,
  reviews: [{
    rating: Number,
    comment: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const writerOrderSchema = new mongoose.Schema({
  writer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  submissionHistory: [{
    files: [{
      filename: String,
      originalname: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    }],
    comment: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    feedback: String,
    createdAt: { type: Date, default: Date.now }
  }],
  earnings: {
    amount: Number,
    processingFee: Number,
    finalAmount: Number,
    status: { type: String, enum: ['pending', 'processed', 'disputed'] }
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'revision', 'disputed', 'canceled'],
    default: 'in_progress'
  }
}, { timestamps: true });

module.exports = {
  Writer: mongoose.model('Writer', writerSchema),
  WriterAnswer: mongoose.model('WriterAnswer', writerAnswerSchema),
  WriterOrder: mongoose.model('WriterOrder', writerOrderSchema)
};