// models/employerModels.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  uploadedAt: Date,
  url: String
});

const employerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: {
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive' },
    type: { type: String, enum: ['basic', 'premium'], default: 'basic' },
    startDate: Date,
    endDate: Date,
    lastPayment: Number
  },
  wallet: {
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['deposit', 'order_payment', 'refund', 'subscription'] },
      amount: Number,
      status: { type: String, enum: ['pending', 'completed', 'failed'] },
      mpesaPhone: String,
      mpesaReference: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  privateWriters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ratings: [{
    writer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    review: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const employerOrderSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  subject: { type: String, required: true },
  status: {
    type: String, 
    enum: ['draft', 'posted', 'in_progress', 'completed', 'disputed', 'canceled'],
    default: 'draft'
  },
  budget: { type: Number, required: true },
  platformFee: Number,
  deadline: { type: Date, required: true },
  pages: Number,
  wordCount: Number,
  paperFormat: String,
  references: Number,
  technicalRequirements: [String],
  files: [fileSchema],
  isPrivate: { type: Boolean, default: false },
  selectedWriters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedWriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bids: [{
    writer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    proposal: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    createdAt: { type: Date, default: Date.now }
  }],
  dispute: {
    reason: String,
    description: String,
    raisedBy: { type: String, enum: ['employer', 'writer', 'system'] },
    status: { type: String, enum: ['pending', 'resolved'] },
    resolution: String,
    createdAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

const qaSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' },
  purchased: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'] },
  price: Number,
  purchaseDate: Date
}, { timestamps: true });

module.exports = {
  Employer: mongoose.model('Employer', employerSchema),
  EmployerOrder: mongoose.model('EmployerOrder', employerOrderSchema),
  QA: mongoose.model('QA', qaSchema)
};