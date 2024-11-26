// models/editorModels.js
const mongoose = require('mongoose');

const EditorDashboardSchema = new mongoose.Schema({
  editorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Editor',
    required: true,
    unique: true
  },

  stats: {
    papersReviewed: {
      today: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    approvalRate: { type: Number, default: 0 },
    earnings: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      lastPayout: { type: Date }
    },
    averageResponseTime: { type: Number, default: 0 }, // in hours
    qualityMetrics: {
      grammar: { type: Number, default: 0 },
      noAiUse: { type: Number, default: 0 },
      noPlagiarism: { type: Number, default: 0 },
      noAiHumanizers: { type: Number, default: 0 },
      properReferencing: { type: Number, default: 0 },
      properFormatting: { type: Number, default: 0 },
      thesisStatement: { type: Number, default: 0 },
      topicSentences: { type: Number, default: 0 },
      concludingSentences: { type: Number, default: 0 }
    }
  },

  paperQueue: [{
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper'
    },
    orderId: String,
    writerId: String,
    title: String,
    subject: String,
    pageCount: Number,
    status: {
      type: String,
      enum: ['pending_review', 'under_review', 'reviewed', 'approved', 'rejected'],
      default: 'pending_review'
    },
    submittedAt: { type: Date, default: Date.now },
    deadline: Date,
    reviewNotes: {
      grammar: Boolean,
      noAiUse: Boolean,
      noPlagiarism: Boolean,
      noAiHumanizers: Boolean,
      properReferencing: Boolean,
      properFormatting: Boolean,
      thesisStatement: Boolean,
      topicSentences: Boolean,
      concludingSentences: Boolean,
      comments: String
    }
  }],

  performanceMetrics: {
    daily: [{
      date: Date,
      papersReviewed: Number,
      earnings: Number,
      responseTime: Number
    }],
    weekly: [{
      weekStart: Date,
      papersReviewed: Number,
      earnings: Number,
      averageResponseTime: Number
    }],
    monthly: [{
      monthStart: Date,
      papersReviewed: Number,
      earnings: Number,
      averageResponseTime: Number
    }]
  },

  recentActivity: [{
    type: {
      type: String,
      enum: ['review_completed', 'payment_received', 'paper_assigned', 'feedback_received']
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper'
    },
    details: {
      title: String,
      amount: Number,
      status: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  notifications: [{
    title: String,
    message: String,
    type: {
      type: String,
      enum: ['paper', 'system', 'payment']
    },
    read: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    autoAssignPapers: {
      type: Boolean,
      default: false
    },
    maxPapersPerDay: {
      type: Number,
      default: 10
    },
    preferredSubjects: [String]
  }
}, { timestamps: true });

// Add indexes for better query performance
EditorDashboardSchema.index({ editorId: 1 });
EditorDashboardSchema.index({ 'paperQueue.status': 1 });
EditorDashboardSchema.index({ 'performanceMetrics.daily.date': 1 });

// Virtual for getting current workload
EditorDashboardSchema.virtual('currentWorkload').get(function() {
  return this.paperQueue.filter(paper => 
    paper.status === 'pending_review' || paper.status === 'under_review'
  ).length;
});

// Method to update performance metrics
EditorDashboardSchema.methods.updatePerformanceMetrics = async function() {
  // Implementation for updating performance metrics
  // This would aggregate data from paperQueue and update the metrics
};

// Method to add activity
EditorDashboardSchema.methods.addActivity = function(activityData) {
  this.recentActivity.unshift({
    type: activityData.type,
    paperId: activityData.paperId,
    details: activityData.details,
    timestamp: new Date()
  });

  // Keep only last 50 activities
  if (this.recentActivity.length > 50) {
    this.recentActivity = this.recentActivity.slice(0, 50);
  }
};

// Method to calculate earnings
EditorDashboardSchema.methods.calculateEarnings = function(timeframe = 'total') {
  switch(timeframe) {
    case 'today':
      // Calculate today's earnings
      break;
    case 'week':
      // Calculate this week's earnings
      break;
    case 'month':
      // Calculate this month's earnings
      break;
    default:
      // Calculate total earnings
      return this.stats.earnings.total;
  }
};

module.exports = mongoose.model('EditorDashboard', EditorDashboardSchema);